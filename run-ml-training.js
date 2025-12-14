#!/usr/bin/env node

/**
 * ML Training Runner
 * Run this script to execute the ML training cycle for the GOD algorithm
 * 
 * Usage:
 *   node run-ml-training.js
 *   npm run ml-train (if you add the script to package.json)
 */

import { runMLTrainingCycle } from './server/services/mlTrainingService.js';

console.log('\n' + '='.repeat(80));
console.log('🤖 MACHINE LEARNING TRAINING FOR GOD ALGORITHM');
console.log('='.repeat(80) + '\n');

console.log('Starting ML training cycle...\n');

// Run the training cycle
runMLTrainingCycle()
  .then(() => {
    console.log('\n' + '='.repeat(80));
    console.log('✅ ML TRAINING COMPLETE!');
    console.log('='.repeat(80));
    console.log('\nNext steps:');
    console.log('1. Check recommendations in ML Dashboard: /admin/ml-dashboard');
    console.log('2. Review suggested weight changes');
    console.log('3. Apply high-confidence recommendations');
    console.log('4. Monitor performance improvements\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error running ML training:', error);
    process.exit(1);
  });
