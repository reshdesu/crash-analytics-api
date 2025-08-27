"""
Universal Crash Reporter - Python Client
For integration with any Python application
"""

import json
import hashlib
import hmac
import time
import platform
import psutil
import requests
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import logging

class CrashReporter:
    """
    Universal crash reporter client with database-first, local fallback approach.
    Always-on crash reporting with maximum security.
    """
    
    def __init__(self, 
                 app_name: str,
                 app_version: str,
                 api_endpoint: str,
                 hmac_secret: str,
                 local_storage_path: Optional[str] = None,
                 timeout: int = 10):
        """
        Initialize crash reporter.
        
        Args:
            app_name: Name of your application (e.g., 'oopsie-daisy')
            app_version: Version string (e.g., 'v1.2.3')
            api_endpoint: Your Cloudflare Worker URL
            hmac_secret: HMAC signing secret (same as in worker)
            local_storage_path: Path for local crash storage (fallback)
            timeout: HTTP request timeout in seconds
        """
        self.app_name = app_name
        self.app_version = app_version
        self.api_endpoint = api_endpoint
        self.hmac_secret = hmac_secret
        self.local_storage_path = local_storage_path or os.path.join(
            os.path.expanduser("~"), f".{app_name}_crashes"
        )
        self.timeout = timeout
        
        # Ensure local storage directory exists
        os.makedirs(os.path.dirname(self.local_storage_path), exist_ok=True)
        
        # Setup logging
        self.logger = logging.getLogger(f"{app_name}.crash_reporter")
    
    def report_crash(self, 
                    error: Exception,
                    user_id: Optional[str] = None,
                    session_id: Optional[str] = None,
                    additional_context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Report a crash with full system information.
        
        Args:
            error: The exception that caused the crash
            user_id: Optional anonymous user identifier
            session_id: Optional session identifier
            additional_context: Extra context data
            
        Returns:
            bool: True if successfully reported to API, False if stored locally
        """
        crash_data = self._build_crash_data(error, user_id, session_id, additional_context)
        
        # Try API first (database-first approach)
        if self._send_to_api(crash_data):
            self.logger.info(f"Crash reported to API for {self.app_name}")
            return True
        
        # Fallback to local storage
        self._store_locally(crash_data)
        self.logger.warning(f"Crash stored locally for {self.app_name} (API unavailable)")
        return False
    
    def _build_crash_data(self, 
                         error: Exception,
                         user_id: Optional[str],
                         session_id: Optional[str],
                         additional_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Build comprehensive crash data."""
        import traceback
        
        # Get hardware specs
        hardware_specs = self._get_hardware_specs()
        if additional_context:
            hardware_specs.update(additional_context)
        
        return {
            "app_name": self.app_name,
            "app_version": self.app_version,
            "platform": self._get_platform(),
            "crash_timestamp": datetime.now(timezone.utc).isoformat(),
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
            "hardware_specs": hardware_specs,
            "user_id": user_id,
            "session_id": session_id
        }
    
    def _get_platform(self) -> str:
        """Get standardized platform name."""
        system = platform.system().lower()
        if system == "darwin":
            return "macos"
        return system
    
    def _get_hardware_specs(self) -> Dict[str, Any]:
        """Collect comprehensive hardware and system information."""
        try:
            # CPU information
            cpu_info = {
                "cpu_count": psutil.cpu_count(),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "cpu_freq_max": psutil.cpu_freq().max if psutil.cpu_freq() else None,
                "cpu_percent": psutil.cpu_percent(interval=1)
            }
            
            # Memory information
            memory = psutil.virtual_memory()
            memory_info = {
                "total_memory": memory.total,
                "available_memory": memory.available,
                "memory_percent": memory.percent
            }
            
            # Disk information
            disk = psutil.disk_usage('/')
            disk_info = {
                "disk_total": disk.total,
                "disk_free": disk.free,
                "disk_percent": (disk.used / disk.total) * 100
            }
            
            # Platform details
            platform_info = {
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor(),
                "python_version": platform.python_version()
            }
            
            return {
                "cpu": cpu_info,
                "memory": memory_info,
                "disk": disk_info,
                "platform": platform_info,
                "collection_timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            self.logger.warning(f"Failed to collect hardware specs: {e}")
            return {
                "error": f"Failed to collect specs: {str(e)}",
                "basic_platform": platform.system()
            }
    
    def _send_to_api(self, crash_data: Dict[str, Any]) -> bool:
        """Send crash data to API with HMAC authentication."""
        try:
            # Serialize data
            payload = json.dumps(crash_data, separators=(',', ':'))
            
            # Generate HMAC signature
            signature = self._generate_hmac(payload)
            
            # Send request
            response = requests.post(
                self.api_endpoint,
                data=payload,
                headers={
                    'Content-Type': 'application/json',
                    'X-HMAC-Signature': f'sha256={signature}',
                    'X-App-Name': self.app_name
                },
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                return True
            elif response.status_code == 429:
                self.logger.warning("Rate limited by crash API")
            else:
                self.logger.error(f"API returned {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Failed to send crash data to API: {e}")
        except Exception as e:
            self.logger.error(f"Unexpected error sending crash data: {e}")
            
        return False
    
    def _generate_hmac(self, payload: str) -> str:
        """Generate HMAC signature for payload."""
        return hmac.new(
            self.hmac_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    def _store_locally(self, crash_data: Dict[str, Any]) -> None:
        """Store crash data locally as fallback."""
        try:
            timestamp = int(time.time())
            filename = f"crash_{timestamp}_{self.app_name}.json"
            filepath = os.path.join(self.local_storage_path, filename)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(crash_data, f, indent=2, ensure_ascii=False)
                
            self.logger.info(f"Crash data stored locally: {filepath}")
            
        except Exception as e:
            self.logger.error(f"Failed to store crash data locally: {e}")
    
    def get_local_crashes(self) -> list:
        """Get all locally stored crash reports."""
        crashes = []
        try:
            if os.path.exists(self.local_storage_path):
                for filename in os.listdir(self.local_storage_path):
                    if filename.endswith('.json') and filename.startswith('crash_'):
                        filepath = os.path.join(self.local_storage_path, filename)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            crashes.append(json.load(f))
        except Exception as e:
            self.logger.error(f"Failed to read local crashes: {e}")
        
        return crashes
    
    def retry_local_crashes(self) -> int:
        """Retry sending locally stored crashes to API."""
        if not os.path.exists(self.local_storage_path):
            return 0
            
        sent_count = 0
        try:
            for filename in os.listdir(self.local_storage_path):
                if filename.endswith('.json') and filename.startswith('crash_'):
                    filepath = os.path.join(self.local_storage_path, filename)
                    
                    with open(filepath, 'r', encoding='utf-8') as f:
                        crash_data = json.load(f)
                    
                    if self._send_to_api(crash_data):
                        os.remove(filepath)  # Remove successfully sent crash
                        sent_count += 1
                        self.logger.info(f"Retried and sent local crash: {filename}")
                        
        except Exception as e:
            self.logger.error(f"Failed to retry local crashes: {e}")
            
        return sent_count


def install_crash_handler(app_name: str,
                         app_version: str,
                         api_endpoint: str,
                         hmac_secret: str,
                         user_id: Optional[str] = None) -> CrashReporter:
    """
    Install global crash handler for unhandled exceptions.
    
    Args:
        app_name: Name of your application
        app_version: Version string
        api_endpoint: Your Cloudflare Worker URL  
        hmac_secret: HMAC signing secret
        user_id: Optional user identifier
        
    Returns:
        CrashReporter: Instance for manual crash reporting
    """
    import sys
    import atexit
    import threading
    
    reporter = CrashReporter(app_name, app_version, api_endpoint, hmac_secret)
    
    # Store original exception handler
    original_excepthook = sys.excepthook
    
    def crash_handler(exc_type, exc_value, exc_traceback):
        """Handle unhandled exceptions."""
        # Don't report KeyboardInterrupt
        if issubclass(exc_type, KeyboardInterrupt):
            original_excepthook(exc_type, exc_value, exc_traceback)
            return
            
        # Report the crash
        try:
            # Create a fake exception for consistent interface
            class CrashException(Exception):
                pass
            
            crash_exception = CrashException(f"{exc_type.__name__}: {exc_value}")
            crash_exception.__traceback__ = exc_traceback
            
            # Generate session ID if not provided
            session_id = f"session_{int(time.time())}"
            
            # Report in separate thread to avoid blocking shutdown
            def report_async():
                try:
                    reporter.report_crash(crash_exception, user_id, session_id)
                except:
                    pass  # Don't let crash reporting crash the crash handler
            
            thread = threading.Thread(target=report_async, daemon=True)
            thread.start()
            thread.join(timeout=5)  # Wait max 5 seconds
            
        except:
            pass  # Silently fail to avoid recursive crashes
        
        # Call original handler
        original_excepthook(exc_type, exc_value, exc_traceback)
    
    # Install the crash handler
    sys.excepthook = crash_handler
    
    # Try to send any pending local crashes on startup
    def retry_on_exit():
        try:
            reporter.retry_local_crashes()
        except:
            pass
    
    atexit.register(retry_on_exit)
    
    return reporter