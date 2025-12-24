#!/usr/bin/env node
/**
 * RECENT DISCOVERIES & DATA COMPLETENESS CHECK
 * 
 * Shows:
 * - Recent startup discoveries
 * - VC investors found
 * - Funding rounds
 * - Valuation metrics
 * - Missing data (5-point format, etc.)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRecentDiscoveries() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🔥 HOT MATCH - RECENT DISCOVERIES & DATA STATUS        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. RECENT STARTUP DISCOVERIES
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 RECENT STARTUP DISCOVERIES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Discovered startups
    const { count: discovered24h, error: d24Error } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo);

    const { count: discovered7d, error: d7Error } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    // Approved startups
    const { count: approved24h, error: a24Error } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)
      .eq('status', 'approved');

    const { count: approved7d, error: a7Error } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo)
      .eq('status', 'approved');

    console.log(`📊 Discovery Stats:`);
    console.log(`   Last 24 hours: ${discovered24h || 0} discovered, ${approved24h || 0} approved`);
    console.log(`   Last 7 days: ${discovered7d || 0} discovered, ${approved7d || 0} approved`);

    // Recent discoveries with details
    const { data: recent, error: recentError } = await supabase
      .from('discovered_startups')
      .select('name, website, funding_amount, funding_stage, rss_source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recent && recent.length > 0) {
      console.log(`\n📋 Most Recent Discoveries (last 10):`);
      recent.forEach((s, i) => {
        const time = new Date(s.created_at).toLocaleString();
        const funding = s.funding_amount ? `💰 ${s.funding_amount}` : '';
        const stage = s.funding_stage ? `(${s.funding_stage})` : '';
        console.log(`   ${i+1}. ${s.name} ${funding} ${stage}`);
        console.log(`      Source: ${s.rss_source || 'Unknown'} | ${time}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error checking startups: ${error.message}`);
  }

  // 2. VC INVESTORS
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💼 VC INVESTORS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: investors24h, error: i24Error } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo);

    const { count: investors7d, error: i7Error } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: totalInvestors, error: totalError } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Investor Stats:`);
    console.log(`   Last 24 hours: ${investors24h || 0} added`);
    console.log(`   Last 7 days: ${investors7d || 0} added`);
    console.log(`   Total investors: ${totalInvestors || 0}`);

    // Recent investors
    const { data: recentInvestors, error: riError } = await supabase
      .from('investors')
      .select('name, type, sectors, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentInvestors && recentInvestors.length > 0) {
      console.log(`\n📋 Most Recent Investors (last 10):`);
      recentInvestors.forEach((inv, i) => {
        const time = new Date(inv.created_at).toLocaleString();
        const sectors = inv.sectors && Array.isArray(inv.sectors) ? inv.sectors.slice(0, 2).join(', ') : 'N/A';
        console.log(`   ${i+1}. ${inv.name} (${inv.type || 'VC'})`);
        console.log(`      Sectors: ${sectors} | ${time}`);
      });
    }

  } catch (error) {
    console.error(`❌ Error checking investors: ${error.message}`);
  }

  // 3. FUNDING ROUNDS & VALUATION METRICS
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💰 FUNDING ROUNDS & VALUATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Check discovered_startups for funding data
    const { data: fundingData, error: fError } = await supabase
      .from('discovered_startups')
      .select('name, funding_amount, funding_stage, investors_mentioned')
      .not('funding_amount', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fundingData && fundingData.length > 0) {
      console.log(`📊 Recent Funding Rounds (last 20):`);
      
      const stages = {};
      let totalFunding = 0;
      
      fundingData.forEach((s) => {
        const stage = s.funding_stage || 'Unknown';
        stages[stage] = (stages[stage] || 0) + 1;
        
        // Try to extract numeric value
        if (s.funding_amount) {
          const match = s.funding_amount.match(/[\d.]+/);
          if (match) {
            const num = parseFloat(match[0]);
            if (s.funding_amount.includes('M')) totalFunding += num;
            else if (s.funding_amount.includes('B')) totalFunding += num * 1000;
            else if (s.funding_amount.includes('K')) totalFunding += num / 1000;
          }
        }
      });

      console.log(`   Total funding tracked: $${totalFunding.toFixed(1)}M`);
      console.log(`\n   Stage Distribution:`);
      Object.entries(stages).forEach(([stage, count]) => {
        console.log(`      ${stage}: ${count}`);
      });

      console.log(`\n   Recent Rounds:`);
      fundingData.slice(0, 10).forEach((s, i) => {
        const investors = s.investors_mentioned && Array.isArray(s.investors_mentioned) 
          ? s.investors_mentioned.slice(0, 2).join(', ') 
          : 'N/A';
        console.log(`   ${i+1}. ${s.name}: ${s.funding_amount} (${s.funding_stage || 'N/A'})`);
        if (investors !== 'N/A') {
          console.log(`      Investors: ${investors}`);
        }
      });
    } else {
      console.log(`   ⚠️  No recent funding data found`);
    }

  } catch (error) {
    console.error(`❌ Error checking funding: ${error.message}`);
  }

  // 4. DATA COMPLETENESS - 5 POINT FORMAT
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 DATA COMPLETENESS - 5 POINT FORMAT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Check startup_uploads for 5-point format
    const { data: startups, error: sError } = await supabase
      .from('startup_uploads')
      .select('id, name, value_proposition, problem, solution, market_size, team_companies, sectors')
      .eq('status', 'approved')
      .limit(1000);

    if (sError) {
      console.log(`   ⚠️  Error querying startup_uploads: ${sError.message}`);
      console.log(`   Note: 5-point format may be in discovered_startups table`);
    }

    if (startups && startups.length > 0) {
      const withValueProp = startups.filter(s => s.value_proposition).length;
      const withProblem = startups.filter(s => s.problem).length;
      const withSolution = startups.filter(s => s.solution).length;
      const withMarketSize = startups.filter(s => s.market_size).length;
      const withTeamCompanies = startups.filter(s => s.team_companies && Array.isArray(s.team_companies) && s.team_companies.length > 0).length;
      const withSectors = startups.filter(s => s.sectors && Array.isArray(s.sectors) && s.sectors.length > 0).length;

      const total = startups.length;

      console.log(`📊 5-Point Format Completeness (${total} approved startups):`);
      console.log(`   Value Proposition: ${withValueProp} (${((withValueProp/total)*100).toFixed(1)}%)`);
      console.log(`   Problem: ${withProblem} (${((withProblem/total)*100).toFixed(1)}%)`);
      console.log(`   Solution: ${withSolution} (${((withSolution/total)*100).toFixed(1)}%)`);
      console.log(`   Market Size: ${withMarketSize} (${((withMarketSize/total)*100).toFixed(1)}%)`);
      console.log(`   Team Companies: ${withTeamCompanies} (${((withTeamCompanies/total)*100).toFixed(1)}%)`);
      console.log(`   Sectors: ${withSectors} (${((withSectors/total)*100).toFixed(1)}%)`);

      // Check discovered_startups for 5-point format
      const { data: discovered, error: dError } = await supabase
        .from('discovered_startups')
        .select('id, name, value_proposition, problem, solution, market_size, team_companies, sectors')
        .limit(500);

      if (discovered && discovered.length > 0) {
        const dWithValueProp = discovered.filter(s => s.value_proposition).length;
        const dWithProblem = discovered.filter(s => s.problem).length;
        const dWithSolution = discovered.filter(s => s.solution).length;
        const dWithMarketSize = discovered.filter(s => s.market_size).length;
        const dWithTeamCompanies = discovered.filter(s => s.team_companies && Array.isArray(s.team_companies) && s.team_companies.length > 0).length;
        const dWithSectors = discovered.filter(s => s.sectors && Array.isArray(s.sectors) && s.sectors.length > 0).length;

        const dTotal = discovered.length;

        console.log(`\n📊 Discovered Startups 5-Point Format (${dTotal} recent):`);
        console.log(`   Value Proposition: ${dWithValueProp} (${((dWithValueProp/dTotal)*100).toFixed(1)}%)`);
        console.log(`   Problem: ${dWithProblem} (${((dWithProblem/dTotal)*100).toFixed(1)}%)`);
        console.log(`   Solution: ${dWithSolution} (${((dWithSolution/dTotal)*100).toFixed(1)}%)`);
        console.log(`   Market Size: ${dWithMarketSize} (${((dWithMarketSize/dTotal)*100).toFixed(1)}%)`);
        console.log(`   Team Companies: ${dWithTeamCompanies} (${((dWithTeamCompanies/dTotal)*100).toFixed(1)}%)`);
        console.log(`   Sectors: ${dWithSectors} (${((dWithSectors/dTotal)*100).toFixed(1)}%)`);
      }

    } else {
      console.log(`   ⚠️  No startup data found`);
    }

  } catch (error) {
    console.error(`❌ Error checking data completeness: ${error.message}`);
  }

  // 5. MISSING DATA SUMMARY
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚠️  MISSING DATA SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data: allStartups, error: allError } = await supabase
      .from('startup_uploads')
      .select('id, name, website, description, tagline, pitch, sectors, location, total_god_score')
      .eq('status', 'approved')
      .limit(1000);

    if (allStartups && allStartups.length > 0) {
      const missingWebsite = allStartups.filter(s => !s.website).length;
      const missingDescription = allStartups.filter(s => !s.description).length;
      const missingTagline = allStartups.filter(s => !s.tagline).length;
      const missingPitch = allStartups.filter(s => !s.pitch).length;
      const missingSectors = allStartups.filter(s => !s.sectors || !Array.isArray(s.sectors) || s.sectors.length === 0).length;
      const missingLocation = allStartups.filter(s => !s.location).length;
      const missingGodScore = allStartups.filter(s => !s.total_god_score).length;

      const total = allStartups.length;

      console.log(`📊 Missing Data in Approved Startups (${total} total):`);
      console.log(`   Missing Website: ${missingWebsite} (${((missingWebsite/total)*100).toFixed(1)}%)`);
      console.log(`   Missing Description: ${missingDescription} (${((missingDescription/total)*100).toFixed(1)}%)`);
      console.log(`   Missing Tagline: ${missingTagline} (${((missingTagline/total)*100).toFixed(1)}%)`);
      console.log(`   Missing Pitch: ${missingPitch} (${((missingPitch/total)*100).toFixed(1)}%)`);
      console.log(`   Missing Sectors: ${missingSectors} (${((missingSectors/total)*100).toFixed(1)}%)`);
      console.log(`   Missing Location: ${missingLocation} (${((missingLocation/total)*100).toFixed(1)}%)`);
      console.log(`   Missing GOD Score: ${missingGodScore} (${((missingGodScore/total)*100).toFixed(1)}%)`);
    }

  } catch (error) {
    console.error(`❌ Error checking missing data: ${error.message}`);
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Discovery check complete\n');
}

checkRecentDiscoveries().catch(console.error);

