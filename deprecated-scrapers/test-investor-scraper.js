#!/usr/bin/env node
/**
 * TEST INVESTOR SCRAPER
 * Tests a single URL to see what's happening
 */

require('dotenv').config();
const { execSync } = require('child_process');

const testUrl = process.argv[2] || 'https://strictlyvc.com/';

console.log('\n🧪 TESTING INVESTOR SCRAPER');
console.log('═'.repeat(70));
console.log(`\n📡 Testing URL: ${testUrl}\n`);

try {
  const output = execSync(`node intelligent-scraper.js "${testUrl}" investors`, {
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 120000
  });
  
  console.log('📋 FULL OUTPUT:');
  console.log('═'.repeat(70));
  console.log(output);
  console.log('═'.repeat(70));
  
  // Parse results
  const investorMatch = output.match(/💼 Investors: (\d+) added/);
  const skippedMatch = output.match(/(\d+) skipped/);
  const foundMatch = output.match(/Investors found: (\d+)/);
  
  console.log('\n📊 RESULTS SUMMARY:');
  console.log(`   • Investors found: ${foundMatch ? foundMatch[1] : '0'}`);
  console.log(`   • Investors added: ${investorMatch ? investorMatch[1] : '0'}`);
  console.log(`   • Investors skipped: ${skippedMatch ? skippedMatch[1] : '0'}`);
  
} catch (error) {
  console.error('\n❌ ERROR:');
  console.error(error.message);
  if (error.stdout) {
    console.error('\nSTDOUT:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('\nSTDERR:', error.stderr.toString());
  }
}


