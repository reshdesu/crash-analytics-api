#!/usr/bin/env python3
"""
Universal Crash Reporter for Python Applications
Automatically catches and reports crashes to your crash analytics API
"""

import json
import hashlib
import hmac
import platform
import psutil
import requests
import time
import uuid
import os
from datetime import datetime
from typing import Dict, Any, Optional

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # If python-dotenv is not available, continue without it
    pass


class CrashReporter:
    def __init__(self, config: Dict[str, Any]):
        self.config = {
            'app_name': config['app_name'],
            'app_version': config['app_version'],
            'api_endpoint': config['api_endpoint'],
            'hmac_secret': config['hmac_secret'],
            'user_id': config.get('user_id'),
            'session_id': config.get('session_id', self._generate_session_id()),
            'platform': self._get_platform(),
            **config
        }
        
        self.local_crashes = []
        self._install_crash_handlers()
    
    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return f"session_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    
    def _get_platform(self) -> str:
        """Get system platform information"""
        system = platform.system().lower()
        platform_map = {
            'windows': 'windows',
            'darwin': 'macos',
            'linux': 'linux',
            'android': 'android',
            'ios': 'ios'
        }
        return platform_map.get(system, system)
    
    def _get_hardware_specs(self) -> Dict[str, Any]:
        """Get hardware specifications"""
        try:
            cpu_info = {
                'cores': psutil.cpu_count(),
                'freq': psutil.cpu_freq().current if psutil.cpu_freq() else 0,
                'model': platform.processor() or 'Unknown'
            }
        except:
            cpu_info = {'cores': 0, 'freq': 0, 'model': 'Unknown'}
        
        try:
            memory_info = {
                'total': psutil.virtual_memory().total,
                'available': psutil.virtual_memory().available,
                'used': psutil.virtual_memory().used
            }
        except:
            memory_info = {'total': 0, 'available': 0, 'used': 0}
        
        platform_info = {
            'system': platform.system(),
            'release': platform.release(),
            'arch': platform.architecture()[0],
            'python_version': platform.python_version()
        }
        
        return {
            'cpu': cpu_info,
            'memory': memory_info,
            'platform': platform_info
        }
    
    def _generate_hmac_signature(self, payload: str) -> str:
        """Generate HMAC signature for request authentication"""
        return hmac.new(
            self.config['hmac_secret'].encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def send_crash_report(self, error: Exception, stack_trace: Optional[str] = None) -> Dict[str, Any]:
        """Send crash report to the API"""
        crash_data = {
            'app_name': self.config['app_name'],
            'app_version': self.config['app_version'],
            'platform': self.config['platform'],
            'crash_timestamp': datetime.utcnow().isoformat() + 'Z',
            'error_message': str(error),
            'stack_trace': stack_trace or str(error.__traceback__),
            'hardware_specs': self._get_hardware_specs(),
            'user_id': self.config['user_id'],
            'session_id': self.config['session_id']
        }
        
        payload = json.dumps(crash_data)
        signature = self._generate_hmac_signature(payload)
        
        headers = {
            'Content-Type': 'application/json',
            'X-HMAC-Signature': f'sha256={signature}',
            'X-App-Name': self.config['app_name']
        }
        
        try:
            response = requests.post(
                self.config['api_endpoint'],
                data=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise requests.RequestException(f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            raise Exception(f"Failed to send crash report: {str(e)}")
    
    def store_crash_locally(self, error: Exception, stack_trace: Optional[str] = None) -> Dict[str, Any]:
        """Store crash report locally if API fails"""
        crash_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'error': str(error),
            'stack': stack_trace or str(error.__traceback__),
            'app_name': self.config['app_name'],
            'app_version': self.config['app_version']
        }
        
        self.local_crashes.append(crash_data)
        print(f"Warning: Crash stored locally (API unavailable): {crash_data}")
        return crash_data
    
    def report_crash(self, error: Exception, stack_trace: Optional[str] = None) -> Dict[str, Any]:
        """Report a crash with automatic fallback"""
        try:
            result = self.send_crash_report(error, stack_trace)
            print(f"Crash report sent successfully: {result}")
            return result
        except Exception as api_error:
            print(f"Warning: Failed to send crash report to API: {str(api_error)}")
            return self.store_crash_locally(error, stack_trace)
    
    def report_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Manually report an error with context"""
        enhanced_error = Exception(f"{str(error)} | Context: {context or {}}")
        return self.report_crash(enhanced_error)
    
    def _install_crash_handlers(self):
        """Install global error handlers"""
        import sys
        
        def handle_exception(exc_type, exc_value, exc_traceback):
            if issubclass(exc_type, KeyboardInterrupt):
                # Don't report keyboard interrupts
                sys.__excepthook__(exc_type, exc_value, exc_traceback)
                return
            
            print(f"Uncaught Exception: {exc_value}")
            self.report_crash(exc_value, str(exc_traceback))
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
        
        sys.excepthook = handle_exception
    
    def get_local_crashes(self) -> list:
        """Get locally stored crashes"""
        return self.local_crashes.copy()
    
    def clear_local_crashes(self):
        """Clear locally stored crashes"""
        self.local_crashes.clear()


def install_crash_handler(config: Dict[str, Any]) -> CrashReporter:
    """Factory function to create and install crash reporter"""
    required_fields = ['app_name', 'app_version', 'api_endpoint', 'hmac_secret']
    
    for field in required_fields:
        if field not in config:
            raise ValueError(f"Missing required configuration: {field}")
    
    reporter = CrashReporter(config)
    print(f"Crash reporter installed for {config['app_name']} v{config['app_version']}")
    
    return reporter


# Example usage
if __name__ == "__main__":
    import os
    
    # Example configuration - use environment variables for secrets
    config = {
        'app_name': 'test-python-app',
        'app_version': 'v1.0.0',
        'api_endpoint': os.getenv('API_ENDPOINT', 'http://localhost:8787'),
        'hmac_secret': os.getenv('HMAC_SECRET', 'test-hmac-secret-for-local-development-only'),
        'user_id': 'example-user-123'
    }
    
    try:
        reporter = install_crash_handler(config)
        
        # Test manual error reporting
        test_error = Exception("Test Python error: Something went wrong in test-python-app")
        result = reporter.report_error(test_error, {'test_context': 'manual_error_test'})
        
        print(f"Test completed: {result}")
        
    except Exception as e:
        print(f"Setup failed: {e}")

