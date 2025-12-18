#!/usr/bin/env node
/**
 * Quick Health Check Script
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runHealthCheck() {
  console.log('\n' + '='.repeat(70));
  console.log('               🏥 HOT MATCH SYSTEM HEALTH CHECK');
  console.log('               ' + new Date().toISOString());
  console.log('='.repeat(70));

  // 1. DATABASE COUNTS
  console.log('\n📊 DATABASE STATUS\n');
  
  const tables = [
    'investors',
    'startups',
    'startup_uploads',
    'discovered_startups',
    'rss_sources',
    'rss_articles',
    'startup_investor_matches'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`   ❌ ${table.padEnd(30)} ERROR: ${error.message}`);
    } else {
      console.log(`   ✅ ${table.padEnd(30)} ${count} records`);
    }
  }

  // 2. ENRICHMENT STATUS - INVESTORS
  console.log('\n👤 INVESTOR ENRICHMENT STATUS\n');
  
  const { data: investors } = await supabase
    .from('investors')
    .select('website, linkedin_url, investment_thesis, check_size_min, embedding, god_score')
    .limit(1000);
  
  if (investors) {
    const total = investors.length;
    const stats = {
      website: investors.filter(i => i.website).length,
      linkedin: investors.filter(i => i.linkedin_url).length,
      thesis: investors.filter(i => i.investment_thesis).length,
      checkSize: investors.filter(i => i.check_size_min).length,
      embedding: investors.filter(i => i.embedding).length,
      godScore: investors.filter(i => i.god_score).length
    };
    
    console.log(`   Website:          ${stats.website}/${total} (${Math.round(stats.website/total*100)}%)`);
    console.log(`   LinkedIn:         ${stats.linkedin}/${total} (${Math.round(stats.linkedin/total*100)}%)`);
    console.log(`   Investment Thesis: ${stats.thesis}/${total} (${Math.round(stats.thesis/total*100)}%)`);
    console.log(`   Check Size:       ${stats.checkSize}/${total} (${Math.round(stats.checkSize/total*100)}%)`);
    console.log(`   AI Embedding:     ${stats.embedding}/${total} (${Math.round(stats.embedding/total*100)}%)`);
    console.log(`   GOD Score:        ${stats.godScore}/${total} (${Math.round(stats.godScore/total*100)}%)`);
  }

  // 3. ENRICHMENT STATUS - STARTUPS
  console.log('\n🚀 STARTUP ENRICHMENT STATUS\n');
  
  const { data: startups } = await supabase
    .from('startups')
    .select('description, industry, funding, website, embedding, god_score, five_points')
    .limit(500);
  
  if (startups) {
    const total = startups.length;
    const stats = {
      description: startups.filter(s => s.description).length,
      industry: startups.filter(s => s.industry).length,
      funding: startups.filter(s => s.funding).length,
      website: startups.filter(s => s.website).length,
      embedding: startups.filter(s => s.embedding).length,
      godScore: startups.filter(s => s.god_score).length,
      fivePoints: startups.filter(s => s.five_points && s.five_points.length > 0).length
    };
    
    console.log(`   Description:      ${stats.description}/${total} (${Math.round(stats.description/total*100)}%)`);
    console.log(`   Industry:         ${stats.industry}/${total} (${Math.round(stats.industry/total*100)}%)`);
    console.log(`   Funding:          ${stats.funding}/${total} (${Math.round(stats.funding/total*100)}%)`);
    console.log(`   Website:          ${stats.website}/${total} (${Math.round(stats.website/total*100)}%)`);
    console.log(`   AI Embedding:     ${stats.embedding}/${total} (${Math.round(stats.embedding/total*100)}%)`);
    console.log(`   GOD Score:        ${stats.godScore}/${total} (${Math.round(stats.godScore/total*100)}%)`);
    console.log(`   Five Points:      ${stats.fivePoints}/${total} (${Math.round(stats.fivePoints/total*100)}%)`);
  }

  // 4. RSS SCRAPER STATUS
  console.log('\n📡 RSS SCRAPER STATUS\n');
  
  const { data: rssSources } = await supabase
    .from('rss_sources')
    .select('url, last_scraped, is_active, error_count')
    .eq('is_active', true);
  
  if (rssSources) {
    const total = rssSources.length;
    const now = new Date();
    const recentlyScraped = rssSources.filter(s => {
      if (!s.last_scraped) return false;
      const lastScraped = new Date(s.last_scraped);
      return (now - lastScraped) < 2 * 60 * 60 * 1000; // 2 hours
    }).length;
    const neverScraped = rssSources.filter(s => !s.last_scraped).length;
    const withErrors = rssSources.filter(s => s.error_count > 0).length;
    
    console.log(`   Active Sources:      ${total}`);
    console.log(`   Recently Scraped:    ${recentlyScraped} (last 2 hours)`);
    console.log(`   Never Scraped:       ${neverScraped}`);
    console.log(`   Sources with Errors: ${withErrors}`);
    
    if (neverScraped > 0 || recentlyScraped === 0) {
      console.log(`   ⚠️  WARNING: RSS scraping may be stalled`);
    }
  }

  // 5. RECENT ARTICLES
  const { data: recentArticles } = await supabase
    .from('rss_articles')
    .select('id')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  console.log(`   Articles (24h):      ${recentArticles ? recentArticles.length : 0}`);

  // 6. MATCHING ENGINE STATUS
  console.log('\n🎯 MATCHING ENGINE STATUS\n');
  
  const { data: recentMatches } = await supabase
    .from('startup_investor_matches')
    .select('score, reasoning, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (recentMatches && recentMatches.length > 0) {
    const withReasoning = recentMatches.filter(m => m.reasoning).length;
    const avgScore = Math.round(recentMatches.reduce((sum, m) => sum + (m.score || 0), 0) / recentMatches.length);
    const lastMatch = new Date(recentMatches[0].created_at);
    const minutesAgo = Math.round((Date.now() - lastMatch) / 1000 / 60);
    
    console.log(`   Last Match:          ${minutesAgo} minutes ago`);
    console.log(`   Avg Score (last 10): ${avgScore}%`);
    console.log(`   With Reasoning:      ${withReasoning}/10`);
  } else {
    console.log(`   ⚠️  No recent matches found`);
  }

  // 7. GOD SCORING STATUS
  console.log('\n🏆 GOD SCORING STATUS\n');
  
  const { data: godInvestors } = await supabase
    .from('investors')
    .select('god_score')
    .not('god_score', 'is', null)
    .order('god_score', { ascending: false })
    .limit(100);
  
  if (godInvestors && godInvestors.length > 0) {
    const elite = godInvestors.filter(i => i.god_score >= 80).length;
    const strong = godInvestors.filter(i => i.god_score >= 60 && i.god_score < 80).length;
    const solid = godInvestors.filter(i => i.god_score >= 40 && i.god_score < 60).length;
    
    console.log(`   Investors with GOD Score: ${godInvestors.length}`);
    console.log(`   Elite (80+):       ${elite}`);
    console.log(`   Strong (60-79):    ${strong}`);
    console.log(`   Solid (40-59):     ${solid}`);
  } else {
    console.log(`   ⚠️  No GOD scores found`);
  }

  // 8. ISSUES SUMMARY
  console.log('\n' + '='.repeat(70));
  console.log('               🔥 ISSUES & RECOMMENDATIONS');
  console.log('='.repeat(70) + '\n');
  
  const issues = [];
  
  // Check RSS
  if (rssSources) {
    const neverScraped = rssSources.filter(s => !s.last_scraped).length;
    if (neverScraped > 10) {
      issues.push({
        severity: 'HIGH',
        issue: `${neverScraped} RSS sources never scraped`,
        fix: 'Run: node discover-startups-from-rss.js'
      });
    }
  }
  
  // Check embeddings
  if (investors) {
    const noEmbed = investors.filter(i => !i.embedding).length;
    if (noEmbed > 10) {
      issues.push({
        severity: 'MEDIUM',
        issue: `${noEmbed} investors without embeddings`,
        fix: 'Run: node generate-embeddings.js --investors'
      });
    }
  }
  
  // Check GOD scores
  if (startups) {
    const noGod = startups.filter(s => !s.god_score).length;
    if (noGod > 50) {
      issues.push({
        severity: 'MEDIUM',
        issue: `${noGod} startups without GOD scores`,
        fix: 'Run: node recalculate-god-scores.js'
      });
    }
  }
  
  if (issues.length === 0) {
    console.log('   ✅ No critical issues detected\n');
  } else {
    issues.forEach((issue, i) => {
      const icon = issue.severity === 'HIGH' ? '🔴' : '🟡';
      console.log(`   ${icon} [${issue.severity}] ${issue.issue}`);
      console.log(`      → Fix: ${issue.fix}\n`);
    });
  }
  
  console.log('='.repeat(70) + '\n');
}

runHealthCheck().catch(console.error);
