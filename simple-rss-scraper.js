#!/usr/bin/env node
/**
 * Simple RSS Feed Scraper
 * 
 * Scrapes RSS feeds WITHOUT AI - just extracts headlines and links.
 * Then we can enrich later with AI when credits are available.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; HotMatchBot/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml'
  }
});

// Keywords that indicate startup/funding news
const STARTUP_KEYWORDS = [
  'startup', 'funding', 'raised', 'series', 'seed', 'venture', 'launches',
  'founded', 'valuation', 'investment', 'investor', 'accelerator', 'incubator',
  'ai startup', 'fintech', 'healthtech', 'saas', 'million', 'billion'
];

// Extract company name from title (basic heuristics)
function extractCompanyName(title) {
  // Patterns: "Company raises $X", "Company launches Y", "Company: description"
  const patterns = [
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+raises/i,
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+launches/i,
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+secures/i,
    /^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+closes/i,
    /^([A-Z][a-zA-Z0-9]+(?:\.\s*[A-Z][a-zA-Z0-9]+)?),?\s+(a|the|an)\s+/i,
    /^([A-Z][a-zA-Z0-9]+)\s*:/i,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1] && match[1].length > 2 && match[1].length < 50) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Detect sectors from text
function detectSectors(text) {
  const sectors = [];
  const lowerText = text.toLowerCase();
  
  const sectorKeywords = {
    'AI/ML': ['artificial intelligence', ' ai ', 'machine learning', 'deep learning', 'llm', 'gpt'],
    'FinTech': ['fintech', 'financial', 'banking', 'payments', 'neobank', 'crypto'],
    'HealthTech': ['healthtech', 'healthcare', 'medical', 'biotech', 'health tech'],
    'SaaS': ['saas', 'software as a service', 'b2b software', 'enterprise software'],
    'Climate': ['climate', 'cleantech', 'sustainability', 'carbon', 'renewable'],
    'EdTech': ['edtech', 'education', 'e-learning', 'online learning'],
    'E-Commerce': ['ecommerce', 'e-commerce', 'retail tech', 'marketplace'],
    'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'cyber'],
    'Developer Tools': ['developer', 'devtools', 'api', 'infrastructure'],
    'Consumer': ['consumer', 'b2c', 'direct to consumer', 'd2c'],
  };
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      sectors.push(sector);
    }
  }
  
  return sectors.length > 0 ? sectors : ['Technology'];
}

// Check if title is about startup/funding
function isStartupNews(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();
  return STARTUP_KEYWORDS.some(kw => text.includes(kw));
}

async function scrapeRssFeeds() {
  console.log('📡 Simple RSS Feed Scraper (No AI Required)\n');
  
  // Get active RSS sources
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('id, name, url, category')
    .eq('active', true)
    .limit(20);
  
  console.log(`Found ${sources?.length || 0} active RSS sources\n`);
  
  let totalDiscovered = 0;
  let totalAdded = 0;
  
  for (const source of sources || []) {
    console.log(`\n📰 ${source.name}`);
    console.log(`   ${source.url}`);
    
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items?.slice(0, 10) || [];
      
      console.log(`   Found ${items.length} items`);
      
      let added = 0;
      for (const item of items) {
        // Skip if not startup-related
        if (!isStartupNews(item.title || '', item.contentSnippet || item.content || '')) {
          continue;
        }
        
        // Try to extract company name
        const companyName = extractCompanyName(item.title || '');
        if (!companyName) continue;
        
        // Check if already exists
        const { data: existing } = await supabase
          .from('discovered_startups')
          .select('id')
          .ilike('name', companyName)
          .limit(1);
        
        if (existing && existing.length > 0) continue;
        
        // Detect sectors
        const sectors = detectSectors(`${item.title} ${item.contentSnippet || ''}`);
        
        // Insert
        const { error } = await supabase.from('discovered_startups').insert({
          name: companyName,
          tagline: (item.contentSnippet || item.title || '').slice(0, 200),
          website: item.link,
          source: source.name,
          source_url: item.link,
          sectors: sectors,
          status: 'pending',
          discovered_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        
        if (!error) {
          console.log(`   ✅ ${companyName} (${sectors.join(', ')})`);
          added++;
          totalAdded++;
        }
        totalDiscovered++;
      }
      
      // Update last_scraped
      await supabase.from('rss_sources')
        .update({ last_scraped: new Date().toISOString() })
        .eq('id', source.id);
      
      if (added > 0) {
        console.log(`   Added: ${added}`);
      }
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total discovered: ${totalDiscovered}`);
  console.log(`Total added: ${totalAdded}`);
  console.log('='.repeat(50));
}

// Run
scrapeRssFeeds().catch(console.error);
