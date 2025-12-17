#!/usr/bin/env node
/**
 * UPDATE INVESTOR SCORES FROM NEWS
 * =================================
 * Analyzes RSS articles mentioning investors and updates their scores
 * based on activity signals.
 * 
 * News signals that boost scores:
 * - New investments announced (+0.5-1.5)
 * - Fund raises/new fund (+0.5-1.0)
 * - Portfolio exits/IPOs (+1.0-2.0)
 * - Positive mentions (+0.2)
 * - Recent activity (<30 days) (+0.5)
 * 
 * Run: node update-scores-from-news.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Keywords that indicate positive signals
const SIGNAL_PATTERNS = {
  new_investment: {
    patterns: [
      /led.*round/i, /lead.*invest/i, /participated.*round/i,
      /invested.*\$\d+/i, /raises.*\$\d+/i, /funding.*\$\d+/i,
      /series [a-d]/i, /seed round/i, /announces investment/i
    ],
    scoreBoost: 1.0,
    signal: 'Recent investment announced'
  },
  exit_ipo: {
    patterns: [
      /ipo/i, /goes public/i, /acquisition/i, /acquired by/i,
      /exit/i, /unicorn/i, /\$\d+[mb] valuation/i
    ],
    scoreBoost: 1.5,
    signal: 'Portfolio exit/IPO'
  },
  new_fund: {
    patterns: [
      /new fund/i, /raises.*fund/i, /closes.*fund/i,
      /\$\d+[mb].*fund/i, /fund.*\$\d+[mb]/i
    ],
    scoreBoost: 0.8,
    signal: 'New fund raised'
  },
  thought_leadership: {
    patterns: [
      /partner at/i, /general partner/i, /managing partner/i,
      /says.*about/i, /predicts/i, /bullish on/i, /bearish on/i
    ],
    scoreBoost: 0.3,
    signal: 'Media coverage'
  },
  award_recognition: {
    patterns: [
      /midas list/i, /top.*vc/i, /best.*investor/i,
      /forbes.*list/i, /award/i
    ],
    scoreBoost: 0.5,
    signal: 'Industry recognition'
  }
};

/**
 * Analyze article content for investment signals
 */
function analyzeArticle(article) {
  const signals = [];
  let totalBoost = 0;
  
  const textToAnalyze = [
    article.title || '',
    article.content || '',
    article.summary || '',
    article.ai_summary || ''
  ].join(' ').toLowerCase();
  
  for (const [signalType, config] of Object.entries(SIGNAL_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(textToAnalyze)) {
        if (!signals.find(s => s.type === signalType)) {
          signals.push({
            type: signalType,
            boost: config.scoreBoost,
            signal: config.signal
          });
          totalBoost += config.scoreBoost;
        }
        break;
      }
    }
  }
  
  // Recency bonus
  if (article.published_at) {
    const publishedDate = new Date(article.published_at);
    const daysAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysAgo <= 7) {
      totalBoost += 0.5;
      signals.push({ type: 'recency', boost: 0.5, signal: 'Activity within last week' });
    } else if (daysAgo <= 30) {
      totalBoost += 0.3;
      signals.push({ type: 'recency', boost: 0.3, signal: 'Activity within last month' });
    } else if (daysAgo <= 90) {
      totalBoost += 0.1;
      signals.push({ type: 'recency', boost: 0.1, signal: 'Activity within last quarter' });
    }
  }
  
  return { signals, totalBoost };
}

/**
 * Find investors mentioned in article
 */
function findMentionedInvestors(article, investorNames) {
  const textToSearch = [
    article.title || '',
    article.content || '',
    article.summary || '',
    JSON.stringify(article.investors_mentioned || [])
  ].join(' ').toLowerCase();
  
  const mentioned = [];
  
  for (const investor of investorNames) {
    const name = (investor.name || '').toLowerCase();
    const firm = (investor.firm || '').toLowerCase();
    
    // Check for exact name match or firm match
    if (name.length > 3 && textToSearch.includes(name)) {
      mentioned.push(investor);
    } else if (firm.length > 3 && textToSearch.includes(firm)) {
      mentioned.push(investor);
    }
  }
  
  return mentioned;
}

