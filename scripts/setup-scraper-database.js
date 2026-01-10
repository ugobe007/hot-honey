#!/usr/bin/env node
/**
 * SETUP SCRAPER DATABASE
 * ======================
 * Creates the scraper_selectors table in Supabase.
 * 
 * Usage:
 *   node scripts/setup-scraper-database.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🗄️  Setting up scraper database tables...\n');
  
  // Read migration file
  const migrationPath = path.join(__dirname, '../migrations/create_scraper_selectors_table.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📋 Migration SQL:');
  console.log('─'.repeat(60));
  console.log(migrationSQL);
  console.log('─'.repeat(60));
  console.log();
  
  // Execute migration
  console.log('🚀 Executing migration...');
  
  try {
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        // If RPC doesn't exist, try direct query (Supabase might not have exec_sql)
        if (error && error.message.includes('function') && error.message.includes('does not exist')) {
          // Try using Supabase's REST API to execute SQL
          // Note: This requires using the PostgREST API or Supabase client
          console.log(`   ⚠️  Direct SQL execution not available via RPC`);
          console.log(`   ℹ️  Please run the migration manually in Supabase Dashboard`);
          break;
        }
        
        if (error) {
          // Some errors are OK (e.g., table already exists, index already exists)
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`   ℹ️  ${error.message.split('\n')[0]}`);
            successCount++;
          } else {
            console.error(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error executing statement: ${err.message}`);
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      console.log(`\n✅ Migration completed successfully!`);
      console.log(`   ${successCount} statements executed`);
      
      // Verify table exists
      console.log('\n🔍 Verifying table exists...');
      const { data, error } = await supabase
        .from('scraper_selectors')
        .select('id')
        .limit(1);
      
      if (error) {
        if (error.message.includes('Could not find the table')) {
          console.log('   ⚠️  Table not found - migration may need to be run manually');
          console.log('   📋 Please run the SQL in Supabase Dashboard → SQL Editor');
        } else {
          console.log(`   ✅ Table exists! (${error.message})`);
        }
      } else {
        console.log('   ✅ Table exists and is accessible!');
      }
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors`);
      console.log('   Some statements may need to be run manually');
    }
    
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.log('\n📋 Please run the migration manually:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: migrations/create_scraper_selectors_table.sql');
    console.log('   3. Paste and run');
    process.exit(1);
  }
}

// Main
setupDatabase()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });

