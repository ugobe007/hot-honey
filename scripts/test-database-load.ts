#!/usr/bin/env node
/**
 * Test database queries that run on page load
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log('🔍 Testing database queries that run on page load...\n');

  // Test 1: startup_uploads query (from store.ts)
  console.log('1. Testing startup_uploads query (from store.ts)...');
  try {
    const { data, error, count } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    
    if (error) {
      console.log('   ❌ ERROR:', error.message, error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log(`   ✅ SUCCESS: Found ${count} approved startups`);
    }
  } catch (err: any) {
    console.log('   ❌ EXCEPTION:', err.message);
  }

  // Test 2: startup_uploads with select *
  console.log('\n2. Testing startup_uploads select * (limit 1)...');
  try {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .limit(1);
    
    if (error) {
      console.log('   ❌ ERROR:', error.message, error.code);
    } else {
      console.log('   ✅ SUCCESS: Query works');
      if (data && data.length > 0) {
        const sample = data[0];
        console.log('   Sample columns:', Object.keys(sample).length, 'columns');
        console.log('   Has benchmark_score:', 'benchmark_score' in sample);
        console.log('   Has total_god_score:', 'total_god_score' in sample);
        console.log('   Has match_count:', 'match_count' in sample);
      }
    }
  } catch (err: any) {
    console.log('   ❌ EXCEPTION:', err.message);
  }

  // Test 3: startup_investor_matches count
  console.log('\n3. Testing startup_investor_matches count...');
  try {
    const { count, error } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ ERROR:', error.message, error.code);
    } else {
      console.log(`   ✅ SUCCESS: Found ${count} matches`);
    }
  } catch (err: any) {
    console.log('   ❌ EXCEPTION:', err.message);
  }

  // Test 4: benchmark_score column
  console.log('\n4. Testing benchmark_score column...');
  try {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('id, name, benchmark_score')
      .eq('status', 'approved')
      .limit(1);
    
    if (error) {
      console.log('   ❌ ERROR:', error.message, error.code);
      if (error.code === '42703') {
        console.log('   ⚠️  Column benchmark_score does not exist!');
        console.log('   💡 Run: npx tsx supabase/migrations/add_benchmark_score.sql');
      }
    } else {
      console.log('   ✅ SUCCESS: benchmark_score column exists');
      if (data && data.length > 0) {
        console.log('   Sample:', { name: data[0].name, benchmark_score: data[0].benchmark_score });
      }
    }
  } catch (err: any) {
    console.log('   ❌ EXCEPTION:', err.message);
  }

  // Test 5: investors table
  console.log('\n5. Testing investors table...');
  try {
    const { count, error } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ ERROR:', error.message, error.code);
    } else {
      console.log(`   ✅ SUCCESS: Found ${count} investors`);
    }
  } catch (err: any) {
    console.log('   ❌ EXCEPTION:', err.message);
  }

  console.log('\n✅ Database diagnostic complete!');
}

testQueries().catch(console.error);

