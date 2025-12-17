#!/usr/bin/env node
/**
 * EXEC SQL - Direct SQL Execution Tool
 * =====================================
 * Bypasses PostgREST schema cache issues by using RPC functions.
 * 
 * Usage:
 *   node exec-sql.js "SELECT * FROM startup_uploads LIMIT 5"
 *   node exec-sql.js --modify "UPDATE startup_uploads SET updated_at = NOW() WHERE name = 'Test'"
 *   node exec-sql.js --file query.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse args
const args = process.argv.slice(2);
const isModify = args.includes('--modify');
const fileIndex = args.indexOf('--file');

let sql = '';

if (fileIndex !== -1) {
  const filePath = args[fileIndex + 1];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
  }
  sql = fs.readFileSync(filePath, 'utf8');
} else {
  // Get SQL from remaining args
  sql = args.filter(arg => arg !== '--modify').join(' ');
}

if (!sql.trim()) {
  console.log(`
📊 EXEC SQL - Direct SQL Execution Tool

Usage:
  node exec-sql.js "SELECT * FROM startup_uploads LIMIT 5"
  node exec-sql.js --modify "UPDATE startup_uploads SET updated_at = NOW() WHERE id = 'xxx'"
  node exec-sql.js --file query.sql

Options:
  --modify   Use for INSERT/UPDATE/DELETE (returns affected row count)
  --file     Read SQL from a file

Note: This bypasses PostgREST schema cache by using direct SQL functions.
  `);
  process.exit(0);
}

async function executeSql() {
  console.log('\n📊 Executing SQL...\n');
  console.log('Query:', sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
  console.log('');

  try {
    if (isModify) {
      // Use exec_sql_modify for INSERT/UPDATE/DELETE
      const { data, error } = await supabase.rpc('exec_sql_modify', { sql_query: sql });
      
      if (error) {
        // If RPC not found, try direct SQL workaround
        if (error.code === 'PGRST202') {
          console.log('⚠️  RPC not in schema cache, using direct approach...\n');
          // Execute via a direct query approach
          const result = await directExecute(sql, true);
          console.log('Result:', JSON.stringify(result, null, 2));
          return;
        }
        throw error;
      }
      
      console.log('✅ Result:', JSON.stringify(data, null, 2));
    } else {
      // Use exec_sql_rows for SELECT
      const { data, error } = await supabase.rpc('exec_sql_rows', { sql_query: sql });
      
      if (error) {
        // If RPC not found, try direct SQL workaround
        if (error.code === 'PGRST202') {
          console.log('⚠️  RPC not in schema cache, using direct approach...\n');
          const result = await directExecute(sql, false);
          console.log('Result:', JSON.stringify(result, null, 2));
          return;
        }
        throw error;
      }
      
      console.log('✅ Result:', JSON.stringify(data, null, 2));
      console.log(`\n📊 ${Array.isArray(data) ? data.length : 1} row(s) returned`);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

// Fallback direct execution using fetch
async function directExecute(sql, isModify) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${isModify ? 'exec_sql_modify' : 'exec_sql_rows'}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return response.json();
}

executeSql();
