/**
 * HOT MONEY HONEY - STARTUP SCRAPER
 * 
 * CORRECTLY MAPPED to actual Supabase schema
 * 
 * startup_uploads required fields:
 *   - name (text, NOT NULL)
 *   - source_type (text, NOT NULL)
 * 
 * All other fields are optional
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase - UPDATE WITH YOUR CREDENTIALS
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TYPES - Matching EXACT database schema
// ============================================================================

interface StartupInsert {
  // REQUIRED
  name: string;
  source_type: string;  // 'scraper', 'manual', 'api', 'yc', 'techcrunch'
  
  // Optional - Basic Info
  pitch?: string;
  tagline?: string;
  website?: string;
  linkedin?: string;
  location?: string;
  
  // Optional - Funding
  raise_amount?: string;  // TEXT not number - e.g., "$2M"
  raise_type?: string;    // 'Pre-Seed', 'Seed', 'Series A'
  stage?: string;         // TEXT: 'Pre-Seed', 'Seed', 'Series A', etc.
  
  // Optional - Status
  status?: string;  // 'pending', 'approved', 'rejected'
  
  // Optional - GOD Scores (pre-calculated)
  total_god_score?: number;
  team_score?: number;
  traction_score?: number;
  market_score?: number;
  product_score?: number;
  vision_score?: number;
  
  // Optional - Sectors
  sectors?: string[];  // ARRAY
  
  // Optional - Metrics
  revenue_annual?: number;
  mrr?: number;
  team_size?: number;
  growth_rate_monthly?: number;
  
  // Optional - Flags
  has_technical_cofounder?: boolean;
  is_launched?: boolean;
  has_demo?: boolean;
  
  // Optional - 5 Points
  value_proposition?: string;
  problem?: string;
  solution?: string;
  market_size?: string;
  team_companies?: string[];
}

// ============================================================================
// SCRAPER FUNCTIONS
// ============================================================================

/**
 * Insert startups with duplicate handling
 */
