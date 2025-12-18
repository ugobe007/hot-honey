#!/usr/bin/env node
/**
 * SUPER SCRAPER - High Volume Startup & VC Discovery
 * 
 * Goal: Discover HUNDREDS of startups and investors daily
 * 
 * Sources:
 * - Startup databases (YC, Crunchbase, AngelList, ProductHunt)
 * - VC firm websites (team pages)
 * - Funding news (TechCrunch, VentureBeat, etc.)
 * - Accelerator portfolios
 * - Angel networks
 * 
 * Run: node super-scraper.js
 * Or with PM2: pm2 start super-scraper.js --name "super-scraper"
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// 📚 DATA SOURCES - The more sources, the more startups/investors we find
// ═══════════════════════════════════════════════════════════════════════════

const STARTUP_SOURCES = [
  // Y Combinator (thousands of startups)
  { name: 'YC Companies', url: 'https://www.ycombinator.com/companies', type: 'startups' },
  { name: 'YC W24', url: 'https://www.ycombinator.com/companies?batch=W24', type: 'startups' },
  { name: 'YC S24', url: 'https://www.ycombinator.com/companies?batch=S24', type: 'startups' },
  { name: 'YC W23', url: 'https://www.ycombinator.com/companies?batch=W23', type: 'startups' },
  
  // Product Hunt (new products daily)
  { name: 'PH Today', url: 'https://www.producthunt.com/', type: 'startups' },
  { name: 'PH AI Tools', url: 'https://www.producthunt.com/topics/artificial-intelligence', type: 'startups' },
  { name: 'PH Developer', url: 'https://www.producthunt.com/topics/developer-tools', type: 'startups' },
  { name: 'PH Fintech', url: 'https://www.producthunt.com/topics/fintech', type: 'startups' },
  { name: 'PH SaaS', url: 'https://www.producthunt.com/topics/software-as-a-service-saas', type: 'startups' },
  
  // AngelList/Wellfound
  { name: 'Wellfound Startups', url: 'https://wellfound.com/discover/startups', type: 'startups' },
  { name: 'Wellfound Trending', url: 'https://wellfound.com/trending', type: 'startups' },
  
  // Crunchbase
  { name: 'CB Trending', url: 'https://www.crunchbase.com/discover/organization.companies/trending', type: 'startups' },
  { name: 'CB Recently Funded', url: 'https://www.crunchbase.com/discover/funding_rounds', type: 'startups' },
  
  // Tech News (funding announcements)
  { name: 'TC Startups', url: 'https://techcrunch.com/category/startups/', type: 'startups' },
  { name: 'TC Funding', url: 'https://techcrunch.com/tag/funding/', type: 'startups' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/category/business/', type: 'startups' },
  
  // Accelerator Portfolios
  { name: 'Techstars', url: 'https://www.techstars.com/portfolio', type: 'startups' },
  { name: '500 Global', url: 'https://500.co/startups', type: 'startups' },
  { name: 'Plug and Play', url: 'https://www.plugandplaytechcenter.com/startups/', type: 'startups' },
];

const VC_SOURCES = [
  // Top-Tier VCs
  { name: 'a16z Team', url: 'https://a16z.com/about/', type: 'investors' },
  { name: 'Sequoia Team', url: 'https://www.sequoiacap.com/people/', type: 'investors' },
  { name: 'Accel Team', url: 'https://www.accel.com/people', type: 'investors' },
  { name: 'Benchmark', url: 'https://www.benchmark.com/', type: 'investors' },
  { name: 'Greylock', url: 'https://greylock.com/team/', type: 'investors' },
  { name: 'Lightspeed', url: 'https://lsvp.com/team/', type: 'investors' },
  { name: 'Index Ventures', url: 'https://www.indexventures.com/team/', type: 'investors' },
  { name: 'Bessemer', url: 'https://www.bvp.com/team', type: 'investors' },
  { name: 'NEA', url: 'https://www.nea.com/team', type: 'investors' },
  { name: 'General Catalyst', url: 'https://www.generalcatalyst.com/team/', type: 'investors' },
  
  // Growth Stage
  { name: 'Tiger Global', url: 'https://www.tigerglobal.com/', type: 'investors' },
  { name: 'Coatue', url: 'https://www.coatue.com/team', type: 'investors' },
  { name: 'Insight Partners', url: 'https://www.insightpartners.com/team/', type: 'investors' },
  
  // Seed Stage
  { name: 'First Round', url: 'https://firstround.com/team/', type: 'investors' },
  { name: 'Initialized', url: 'https://initialized.com/team', type: 'investors' },
  { name: 'Floodgate', url: 'https://floodgate.com/', type: 'investors' },
  { name: 'SV Angel', url: 'https://svangel.com/', type: 'investors' },
  { name: 'Lerer Hippeau', url: 'https://www.lererhippeau.com/team', type: 'investors' },
  { name: 'Forerunner', url: 'https://forerunnerventures.com/team/', type: 'investors' },
  
  // Sector-Specific
  { name: 'a16z Bio', url: 'https://a16z.com/bio-health/', type: 'investors' },
  { name: 'a16z Crypto', url: 'https://a16zcrypto.com/team/', type: 'investors' },
  { name: 'Ribbit Capital', url: 'https://ribbitcap.com/', type: 'investors' },
  { name: 'Lux Capital', url: 'https://www.luxcapital.com/team', type: 'investors' },
  { name: 'USV', url: 'https://www.usv.com/team/', type: 'investors' },
  
  // International
  { name: 'SoftBank', url: 'https://visionfund.com/team', type: 'investors' },
  { name: 'DST Global', url: 'https://dst.global/', type: 'investors' },
  
  // Angel Networks
  { name: 'AngelList Syndicates', url: 'https://angel.co/syndicates', type: 'investors' },
];

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 SCRAPING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeSource(source) {
  console.log(`\n🌐 [${source.name}] ${source.url}`);
  
  try {
    const output = execSync(
      `node intelligent-scraper.js "${source.url}" ${source.type}`,
      {
        cwd: __dirname,
        encoding: 'utf-8',
        timeout: 90000, // 90 seconds per source
        maxBuffer: 10 * 1024 * 1024,
        stdio: 'pipe'
      }
    );
    
    // Parse results
    const startupMatch = output.match(/🚀 Startups: (\d+) added/);
    const investorMatch = output.match(/💼 Investors: (\d+) added/);
    
    const startups = startupMatch ? parseInt(startupMatch[1]) : 0;
    const investors = investorMatch ? parseInt(investorMatch[1]) : 0;
    
    if (startups > 0 || investors > 0) {
      console.log(`   ✅ Found: ${startups} startups, ${investors} investors`);
    } else {
      console.log(`   ⏭️  No new data (may be duplicates)`);
    }
    
    return { startups, investors, success: true };
    
  } catch (error) {
    console.log(`   ⚠️  Error: ${error.message?.substring(0, 50) || 'timeout'}`);
    return { startups: 0, investors: 0, success: false };
  }
}

async function runBatch(sources, batchName) {
  console.log('\n' + '═'.repeat(70));
  console.log(`📦 ${batchName} (${sources.length} sources)`);
  console.log('═'.repeat(70));
  
  let totalStartups = 0;
  let totalInvestors = 0;
  let successCount = 0;
  
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    console.log(`\n[${i + 1}/${sources.length}]`);
    
    const result = await scrapeSource(source);
    totalStartups += result.startups;
    totalInvestors += result.investors;
    if (result.success) successCount++;
    
    // Rate limit: 3 seconds between requests
    if (i < sources.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  return { totalStartups, totalInvestors, successCount, total: sources.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 STATS & REPORTING
// ═══════════════════════════════════════════════════════════════════════════

async function getStats() {
  const { count: startups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { count: discovered } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });
  
  const { count: investors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  return { startups, discovered, investors };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
  console.log('🔥                                                               🔥');
  console.log('🔥   SUPER SCRAPER - High Volume Discovery Engine                🔥');
  console.log('🔥   Goal: HUNDREDS of startups & investors daily                🔥');
  console.log('🔥                                                               🔥');
  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
  console.log(`\n⏰ Started: ${new Date().toISOString()}`);
  
  // Get starting stats
  const beforeStats = await getStats();
  console.log(`\n📊 BEFORE: ${beforeStats.startups} approved, ${beforeStats.discovered} discovered, ${beforeStats.investors} investors`);
  
  // Run startup sources
  const startupResults = await runBatch(STARTUP_SOURCES, 'STARTUP SOURCES');
  
  // Run VC sources
  const vcResults = await runBatch(VC_SOURCES, 'VC/INVESTOR SOURCES');
  
  // Get ending stats
  const afterStats = await getStats();
  
  // Final report
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📊 SUPER SCRAPER RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n⏰ Completed: ${new Date().toISOString()}`);
  console.log(`\n📈 STARTUPS:`);
  console.log(`   • Sources scraped: ${startupResults.total}`);
  console.log(`   • Successful: ${startupResults.successCount}`);
  console.log(`   • New startups found: ${startupResults.totalStartups}`);
  console.log(`   • DB change: ${beforeStats.discovered} → ${afterStats.discovered} (+${afterStats.discovered - beforeStats.discovered})`);
  
  console.log(`\n💼 INVESTORS:`);
  console.log(`   • Sources scraped: ${vcResults.total}`);
  console.log(`   • Successful: ${vcResults.successCount}`);
  console.log(`   • New investors found: ${vcResults.totalInvestors}`);
  console.log(`   • DB change: ${beforeStats.investors} → ${afterStats.investors} (+${afterStats.investors - beforeStats.investors})`);
  
  console.log('\n' + '═'.repeat(70));
  console.log(`✨ TOTAL NEW: +${startupResults.totalStartups + vcResults.totalInvestors} entities`);
  console.log('═'.repeat(70) + '\n');
  
  // Log to database for tracking
  try {
    await supabase.from('scraper_logs').insert({
      level: 'info',
      message: `Super Scraper completed: +${startupResults.totalStartups} startups, +${vcResults.totalInvestors} investors`,
      metadata: {
        startups_found: startupResults.totalStartups,
        investors_found: vcResults.totalInvestors,
        sources_scraped: startupResults.total + vcResults.total,
        success_rate: ((startupResults.successCount + vcResults.successCount) / (startupResults.total + vcResults.total) * 100).toFixed(1) + '%'
      }
    });
  } catch (e) {
    // Ignore logging errors
  }
}

// Run
main().catch(console.error);
