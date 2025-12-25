require('dotenv').config();
const { batchAdd, generateMatchesForNew } = require('./auto-ingest');
const STARTUP_DATABASE = require('./startup-database');

async function runDailyIngest() {
  console.log('=== DAILY STARTUP INGESTION ===\n');
  console.log('Date:', new Date().toISOString().split('T')[0]);
  console.log('Database size:', STARTUP_DATABASE.length, 'startups\n');
  
  // Add all startups from database
  const result = await batchAdd(STARTUP_DATABASE);
  
  console.log('\n--- Generating matches for new startups ---');
  await generateMatchesForNew();
  
  console.log('\n=== COMPLETE ===');
}

runDailyIngest();
