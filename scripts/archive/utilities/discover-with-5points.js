/**
 * 🔥 HOT MONEY STARTUP DISCOVERY WITH 5-POINT FORMAT
 * 
 * This script:
 * 1. Scrapes RSS feeds for startup news
 * 2. Extracts 5-point format data using AI
 * 3. Scores startups with GOD algorithm
 * 4. Saves to database for matching
 * 
 * Usage: node discover-with-5points.js
 */

const { config } = require('dotenv');
const { StartupDiscoveryService } = require('./server/services/startupDiscoveryService.ts');
const { calculateHotScore } = require('./server/services/startupScoringService.ts');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('🔥 HOT MONEY STARTUP DISCOVERY WITH 5-POINT FORMAT');
  console.log('=' .repeat(60));
  console.log('\n📡 Phase 1: Scraping RSS feeds with AI extraction...\n');

  const discoveryService = new StartupDiscoveryService();
  
  try {
    // Discover startups from RSS feeds (now includes 5-point data)
    const startups = await discoveryService.discoverStartupsFromRSS();
    
    if (startups.length === 0) {
      console.log('\n⚠️  No new startups found');
      return;
    }

    console.log(`\n✅ Discovered ${startups.length} startups with 5-point format`);
    
    // Phase 2: Score each startup with GOD algorithm
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Phase 2: Scoring with GOD algorithm...\n');
    
    for (const startup of startups) {
      console.log(`\n📊 Scoring: ${startup.name}`);
      console.log('-'.repeat(40));
      
      // Map discovered startup to profile format
      const profile = {
        // Basic info
        tagline: startup.value_proposition || startup.description,
        pitch: startup.description,
        industries: startup.sectors || [],
        
        // 🔥 HOT MONEY 5-POINT FORMAT
        value_proposition: startup.value_proposition,
        problem: startup.problem,
        solution: startup.solution,
        market_size: startup.market_size,
        
        // Team
        team: startup.team_companies ? startup.team_companies.map(company => ({
          name: 'Team Member',
          role: 'Unknown',
          previousCompanies: [company]
        })) : [],
        
        // Funding
        funding_needed: startup.funding_amount,
        stage: startup.funding_stage === 'Seed' ? 1 : 
               startup.funding_stage === 'Series A' ? 2 :
               startup.funding_stage === 'Series B' ? 3 : 1,
        
        // Inferred data
        launched: true, // If they have funding news, likely launched
      };
      
      // Calculate GOD score
      const score = calculateHotScore(profile);
      
      console.log(`   🎯 GOD Score: ${score.total.toFixed(1)}/10 (${score.tier.toUpperCase()})`);
      console.log(`   📈 Breakdown:`);
      console.log(`      Team: ${score.breakdown.team}/3`);
      console.log(`      Traction: ${score.breakdown.traction}/3`);
      console.log(`      Market: ${score.breakdown.market}/2`);
      console.log(`      Product: ${score.breakdown.product}/2`);
      console.log(`      Vision: ${score.breakdown.vision}/2`);
      console.log(`      Problem Validation: ${score.breakdown.problem_validation}/2`);
      
      // Show 5-point data
      console.log(`   🔥 5-Point Format:`);
      if (startup.value_proposition) console.log(`      1️⃣  Value Prop: ${startup.value_proposition.substring(0, 60)}...`);
      if (startup.problem) console.log(`      2️⃣  Problem: ${startup.problem.substring(0, 60)}...`);
      if (startup.solution) console.log(`      3️⃣  Solution: ${startup.solution.substring(0, 60)}...`);
      if (startup.market_size) console.log(`      4️⃣  Market: ${startup.market_size}`);
      if (startup.team_companies && startup.team_companies.length > 0) {
        console.log(`      5️⃣  Team: ${startup.team_companies.join(', ')}`);
      }
      
      // Update discovered_startup with GOD score
      const { error } = await supabase
        .from('discovered_startups')
        .update({
          god_score: Math.round(score.total * 10), // Store as 0-100
          god_score_breakdown: score.breakdown,
          god_score_reasoning: score.reasoning
        })
        .eq('name', startup.name);
      
      if (error) {
        console.error(`   ❌ Error updating score: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Discovery and scoring complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Total startups: ${startups.length}`);
    console.log(`   All scored with GOD algorithm`);
    console.log(`   All have 5-point format data`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review startups in Admin Dashboard');
    console.log('   2. Approve high-scoring startups');
    console.log('   3. Run matching engine to connect with investors');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
