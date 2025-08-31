"""
Universal Crash Analytics API - Crash Reader Client
Read crash reports for analysis and improvement
"""

import os
import hmac
import hashlib
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class CrashReader:
    def __init__(self, config: Optional[Dict[str, str]] = None):
        """
        Initialize the crash reader client
        
        Args:
            config: Configuration dictionary with apiEndpoint, hmacSecret, appName, appVersion
        """
        if config is None:
            config = {}
            
        self.api_endpoint = config.get('apiEndpoint') or os.getenv('API_ENDPOINT')
        self.hmac_secret = config.get('hmacSecret') or os.getenv('HMAC_SECRET')
        self.app_name = config.get('appName')
        self.app_version = config.get('appVersion')
        
        if not self.api_endpoint or not self.hmac_secret:
            raise ValueError('API_ENDPOINT and HMAC_SECRET are required')
        
        if not self.app_name:
            raise ValueError('appName is required')

    def generate_read_signature(self) -> str:
        """Generate HMAC signature for read requests"""
        return hmac.new(
            self.hmac_secret.encode('utf-8'),
            'read'.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def read_crash_reports(self, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Read crash reports with optional filtering
        
        Args:
            options: Query options dictionary
                - limit: Number of reports to fetch (1-100, default: 50)
                - offset: Pagination offset (default: 0)
                - days: Number of days to look back (1-365, default: 30)
                - version: Filter by app version (optional)
                
        Returns:
            Dictionary containing crash reports data
        """
        if options is None:
            options = {}
            
        limit = options.get('limit', 50)
        offset = options.get('offset', 0)
        days = options.get('days', 30)
        version = options.get('version', self.app_version)

        # Build query string
        params = {}
        if limit != 50:
            params['limit'] = str(limit)
        if offset != 0:
            params['offset'] = str(offset)
        if days != 30:
            params['days'] = str(days)
        if version:
            params['version'] = version

        signature = self.generate_read_signature()
        
        headers = {
            'Content-Type': 'application/json',
            'X-HMAC-Signature': f'sha256={signature}',
            'X-App-Name': self.app_name,
            'X-App-Version': self.app_version or ''
        }

        try:
            response = requests.get(
                self.api_endpoint,
                params=params,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f'Failed to read crash reports: {str(e)}')

    def get_crash_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get crash statistics for the app
        
        Args:
            days: Number of days to analyze (default: 30)
            
        Returns:
            Dictionary containing crash statistics
        """
        reports = self.read_crash_reports({'days': days, 'limit': 100})
        
        if not reports.get('success') or not reports.get('data'):
            raise Exception('Failed to fetch crash reports for statistics')

        crash_data = reports['data']
        
        # Calculate statistics
        stats = {
            'total_crashes': len(crash_data),
            'unique_users': len(set(r.get('user_id') for r in crash_data if r.get('user_id'))),
            'unique_sessions': len(set(r.get('session_id') for r in crash_data if r.get('session_id'))),
            'platforms': {},
            'versions': {},
            'top_errors': {},
            'time_distribution': {
                'last_24h': 0,
                'last_7d': 0,
                'last_30d': 0
            }
        }

        now = datetime.now(timezone.utc)
        one_day_ago = now - timedelta(days=1)
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        for report in crash_data:
            crash_time = datetime.fromisoformat(report['crash_timestamp'].replace('Z', '+00:00'))
            
            # Platform stats
            platform = report.get('platform', 'unknown')
            stats['platforms'][platform] = stats['platforms'].get(platform, 0) + 1
            
            # Version stats
            version = report.get('app_version', 'unknown')
            stats['versions'][version] = stats['versions'].get(version, 0) + 1
            
            # Error stats
            error = report.get('error_message', 'unknown')
            stats['top_errors'][error] = stats['top_errors'].get(error, 0) + 1
            
            # Time distribution
            if crash_time >= one_day_ago:
                stats['time_distribution']['last_24h'] += 1
            if crash_time >= seven_days_ago:
                stats['time_distribution']['last_7d'] += 1
            if crash_time >= thirty_days_ago:
                stats['time_distribution']['last_30d'] += 1

        # Sort top errors
        sorted_errors = sorted(stats['top_errors'].items(), key=lambda x: x[1], reverse=True)
        stats['top_errors'] = dict(sorted_errors[:10])

        return stats

    def get_recent_crashes(self, hours: int = 24) -> List[Dict[str, Any]]:
        """
        Get recent crashes for monitoring
        
        Args:
            hours: Hours to look back (default: 24)
            
        Returns:
            List of recent crash reports
        """
        days = max(1, hours // 24)
        reports = self.read_crash_reports({'days': days, 'limit': 100})
        
        if not reports.get('success'):
            raise Exception('Failed to fetch recent crashes')

        return reports.get('data', [])

    def get_crashes_by_error(self, error_message: str, days: int = 30) -> List[Dict[str, Any]]:
        """
        Get crashes by error message
        
        Args:
            error_message: Error message to search for
            days: Days to look back (default: 30)
            
        Returns:
            List of matching crash reports
        """
        reports = self.read_crash_reports({'days': days, 'limit': 100})
        
        if not reports.get('success'):
            raise Exception('Failed to fetch crashes')

        crash_data = reports.get('data', [])
        error_lower = error_message.lower()
        
        return [
            report for report in crash_data
            if report.get('error_message') and 
            error_lower in report['error_message'].lower()
        ]


# Example usage
if __name__ == '__main__':
    # Initialize the crash reader
    reader = CrashReader({
        'appName': 'test-python-app',
        'appVersion': 'v1.0.0'
    })
    
    try:
        # Get recent crashes
        print("📊 Recent crashes (last 24 hours):")
        recent_crashes = reader.get_recent_crashes(24)
        print(f"Found {len(recent_crashes)} recent crashes")
        
        # Get crash statistics
        print("\n📈 Crash statistics (last 30 days):")
        stats = reader.get_crash_stats(30)
        print(f"Total crashes: {stats['total_crashes']}")
        print(f"Unique users affected: {stats['unique_users']}")
        print(f"Top platforms: {stats['platforms']}")
        print(f"Top errors: {list(stats['top_errors'].keys())[:3]}")
        
        # Get crashes by specific error
        print("\n🔍 Searching for specific errors:")
        error_crashes = reader.get_crashes_by_error("Test crash", 7)
        print(f"Found {len(error_crashes)} crashes with 'Test crash' in the last 7 days")
        
    except Exception as e:
        print(f"❌ Error: {e}")
