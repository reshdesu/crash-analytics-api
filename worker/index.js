/**
 * Universal Crash Analytics API - Cloudflare Worker
 * Maximum security crash reporting for all applications
 */

// Rate limiting storage
const rateLimitKV = new Map(); // In production, use Cloudflare KV

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-HMAC-Signature, X-App-Name',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      // Get client IP for rate limiting
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For') || 
                      'unknown';
      
      // Rate limiting check
      const rateLimitResult = await checkRateLimit(clientIP, env);
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.retry_after
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse request body
      const body = await request.text();
      
      // Check payload size
      if (body.length > (env.MAX_PAYLOAD_SIZE || 50000)) {
        return new Response(JSON.stringify({
          error: 'Payload too large'
        }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify HMAC signature
      const signature = request.headers.get('X-HMAC-Signature');
      if (!signature || !await verifyHMAC(body, signature, env.HMAC_SECRET)) {
        return new Response(JSON.stringify({
          error: 'Invalid signature'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse and validate crash data
      let crashData;
      try {
        crashData = JSON.parse(body);
      } catch (e) {
        return new Response(JSON.stringify({
          error: 'Invalid JSON'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate crash data
      const validationResult = validateCrashData(crashData);
      if (!validationResult.valid) {
        return new Response(JSON.stringify({
          error: 'Invalid crash data',
          details: validationResult.errors
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sanitize data
      const sanitizedData = sanitizeCrashData(crashData, clientIP);

      // Insert into Supabase
      const insertResult = await insertCrashReport(sanitizedData, env);
      
      if (insertResult.success) {
        return new Response(JSON.stringify({
          success: true,
          id: insertResult.id
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        console.error('Supabase insert failed:', insertResult.error);
        return new Response(JSON.stringify({
          error: 'Failed to save crash report',
          stored_locally: true // Client should fall back to local storage
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        stored_locally: true
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Check rate limiting (IP-based)
 */
async function checkRateLimit(ip, env) {
  const rateLimitPerMinute = parseInt(env.RATE_LIMIT_PER_MINUTE || '60');
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / 60) * 60; // 1-minute windows
  
  const key = `rate_limit:${await hashIP(ip)}:${windowStart}`;
  
  // In production, use Cloudflare KV or Durable Objects
  // For now, using in-memory storage (resets on worker restart)
  const current = rateLimitKV.get(key) || 0;
  
  if (current >= rateLimitPerMinute) {
    return {
      allowed: false,
      retry_after: 60 - (now % 60)
    };
  }
  
  rateLimitKV.set(key, current + 1);
  
  return { allowed: true };
}

/**
 * Verify HMAC signature
 */
async function verifyHMAC(body, signature, secret) {
  if (!secret) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // Extract hex signature (remove 'sha256=' prefix if present)
  const cleanSignature = signature.replace('sha256=', '');
  const signatureBytes = hexToBytes(cleanSignature);
  
  return await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(body)
  );
}

/**
 * Validate crash data structure and content
 */
function validateCrashData(data) {
  const errors = [];
  
  // Required fields
  if (!data.app_name || typeof data.app_name !== 'string') {
    errors.push('app_name is required and must be a string');
  }
  
  if (!data.app_version || typeof data.app_version !== 'string') {
    errors.push('app_version is required and must be a string');
  }
  
  if (!data.platform || typeof data.platform !== 'string') {
    errors.push('platform is required and must be a string');
  }
  
  if (!data.crash_timestamp) {
    errors.push('crash_timestamp is required');
  }
  
  // Validate app_name format
  if (data.app_name && (data.app_name.length < 1 || data.app_name.length > 100)) {
    errors.push('app_name must be 1-100 characters');
  }
  
  // Validate version format
  if (data.app_version && !data.app_version.match(/^v[0-9]+\.[0-9]+\.[0-9]+/)) {
    errors.push('app_version must follow semantic versioning (v1.2.3)');
  }
  
  // Validate platform
  const validPlatforms = ['windows', 'linux', 'macos', 'android', 'ios'];
  if (data.platform && !validPlatforms.includes(data.platform.toLowerCase())) {
    errors.push(`platform must be one of: ${validPlatforms.join(', ')}`);
  }
  
  // Validate timestamp (must be recent)
  if (data.crash_timestamp) {
    const crashTime = new Date(data.crash_timestamp);
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (isNaN(crashTime.getTime())) {
      errors.push('crash_timestamp must be a valid ISO date');
    } else if (crashTime > now) {
      errors.push('crash_timestamp cannot be in the future');
    } else if (now - crashTime > oneDay) {
      errors.push('crash_timestamp must be within the last 24 hours');
    }
  }
  
  // Validate optional string fields
  if (data.error_message && (typeof data.error_message !== 'string' || data.error_message.length > 5000)) {
    errors.push('error_message must be a string under 5000 characters');
  }
  
  if (data.stack_trace && (typeof data.stack_trace !== 'string' || data.stack_trace.length > 20000)) {
    errors.push('stack_trace must be a string under 20000 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize crash data for database insertion
 */
function sanitizeCrashData(data, clientIP) {
  return {
    app_name: sanitizeString(data.app_name),
    app_version: sanitizeString(data.app_version),
    platform: data.platform.toLowerCase(),
    crash_timestamp: new Date(data.crash_timestamp).toISOString(),
    error_message: data.error_message ? sanitizeString(data.error_message) : null,
    stack_trace: data.stack_trace ? sanitizeString(data.stack_trace) : null,
    hardware_specs: data.hardware_specs || {},
    user_id: data.user_id ? sanitizeString(data.user_id) : null,
    session_id: data.session_id ? sanitizeString(data.session_id) : null,
    ip_hash: hashIP(clientIP)
  };
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (!str) return null;
  
  return str
    .toString()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .trim()
    .substring(0, 10000); // Hard limit
}

/**
 * Hash IP address for privacy and rate limiting
 */
async function hashIP(ip) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'crash-analytics-salt'); // Add salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Insert crash report into Supabase
 */
async function insertCrashReport(crashData, env) {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/crash_reports`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(crashData)
    });
    
    if (response.ok) {
      return { success: true, id: 'inserted' };
    } else {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Utility: Convert hex string to bytes
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}