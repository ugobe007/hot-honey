/**
 * Test script for Match API endpoints
 * 
 * Tests the match search functionality with real data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function testMatchAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🧪 MATCH API TESTING                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get test data
    console.log('1️⃣  Getting test data...\n');
    
    const { data: startups, error: sError } = await supabase
      .from('startup_uploads')
      .select('id, name, status')
      .eq('status', 'approved')
      .limit(5);
    
    if (sError) {
      console.error('❌ Error fetching startups:', sError);
      return;
    }
    
    if (!startups || startups.length === 0) {
      console.log('⚠️  No approved startups found. Please approve some startups first.');
      return;
    }
    
    const testStartup = startups[0];
    console.log(`   ✅ Test Startup:`);
    console.log(`      ID: ${testStartup.id}`);
    console.log(`      Name: ${testStartup.name}`);
    
    // Check matches for this startup
    const { count: matchCount, error: mError } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', testStartup.id);
    
    if (mError) {
      console.error('❌ Error checking matches:', mError);
    } else {
      console.log(`      Matches: ${matchCount || 0}`);
    }
    
    // 2. Test the match search service
    console.log('\n2️⃣  Testing match search service...\n');
    
    // Use TypeScript services via dynamic import
    const startupMatchService = await import('./server/services/startupMatchSearchService.js');
    const { searchStartupMatches, getStartupMatchStats } = startupMatchService;
    
    try {
      console.log('   Testing searchStartupMatches...');
      const searchResult = await searchStartupMatches(testStartup.id, {
        limit: 10,
        showAll: false, // Test smart filtering
      });
      
      console.log(`   ✅ Search successful:`);
      console.log(`      Total matches: ${searchResult.total}`);
      console.log(`      Filtered matches: ${searchResult.filtered_total}`);
      console.log(`      Smart filter applied: ${searchResult.limit_applied ? 'Yes' : 'No'}`);
      console.log(`      Matches returned: ${searchResult.matches.length}`);
      
      if (searchResult.matches.length > 0) {
        const firstMatch = searchResult.matches[0];
        console.log(`\n   📊 Sample match:`);
        console.log(`      Match Score: ${firstMatch.match_score}`);
        console.log(`      Confidence: ${firstMatch.confidence_level}`);
        console.log(`      Investor: ${firstMatch.investor?.name || 'N/A'}`);
        console.log(`      Firm: ${firstMatch.investor?.firm || 'N/A'}`);
      }
      
    } catch (error) {
      console.error('   ❌ Error in searchStartupMatches:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    // 3. Test stats
    console.log('\n3️⃣  Testing match stats...\n');
    
    try {
      const stats = await getStartupMatchStats(testStartup.id);
      console.log(`   ✅ Stats retrieved:`);
      console.log(`      Total: ${stats.total}`);
      console.log(`      High Confidence: ${stats.highConfidence}`);
      console.log(`      Medium Confidence: ${stats.mediumConfidence}`);
      console.log(`      Low Confidence: ${stats.lowConfidence}`);
      console.log(`      Average Score: ${stats.averageScore}`);
      if (stats.topSectors.length > 0) {
        console.log(`      Top Sector: ${stats.topSectors[0].sector} (${stats.topSectors[0].count} matches)`);
      }
    } catch (error) {
      console.error('   ❌ Error in getStartupMatchStats:', error.message);
    }
    
    // 4. Test API endpoint (if server is running)
    console.log('\n4️⃣  Testing API endpoint...\n');
    console.log('   ℹ️  To test the API endpoint, make sure the server is running:');
    console.log('      npm run dev  (or node server/index.js)');
    console.log(`   Then test: GET http://localhost:3002/api/matches/startup/${testStartup.id}`);
    
    // 5. Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`✅ Test Startup ID: ${testStartup.id}`);
    console.log(`✅ Test Startup Name: ${testStartup.name}`);
    console.log(`✅ Total Matches: ${matchCount || 0}`);
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Start the server: npm run dev`);
    console.log(`   2. Navigate to: /startup/${testStartup.id}/matches`);
    console.log(`   3. Test filters and search functionality`);
    console.log(`\n`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testMatchAPI().catch(console.error);


