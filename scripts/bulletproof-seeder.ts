/**
 * BULLETPROOF STARTUP SEEDER
 * Uses ONLY fields that exist in startup_uploads schema
 * 
 * Run: npx tsx bulletproof-seeder.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8'
);

// ONLY these fields exist in your schema - verified from your export
interface StartupInsert {
  name: string;
  source_type: string;
  pitch?: string;
  tagline?: string;
  website?: string;
  stage?: number;
  raise_amount?: string;
  raise_type?: string;
  sectors?: string[];
  status?: string;
  location?: string;
  team_size?: number;
  mrr?: number;
  revenue_annual?: number;
  growth_rate_monthly?: number;
  is_launched?: boolean;
  has_demo?: boolean;
  has_technical_cofounder?: boolean;
  total_god_score?: number;
  team_score?: number;
  traction_score?: number;
  market_score?: number;
  product_score?: number;
  vision_score?: number;
}

const SECTORS = ['AI/ML', 'Fintech', 'Healthcare', 'SaaS', 'Enterprise', 'Consumer', 'Climate', 'Cybersecurity', 'EdTech', 'DevTools'];
const STAGES = [1, 2, 3, 4]; // INTEGER: 1=Pre-Seed, 2=Seed, 3=Series A, 4=Series B
const STAGE_NAMES = ['Pre-Seed', 'Seed', 'Series A', 'Series B'];
const LOCATIONS = ['San Francisco', 'New York', 'Austin', 'Boston', 'Seattle', 'LA', 'Denver', 'Miami'];
const PREFIXES = ['AI', 'Cloud', 'Data', 'Smart', 'Next', 'Neo', 'Hyper', 'Ultra', 'Meta', 'Deep'];
const SUFFIXES = ['Labs', 'Tech', 'AI', 'Systems', 'Hub', 'Flow', 'Base', 'Stack', 'Mind', 'Ops'];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStartup(index: number): StartupInsert {
  const name = `${randomPick(PREFIXES)}${randomPick(SUFFIXES)}${index}`;
  const sector1 = randomPick(SECTORS);
  const sector2 = randomPick(SECTORS.filter(s => s !== sector1));
  const stageIdx = Math.floor(Math.random() * STAGES.length);
  const stageNum = STAGES[stageIdx];
  const stageName = STAGE_NAMES[stageIdx];
  const launched = Math.random() > 0.3;
  const mrr = launched ? Math.floor(Math.random() * 100000) : 0;
  
  // Calculate scores
  let team = 50 + Math.floor(Math.random() * 30);
  let traction = 40 + Math.floor(Math.random() * 40);
  let market = 50 + Math.floor(Math.random() * 30);
  let product = 45 + Math.floor(Math.random() * 35);
  let vision = 50 + Math.floor(Math.random() * 30);
  
  if (mrr > 10000) traction += 15;
  if (launched) product += 10;
  
  team = Math.min(team, 98);
  traction = Math.min(traction, 98);
  market = Math.min(market, 98);
  product = Math.min(product, 98);
  vision = Math.min(vision, 98);
  
  const total = Math.round(team * 0.2 + traction * 0.25 + market * 0.2 + product * 0.2 + vision * 0.15);

  return {
    name,
    source_type: 'bulk_import',
    pitch: `${sector1} platform transforming how businesses operate`,
    tagline: `Next-gen ${sector1.toLowerCase()} solution`,
    website: `https://${name.toLowerCase()}.com`,
    stage: stageNum,
    raise_amount: stageName === 'Pre-Seed' ? '$500K' : stageName === 'Seed' ? '$2M' : stageName === 'Series A' ? '$10M' : '$30M',
    raise_type: stageName,
    sectors: [sector1, sector2],
    status: 'approved',
    location: randomPick(LOCATIONS),
    team_size: Math.floor(Math.random() * 25) + 2,
    mrr,
    revenue_annual: mrr * 12,
    growth_rate_monthly: Math.floor(Math.random() * 30) + 5,
    is_launched: launched,
    has_demo: Math.random() > 0.4,
    has_technical_cofounder: Math.random() > 0.35,
    total_god_score: Math.min(total, 98),
    team_score: team,
    traction_score: traction,
    market_score: market,
    product_score: product,
    vision_score: vision
  };
}

async function main() {
  console.log('🚀 BULLETPROOF SEEDER');
  console.log('='.repeat(50));
  
  // Test connection
  const { error: testErr } = await supabase.from('startup_uploads').select('id').limit(1);
  if (testErr) {
    console.error('❌ Connection failed:', testErr.message);
    return;
  }
  console.log('✅ Connected\n');

  // Get current count
  const { count: beforeCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Current startups: ${beforeCount || 0}\n`);

  // Generate 500 startups
  const startups = Array.from({ length: 500 }, (_, i) => generateStartup(i));
  
  let inserted = 0, errors = 0;
  const errorMsgs: string[] = [];
  
  // Insert in batches of 50
  for (let i = 0; i < startups.length; i += 50) {
    const batch = startups.slice(i, i + 50);
    console.log(`Batch ${Math.floor(i/50) + 1}/10...`);
    
    const { error } = await supabase.from('startup_uploads').insert(batch);
    
    if (error) {
      errors += batch.length;
      errorMsgs.push(error.message);
    } else {
      inserted += batch.length;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (errorMsgs.length > 0) {
    console.log('\nError details:');
    [...new Set(errorMsgs)].forEach(e => console.log(`  - ${e}`));
  }
  
  // Verify
  const { count } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  console.log(`\n📊 Total approved startups: ${count}`);
}

main();
