/**
 * Universal Crash Analytics API - Crash Reader Client
 * Read crash reports for analysis and improvement
 */

const crypto = require('crypto');

class CrashReader {
  constructor(config = {}) {
    this.apiEndpoint = config.apiEndpoint || process.env.API_ENDPOINT;
    this.hmacSecret = config.hmacSecret || process.env.HMAC_SECRET;
    this.appName = config.appName;
    this.appVersion = config.appVersion;
    
    if (!this.apiEndpoint || !this.hmacSecret) {
      throw new Error('API_ENDPOINT and HMAC_SECRET are required');
    }
    
    if (!this.appName) {
      throw new Error('appName is required');
    }
  }

  /**
   * Generate HMAC signature for read requests
   */
  generateReadSignature() {
    return crypto
      .createHmac('sha256', this.hmacSecret)
      .update('read')
      .digest('hex');
  }

  /**
   * Read crash reports with optional filtering
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of reports to fetch (1-100, default: 50)
   * @param {number} options.offset - Pagination offset (default: 0)
   * @param {number} options.days - Number of days to look back (1-365, default: 30)
   * @param {string} options.version - Filter by app version (optional)
   * @returns {Promise<Object>} Crash reports data
   */
  async readCrashReports(options = {}) {
    const {
      limit = 50,
      offset = 0,
      days = 30,
      version = this.appVersion
    } = options;

    // Build query string
    const params = new URLSearchParams();
    if (limit !== 50) params.append('limit', limit.toString());
    if (offset !== 0) params.append('offset', offset.toString());
    if (days !== 30) params.append('days', days.toString());
    if (version) params.append('version', version);

    const queryString = params.toString();
    const url = `${this.apiEndpoint}${queryString ? '?' + queryString : ''}`;

    const signature = this.generateReadSignature();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-HMAC-Signature': `sha256=${signature}`,
          'X-App-Name': this.appName,
          'X-App-Version': this.appVersion || ''
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to read crash reports: ${error.message}`);
    }
  }

  /**
   * Get crash statistics for the app
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} Crash statistics
   */
  async getCrashStats(days = 30) {
    const reports = await this.readCrashReports({ days, limit: 100 });
    
    if (!reports.success || !reports.data) {
      throw new Error('Failed to fetch crash reports for statistics');
    }

    const crashData = reports.data;
    
    // Calculate statistics
    const stats = {
      total_crashes: crashData.length,
      unique_users: new Set(crashData.map(r => r.user_id).filter(Boolean)).size,
      unique_sessions: new Set(crashData.map(r => r.session_id).filter(Boolean)).size,
      platforms: {},
      versions: {},
      top_errors: {},
      time_distribution: {
        last_24h: 0,
        last_7d: 0,
        last_30d: 0
      }
    };

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    crashData.forEach(report => {
      const crashTime = new Date(report.crash_timestamp);
      
      // Platform stats
      const platform = report.platform || 'unknown';
      stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
      
      // Version stats
      const version = report.app_version || 'unknown';
      stats.versions[version] = (stats.versions[version] || 0) + 1;
      
      // Error stats
      const error = report.error_message || 'unknown';
      stats.top_errors[error] = (stats.top_errors[error] || 0) + 1;
      
      // Time distribution
      if (crashTime >= oneDayAgo) stats.time_distribution.last_24h++;
      if (crashTime >= sevenDaysAgo) stats.time_distribution.last_7d++;
      if (crashTime >= thirtyDaysAgo) stats.time_distribution.last_30d++;
    });

    // Sort top errors
    stats.top_errors = Object.entries(stats.top_errors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    return stats;
  }

  /**
   * Get recent crashes for monitoring
   * @param {number} hours - Hours to look back (default: 24)
   * @returns {Promise<Array>} Recent crash reports
   */
  async getRecentCrashes(hours = 24) {
    const days = Math.ceil(hours / 24);
    const reports = await this.readCrashReports({ days, limit: 100 });
    
    if (!reports.success) {
      throw new Error('Failed to fetch recent crashes');
    }

    return reports.data || [];
  }

  /**
   * Get crashes by error message
   * @param {string} errorMessage - Error message to search for
   * @param {number} days - Days to look back (default: 30)
   * @returns {Promise<Array>} Matching crash reports
   */
  async getCrashesByError(errorMessage, days = 30) {
    const reports = await this.readCrashReports({ days, limit: 100 });
    
    if (!reports.success) {
      throw new Error('Failed to fetch crashes');
    }

    return (reports.data || []).filter(report => 
      report.error_message && 
      report.error_message.toLowerCase().includes(errorMessage.toLowerCase())
    );
  }
}

module.exports = CrashReader;
