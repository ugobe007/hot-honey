/**
 * Signal Ingestion Script
 * Run manually or via cron to ingest signals from VC/founder blogs
 */

import dotenv from 'dotenv';
dotenv.config();

import { ingestSignals, aggregateSignalTrends } from '../server/services/signalIngestionService.js';

async function main() {
  console.log('='.repeat(60));
  console.log('  SIGNAL INGESTION');
  console.log('='.repeat(60));
  console.log('');
  
  // Ingest new signals
  const result = await ingestSignals();
  
  console.log('');
  console.log('By source:');
  for (const [source, count] of Object.entries(result.bySource)) {
    if (count > 0) console.log(`  ${source}: ${count}`);
  }
  
  console.log('');
  console.log('Aggregating trends...');
  await aggregateSignalTrends(7); // Last 7 days
  
  console.log('');
  console.log('Done!');
}

main().catch(console.error);
