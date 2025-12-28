#!/usr/bin/env node
/**
 * Startup Discovery - NO AI
 * Uses pattern matching only, zero API costs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const parser = new Parser();

const RSS_SOURCES = [
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/' },
  { name: 'TechCrunch Funding', url: 'https://techcrunch.com/tag/funding/feed/' },
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/' },
  { name: 'HN Show', url: 'https://hnrss.org/show' },
  { name: 'HN Best', url: 'https://hnrss.org/best' },
  { name: 'Sequoia Medium', url: 'https://medium.com/feed/sequoia-capital' },
  { name: 'a]16z', url: 'https://a16z.com/feed/' }
];

function extractStartupFromTitle(title, content) {
  const combined = (title + ' ' + (content || '')).toLowerCase();
  
  const fundingMatch = combined.match(/([a-z0-9\s]+)\s+(raises?|secures?|closes?|gets?|lands?)\s+\$?([\d.]+)\s*(m|million|b|billion)/i);
  if (fundingMatch) {
    const name = fundingMatch[1].trim().split(' ').slice(-3).join(' ');
    const amount = parseFloat(fundingMatch[3]);
    const unit = fundingMatch[4].toLowerCase();
    const funding = unit.startsWith('b') ? amount * 1000000000 : amount * 1000000;
    return { name: cleanName(name), funding_amount: funding };
  }
  
  const launchMatch = combined.match(/([a-z0-9\s]+)\s+(launches?|announces?|unveils?|introduces?|debuts?)/i);
  if (launchMatch) {
    const name = launchMatch[1].trim().split(' ').slice(-2).join(' ');
    return { name: cleanName(name), is_launched: true };
  }
  
  return null;
}

function cleanName(name) {
  return name
    .replace(/^(startup|company|firm|platform)\s+/i, '')
    .replace(/\s+(startup|company|firm|platform)$/i, '')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

function extractSectors(text) {
  const sectors = [];
  const t = text.toLowerCase();
  if (/\b(ai|artificial intelligence|machine learning|llm|gpt)\b/.test(t)) sectors.push('AI');
  if (/\b(fintech|financial|banking|payments)\b/.test(t)) sectors.push('Fintech');
  if (/\b(health|medical|biotech|therapeutics)\b/.test(t)) sectors.push('HealthTech');
  if (/\b(climate|carbon|clean energy|renewable)\b/.test(t)) sectors.push('Climate');
  if (/\b(defense|military|security)\b/.test(t)) sectors.push('Defense');
  if (/\b(robot|automation)\b/.test(t)) sectors.push('Robotics');
  if (/\b(saas|software|cloud|enterprise)\b/.test(t)) sectors.push('SaaS');
  if (/\b(crypto|blockchain|web3|defi)\b/.test(t)) sectors.push('Crypto');
  if (/\b(edtech|education|learning)\b/.test(t)) sectors.push('EdTech');
  if (/\b(space|satellite|rocket)\b/.test(t)) sectors.push('Space');
  return sectors;
}

async function discoverFromRSS() {
  let totalFound = 0;
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const source of RSS_SOURCES) {
    console.log('\n' + source.name + '...');
    
    try {
      const feed = await parser.parseURL(source.url);
      let added = 0;
      let skipped = 0;
      
      for (const item of feed.items.slice(0, 20)) {
        const startup = extractStartupFromTitle(item.title, item.contentSnippet);
        
        if (startup && startup.name && startup.name.length > 2 && startup.name.length < 50) {
          const { data: existing } = await supabase
            .from('startup_uploads')
            .select('id')
            .ilike('name', startup.name)
            .limit(1);
          
          if (existing && existing.length > 0) {
            skipped++;
            continue;
          }
          
          const sectors = extractSectors(item.title + ' ' + (item.contentSnippet || ''));
          
          const { error } = await supabase.from('startup_uploads').insert({
            name: startup.name,
            tagline: item.title.slice(0, 200),
            website: item.link,
            sectors: sectors,
            funding_amount: startup.funding_amount || null,
            is_launched: startup.is_launched || false,
            status: 'pending',
            source: source.name,
            created_at: new Date().toISOString()
          });
          
          if (!error) {
            added++;
            console.log('  + ' + startup.name + (startup.funding_amount ? ' ($' + (startup.funding_amount/1000000).toFixed(1) + 'M)' : ''));
          }
        }
      }
      
      totalFound += feed.items.length;
      totalAdded += added;
      totalSkipped += skipped;
      console.log('  Found: ' + feed.items.length + ' | Added: ' + added + ' | Skipped: ' + skipped);
      
    } catch (err) {
      console.log('  Error: ' + err.message);
    }
  }
  
  console.log('\n========================================');
  console.log('TOTAL: Found ' + totalFound + ' | Added ' + totalAdded + ' | Skipped ' + totalSkipped);
  console.log('========================================');
}

discoverFromRSS().catch(console.error);
