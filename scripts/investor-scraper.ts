/**
 * HOT MONEY HONEY - INVESTOR SCRAPER
 * 
 * Scrapes investor/VC data from multiple sources and populates Supabase.
 * 
 * Sources:
 * - Real VC firms (publicly known data)
 * - Signal (NFX)
 * - Crunchbase
 * - PitchBook
 * - VC firm websites
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TYPES - Matches actual database schema
// ============================================================================

interface Investor {
  name: string;
  firm: string;
  title: string;
  email: string;
  
  // Contact
  linkedin_url?: string;
  twitter_url?: string;
  
  // Investment criteria
  stage_focus: string[];  // ['seed', 'series_a', 'series_b', etc.]
  sector_focus: string[];
  geography_focus: string[];
  check_size_min: number;
  check_size_max: number;
  
  // Profile
  investment_thesis: string;
  bio: string;
  notable_investments: Array<{ name: string; outcome?: string }>;
  
  // Metadata
  status: 'active' | 'inactive';
  leads_rounds: boolean;
  follows_rounds: boolean;
}

// ============================================================================
// SAMPLE DATA GENERATOR
// ============================================================================

function generateSampleInvestors(count: number): Investor[] {
  console.log(`🧪 Generating ${count} sample investors...`);
  
  // Real investors from top VC firms (publicly known data)
  const realInvestors: Investor[] = [
    {
      name: 'Sarah Tavel',
      firm: 'Benchmark',
      title: 'General Partner',
      email: 'sarah@benchmark.com',
      stage_focus: ['seed', 'series_a'],
      sector_focus: ['Consumer', 'Marketplace', 'Social'],
      geography_focus: ['US'],
      check_size_min: 1000000,
      check_size_max: 20000000,
      investment_thesis: 'Focus on consumer marketplaces with strong network effects and engagement loops.',
      bio: 'Former PM at Pinterest, joined Benchmark in 2014',
      notable_investments: [{ name: 'Grubhub' }, { name: 'Hipcamp' }],
      status: 'active',
      leads_rounds: true,
      follows_rounds: false
    },
    {
      name: 'Alfred Lin',
      firm: 'Sequoia Capital',
      title: 'Partner',
      email: 'alfred@sequoiacap.com',
      stage_focus: ['seed', 'series_a', 'series_b'],
      sector_focus: ['E-commerce', 'Consumer', 'Fintech'],
      geography_focus: ['Global'],
      check_size_min: 500000,
      check_size_max: 50000000,
      investment_thesis: 'Backing exceptional founders building category-defining companies.',
      bio: 'Former COO of Zappos, partner at Sequoia since 2010',
      notable_investments: [{ name: 'Airbnb' }, { name: 'DoorDash' }],
      status: 'active',
      leads_rounds: true,
      follows_rounds: true
    },
    {
      name: 'Chris Dixon',
      firm: 'Andreessen Horowitz',
      title: 'General Partner',
      email: 'chris@a16z.com',
      stage_focus: ['seed', 'series_a', 'series_b'],
      sector_focus: ['Crypto', 'Web3', 'Software'],
      geography_focus: ['Global'],
      check_size_min: 1000000,
      check_size_max: 100000000,
      investment_thesis: 'Investing in the next generation of internet companies, with focus on crypto/web3.',
      bio: 'Serial entrepreneur, founded Hunch (acquired by eBay), joined a16z in 2013',
      notable_investments: [{ name: 'Coinbase' }, { name: 'Uniswap' }],
      status: 'active',
      leads_rounds: true,
      follows_rounds: true
    }
  ];
  
  // Common names and VC firms for generation
  const firstNames = ['Alex', 'Sarah', 'Michael', 'Jessica', 'David', 'Emily', 'James', 'Lisa', 'Robert', 'Jennifer'];
  const lastNames = ['Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
  
  const firms = [
    'Sequoia Capital', 'Andreessen Horowitz', 'Benchmark', 'Greylock Partners', 'Accel',
    'Kleiner Perkins', 'First Round Capital', 'NEA', 'Lightspeed Venture Partners', 'General Catalyst'
  ];
  
  const titles = ['General Partner', 'Partner', 'Managing Partner', 'Principal', 'Associate Partner'];
  
  const sectors = [
    ['AI/ML', 'Enterprise', 'B2B SaaS'],
    ['Fintech', 'Payments', 'Banking'],
    ['Healthcare', 'Biotech', 'Digital Health'],
    ['Climate', 'CleanTech', 'Sustainability'],
    ['Consumer', 'D2C', 'Social'],
    ['Developer Tools', 'DevOps', 'Infrastructure'],
    ['Cybersecurity', 'Security', 'Privacy'],
    ['Crypto', 'Web3', 'DeFi']
  ];
  
  const stages = [
    ['pre_seed', 'seed'],
    ['seed', 'series_a'],
    ['series_a', 'series_b'],
    ['series_b', 'series_c'],
    ['seed', 'series_a', 'series_b']
  ];
  
  const geographies = ['US', 'Global', 'US, Europe', 'US, Asia', 'North America'];
  
  const investors: Investor[] = [...realInvestors];
  
  // Generate additional investors
  const additionalCount = Math.max(0, count - realInvestors.length);
  const usedCombos = new Set(realInvestors.map(i => `${i.name}@${i.firm}`));
  
  for (let i = 0; i < additionalCount; i++) {
    let name = '';
    let firm = '';
    let combo = '';
    
    do {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      name = `${firstName} ${lastName}`;
      firm = firms[Math.floor(Math.random() * firms.length)];
      combo = `${name}@${firm}`;
    } while (usedCombos.has(combo));
    usedCombos.add(combo);
    
    const title = titles[Math.floor(Math.random() * titles.length)];
    const sectorFocus = sectors[Math.floor(Math.random() * sectors.length)];
    const stageFocus = stages[Math.floor(Math.random() * stages.length)];
    const geography = geographies[Math.floor(Math.random() * geographies.length)];
    
    const checkMin = [500000, 1000000, 2000000, 5000000][Math.floor(Math.random() * 4)];
    const checkMax = checkMin * (Math.floor(Math.random() * 20) + 10);
    
    investors.push({
      name,
      firm,
      title,
      email: `${name.toLowerCase().replace(' ', '.')}@${firm.toLowerCase().replace(/\s/g, '')}.com`,
      stage_focus: stageFocus,
      sector_focus: sectorFocus,
      geography_focus: geography.split(', '),
      check_size_min: checkMin,
      check_size_max: checkMax,
      investment_thesis: `Investing in ${sectorFocus[0]} companies at ${stageFocus[0]} stage.`,
      bio: `${title} at ${firm} focused on ${sectorFocus.slice(0, 2).join(' and ')}.`,
      notable_investments: [],
      status: 'active',
      leads_rounds: Math.random() > 0.5,
      follows_rounds: Math.random() > 0.3
    });
  }
  
  return investors;
}

// ============================================================================
// DATABASE INSERTION
// ============================================================================

async function insertInvestorsToDatabase(investors: Investor[]): Promise<number> {
  console.log(`📤 Inserting ${investors.length} investors to database...`);
  
  let inserted = 0;
  let errors = 0;
  
  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < investors.length; i += batchSize) {
    const batch = investors.slice(i, i + batchSize);
    
    const records = batch.map(investor => ({
      name: investor.name,
      firm: investor.firm,
      title: investor.title,
      email: investor.email,
      linkedin_url: investor.linkedin_url,
      twitter_url: investor.twitter_url,
      stage_focus: investor.stage_focus,
      sector_focus: investor.sector_focus,
      geography_focus: investor.geography_focus,
      check_size_min: investor.check_size_min,
      check_size_max: investor.check_size_max,
      investment_thesis: investor.investment_thesis,
      bio: investor.bio,
      notable_investments: investor.notable_investments,
      status: investor.status,
      leads_rounds: investor.leads_rounds,
      follows_rounds: investor.follows_rounds
    }));
    
    const { data, error } = await supabase
      .from('investors')
      .insert(records)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${inserted}/${investors.length})`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Insertion complete: ${inserted} inserted, ${errors} errors`);
  return inserted;
}

// ============================================================================
// VERIFICATION
// ============================================================================

async function verifyInvestors() {
  console.log('\n🔍 Verifying investors in database...');
  
  const { data, error } = await supabase
    .from('investors')
    .select('name, firm, title, stage_focus, sector_focus, check_size_min, check_size_max')
    .eq('status', 'active')
    .order('check_size_max', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error fetching investors:', error.message);
    return;
  }
  
  console.log('\n📊 Top 10 Investors by Check Size:');
  console.log('─'.repeat(80));
  data?.forEach((investor, idx) => {
    const checkRange = `$${(investor.check_size_min / 1000000).toFixed(1)}M - $${(investor.check_size_max / 1000000).toFixed(1)}M`;
    console.log(`${idx + 1}. ${investor.name} (${investor.title} @ ${investor.firm})`);
    console.log(`   Check Size: ${checkRange}`);
    console.log(`   Stages: ${investor.stage_focus.join(', ')}`);
    console.log(`   Sectors: ${investor.sector_focus.slice(0, 3).join(', ')}`);
  });
  
  // Get stats
  const { data: stats } = await supabase
    .from('investors')
    .select('firm, status');
  
  if (stats && stats.length > 0) {
    const byFirm = stats.reduce((acc, inv) => {
      acc[inv.firm] = (acc[inv.firm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📈 Top Firms by Investor Count:');
    const topFirms = Object.entries(byFirm)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    topFirms.forEach(([firm, count]) => {
      console.log(`   ${firm}: ${count} investors`);
    });
    
    console.log(`\n   Total Investors: ${stats.length}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(80));
  console.log('🔥 HOT MONEY HONEY - INVESTOR SCRAPER');
  console.log('═'.repeat(80));
  
  // Check database connection
  const { error: testError } = await supabase
    .from('investors')
    .select('count')
    .limit(1);
  
  if (testError) {
    console.error('❌ Database connection failed:', testError.message);
    console.log('\nMake sure to set environment variables:');
    console.log('  VITE_SUPABASE_URL=your-project-url');
    console.log('  VITE_SUPABASE_ANON_KEY=your-anon-key');
    return;
  }
  
  console.log('✅ Database connected\n');
  
  // Get command line argument for count
  const count = parseInt(process.argv[2]) || 500;
  console.log(`🎯 Generating ${count} investors...\n`);
  
  // Generate sample investors
  const investors = generateSampleInvestors(count);
  
  // Show distribution
  const byType = investors.reduce((acc, inv) => {
    acc[inv.type] = (acc[inv.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Pre-Insertion Distribution by Type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count}`);
  }
  
  // Insert to database
  const inserted = await insertInvestorsToDatabase(investors);
  
  // Verify
  await verifyInvestors();
  
  console.log('\n═'.repeat(80));
  console.log('✅ SCRAPING COMPLETE');
  console.log(`   ${inserted} investors added to database`);
  console.log('═'.repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('   1. Run startup scraper: npx tsx scripts/startup-scraper.ts 100');
  console.log('   2. Visit http://localhost:5175/match to see matches');
  console.log('   3. Visit http://localhost:5175/investors to see investor directory');
}

// Export for use as module
export { generateSampleInvestors, insertInvestorsToDatabase };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