async function insertStartups(startups: StartupInsert[]): Promise<{
  inserted: number;
  duplicates: number;
  errors: string[];
}> {
  const results = { inserted: 0, duplicates: 0, errors: [] as string[] };
  
  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < startups.length; i += batchSize) {
    const batch = startups.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(startups.length/batchSize)}`);
    
    for (const startup of batch) {
      try {
        // Check for duplicate by name
        const { data: existing } = await supabase
          .from('startup_uploads')
          .select('id')
          .ilike('name', startup.name)
          .limit(1);
        
        if (existing && existing.length > 0) {
          // Update existing record
          const { error } = await supabase
            .from('startup_uploads')
            .update({
              ...startup,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing[0].id);
          
          if (error) {
            results.errors.push(`Update ${startup.name}: ${error.message}`);
          } else {
            results.duplicates++;
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('startup_uploads')
            .insert({
              ...startup,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (error) {
            results.errors.push(`Insert ${startup.name}: ${error.message}`);
          } else {
            results.inserted++;
          }
        }
      } catch (err) {
        results.errors.push(`${startup.name}: ${err}`);
      }
    }
    
    // Small delay between batches
    await new Promise(r => setTimeout(r, 100));
  }
  
  return results;
}

// ============================================================================
// GOD SCORE CALCULATOR
// ============================================================================

function calculateGODScores(startup: Partial<StartupInsert>): {
  total_god_score: number;
  team_score: number;
  traction_score: number;
  market_score: number;
  product_score: number;
  vision_score: number;
} {
  let team = 50, traction = 50, market = 50, product = 50, vision = 50;
  
  // Team scoring
  if (startup.has_technical_cofounder) team += 15;
  if (startup.team_size && startup.team_size >= 3) team += 10;
  if (startup.team_size && startup.team_size >= 10) team += 10;
  
  // Traction scoring
  if (startup.is_launched) traction += 15;
  if (startup.mrr && startup.mrr > 0) traction += 15;
  if (startup.mrr && startup.mrr >= 10000) traction += 10;
  if (startup.revenue_annual && startup.revenue_annual >= 100000) traction += 10;
  if (startup.growth_rate_monthly && startup.growth_rate_monthly >= 10) traction += 10;
  
  // Market scoring
  const hotSectors = ['AI/ML', 'Fintech', 'Healthcare', 'Climate', 'Enterprise'];
  if (startup.sectors?.some(s => hotSectors.includes(s))) market += 15;
  if (startup.sectors && startup.sectors.length >= 2) market += 5;
  
  // Product scoring
  if (startup.has_demo) product += 15;
  if (startup.is_launched) product += 15;
  
  // Vision scoring based on stage
  if (startup.stage && ['Seed', 'Series A', 'Series B'].includes(startup.stage)) vision += 10;
  if (startup.raise_amount) vision += 10;
  
  // Cap scores at 98
  team = Math.min(team, 98);
  traction = Math.min(traction, 98);
  market = Math.min(market, 98);
  product = Math.min(product, 98);
  vision = Math.min(vision, 98);
  
  // Calculate weighted total
  const total = Math.round(
    team * 0.20 +
    traction * 0.25 +
    market * 0.20 +
    product * 0.20 +
    vision * 0.15
  );
  
  return {
    total_god_score: Math.min(total, 98),
    team_score: team,
    traction_score: traction,
    market_score: market,
    product_score: product,
    vision_score: vision
  };
}

// ============================================================================
// SAMPLE DATA GENERATOR (for testing)
// ============================================================================

function generateSampleStartups(count: number): StartupInsert[] {
  const sectors = [
    ['AI/ML', 'Enterprise'],
    ['Fintech', 'B2B'],
    ['Healthcare', 'Biotech'],
    ['Climate', 'CleanTech'],
    ['Consumer', 'Marketplace'],
    ['Developer Tools', 'SaaS'],
    ['EdTech', 'AI/ML'],
    ['Cybersecurity', 'Enterprise'],
    ['Logistics', 'B2B'],
    ['Real Estate', 'PropTech'],
    ['Food Tech', 'Consumer'],
    ['Gaming', 'Entertainment'],
    ['Legal Tech', 'B2B'],
    ['HR Tech', 'Enterprise'],
    ['Insurance', 'Fintech']
  ];
  
  const stages = [
    { stage: 'Pre-Seed', raise: '$500K', type: 'Pre-Seed' },
    { stage: 'Pre-Seed', raise: '$750K', type: 'Pre-Seed' },
    { stage: 'Seed', raise: '$2M', type: 'Seed' },
    { stage: 'Seed', raise: '$3.5M', type: 'Seed' },
    { stage: 'Series A', raise: '$10M', type: 'Series A' },
    { stage: 'Series A', raise: '$15M', type: 'Series A' },
    { stage: 'Series B', raise: '$30M', type: 'Series B' },
    { stage: 'Series B', raise: '$50M', type: 'Series B' }
  ];
  
  const prefixes = [
    'Neural', 'Quantum', 'Cloud', 'Data', 'Smart', 'Auto', 'Rapid', 'Swift',
    'Prime', 'Next', 'Meta', 'Hyper', 'Ultra', 'Apex', 'Vertex', 'Nova',
    'Stellar', 'Cyber', 'Digital', 'Fusion', 'Sync', 'Flow', 'Stack', 'Core',
    'Grid', 'Hub', 'Link', 'Node', 'Pulse', 'Wave', 'Spark', 'Bright',
    'Clear', 'Deep', 'Fast', 'Open', 'True', 'Blue', 'Green', 'Red'
  ];
  
  const suffixes = [
    'AI', 'Labs', 'Tech', 'Systems', 'Software', 'Solutions', 'Platform',
    'Cloud', 'Data', 'Analytics', 'Networks', 'Security', 'Health', 'Finance',
    'Pay', 'Ops', 'Base', 'Hub', 'Space', 'Works', 'Logic', 'Mind', 'Sense',
    'Bot', 'Flow', 'Stack', 'Forge', 'Scale', 'Path', 'Way'
  ];
  
  const locations = [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Boston, MA', 
    'Seattle, WA', 'Los Angeles, CA', 'Denver, CO', 'Chicago, IL',
    'Miami, FL', 'Atlanta, GA', 'Portland, OR', 'San Diego, CA'
  ];
  
  const teamCompanies = [
    ['Google', 'Meta'], ['Amazon', 'Microsoft'], ['Apple', 'Tesla'],
    ['Stripe', 'Airbnb'], ['Uber', 'Lyft'], ['Netflix', 'Spotify'],
    ['Salesforce', 'Oracle'], ['Goldman Sachs', 'JPMorgan'],
    ['McKinsey', 'Bain'], ['Stanford', 'MIT']
  ];
  
  const startups: StartupInsert[] = [];
  const usedNames = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    const sectorSet = sectors[i % sectors.length];
    const stageInfo = stages[i % stages.length];
    
    // Generate unique name
    let uniqueName: string;
    do {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      uniqueName = `${prefix}${suffix}`;
    } while (usedNames.has(uniqueName));
    usedNames.add(uniqueName);
    
    const teamFrom = teamCompanies[i % teamCompanies.length];
    const loc = locations[i % locations.length];
    
    const startup: StartupInsert = {
      name: uniqueName,
      source_type: 'scraper',
      pitch: `${sectorSet[0]} platform revolutionizing how businesses operate`,
      tagline: `The future of ${sectorSet[0].toLowerCase()}`,
      website: `https://${uniqueName.toLowerCase()}.com`,
      stage: stageInfo.stage,
      raise_amount: stageInfo.raise,
      raise_type: stageInfo.type,
      sectors: sectorSet,
      status: 'approved',
      is_launched: Math.random() > 0.3,
      has_demo: Math.random() > 0.4,
      has_technical_cofounder: Math.random() > 0.3,
      team_size: Math.floor(Math.random() * 20) + 2,
      mrr: Math.floor(Math.random() * 50000),
      location: loc,
      value_proposition: `Leading ${sectorSet[0]} solution for modern businesses`,
      problem: `${sectorSet[1]} companies struggle with efficiency and scale`,
      solution: `AI-powered platform that automates and optimizes workflows`,
      market_size: `$${Math.floor(Math.random() * 100) + 10}B+ market opportunity`,
      team_companies: teamFrom
    };
    
    // Calculate and add GOD scores
    const scores = calculateGODScores(startup);
    Object.assign(startup, scores);
    
    startups.push(startup);
  }
  
  return startups;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 HOT MONEY STARTUP SCRAPER (FIXED)');
  console.log('=====================================\n');
  
  // Check connection
  const { data: testData, error: testError } = await supabase
    .from('startup_uploads')
    .select('id')
    .limit(1);
  
  if (testError) {
    console.error('❌ Database connection failed:', testError.message);
    console.log('\nCheck your SUPABASE_URL and SUPABASE_ANON_KEY');
    return;
  }
  
  console.log('✅ Database connected\n');
  
  // Get current count
  const { count: beforeCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Current startups in DB: ${beforeCount || 0}`);
  
  // Generate sample startups
  const count = 500; // Full 500 load
  console.log(`\n📊 Generating ${count} startups...`);
  const startups = generateSampleStartups(count);
  
  // Insert
  console.log(`\n📥 Inserting into database...`);
  const results = await insertStartups(startups);
  
  console.log('\n=====================================');
  console.log('📊 RESULTS:');
  console.log(`   ✅ Inserted: ${results.inserted}`);
  console.log(`   🔄 Updated: ${results.duplicates}`);
  console.log(`   ❌ Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nFirst 5 errors:');
    results.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
  }
  
  // Verify final count
  const { count: afterCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Final startups in DB: ${afterCount || 0}`);
  console.log('\n✅ SCRAPER COMPLETE!');
}

main().catch(console.error);
