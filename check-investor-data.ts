/**
 * Check current investor data in database
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvestorData() {
  console.log('🔍 Checking investor data in database...\n');
  
  // First, get a sample to see what columns exist
  const { data: sample, error: sampleError } = await supabase
    .from('investors')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('❌ Error:', sampleError);
    return;
  }

  if (sample && sample.length > 0) {
    console.log('📋 Available columns in investors table:');
    console.log(Object.keys(sample[0]).join(', '));
    console.log('');
  }
  
  // Now get investor data with only fields that might exist
  const { data: investors, error } = await supabase
    .from('investors')
    .select('*')
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${investors?.length || 0} investors\n`);
  
  if (investors && investors.length > 0) {
    investors.forEach((inv, i) => {
      console.log(`\n📊 INVESTOR ${i + 1}: ${inv.name}`);
      console.log(`   ID: ${inv.id}`);
      console.log(`   Type: ${inv.type || 'MISSING'}`);
      console.log(`   Tagline: ${inv.tagline || 'MISSING'}`);
      console.log(`   Sectors: ${inv.sectors ? JSON.stringify(inv.sectors) : 'MISSING'}`);
      console.log(`   Stage: ${inv.stage ? JSON.stringify(inv.stage) : 'MISSING'}`);
      console.log(`   Check Size: ${inv.check_size || 'MISSING'}`);
      console.log(`   Website: ${inv.website || 'MISSING'}`);
      console.log(`   Notable Investments: ${inv.notable_investments ? JSON.stringify(inv.notable_investments).substring(0, 100) : 'MISSING'}`);
      
      // Check for fields that might not exist
      if ('portfolio_count' in inv) {
        console.log(`   Portfolio Count: ${inv.portfolio_count || 'MISSING'}`);
      }
      if ('unicorns' in inv) {
        console.log(`   Unicorns: ${inv.unicorns || 'MISSING'}`);
      }
      if ('investment_thesis' in inv) {
        console.log(`   Investment Thesis: ${inv.investment_thesis || 'MISSING'}`);
      }
    });

    // Count missing data for common fields
    const missingNotable = investors.filter(i => !i.notable_investments || (Array.isArray(i.notable_investments) && i.notable_investments.length === 0)).length;
    const missingSectors = investors.filter(i => !i.sectors || i.sectors.length === 0).length;
    const missingCheckSize = investors.filter(i => !i.check_size).length;
    
    console.log('\n\n📈 DATA COMPLETENESS:');
    console.log(`   Missing Notable Investments: ${missingNotable}/${investors.length} (${Math.round(missingNotable/investors.length*100)}%)`);
    console.log(`   Missing Sectors: ${missingSectors}/${investors.length} (${Math.round(missingSectors/investors.length*100)}%)`);
    console.log(`   Missing Check Size: ${missingCheckSize}/${investors.length} (${Math.round(missingCheckSize/investors.length*100)}%)`);
    
    if ('portfolio_count' in investors[0]) {
      const missingPortfolio = investors.filter(i => !i.portfolio_count).length;
      console.log(`   Missing Portfolio Count: ${missingPortfolio}/${investors.length} (${Math.round(missingPortfolio/investors.length*100)}%)`);
    }
    if ('investment_thesis' in investors[0]) {
      const missingThesis = investors.filter(i => !i.investment_thesis).length;
      console.log(`   Missing Investment Thesis: ${missingThesis}/${investors.length} (${Math.round(missingThesis/investors.length*100)}%)`);
    }
  }
}

checkInvestorData().then(() => process.exit(0));
