#!/usr/bin/env node
/**
 * List all unique sectors/industries from the database
 * Run: node scripts/list-all-sectors.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Discovering all sectors from database...\n');
  
  try {
    // Get all startups with sectors
    const { data: startups, error: startupError } = await supabase
      .from('startup_uploads')
      .select('sectors')
      .not('sectors', 'is', null);
    
    if (startupError) {
      console.error('❌ Error fetching startups:', startupError.message);
      process.exit(1);
    }
    
    // Get all investors with sectors
    const { data: investors, error: investorError } = await supabase
      .from('investors')
      .select('sectors')
      .not('sectors', 'is', null);
    
    if (investorError) {
      console.error('❌ Error fetching investors:', investorError.message);
      process.exit(1);
    }
    
    // Collect all unique sectors
    const allSectors = new Set();
    
    // From startups
    (startups || []).forEach(s => {
      if (Array.isArray(s.sectors)) {
        s.sectors.forEach(sec => {
          if (sec && typeof sec === 'string') {
            allSectors.add(sec.trim());
          }
        });
      }
    });
    
    // From investors
    (investors || []).forEach(i => {
      if (Array.isArray(i.sectors)) {
        i.sectors.forEach(sec => {
          if (sec && typeof sec === 'string') {
            allSectors.add(sec.trim());
          }
        });
      }
    });
    
    // Sort alphabetically
    const sortedSectors = Array.from(allSectors).sort();
    
    console.log('📊 ALL UNIQUE SECTORS/INDUSTRIES FOUND:');
    console.log('========================================\n');
    
    sortedSectors.forEach((sector, i) => {
      console.log(`${(i + 1).toString().padStart(3, ' ')}. ${sector}`);
    });
    
    console.log(`\n✅ Total: ${sortedSectors.length} unique sectors\n`);
    
    // Also show sectors from code (AdminAnalytics.tsx)
    console.log('📋 SECTORS DEFINED IN CODE (AdminAnalytics.tsx):');
    console.log('==================================================\n');
    const codeSectors = [
      'FinTech', 'AI/ML', 'SaaS', 'HealthTech', 'EdTech', 'Sustainability',
      'E-commerce', 'Cybersecurity', 'PropTech', 'FoodTech', 'Developer Tools',
      'Marketing', 'HR/Talent', 'Logistics', 'Consumer'
    ];
    codeSectors.forEach((s, i) => {
      const inDB = sortedSectors.includes(s) ? '✓' : '✗';
      console.log(`${(i + 1).toString().padStart(3, ' ')}. ${s.padEnd(20, ' ')} [${inDB}]`);
    });
    
    // Show which DB sectors aren't in code
    const missingInCode = sortedSectors.filter(s => !codeSectors.includes(s));
    if (missingInCode.length > 0) {
      console.log('\n⚠️  SECTORS IN DB BUT NOT IN CODE:');
      console.log('===================================\n');
      missingInCode.forEach((s, i) => {
        console.log(`${(i + 1).toString().padStart(3, ' ')}. ${s}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

