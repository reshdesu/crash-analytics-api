/**
 * Universal Crash Reporter for JavaScript/Node.js Applications
 * Automatically catches and reports crashes to your crash analytics API
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const os = require('os');

class CrashReporter {
    constructor(config) {
        this.config = {
            app_name: config.app_name,
            app_version: config.app_version,
            api_endpoint: config.api_endpoint,
            hmac_secret: config.hmac_secret,
            user_id: config.user_id || null,
            session_id: config.session_id || this.generateSessionId(),
            platform: this.getPlatform(),
            ...config
        };
        
        this.installCrashHandlers();
    }

    /**
     * Generate HMAC signature for request authentication
     */
    generateHmacSignature(payload) {
        return crypto
            .createHmac('sha256', this.config.hmac_secret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Get system platform information
     */
    getPlatform() {
        const platform = os.platform();
        const platformMap = {
            'win32': 'windows',
            'darwin': 'macos',
            'linux': 'linux',
            'android': 'android',
            'ios': 'ios'
        };
        return platformMap[platform] || platform;
    }

    /**
     * Get hardware specifications
     */
    getHardwareSpecs() {
        return {
            cpu: {
                cores: os.cpus().length,
                freq: os.cpus()[0]?.speed || 0,
                model: os.cpus()[0]?.model || 'Unknown'
            },
            memory: {
                total: os.totalmem(),
                available: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            platform: {
                system: os.type(),
                release: os.release(),
                arch: os.arch(),
                node_version: process.version
            }
        };
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Send crash report to the API
     */
    async sendCrashReport(error, stackTrace = null) {
        const crashData = {
            app_name: this.config.app_name,
            app_version: this.config.app_version,
            platform: this.config.platform,
            crash_timestamp: new Date().toISOString(),
            error_message: error.message || error.toString(),
            stack_trace: stackTrace || error.stack || null,
            hardware_specs: this.getHardwareSpecs(),
            user_id: this.config.user_id,
            session_id: this.config.session_id
        };

        const payload = JSON.stringify(crashData);
        const signature = this.generateHmacSignature(payload);

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-HMAC-Signature': `sha256=${signature}`,
                'X-App-Name': this.config.app_name,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        return new Promise((resolve, reject) => {
            const url = new URL(this.config.api_endpoint);
            const client = url.protocol === 'https:' ? https : http;
            
            const req = client.request(url, options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const response = JSON.parse(body);
                            resolve(response);
                        } catch (e) {
                            resolve({ success: true, raw: body });
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }

    /**
     * Store crash report locally if API fails
     */
    storeCrashLocally(error, stackTrace = null) {
        const crashData = {
            timestamp: new Date().toISOString(),
            error: error.message || error.toString(),
            stack: stackTrace || error.stack || null,
            app_name: this.config.app_name,
            app_version: this.config.app_version
        };

        // Store in memory for now (could be extended to write to file)
        if (!this.localCrashes) {
            this.localCrashes = [];
        }
        this.localCrashes.push(crashData);

        console.warn('Crash stored locally (API unavailable):', crashData);
        return crashData;
    }

    /**
     * Report a crash with automatic fallback
     */
    async reportCrash(error, stackTrace = null) {
        try {
            const result = await this.sendCrashReport(error, stackTrace);
            console.log('Crash report sent successfully:', result);
            return result;
        } catch (apiError) {
            console.warn('Failed to send crash report to API:', apiError.message);
            return this.storeCrashLocally(error, stackTrace);
        }
    }

    /**
     * Install global error handlers
     */
    installCrashHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.reportCrash(error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.reportCrash(new Error(`Unhandled Rejection: ${reason}`));
        });

        // Handle process termination
        process.on('SIGTERM', () => {
            console.log('Process terminated, sending final crash report if needed');
            // Could implement final crash report logic here
        });

        // Handle process interruption
        process.on('SIGINT', () => {
            console.log('Process interrupted, sending final crash report if needed');
            // Could implement final crash report logic here
        });
    }

    /**
     * Manually report a crash
     */
    async reportError(error, context = {}) {
        const enhancedError = {
            ...error,
            context,
            reported_at: new Date().toISOString()
        };
        return this.reportCrash(enhancedError);
    }

    /**
     * Get locally stored crashes
     */
    getLocalCrashes() {
        return this.localCrashes || [];
    }

    /**
     * Clear locally stored crashes
     */
    clearLocalCrashes() {
        this.localCrashes = [];
    }
}

/**
 * Factory function to create and install crash reporter
 */
function installCrashHandler(config) {
    if (!config.app_name || !config.app_version || !config.api_endpoint || !config.hmac_secret) {
        throw new Error('Missing required configuration: app_name, app_version, api_endpoint, hmac_secret');
    }

    const reporter = new CrashReporter(config);
    console.log(`Crash reporter installed for ${config.app_name} v${config.app_version}`);
    
    return reporter;
}

module.exports = {
    CrashReporter,
    installCrashHandler
};

