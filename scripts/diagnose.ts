/**
 * HOT MATCH - SYSTEM DIAGNOSTIC
 * Run: npx tsx scripts/diagnose.ts
 */

import { readdirSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('\n🔥 HOT MATCH - SYSTEM DIAGNOSTIC\n');
console.log('═'.repeat(60) + '\n');

const pass = (msg: string) => console.log(`✅ PASS: ${msg}`);
const fail = (msg: string) => console.log(`❌ FAIL: ${msg}`);
const warn = (msg: string) => console.log(`⚠️  WARN: ${msg}`);
const info = (msg: string) => console.log(`ℹ️  INFO: ${msg}`);

// 1. FOLDER STRUCTURE
console.log('📁 FOLDER STRUCTURE\n' + '─'.repeat(60));
['src', 'src/components', 'src/lib', 'src/pages', 'public', 'scripts'].forEach(dir => {
  if (existsSync(dir)) {
    const files = readdirSync(dir).length;
    pass(`${dir}/ exists (${files} items)`);
  } else {
    fail(`${dir}/ MISSING`);
  }
});

// 2. KEY FILES
console.log('\n📄 KEY FILES\n' + '─'.repeat(60));
[
  'package.json',
  'src/App.tsx',
  'src/lib/supabase.ts',
  'src/components/MatchingEngine.tsx',
  '.env'
].forEach(file => {
  existsSync(file) ? pass(file) : fail(`${file} MISSING`);
});

// 3. ENV VARS
console.log('\n🔐 ENVIRONMENT\n' + '─'.repeat(60));
if (existsSync('.env')) {
  const env = readFileSync('.env', 'utf-8');
  env.includes('SUPABASE_URL') ? pass('SUPABASE_URL set') : fail('SUPABASE_URL missing');
  env.includes('SUPABASE_ANON_KEY') ? pass('SUPABASE_ANON_KEY set') : fail('SUPABASE_ANON_KEY missing');
} else {
  fail('.env file missing');
}

// 4. COMPONENTS COUNT
console.log('\n🧩 COMPONENTS\n' + '─'.repeat(60));
if (existsSync('src/components')) {
  const components = readdirSync('src/components').filter(f => f.endsWith('.tsx'));
  info(`${components.length} components found`);
  
  ['MatchingEngine', 'Header', 'LogoDropdownMenu'].forEach(comp => {
    const found = components.find(c => c.includes(comp));
    found ? pass(`${comp}.tsx`) : warn(`${comp} not found`);
  });
}

// 5. SCHEMA ISSUES - Search for bad field names
console.log('\n🔧 SCHEMA MISMATCH SCAN\n' + '─'.repeat(60));
try {
  const badFields = [
    { field: 'sector_focus', fix: 'sectors' },
    { field: 'stage_focus', fix: 'stage' },
    { field: "'god_score'", fix: 'match_score or total_god_score' }
  ];
  
  badFields.forEach(({ field, fix }) => {
    try {
      const result = execSync(`grep -rn "${field}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l`, { encoding: 'utf-8' });
      const count = parseInt(result.trim());
      if (count > 0) {
        warn(`'${field}' found ${count}x - should be '${fix}'`);
      }
    } catch (e) {
      // grep returns error if no matches, which is good
    }
  });
  pass('Schema scan complete');
} catch (e) {
  warn('Could not scan for schema issues');
}

// 6. YELLOW CIRCLE LOGO ISSUE
console.log('\n🎨 LOGO CIRCLE ISSUE\n' + '─'.repeat(60));
try {
  const result = execSync(`grep -rn "bg-yellow\\|bg-amber\\|rounded-full" src/components/*.tsx 2>/dev/null | grep -i logo`, { encoding: 'utf-8' });
  if (result) {
    warn('Potential yellow circle styling found:');
    console.log(result.split('\n').slice(0, 5).map(l => `   ${l}`).join('\n'));
  }
} catch (e) {
  pass('No obvious yellow circle styling found');
}

// 7. DATABASE TABLES
console.log('\n🗄️  DATABASE TABLES IN CODE\n' + '─'.repeat(60));
try {
  const result = execSync(`grep -rohE "from\\(['\"][a-z_]+['\"]\\)" src/ 2>/dev/null | sort -u`, { encoding: 'utf-8' });
  const tables = result.split('\n').filter(Boolean).map(t => t.replace(/from\(['"]|['"]\)/g, ''));
  info(`Tables referenced: ${tables.join(', ')}`);
} catch (e) {
  warn('Could not scan for table references');
}

// 8. NODE_MODULES
console.log('\n📦 DEPENDENCIES\n' + '─'.repeat(60));
existsSync('node_modules') ? pass('node_modules exists') : fail('Run: npm install');
existsSync('node_modules/@supabase') ? pass('@supabase/supabase-js installed') : fail('Supabase not installed');

// SUMMARY
console.log('\n' + '═'.repeat(60));
console.log('📊 DIAGNOSTIC COMPLETE');
console.log('═'.repeat(60));
console.log('\nNext steps:');
console.log('  1. Fix any FAIL items');
console.log('  2. Review WARN items');
console.log('  3. Run: npx tsx scripts/test-hotmatch.ts (database tests)');
console.log('');
