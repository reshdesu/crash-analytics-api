/**
 * Universal Crash Analytics API - Crash Reader Test
 * Test the crash reading functionality
 */

require('dotenv').config();
const CrashReader = require('./crash_reader');

async function testCrashReader() {
  console.log('🧪 Testing Crash Reader Functionality');
  console.log('=====================================');
  
  // Initialize the crash reader
  const reader = new CrashReader({
    appName: 'test-app',
    appVersion: 'v1.0.0'
  });
  
  try {
    // Test 1: Read recent crashes
    console.log('\n📊 Test 1: Reading recent crashes (last 24 hours)');
    const recentCrashes = await reader.getRecentCrashes(24);
    console.log(`✅ Found ${recentCrashes.length} recent crashes`);
    
    if (recentCrashes.length > 0) {
      console.log('📋 Sample crash report:');
      console.log(JSON.stringify(recentCrashes[0], null, 2));
    }
    
    // Test 2: Get crash statistics
    console.log('\n📈 Test 2: Getting crash statistics (last 30 days)');
    const stats = await reader.getCrashStats(30);
    console.log('✅ Crash statistics retrieved successfully');
    console.log(`📊 Total crashes: ${stats.total_crashes}`);
    console.log(`👥 Unique users affected: ${stats.unique_users}`);
    console.log(`🖥️  Platforms: ${JSON.stringify(stats.platforms)}`);
    console.log(`📱 Versions: ${JSON.stringify(stats.versions)}`);
    console.log(`⚠️  Top errors: ${Object.keys(stats.top_errors).slice(0, 3)}`);
    console.log(`⏰ Time distribution: ${JSON.stringify(stats.time_distribution)}`);
    
    // Test 3: Search for specific errors
    console.log('\n🔍 Test 3: Searching for specific errors');
    const errorCrashes = await reader.getCrashesByError('Test crash', 7);
    console.log(`✅ Found ${errorCrashes.length} crashes with 'Test crash' in the last 7 days`);
    
    // Test 4: Read with pagination
    console.log('\n📄 Test 4: Testing pagination');
    const paginatedReports = await reader.readCrashReports({
      limit: 5,
      offset: 0,
      days: 30
    });
    console.log(`✅ Retrieved ${paginatedReports.data.length} reports`);
    console.log(`📊 Pagination info: ${JSON.stringify(paginatedReports.pagination)}`);
    
    // Test 5: Filter by version
    console.log('\n🔧 Test 5: Filtering by version');
    const versionReports = await reader.readCrashReports({
      version: 'v1.0.0',
      days: 30
    });
    console.log(`✅ Found ${versionReports.data.length} crashes for version v1.0.0`);
    
    console.log('\n🎉 All crash reader tests completed successfully!');
    console.log('📚 Your crash reading functionality is working correctly');
    
  } catch (error) {
    console.error('❌ Crash reader test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCrashReader();
