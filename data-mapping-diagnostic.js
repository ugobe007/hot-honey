/**
 * 🔬 HOT MONEY HONEY - DATA MAPPING DIAGNOSTIC
 * 
 * This script identifies the #1 AI Copilot blindspot:
 * Code works but data isn't connected properly.
 * 
 * USAGE:
 * 1. Open your app in browser (http://localhost:5175)
 * 2. Open DevTools Console (F12)
 * 3. Copy/paste this entire script and hit Enter
 * 4. Wait for results
 * 
 * The diagnostic will:
 * - Test database connection
 * - Check if data is loading
 * - Analyze field structure
 * - Identify mapping issues
 * - Show what GOD algorithm receives vs what it should receive
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     🔬 DATA MAPPING DIAGNOSTIC TOOL                            ║
║     Finding where data gets lost                               ║
╚════════════════════════════════════════════════════════════════╝
`);

// ============================================================
// TEST 1: Supabase Connection
// ============================================================

async function testSupabaseConnection() {
  console.log('\n📡 TEST 1: Supabase Connection');
  console.log('─'.repeat(50));
  
  try {
    // Try to access supabase client (may be on window or imported)
    let client = window.supabase || null;
    
    if (!client) {
      // Try common patterns
      console.log('Looking for Supabase client...');
      
      // Check if it's in a module
      if (typeof window.__SUPABASE_CLIENT__ !== 'undefined') {
        client = window.__SUPABASE_CLIENT__;
      }
    }
    
    if (!client) {
      console.log('❌ Supabase client not found on window');
      console.log('   Trying to import dynamically...');
      
      // Try dynamic import
      try {
        const module = await import('/src/lib/supabase.ts');
        client = module.supabase || module.default;
      } catch (importError) {
        console.log('   Could not import supabase module');
      }
    }
    
    if (!client) {
      console.log('❌ Supabase client not accessible');
      console.log('   To test, you need to expose the client globally');
      console.log('   Add this to src/lib/supabase.ts:');
      console.log('   window.supabase = supabase;');
      return null;
    }
    
    console.log('✅ Supabase client found');
    return client;
  } catch (error) {
    console.error('❌ Error accessing Supabase:', error);
    return null;
  }
}

// ============================================================
// TEST 2: Database Query Test
// ============================================================

async function testDatabaseQueries(supabase) {
  console.log('\n📊 TEST 2: Database Queries');
  console.log('─'.repeat(50));
  
  if (!supabase) {
    console.log('⏭️  Skipping - no Supabase client');
    return { startups: [], investors: [] };
  }
  
  // Test startup_uploads query
  console.log('\nQuerying startup_uploads...');
  const { data: startups, error: startupError } = await supabase
    .from('startup_uploads')
    .select('*')
    .limit(3);
  
  if (startupError) {
    console.error('❌ Startup query failed:', startupError.message);
  } else if (!startups?.length) {
    console.error('❌ Startup query returned EMPTY');
  } else {
    console.log(`✅ Found ${startups.length} startups`);
  }
  
  // Test investors query
  console.log('\nQuerying investors...');
  const { data: investors, error: investorError } = await supabase
    .from('investors')
    .select('*')
    .limit(3);
  
  if (investorError) {
    console.error('❌ Investor query failed:', investorError.message);
  } else if (!investors?.length) {
    console.error('❌ Investor query returned EMPTY');
  } else {
    console.log(`✅ Found ${investors.length} investors`);
  }
  
  return { startups: startups || [], investors: investors || [] };
}

// ============================================================
// TEST 3: Field Structure Analysis
// ============================================================

function analyzeFieldStructure(data, type) {
  console.log(`\n🔍 TEST 3: ${type} Field Structure`);
  console.log('─'.repeat(50));
  
  if (!data?.length) {
    console.log(`⏭️  No ${type} data to analyze`);
    return;
  }
  
  const sample = data[0];
  console.log(`\nSample ${type} record:`);
  console.log('Name:', sample.name || 'N/A');
  
  // List all top-level fields
  console.log('\nTop-level fields:');
  Object.keys(sample).forEach(key => {
    const value = sample[key];
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    const preview = valueType === 'object' && value !== null ? '[object]' : 
                    valueType === 'array' ? `[${value.length} items]` :
                    String(value).substring(0, 50);
    console.log(`  • ${key}: ${valueType} = ${preview}`);
  });
  
  // Check for nested extracted_data
  if (sample.extracted_data) {
    console.log('\nextracted_data fields:');
    Object.keys(sample.extracted_data).forEach(key => {
      const value = sample.extracted_data[key];
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      const preview = valueType === 'object' && value !== null ? '[object]' : 
                      valueType === 'array' ? `[${value.length} items]` :
                      String(value).substring(0, 50);
      console.log(`  • extracted_data.${key}: ${valueType} = ${preview}`);
    });
  }
}

// ============================================================
// TEST 4: GOD Algorithm Expected vs Actual Fields
// ============================================================

function checkGODFieldMapping(startup) {
  console.log('\n🧮 TEST 4: GOD Algorithm Field Mapping');
  console.log('─'.repeat(50));
  
  if (!startup) {
    console.log('⏭️  No startup data to check');
    return;
  }
  
  // Fields GOD algorithm expects
  const expectedFields = [
    'team',
    'traction',
    'revenue',
    'sectors',
    'stage',
    'raise_amount',
    'market_size',
    'product',
    'pitch',
    'description'
  ];
  
  console.log('\nChecking field availability:');
  console.log('(GOD expects these fields on startup object)\n');
  
  const issues = [];
  
  expectedFields.forEach(field => {
    // Check top level
    const topLevel = startup[field];
    // Check in extracted_data
    const nested = startup.extracted_data?.[field];
    
    const topExists = topLevel !== undefined && topLevel !== null && topLevel !== 'undefined';
    const nestedExists = nested !== undefined && nested !== null && nested !== 'undefined';
    
    let status, location;
    
    if (topExists) {
      status = '✅';
      location = `startup.${field}`;
    } else if (nestedExists) {
      status = '⚠️';
      location = `startup.extracted_data.${field}`;
      issues.push({
        field,
        problem: 'Data in extracted_data but GOD may look at top level',
        fix: `Use startup.extracted_data?.${field} || startup.${field}`
      });
    } else {
      status = '❌';
      location = 'NOT FOUND';
      issues.push({
        field,
        problem: 'Field not found anywhere',
        fix: 'Check database schema or add default value'
      });
    }
    
    console.log(`${status} ${field.padEnd(15)} → ${location}`);
  });
  
  // Report issues
  if (issues.length > 0) {
    console.log('\n🚨 MAPPING ISSUES FOUND:');
    issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.field}`);
      console.log(`   Problem: ${issue.problem}`);
      console.log(`   Fix: ${issue.fix}`);
    });
  } else {
    console.log('\n✅ All expected fields found at top level');
  }
  
  return issues;
}

// ============================================================
// TEST 5: Investor Field Mapping
// ============================================================

function checkInvestorFieldMapping(investor) {
  console.log('\n💼 TEST 5: Investor Field Mapping');
  console.log('─'.repeat(50));
  
  if (!investor) {
    console.log('⏭️  No investor data to check');
    return;
  }
  
  // Fields GOD algorithm expects for matching
  const expectedFields = [
    { name: 'sectors', type: 'array' },
    { name: 'stage', type: 'array' },
    { name: 'stages', type: 'array' },  // Alternative name
    { name: 'check_size', type: 'string' },
    { name: 'checkSize', type: 'string' },  // Alternative name
    { name: 'geography', type: 'string' },
    { name: 'type', type: 'string' }
  ];
  
  console.log('\nChecking investor fields:\n');
  
  const issues = [];
  
  expectedFields.forEach(({ name, type }) => {
    const value = investor[name];
    const exists = value !== undefined && value !== null;
    const hasData = exists && (Array.isArray(value) ? value.length > 0 : value !== '');
    
    let status;
    if (hasData) {
      status = '✅';
    } else if (exists) {
      status = '⚠️';
      issues.push({ field: name, problem: 'Field exists but empty' });
    } else {
      status = '❌';
      issues.push({ field: name, problem: 'Field not found' });
    }
    
    const preview = hasData ? 
      (Array.isArray(value) ? `[${value.slice(0, 2).join(', ')}...]` : value) : 
      'N/A';
    
    console.log(`${status} ${name.padEnd(15)} = ${preview}`);
  });
  
  if (issues.length > 0) {
    console.log('\n🚨 INVESTOR DATA ISSUES:');
    issues.forEach(issue => {
      console.log(`   • ${issue.field}: ${issue.problem}`);
    });
  }
  
  return issues;
}

// ============================================================
// TEST 6: Simulate GOD Algorithm Input
// ============================================================

function simulateGODInput(startup, investor) {
  console.log('\n🎯 TEST 6: Simulated GOD Algorithm Input');
  console.log('─'.repeat(50));
  
  // This is what GOD algorithm likely receives based on current code
  const currentInput = {
    startup: {
      team: startup?.team,
      traction: startup?.traction,
      revenue: startup?.revenue,
      sectors: startup?.sectors,
      stage: startup?.stage,
    },
    investor: {
      sectors: investor?.sectors,
      stages: investor?.stages || investor?.stage,
      checkSize: investor?.checkSize || investor?.check_size,
      geography: investor?.geography,
    }
  };
  
  // This is what it SHOULD receive with proper mapping
  const correctedInput = {
    startup: {
      team: startup?.team || startup?.extracted_data?.team || '',
      traction: startup?.traction || startup?.extracted_data?.traction || '',
      revenue: startup?.revenue || startup?.extracted_data?.revenue || 0,
      sectors: startup?.sectors || startup?.extracted_data?.sectors || [],
      stage: startup?.stage || 0,
    },
    investor: {
      sectors: investor?.sectors || [],
      stages: investor?.stages || investor?.stage || [],
      checkSize: investor?.checkSize || investor?.check_size || '',
      geography: investor?.geography || '',
    }
  };
  
  console.log('\nCURRENT INPUT (may have undefined values):');
  console.log(JSON.stringify(currentInput, null, 2));
  
  console.log('\nCORRECTED INPUT (with fallbacks):');
  console.log(JSON.stringify(correctedInput, null, 2));
  
  // Check for differences
  const startupDiffs = [];
  const investorDiffs = [];
  
  Object.keys(currentInput.startup).forEach(key => {
    const current = currentInput.startup[key];
    const corrected = correctedInput.startup[key];
    if (current === undefined && corrected !== undefined) {
      startupDiffs.push(key);
    }
  });
  
  Object.keys(currentInput.investor).forEach(key => {
    const current = currentInput.investor[key];
    const corrected = correctedInput.investor[key];
    if (current === undefined && corrected !== undefined) {
      investorDiffs.push(key);
    }
  });
  
  if (startupDiffs.length > 0 || investorDiffs.length > 0) {
    console.log('\n🚨 FIELDS THAT NEED FALLBACK MAPPING:');
    if (startupDiffs.length) console.log('   Startup:', startupDiffs.join(', '));
    if (investorDiffs.length) console.log('   Investor:', investorDiffs.join(', '));
  } else {
    console.log('\n✅ All fields properly mapped with fallbacks');
  }
}

// ============================================================
// RUN ALL TESTS
// ============================================================

async function runDiagnostics() {
  console.log('\n🚀 Starting diagnostics...\n');
  
  try {
    // Test 1
    const supabase = await testSupabaseConnection();
    
    // Test 2
    const { startups, investors } = await testDatabaseQueries(supabase);
    
    // Test 3
    if (startups.length) analyzeFieldStructure(startups, 'Startup');
    if (investors.length) analyzeFieldStructure(investors, 'Investor');
    
    // Test 4
    if (startups.length) checkGODFieldMapping(startups[0]);
    
    // Test 5
    if (investors.length) checkInvestorFieldMapping(investors[0]);
    
    // Test 6
    if (startups.length && investors.length) {
      simulateGODInput(startups[0], investors[0]);
    }
    
    // Summary
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    DIAGNOSTIC COMPLETE                         ║
╚════════════════════════════════════════════════════════════════╝

📋 NEXT STEPS:

If you see undefined values in the GOD input, the fix is:

1. In matchingService.ts, update field access to use fallbacks:

   // BEFORE (broken):
   const team = startup.team;
   
   // AFTER (fixed):
   const team = startup.team || startup.extracted_data?.team || '';

2. Or create a data transformation layer that maps fields
   before passing to the scoring function:
   
   function mapStartupData(raw) {
     return {
       team: raw.team || raw.extracted_data?.team || [],
       traction: raw.traction || raw.extracted_data?.traction || '',
       revenue: raw.revenue || raw.extracted_data?.revenue || 0,
       // ... etc
     };
   }

3. Make sure investor fields match the schema:
   - sectors (array)
   - stages or stage (array)
   - check_size or checkSize (string)
   - geography (string)

📤 Share these results with your Copilot to fix the data mapping!
`);
  } catch (error) {
    console.error('\n❌ Diagnostic failed with error:', error);
    console.log('\nTry running individual test functions:');
    console.log('  await testSupabaseConnection()');
    console.log('  await testDatabaseQueries(supabase)');
  }
}

// ============================================================
// AUTO-RUN
// ============================================================

console.log('🏃 Running diagnostics automatically...');
console.log('(This may take a few seconds)\n');

runDiagnostics().catch(error => {
  console.error('Failed to run diagnostics:', error);
  console.log('\nYou can run tests manually:');
  console.log('  await testSupabaseConnection()');
  console.log('  await testDatabaseQueries(supabase)');
});

// Export functions for manual testing
window.dataDiagnostic = {
  runAll: runDiagnostics,
  testConnection: testSupabaseConnection,
  testQueries: testDatabaseQueries,
  analyzeFields: analyzeFieldStructure,
  checkGODMapping: checkGODFieldMapping,
  checkInvestorMapping: checkInvestorFieldMapping,
  simulateInput: simulateGODInput
};

console.log('\n💡 TIP: Access individual tests via window.dataDiagnostic');
console.log('   Example: await dataDiagnostic.testConnection()');
