#!/usr/bin/env tsx

/**
 * Cleanup old VC data to manage storage
 * Run monthly to keep database lean
 */

import { supabase } from '../src/lib/supabase';

async function cleanupOldData() {
  console.log('🧹 Starting database cleanup...\n');
  
  const results = {
    newsDeleted: 0,
    adviceDeleted: 0,
    activityDeleted: 0
  };
  
  try {
    // 1. Delete news older than 90 days
    console.log('📰 Cleaning old news articles...');
    const { data: oldNews, error: newsError } = await supabase
      .from('investor_news')
      .delete()
      .lt('published_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .select('id');
    
    if (newsError) {
      console.error('❌ Error deleting old news:', newsError);
    } else {
      results.newsDeleted = oldNews?.length || 0;
      console.log(`✅ Deleted ${results.newsDeleted} old news articles`);
    }
    
    // 2. Delete advice older than 180 days
    console.log('\n📝 Cleaning old advice articles...');
    const { data: oldAdvice, error: adviceError } = await supabase
      .from('investor_advice')
      .delete()
      .lt('published_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .select('id');
    
    if (adviceError) {
      console.error('❌ Error deleting old advice:', adviceError);
    } else {
      results.adviceDeleted = oldAdvice?.length || 0;
      console.log(`✅ Deleted ${results.adviceDeleted} old advice articles`);
    }
    
    // 3. Delete activity older than 60 days
    console.log('\n📊 Cleaning old activity records...');
    const { data: oldActivity, error: activityError } = await supabase
      .from('investor_activity')
      .delete()
      .lt('activity_date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .select('id');
    
    if (activityError) {
      console.error('❌ Error deleting old activity:', activityError);
    } else {
      results.activityDeleted = oldActivity?.length || 0;
      console.log(`✅ Deleted ${results.activityDeleted} old activity records`);
    }
    
    // 4. Get storage stats after cleanup
    console.log('\n📊 Current database stats:');
    
    const { count: newsCount } = await supabase
      .from('investor_news')
      .select('*', { count: 'exact', head: true });
    
    const { count: adviceCount } = await supabase
      .from('investor_advice')
      .select('*', { count: 'exact', head: true });
    
    const { count: partnersCount } = await supabase
      .from('investor_partners')
      .select('*', { count: 'exact', head: true });
    
    const { count: investmentsCount } = await supabase
      .from('investor_investments')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   News articles: ${newsCount || 0}`);
    console.log(`   Advice articles: ${adviceCount || 0}`);
    console.log(`   Partners: ${partnersCount || 0}`);
    console.log(`   Investments: ${investmentsCount || 0}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ News deleted: ${results.newsDeleted}`);
    console.log(`✅ Advice deleted: ${results.adviceDeleted}`);
    console.log(`✅ Activity deleted: ${results.activityDeleted}`);
    console.log(`📊 Total records removed: ${results.newsDeleted + results.adviceDeleted + results.activityDeleted}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupOldData().catch(console.error);
