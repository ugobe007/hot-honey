#!/usr/bin/env node
/**
 * SYSTEM HEALTH CHECK
 * ===================
 * Quick health check for all Hot Match systems.
 * 
 * Run: node system-health-check.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  try {
    const { data, error } = await supabase.rpc('exec_sql_rows', {
      sql_query: `
        SELECT 
          (SELECT COUNT(*) FROM investors) as investors,
          (SELECT COUNT(*) FROM startups) as startups,
          (SELECT COUNT(*) FROM discovered_startups) as discovered,
          (SELECT COUNT(*) FROM rss_articles) as articles,
          (SELECT COUNT(*) FROM startup_investor_matches) as matches
      `
    });
    
    if (error) throw error;
    return { status: 'ok', counts: data[0] };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function checkRecentActivity() {
  try {
    const { data, error } = await supabase.rpc('exec_sql_rows', {
      sql_query: `
        SELECT 
          (SELECT COUNT(*) FROM rss_articles WHERE created_at > NOW() - INTERVAL '24 hours') as articles_24h,
          (SELECT COUNT(*) FROM discovered_startups WHERE discovered_at > NOW() - INTERVAL '24 hours') as startups_24h,
          (SELECT COUNT(*) FROM investors WHERE last_scored_at > NOW() - INTERVAL '24 hours') as investors_scored_24h,
          (SELECT COUNT(*) FROM startup_investor_matches WHERE created_at > NOW() - INTERVAL '24 hours') as matches_24h
      `
    });
    
    if (error) throw error;
    return { status: 'ok', activity: data[0] };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function checkInvestorScores() {
  try {
    const { data, error } = await supabase.rpc('exec_sql_rows', {
      sql_query: `
        SELECT investor_tier, COUNT(*) as count
        FROM investors
        GROUP BY investor_tier
        ORDER BY investor_tier
      `
    });
    
    if (error) throw error;
    const tiers = {};
    data.forEach(r => tiers[r.investor_tier] = r.count);
    return { status: 'ok', tiers };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

async function main() {
  console.log('\n🏥 SYSTEM HEALTH CHECK\n');
  console.log('═'.repeat(50));
  
  // Database connectivity
  console.log('\n📊 Database Counts:');
  const dbCheck = await checkDatabase();
  if (dbCheck.status === 'ok') {
    const c = dbCheck.counts;
    console.log(`   ✅ Investors: ${c.investors}`);
    console.log(`   ✅ Startups: ${c.startups}`);
    console.log(`   ✅ Discovered: ${c.discovered}`);
    console.log(`   ✅ Articles: ${c.articles}`);
    console.log(`   ✅ Matches: ${c.matches}`);
  } else {
    console.log(`   ❌ Database error: ${dbCheck.error}`);
  }
  
  // Recent activity
  console.log('\n📈 Activity (last 24h):');
  const actCheck = await checkRecentActivity();
  if (actCheck.status === 'ok') {
    const a = actCheck.activity;
    console.log(`   📰 Articles scraped: ${a.articles_24h}`);
    console.log(`   🚀 Startups discovered: ${a.startups_24h}`);
    console.log(`   👥 Investors scored: ${a.investors_scored_24h}`);
    console.log(`   🎯 Matches created: ${a.matches_24h}`);
    
    // Warnings
    if (a.articles_24h === 0) console.log('   ⚠️  No articles in 24h - RSS may be down');
    if (a.investors_scored_24h === 0) console.log('   ⚠️  No scoring in 24h - run investor scoring');
  } else {
    console.log(`   ❌ Activity check error: ${actCheck.error}`);
  }
  
  // Investor tiers
  console.log('\n🏆 Investor Tiers:');
  const tierCheck = await checkInvestorScores();
  if (tierCheck.status === 'ok') {
    const t = tierCheck.tiers;
    console.log(`   🏆 Elite: ${t.elite || 0}`);
    console.log(`   💪 Strong: ${t.strong || 0}`);
    console.log(`   ✓  Solid: ${t.solid || 0}`);
    console.log(`   🌱 Emerging: ${t.emerging || 0}`);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Health check complete\n');
}

main().catch(console.error);
