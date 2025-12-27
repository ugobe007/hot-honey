#!/usr/bin/env node
/**
 * RSS Scraper Runner - wrapper for funding-scraper.js
 */
require('dotenv').config();
const { execSync } = require('child_process');

console.log('Running RSS/Funding Scraper...');

try {
  execSync('node scrapers/funding-scraper.js', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
} catch (e) {
  console.error('Scraper error:', e.message);
  process.exit(1);
}
