#!/usr/bin/env node
/**
 * APPLY MIGRATION
 * ===============
 * Applies SQL migration files to your Supabase database
 * 
 * Usage: node apply-migration.js migrations/exec_sql_functions.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'public'
  }
});

const filePath = process.argv[2];

if (!filePath) {
  console.log(`
📊 APPLY MIGRATION
==================

Usage: node apply-migration.js <sql-file>

Example: node apply-migration.js migrations/exec_sql_functions.sql
  `);
  process.exit(0);
}

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');

// Split by semicolons but preserve them, and filter out comments/empty
const statements = sql
  .split(/(?<=;)/g)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`
╔════════════════════════════════════════════════════════════╗
║          📊 APPLYING MIGRATION                             ║
╚════════════════════════════════════════════════════════════╝
  File: ${path.basename(filePath)}
  Statements: ${statements.length}
`);

async function applyMigration() {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
    
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}`);

    try {
      // Use raw SQL via postgrest-js
      const { error } = await supabase.rpc('exec_sql_modify', { sql_query: stmt });
      
      if (error) {
        // If exec_sql_modify doesn't exist yet, we need to create it first
        if (error.code === 'PGRST202') {
          console.log(' ⏭️  (exec_sql not available yet)');
          // This is expected for the first migration
          continue;
        }
        throw error;
      }
      
      console.log(' ✅');
      success++;
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║          📊 MIGRATION COMPLETE                             ║
╚════════════════════════════════════════════════════════════╝
  ✅ Successful: ${success}
  ❌ Failed: ${failed}
`);

  if (failed > 0) {
    console.log(`
⚠️  Some statements failed. You may need to run the SQL manually:
    1. Go to Supabase Dashboard → SQL Editor
    2. Paste the contents of: ${filePath}
    3. Click "Run"
`);
  }
}

applyMigration();
