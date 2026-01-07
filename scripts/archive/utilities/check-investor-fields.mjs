import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkInvestorFields() {
  console.log('\n🔍 CHECKING INVESTOR DATA FIELDS...\n');
  
  const { data: investors, error } = await supabase
    .from('investors')
    .select('*')
    .limit(3);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!investors || investors.length === 0) {
    console.log('❌ No investors found in database');
    return;
  }
  
  console.log(`✅ Found ${investors.length} investors (showing first 3)\n`);
  
  investors.forEach((inv, idx) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`INVESTOR ${idx + 1}: ${inv.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('Available fields:');
    Object.keys(inv).forEach(key => {
      const value = inv[key];
      if (value !== null && value !== undefined && value !== '') {
        console.log(`  ✓ ${key}: ${JSON.stringify(value).substring(0, 100)}`);
      } else {
        console.log(`  ✗ ${key}: (empty)`);
      }
    });
  });
  
  console.log('\n\n📊 FIELD POPULATION SUMMARY:');
  const allFields = Object.keys(investors[0]);
  allFields.forEach(field => {
    const populated = investors.filter(inv => inv[field] !== null && inv[field] !== undefined && inv[field] !== '').length;
    const percentage = (populated / investors.length * 100).toFixed(0);
    console.log(`  ${field}: ${populated}/${investors.length} (${percentage}%)`);
  });
}

checkInvestorFields().then(() => process.exit(0));
