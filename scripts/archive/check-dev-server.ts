#!/usr/bin/env node
/**
 * Quick check for dev server issues
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Checking for common dev server issues...\n');

// Check if recharts is installed
try {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  if (packageJson.dependencies?.recharts) {
    console.log('✅ recharts is installed');
  } else {
    console.log('❌ recharts is NOT installed');
    console.log('   Run: npm install recharts');
  }
} catch (error) {
  console.log('⚠️  Could not check package.json');
}

// Check if StartupBenchmarksDashboard has syntax errors
try {
  const benchmarkFile = readFileSync(join(process.cwd(), 'src/pages/StartupBenchmarksDashboard.tsx'), 'utf-8');
  
  // Basic checks
  const openBraces = (benchmarkFile.match(/{/g) || []).length;
  const closeBraces = (benchmarkFile.match(/}/g) || []).length;
  
  if (openBraces === closeBraces) {
    console.log('✅ StartupBenchmarksDashboard.tsx has balanced braces');
  } else {
    console.log(`❌ StartupBenchmarksDashboard.tsx has unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  // Check for export default
  if (benchmarkFile.includes('export default')) {
    console.log('✅ StartupBenchmarksDashboard.tsx has default export');
  } else {
    console.log('❌ StartupBenchmarksDashboard.tsx missing default export');
  }
  
  // Check for recharts import
  if (benchmarkFile.includes('from \'recharts\'')) {
    console.log('✅ StartupBenchmarksDashboard.tsx imports recharts');
  } else {
    console.log('❌ StartupBenchmarksDashboard.tsx missing recharts import');
  }
  
} catch (error: any) {
  console.log(`❌ Error reading StartupBenchmarksDashboard.tsx: ${error.message}`);
}

console.log('\n💡 If all checks pass, try:');
console.log('   1. Stop the dev server (Ctrl+C)');
console.log('   2. Clear cache: rm -rf node_modules/.vite');
console.log('   3. Restart: npm run dev');



