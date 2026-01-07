#!/usr/bin/env node

/**
 * DATA PARSING & MAPPING AUDIT REPORT
 * Analyzes all data tables for completeness and quality
 */

require('dotenv').config();
const { Client } = require('pg');

async function audit() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('               📊 DATA PARSING & MAPPING AUDIT REPORT              ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Generated:', new Date().toISOString());
  
  // 1. RSS ARTICLES
  console.log('\n\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 📰 RSS_ARTICLES - News & Funding Articles                        │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  const { rows: [rss] } = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(title) as title,
      COUNT(NULLIF(content, '')) as content,
      COUNT(NULLIF(summary, '')) as summary,
      COUNT(source) as source,
      COUNT(published_at) as published,
      COUNT(*) FILTER (WHERE array_length(companies_mentioned, 1) > 0) as companies,
      COUNT(*) FILTER (WHERE array_length(investors_mentioned, 1) > 0) as investors,
      COUNT(*) FILTER (WHERE array_length(funding_amounts, 1) > 0) as funding,
      COUNT(*) FILTER (WHERE ai_analyzed = true) as ai_done
    FROM rss_articles
  `);
  
  console.log('Total: ' + rss.total + ' articles');
  console.log('');
  console.log('FIELD               POPULATED    STATUS');
  console.log('─'.repeat(50));
  console.log(`title               ${rss.title}/${rss.total}        ${rss.title == rss.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`content             ${rss.content}/${rss.total}        ${rss.content == rss.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`summary             ${rss.summary}/${rss.total}         ${rss.summary > rss.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`source              ${rss.source}/${rss.total}        ${rss.source == rss.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`published_at        ${rss.published}/${rss.total}        ${rss.published == rss.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`companies_mentioned ${rss.companies}/${rss.total}          ${rss.companies > 0 ? '✅ OK' : '❌ NOT EXTRACTED'}`);
  console.log(`investors_mentioned ${rss.investors}/${rss.total}          ${rss.investors > 0 ? '✅ OK' : '❌ NOT EXTRACTED'}`);
  console.log(`funding_amounts     ${rss.funding}/${rss.total}          ${rss.funding > 0 ? '✅ OK' : '❌ NOT EXTRACTED'}`);
  console.log(`ai_analyzed         ${rss.ai_done}/${rss.total}          ${rss.ai_done > 0 ? '✅ OK' : '❌ NOT PROCESSED'}`);
  
  // 2. DISCOVERED STARTUPS
  console.log('\n\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 🚀 DISCOVERED_STARTUPS - Auto-discovered from articles          │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  const { rows: [ds] } = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(NULLIF(name, '')) as name,
      COUNT(NULLIF(website, '')) as website,
      COUNT(NULLIF(description, '')) as description,
      COUNT(funding_amount) FILTER (WHERE funding_amount IS NOT NULL) as funding_amt,
      COUNT(NULLIF(funding_stage, '')) as funding_stage,
      COUNT(*) FILTER (WHERE array_length(investors_mentioned, 1) > 0) as investors,
      COUNT(discovered_from_article_id) as linked,
      COUNT(*) FILTER (WHERE imported_to_startups = true) as imported,
      COUNT(*) FILTER (WHERE website_verified = true) as verified
    FROM discovered_startups
  `);
  
  console.log('Total: ' + ds.total + ' startups discovered');
  console.log('');
  console.log('FIELD                POPULATED    STATUS');
  console.log('─'.repeat(50));
  console.log(`name                 ${ds.name}/${ds.total}        ${ds.name == ds.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`website              ${ds.website}/${ds.total}        ${ds.website > ds.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`description          ${ds.description}/${ds.total}        ${ds.description > ds.total * 0.3 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`funding_amount       ${ds.funding_amt}/${ds.total}        ${ds.funding_amt > 0 ? '✅ OK' : '⚠️ NOT PARSED'}`);
  console.log(`funding_stage        ${ds.funding_stage}/${ds.total}        ${ds.funding_stage > 0 ? '✅ OK' : '⚠️ NOT PARSED'}`);
  console.log(`investors_mentioned  ${ds.investors}/${ds.total}         ${ds.investors > 0 ? '✅ OK' : '⚠️ NOT EXTRACTED'}`);
  console.log(`linked_to_article    ${ds.linked}/${ds.total}        ${ds.linked == ds.total ? '✅ OK' : '⚠️ ORPHANED'}`);
  console.log(`imported_to_startups ${ds.imported}/${ds.total}         ${ds.imported > 0 ? '✅ OK' : '⚠️ NONE IMPORTED'}`);
  console.log(`website_verified     ${ds.verified}/${ds.total}         ${ds.verified > 0 ? '✅ OK' : '⚠️ NONE VERIFIED'}`);
  
  // 3. INVESTORS
  console.log('\n\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 👤 INVESTORS - VC/Angel Database                                │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  // Note: sectors and stage are array columns with some malformed data
  const { rows: [inv] } = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(NULLIF(name, '')) as name,
      COUNT(NULLIF(firm, '')) as firm,
      COUNT(NULLIF(email, '')) as email,
      COUNT(NULLIF(linkedin_url, '')) as linkedin,
      COUNT(check_size_min) FILTER (WHERE check_size_min > 0) as check_min,
      COUNT(check_size_max) FILTER (WHERE check_size_max > 0) as check_max,
      COUNT(NULLIF(investment_thesis, '')) as thesis,
      COUNT(embedding) FILTER (WHERE embedding IS NOT NULL) as has_embedding
    FROM investors
  `);
  
  console.log('Total: ' + inv.total + ' investors');
  console.log('');
  console.log('FIELD               POPULATED    STATUS');
  console.log('─'.repeat(50));
  console.log(`name                ${inv.name}/${inv.total}        ${inv.name == inv.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`firm                ${inv.firm}/${inv.total}        ${inv.firm > inv.total * 0.7 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`email               ${inv.email}/${inv.total}        ${inv.email > inv.total * 0.3 ? '⚠️ LOW' : '⚠️ LOW'}`);
  console.log(`linkedin_url        ${inv.linkedin}/${inv.total}        ${inv.linkedin > inv.total * 0.3 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`check_size_min      ${inv.check_min}/${inv.total}        ${inv.check_min > inv.total * 0.3 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`check_size_max      ${inv.check_max}/${inv.total}        ${inv.check_max > inv.total * 0.3 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`investment_thesis   ${inv.thesis}/${inv.total}        ${inv.thesis > inv.total * 0.3 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`embedding (AI)      ${inv.has_embedding}/${inv.total}        ${inv.has_embedding > inv.total * 0.5 ? '✅ OK' : '⚠️ NOT GENERATED'}`);
  console.log(`sectors/stage       (array columns have malformed data - needs fix)`);
  
  // 4. STARTUP_UPLOADS
  console.log('\n\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 📤 STARTUP_UPLOADS - User-submitted startups                    │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  const { rows: [su] } = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(NULLIF(name, '')) as name,
      COUNT(NULLIF(description, '')) as description,
      COUNT(NULLIF(website, '')) as website,
      COUNT(NULLIF(stage, '')) as stage,
      COUNT(raise_amount) FILTER (WHERE raise_amount > 0) as raise_amt,
      COUNT(NULLIF(sectors, '')) as sectors,
      COUNT(embedding) FILTER (WHERE embedding IS NOT NULL) as embedding,
      COUNT(total_god_score) FILTER (WHERE total_god_score > 0) as scored
    FROM startup_uploads
  `);
  
  console.log('Total: ' + su.total + ' startups');
  console.log('');
  console.log('FIELD               POPULATED    STATUS');
  console.log('─'.repeat(50));
  console.log(`name                ${su.name}/${su.total}        ${su.name == su.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`description         ${su.description}/${su.total}        ${su.description > su.total * 0.8 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`website             ${su.website}/${su.total}        ${su.website > su.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`stage               ${su.stage}/${su.total}        ${su.stage > su.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`raise_amount        ${su.raise_amt}/${su.total}        ${su.raise_amt > su.total * 0.3 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`sectors             ${su.sectors}/${su.total}        ${su.sectors > su.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`embedding (AI)      ${su.embedding}/${su.total}        ${su.embedding > su.total * 0.5 ? '✅ OK' : '⚠️ NOT GENERATED'}`);
  console.log(`total_god_score     ${su.scored}/${su.total}        ${su.scored > su.total * 0.5 ? '✅ OK' : '⚠️ NOT SCORED'}`);
  
  // 5. MATCHES
  console.log('\n\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 🔗 STARTUP_INVESTOR_MATCHES - Matching Results                  │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  const { rows: [m] } = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT startup_id) as startups,
      COUNT(DISTINCT investor_id) as investors,
      COUNT(match_score) FILTER (WHERE match_score > 0) as has_score,
      AVG(match_score) FILTER (WHERE match_score > 0) as avg_score,
      COUNT(NULLIF(reasoning, '')) as has_reasoning,
      COUNT(NULLIF(fit_analysis, '')) as has_analysis
    FROM startup_investor_matches
  `);
  
  console.log('Total: ' + m.total + ' matches');
  console.log('Unique startups: ' + m.startups);
  console.log('Unique investors: ' + m.investors);
  console.log('');
  console.log('FIELD               POPULATED    STATUS');
  console.log('─'.repeat(50));
  console.log(`match_score         ${m.has_score}/${m.total}        ${m.has_score == m.total ? '✅ OK' : '⚠️ MISSING'}`);
  console.log(`avg_score           ${m.avg_score ? parseFloat(m.avg_score).toFixed(1) : 'N/A'}           ${m.avg_score > 50 ? '✅ GOOD' : '⚠️ LOW'}`);
  console.log(`reasoning           ${m.has_reasoning}/${m.total}        ${m.has_reasoning > m.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  console.log(`fit_analysis        ${m.has_analysis}/${m.total}        ${m.has_analysis > m.total * 0.5 ? '✅ OK' : '⚠️ LOW'}`);
  
  // 6. RSS SOURCES
  console.log('\n\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ 📡 RSS_SOURCES - Data Collection Sources                        │');
  console.log('└─────────────────────────────────────────────────────────────────┘');
  
  const { rows: sources } = await client.query(`
    SELECT name, url, last_scraped,
           (SELECT COUNT(*) FROM rss_articles WHERE source = rss_sources.name) as articles
    FROM rss_sources WHERE active = true ORDER BY articles DESC
  `);
  
  console.log('SOURCE               ARTICLES  LAST SCRAPED      STATUS');
  console.log('─'.repeat(60));
  for (const src of sources) {
    const status = src.last_scraped ? '✅' : '❌ NEVER';
    const lastDate = src.last_scraped ? new Date(src.last_scraped).toLocaleDateString() : 'never';
    console.log(`${src.name.padEnd(20)} ${String(src.articles).padStart(4)}      ${lastDate.padEnd(14)}  ${status}`);
  }
  
  // SUMMARY
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('                        📋 ISSUES TO FIX                            ');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  console.log('\n🔴 CRITICAL (Blocking data flow):');
  let criticalCount = 0;
  if (rss.companies == 0) { console.log('   • RSS articles: companies_mentioned NOT being extracted'); criticalCount++; }
  if (rss.investors == 0) { console.log('   • RSS articles: investors_mentioned NOT being extracted'); criticalCount++; }
  if (rss.funding == 0) { console.log('   • RSS articles: funding_amounts NOT being extracted'); criticalCount++; }
  if (rss.ai_done == 0) { console.log('   • RSS articles: AI analysis NOT running'); criticalCount++; }
  if (criticalCount === 0) console.log('   None! ✅');
  
  console.log('\n🟡 WARNINGS (Degraded functionality):');
  let warningCount = 0;
  if (ds.imported == 0) { console.log('   • Discovered startups: NONE imported to main startups table'); warningCount++; }
  if (ds.verified == 0) { console.log('   • Discovered startups: NONE have verified websites'); warningCount++; }
  if (inv.has_embedding < inv.total * 0.5) { console.log('   • Investors: Many missing AI embeddings for matching'); warningCount++; }
  if (su.embedding < su.total * 0.5) { console.log('   • Startups: Many missing AI embeddings for matching'); warningCount++; }
  if (warningCount === 0) console.log('   None! ✅');
  
  console.log('\n🟢 WORKING:');
  console.log('   • RSS scraping: ' + rss.total + ' articles collected');
  console.log('   • Startup discovery: ' + ds.total + ' startups found');
  console.log('   • Investor database: ' + inv.total + ' investors');
  console.log('   • Startup uploads: ' + su.total + ' startups');
  console.log('   • Matches generated: ' + m.total);
  
  console.log('\n═══════════════════════════════════════════════════════════════════');
  
  await client.end();
}

audit().catch(e => console.error('Error:', e));
