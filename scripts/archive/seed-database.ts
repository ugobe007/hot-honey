/**
 * SEED DATABASE - Populate with both startups and investors
 * 
 * This script runs both scrapers to fully populate the database
 */

import { generateSampleStartups, insertStartupsToDatabase } from './startup-scraper';
import { generateSampleInvestors, insertInvestorsToDatabase } from './investor-scraper';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkwMzUsImV4cCI6MjA3NjczNTAzNX0.DdtBUf-liELSfKs2akrrHMcmlX4vHEkTuytWnvAYpJ8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('═'.repeat(80));
  console.log('🔥 HOT MONEY HONEY - DATABASE SEEDER');
  console.log('═'.repeat(80));
  console.log('\n🎯 This will populate your database with:');
  console.log('   • 1000 startups with GOD scores');
  console.log('   • 500 investors (including top VCs)');
  console.log('   • Complete matching data\n');
  
  // Check database connection
  console.log('🔍 Checking database connection...');
  const { error: testError } = await supabase
    .from('startup_uploads')
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
  
  // Step 1: Generate and insert investors
  console.log('═'.repeat(80));
  console.log('STEP 1: POPULATING INVESTORS');
  console.log('═'.repeat(80));
  
  const investors = generateSampleInvestors(500);
  const investorsInserted = await insertInvestorsToDatabase(investors);
  
  console.log(`\n✅ ${investorsInserted} investors added\n`);
  
  // Wait a bit between steps
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 2: Generate and insert startups
  console.log('═'.repeat(80));
  console.log('STEP 2: POPULATING STARTUPS');
  console.log('═'.repeat(80));
  
  const startups = generateSampleStartups(1000);
  const startupsInserted = await insertStartupsToDatabase(startups);
  
  console.log(`\n✅ ${startupsInserted} startups added\n`);
  
  // Step 3: Verify data
  console.log('═'.repeat(80));
  console.log('STEP 3: VERIFYING DATA');
  console.log('═'.repeat(80));
  
  // Check startup counts
  const { data: startupData } = await supabase
    .from('startup_uploads')
    .select('status, total_god_score')
    .eq('status', 'approved');
  
  // Check investor counts
  const { data: investorData } = await supabase
    .from('investors')
    .select('type');
  
  console.log('\n📊 Database Summary:');
  console.log('─'.repeat(80));
  console.log(`   Startups (approved): ${startupData?.length || 0}`);
  if (startupData && startupData.length > 0) {
    const avgScore = startupData.reduce((acc, s) => acc + s.total_god_score, 0) / startupData.length;
    console.log(`   Average GOD Score: ${avgScore.toFixed(1)}/100`);
  }
  console.log(`   Investors: ${investorData?.length || 0}`);
  
  if (investorData && investorData.length > 0) {
    const byType = investorData.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   Investor Breakdown:');
    for (const [type, count] of Object.entries(byType)) {
      console.log(`   - ${type}: ${count}`);
    }
  }
  
  // Final summary
  console.log('\n═'.repeat(80));
  console.log('✅ DATABASE SEEDING COMPLETE!');
  console.log('═'.repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('   1. Start dev server: npm run dev');
  console.log('   2. Visit http://localhost:5175/match');
  console.log('   3. See matches with 50-99% scores');
  console.log('   4. Visit http://localhost:5175/investors');
  console.log('   5. Browse 500+ investors\n');
  console.log('🎉 Your Hot Money Honey database is ready to use!');
  console.log('═'.repeat(80));
}

main().catch(console.error);
