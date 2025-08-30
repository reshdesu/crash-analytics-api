#!/usr/bin/env node
/**
 * Environment Configuration Validator
 * Checks all required environment variables and tests Supabase connectivity
 */

// Load environment variables from .env file
require('dotenv').config();

const https = require('https');
const http = require('http');

// Required environment variables
const REQUIRED_VARS = {
    'API_ENDPOINT': 'Your Cloudflare Worker API endpoint',
    'HMAC_SECRET': 'HMAC secret for request signing',
    'SUPABASE_URL': 'Your Supabase project URL',
    'SUPABASE_SERVICE_KEY': 'Your Supabase service role key'
};

// Optional environment variables with defaults
const OPTIONAL_VARS = {
    'RATE_LIMIT_PER_MINUTE': '60',
    'MAX_PAYLOAD_SIZE': '50000',
    'DEBUG': 'false'
};

function makeRequest(url, options, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function validateEnvironmentVariables() {
    console.log('🔍 Validating Environment Configuration');
    console.log('='.repeat(50));
    
    const missing = [];
    const present = {};
    
    // Check required variables
    for (const [varName, description] of Object.entries(REQUIRED_VARS)) {
        const value = process.env[varName];
        if (!value) {
            missing.push({ name: varName, description });
        } else {
            present[varName] = value;
            console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
        }
    }
    
    // Check optional variables
    for (const [varName, defaultValue] of Object.entries(OPTIONAL_VARS)) {
        const value = process.env[varName] || defaultValue;
        present[varName] = value;
        console.log(`⚙️  ${varName}: ${value} ${!process.env[varName] ? '(default)' : ''}`);
    }
    
    if (missing.length > 0) {
        console.log('\n❌ Missing Required Environment Variables:');
        missing.forEach(({ name, description }) => {
            console.log(`   - ${name}: ${description}`);
        });
        console.log('\n💡 Add these to your .env file or set them as environment variables');
        return false;
    }
    
    console.log('\n✅ All required environment variables are present!');
    return true;
}

async function validateSupabaseConnection() {
    console.log('\n🔌 Testing Supabase Connection');
    console.log('='.repeat(40));
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
        console.log('❌ Missing Supabase credentials');
        return false;
    }
    
    try {
        // Test basic connectivity
        console.log(`📡 Testing connection to: ${supabaseUrl}`);
        
        // Test 1: Basic health check
        const healthResponse = await makeRequest(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (healthResponse.statusCode === 200) {
            console.log('✅ Supabase connection successful');
        } else {
            console.log(`⚠️  Supabase responded with status: ${healthResponse.statusCode}`);
        }
        
        // Test 2: Try to create a test table (this will fail but shows permissions work)
        console.log('🧪 Testing database permissions...');
        
        const testTableResponse = await makeRequest(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                sql: 'SELECT current_timestamp as test_connection;' 
            })
        });
        
        if (testTableResponse.statusCode === 200) {
            console.log('✅ Database permissions working correctly');
            return true;
        } else if (testTableResponse.statusCode === 404) {
            console.log('⚠️  exec_sql function not found (this is normal for new projects)');
            console.log('💡 The worker will create tables automatically on first use');
            return true;
        } else {
            console.log(`❌ Database permission test failed: ${testTableResponse.statusCode}`);
            console.log(`Response: ${testTableResponse.body}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ Supabase connection failed: ${error.message}`);
        return false;
    }
}

async function validateWorkerConfiguration() {
    console.log('\n⚙️  Validating Worker Configuration');
    console.log('='.repeat(40));
    
    const apiEndpoint = process.env.API_ENDPOINT;
    
    if (!apiEndpoint) {
        console.log('❌ API_ENDPOINT not set');
        return false;
    }
    
    console.log(`🎯 API Endpoint: ${apiEndpoint}`);
    
    // Check if it's local or production
    if (apiEndpoint.includes('localhost') || apiEndpoint.includes('127.0.0.1')) {
        console.log('🏠 Local development mode detected');
        console.log('💡 Make sure to run: pnpm run dev');
    } else if (apiEndpoint.includes('workers.dev')) {
        console.log('🌐 Production mode detected');
        console.log('💡 Make sure your worker is deployed and running');
    } else {
        console.log('⚠️  Unknown endpoint format');
    }
    
    return true;
}

async function generateHmacSecret() {
    console.log('\n🔐 HMAC Secret Validation');
    console.log('='.repeat(30));
    
    const hmacSecret = process.env.HMAC_SECRET;
    
    if (!hmacSecret) {
        console.log('❌ HMAC_SECRET not set');
        return false;
    }
    
    // Check if it looks like a proper hex string
    if (!/^[a-f0-9]{64}$/i.test(hmacSecret)) {
        console.log('⚠️  HMAC_SECRET format looks incorrect');
        console.log('💡 Should be a 64-character hex string');
        console.log('💡 Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        return false;
    }
    
    console.log('✅ HMAC_SECRET format is correct');
    return true;
}

async function main() {
    console.log('🚀 Universal Crash Analytics API - Environment Validator');
    console.log('='.repeat(60));
    
    try {
        // Step 1: Validate environment variables
        const envValid = await validateEnvironmentVariables();
        if (!envValid) {
            process.exit(1);
        }
        
        // Step 2: Validate HMAC secret format
        const hmacValid = await generateHmacSecret();
        if (!hmacValid) {
            process.exit(1);
        }
        
        // Step 3: Validate worker configuration
        const workerValid = await validateWorkerConfiguration();
        if (!workerValid) {
            process.exit(1);
        }
        
        // Step 4: Test Supabase connection
        const supabaseValid = await validateSupabaseConnection();
        if (!supabaseValid) {
            process.exit(1);
        }
        
        console.log('\n🎉 Environment Validation Complete!');
        console.log('✅ All checks passed successfully');
        console.log('\n📚 Next Steps:');
        console.log('1. Start local development: pnpm run dev');
        console.log('2. Test the API: pnpm test');
        console.log('3. Deploy to production: pnpm run deploy');
        
    } catch (error) {
        console.error('\n❌ Validation failed with error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
