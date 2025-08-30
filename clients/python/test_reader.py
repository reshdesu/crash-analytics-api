#!/usr/bin/env python3
"""
Universal Crash Analytics API - Crash Reader Test
Test the crash reading functionality
"""

import sys
import os
from crash_reader import CrashReader

def test_crash_reader():
    """Test the crash reader functionality"""
    print("🧪 Testing Crash Reader Functionality")
    print("=====================================")
    
    # Initialize the crash reader
    reader = CrashReader({
        'appName': 'test-python-app',
        'appVersion': 'v1.0.0'
    })
    
    try:
        # Test 1: Read recent crashes
        print("\n📊 Test 1: Reading recent crashes (last 24 hours)")
        recent_crashes = reader.get_recent_crashes(24)
        print(f"✅ Found {len(recent_crashes)} recent crashes")
        
        if recent_crashes:
            print("📋 Sample crash report:")
            import json
            print(json.dumps(recent_crashes[0], indent=2))
        
        # Test 2: Get crash statistics
        print("\n📈 Test 2: Getting crash statistics (last 30 days)")
        stats = reader.get_crash_stats(30)
        print("✅ Crash statistics retrieved successfully")
        print(f"📊 Total crashes: {stats['total_crashes']}")
        print(f"👥 Unique users affected: {stats['unique_users']}")
        print(f"🖥️  Platforms: {stats['platforms']}")
        print(f"📱 Versions: {stats['versions']}")
        print(f"⚠️  Top errors: {list(stats['top_errors'].keys())[:3]}")
        print(f"⏰ Time distribution: {stats['time_distribution']}")
        
        # Test 3: Search for specific errors
        print("\n🔍 Test 3: Searching for specific errors")
        error_crashes = reader.get_crashes_by_error("Test crash", 7)
        print(f"✅ Found {len(error_crashes)} crashes with 'Test crash' in the last 7 days")
        
        # Test 4: Read with pagination
        print("\n📄 Test 4: Testing pagination")
        paginated_reports = reader.read_crash_reports({
            'limit': 5,
            'offset': 0,
            'days': 30
        })
        print(f"✅ Retrieved {len(paginated_reports['data'])} reports")
        print(f"📊 Pagination info: {paginated_reports['pagination']}")
        
        # Test 5: Filter by version
        print("\n🔧 Test 5: Filtering by version")
        version_reports = reader.read_crash_reports({
            'version': 'v1.0.0',
            'days': 30
        })
        print(f"✅ Found {len(version_reports['data'])} crashes for version v1.0.0")
        
        print("\n🎉 All crash reader tests completed successfully!")
        print("📚 Your crash reading functionality is working correctly")
        
    except Exception as e:
        print(f"❌ Crash reader test failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    test_crash_reader()