async function main() {
  console.log('\n📰 UPDATING INVESTOR SCORES FROM NEWS\n');
  console.log('═'.repeat(60));
  
  // 1. Get all articles
  const { data: articles, error: articlesError } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, title, content, summary, ai_summary, 
             published_at, investors_mentioned, source
      FROM rss_articles
      ORDER BY published_at DESC
      LIMIT 500
    `
  });
  
  if (articlesError || !articles) {
    console.error('❌ Failed to fetch articles:', articlesError);
    return;
  }
  
  console.log(`📊 Found ${articles.length} articles to analyze\n`);
  
  // 2. Get all investors (for name matching)
  const { data: investors, error: investorsError } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT id, name, firm, investor_score, investor_tier,
             signals, last_investment_date
      FROM investors
    `
  });
  
  if (investorsError || !investors) {
    console.error('❌ Failed to fetch investors:', investorsError);
    return;
  }
  
  console.log(`👥 Matching against ${investors.length} investors\n`);
  
  // 3. Track score updates
  const investorUpdates = new Map(); // investorId -> { boosts, signals, articles }
  
  // 4. Analyze each article
  for (const article of articles) {
    const { signals, totalBoost } = analyzeArticle(article);
    
    if (signals.length === 0) continue; // No meaningful signals
    
    // Find mentioned investors
    const mentioned = findMentionedInvestors(article, investors);
    
    for (const investor of mentioned) {
      if (!investorUpdates.has(investor.id)) {
        investorUpdates.set(investor.id, {
          name: investor.name,
          firm: investor.firm,
          currentScore: investor.investor_score || 0,
          totalBoost: 0,
          signals: [],
          articleCount: 0
        });
      }
      
      const update = investorUpdates.get(investor.id);
      update.totalBoost += totalBoost;
      update.articleCount++;
      signals.forEach(s => {
        if (!update.signals.includes(s.signal)) {
          update.signals.push(s.signal);
        }
      });
    }
  }
  
  // 5. Apply score updates
  console.log('📈 SCORE UPDATES:\n');
  
  let updatedCount = 0;
  const updates = Array.from(investorUpdates.entries())
    .sort((a, b) => b[1].totalBoost - a[1].totalBoost);
  
  for (const [investorId, update] of updates) {
    // Cap the news boost at 2.0 to prevent runaway scores
    const cappedBoost = Math.min(update.totalBoost, 2.0);
    const newScore = Math.min((update.currentScore || 0) + cappedBoost, 10);
    
    // Determine new tier
    let newTier;
    if (newScore >= 8) newTier = 'elite';
    else if (newScore >= 6) newTier = 'strong';
    else if (newScore >= 4) newTier = 'solid';
    else newTier = 'emerging';
    
    // Combine existing signals with new news signals
    const newsSignals = update.signals.map(s => `📰 ${s}`);
    
    // Update database
    const updateQuery = `
      UPDATE investors 
      SET investor_score = ${newScore.toFixed(1)},
          investor_tier = '${newTier}',
          last_news_update = NOW(),
          signals = COALESCE(signals, '{}'::jsonb) || '${JSON.stringify({
            news_mentions: update.articleCount,
            news_boost: cappedBoost,
            news_signals: newsSignals,
            last_news_analysis: new Date().toISOString()
          }).replace(/'/g, "''")}'::jsonb
      WHERE id = '${investorId}'
    `;
    
    const { data: result, error: updateError } = await supabase.rpc('exec_sql_modify', {
      sql_query: updateQuery
    });
    
    if (!updateError && result && result.success) {
      updatedCount++;
      
      // Log significant updates
      if (cappedBoost >= 0.5) {
        const tierEmoji = { elite: '🏆', strong: '💪', solid: '✓', emerging: '🌱' };
        console.log(`${tierEmoji[newTier]} ${(update.name || update.firm).padEnd(25)} ${update.currentScore?.toFixed(1) || '0.0'} → ${newScore.toFixed(1)} (+${cappedBoost.toFixed(1)})`);
        console.log(`   📰 ${update.articleCount} articles | ${update.signals.slice(0, 2).join(', ')}`);
      }
    }
  }
  
  // 6. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 NEWS ANALYSIS COMPLETE\n');
  console.log(`   📰 Articles analyzed: ${articles.length}`);
  console.log(`   👥 Investors matched: ${investorUpdates.size}`);
  console.log(`   ✅ Scores updated: ${updatedCount}`);
  
  // Show new tier distribution
  const { data: tierCounts } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT investor_tier, COUNT(*) as count
      FROM investors
      GROUP BY investor_tier
      ORDER BY investor_tier
    `
  });
  
  if (tierCounts) {
    console.log('\n   NEW TIER DISTRIBUTION:');
    const tierEmoji = { elite: '🏆', strong: '💪', solid: '✓', emerging: '🌱' };
    for (const tier of tierCounts) {
      console.log(`   ${tierEmoji[tier.investor_tier] || '•'} ${tier.investor_tier}: ${tier.count}`);
    }
  }
  
  console.log('\n');
}

main().catch(console.error);
