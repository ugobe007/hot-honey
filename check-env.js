#!/usr/bin/env node
/**
 * Quick script to check if .env file has Supabase credentials
 */

require('dotenv').config();

console.log('\n🔍 Checking Environment Variables...\n');

const required = {
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY
};

let found = 0;
for (const [key, value] of Object.entries(required)) {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 30)}...`);
    found++;
  }
}

if (found === 0) {
  console.log('❌ No Supabase credentials found!\n');
  console.log('💡 Your .env file should contain:\n');
  console.log('   VITE_SUPABASE_URL=https://xxxxx.supabase.co');
  console.log('   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log('\n   Make sure:');
  console.log('   1. File is named exactly ".env" (not .env.txt or .env.local)');
  console.log('   2. Variables have no spaces around the = sign');
  console.log('   3. No quotes needed around values');
  console.log('   4. File is in the project root directory\n');
} else {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (url && key) {
    console.log(`\n✅ All required credentials found!`);
    console.log(`   URL: ${url.substring(0, 40)}...`);
    console.log(`   Key: ${key.substring(0, 30)}...\n`);
    console.log('🚀 Ready to run ML training!\n');
  } else {
    console.log('\n⚠️  Missing some required credentials:');
    if (!url) console.log('   ❌ Missing: VITE_SUPABASE_URL or SUPABASE_URL');
    if (!key) console.log('   ❌ Missing: SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
    console.log('');
  }
}

