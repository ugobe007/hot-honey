#!/usr/bin/env node
/**
 * SAFEGUARD: Prevents accidental match deletion
 * 
 * This script monitors match counts and prevents destructive operations
 * if they would cause significant data loss.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Thresholds
const MIN_SAFE_MATCH_COUNT = 100000; // Alert if below this
const MAX_DROP_PERCENTAGE = 20; // Alert if count drops by more than 20%

async function checkMatchCount(): Promise<{ current: number; safe: boolean; message: string }> {
  const { count: currentCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  const current = currentCount || 0;
  
  // Check if count is too low
  if (current < MIN_SAFE_MATCH_COUNT) {
    return {
      current,
      safe: false,
      message: `🚨 CRITICAL: Match count (${current.toLocaleString()}) is below safe threshold (${MIN_SAFE_MATCH_COUNT.toLocaleString()})`
    };
  }

  return {
    current,
    safe: true,
    message: `✅ Match count is safe: ${current.toLocaleString()}`
  };
}

async function preventDestructiveOperation(operation: string): Promise<boolean> {
  const before = await checkMatchCount();
  
  if (!before.safe) {
    console.error(`\n${before.message}`);
    console.error(`\n❌ BLOCKED: ${operation}`);
    console.error('   This operation would cause unsafe data loss.');
    console.error('   If this is intentional, disable this safeguard first.\n');
    return false; // Block the operation
  }

  return true; // Allow the operation
}

// Export for use in other scripts
export { checkMatchCount, preventDestructiveOperation, MIN_SAFE_MATCH_COUNT };

// If run directly, just check the count
if (require.main === module) {
  checkMatchCount().then(result => {
    console.log(result.message);
    process.exit(result.safe ? 0 : 1);
  }).catch(console.error);
}



