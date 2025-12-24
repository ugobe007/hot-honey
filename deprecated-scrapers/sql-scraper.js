#!/usr/bin/env node
/**
 * HOT MATCH SQL SCRAPER
 * =====================
 * Uses direct SQL via Supabase to bypass PostgREST schema cache issues
 * 
 * This scraper inserts data directly using raw SQL, ensuring schema alignment.
 * 
 * STARTUP_UPLOADS SCHEMA:
 * - id: uuid (auto)
 * - name: text (required)
 * - industries: text[]
 * - stage: text
 * - sectors: text[] (default '{}')
 * - source_type: text (default 'manual')
 * - tagline: text
 * - pitch: text
 * - website: text
 * - location: text
 * - raise_amount: text
 * - total_god_score: integer (default 50)
 * - status: text (default 'pending')
 * 
 * INVESTORS SCHEMA:
 * - id: uuid (auto)
 * - name: text (required)
 * - firm: text
 * - type: text
 * - sectors: text[]
 * - stage: text[]
 * - check_size_min: bigint
 * - check_size_max: bigint
 * - geography: text (default 'Global')
 * - location: text (default 'San Francisco, CA')
 * - notable_investments: text[]
 * - portfolio_size: integer (default 0)
 * - status: text (default 'active')
 * - tagline: text
 * - bio: text
 * - website: text
 * 
 * Run: node sql-scraper.js
 */

import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const parser = new Parser({ timeout: 20000 });

// ============================================
// RSS FEEDS
// ============================================

const STARTUP_FEEDS = [
  { name: 'Crunchbase', url: 'https://news.crunchbase.com/feed/' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
  { name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/' },
  { name: 'Tech.eu', url: 'https://tech.eu/feed/' },
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/' },
  { name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/' }
];

const INVESTOR_FEEDS = [
  { name: 'StrictlyVC', url: 'https://www.strictlyvc.com/feed/' },
  { name: 'TechCrunch VC', url: 'https://techcrunch.com/category/venture/feed/' },
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/' }
];

// ============================================
// CLASSIFICATION HELPERS
// ============================================

const SECTOR_MAP = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'neural', 'deep learning', 'generative'],
  'Fintech': ['fintech', 'payments', 'banking', 'financial', 'insurtech', 'crypto', 'defi', 'neobank'],
  'Healthcare': ['health', 'medical', 'biotech', 'pharma', 'telehealth', 'medtech', 'digital health'],
  'Climate': ['climate', 'cleantech', 'sustainability', 'renewable', 'energy', 'carbon', 'green'],
  'Enterprise SaaS': ['b2b', 'saas', 'enterprise', 'workflow', 'productivity', 'automation'],
  'Consumer': ['consumer', 'dtc', 'e-commerce', 'retail', 'marketplace'],
  'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'privacy', 'zero trust'],
  'DevTools': ['developer', 'devtools', 'api', 'infrastructure', 'devops', 'platform']
};

function classifySectors(text) {
  const lower = (text || '').toLowerCase();
  const matched = new Set();
  
  for (const [sector, keywords] of Object.entries(SECTOR_MAP)) {
    if (keywords.some(k => lower.includes(k))) {
      matched.add(sector);
    }
  }
  
  return matched.size > 0 ? [...matched].slice(0, 4) : ['Technology'];
}

function classifyStage(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('pre-seed')) return 'Pre-Seed';
  if (lower.includes('seed')) return 'Seed';
  if (lower.includes('series a')) return 'Series A';
  if (lower.includes('series b')) return 'Series B';
  if (lower.includes('series c')) return 'Series C';
  if (lower.includes('series d') || lower.includes('series e')) return 'Series D+';
  return 'Seed';
}

function extractFunding(text) {
  const patterns = [
    /raises?\s+\$(\d+(?:\.\d+)?)\s*(million|m|billion|b)/i,
    /\$(\d+(?:\.\d+)?)\s*(million|m|billion|b)\s+(?:round|funding)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      return unit.startsWith('b') ? `$${amount}B` : `$${amount}M`;
    }
  }
  return null;
}

function extractCheckSize(text) {
  const match = text.match(/\$(\d+(?:\.\d+)?)\s*(k|m|million)/i);
  if (match) {
    let amount = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'm' || unit === 'million') amount *= 1000000;
    else if (unit === 'k') amount *= 1000;
    return { min: Math.round(amount * 0.5), max: Math.round(amount * 2) };
  }
  return null;
}

function escapeSQL(str) {
  if (!str) return null;
  return str.replace(/'/g, "''");
}

function arrayToSQL(arr) {
  if (!arr || arr.length === 0) return "'{}'";
  const escaped = arr.map(s => escapeSQL(s));
  return `ARRAY['${escaped.join("','")}']`;
}

// ============================================
// STARTUP SCRAPER
// ============================================

async function scrapeStartups() {
  console.log('\n🚀 STARTUP SCRAPER');
  console.log('═'.repeat(50));
  
  const articles = [];
  
  for (const feed of STARTUP_FEEDS) {
    try {
      process.stdout.write(`  📰 ${feed.name}... `);
      const parsed = await parser.parseURL(feed.url);
      articles.push(...parsed.items.slice(0, 25));
      console.log(`✓ ${parsed.items.length}`);
    } catch (err) {
      console.log('✗');
    }
  }
  
  console.log(`\n  📊 Total articles: ${articles.length}`);
  
  // Extract startups
  const startups = [];
  const seen = new Set();
  
  for (const article of articles) {
    const text = `${article.title || ''} ${article.contentSnippet || ''}`;
    
    const patterns = [
      /^([A-Z][A-Za-z0-9]+)\s+(?:raises|secures|closes|lands)/i,
      /([A-Z][A-Za-z0-9]+),?\s+(?:a|the)\s+(?:startup|company|platform)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim();
        
        if (name.length < 3 || name.length > 35) continue;
        if (['The', 'A', 'This', 'It', 'We', 'AI', 'VC', 'And', 'But', 'How', 'Why', 'New', 'In', 'On', 'At'].includes(name)) continue;
        
        const lowerName = name.toLowerCase();
        if (seen.has(lowerName)) continue;
        seen.add(lowerName);
        
        startups.push({
          name,
          tagline: (article.title || '').substring(0, 250),
          pitch: (article.contentSnippet || '').substring(0, 600),
          sectors: classifySectors(text),
          stage: classifyStage(text),
          raise_amount: extractFunding(text),
          website: article.link ? new URL(article.link).hostname : null
        });
        
        break;
      }
    }
  }
  
  console.log(`  🔍 Extracted ${startups.length} startups\n`);
  
  // Insert using raw SQL
  let inserted = 0;
  let skipped = 0;
  
  for (const s of startups) {
    // Check if exists
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .ilike('name', s.name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`  ⏭️  ${s.name} (exists)`);
      skipped++;
      continue;
    }
    
    // Insert via raw SQL using supabase.rpc or direct
    const sql = `
      INSERT INTO startup_uploads (name, tagline, pitch, sectors, industries, stage, raise_amount, source_type, total_god_score, status)
      VALUES (
        '${escapeSQL(s.name)}',
        '${escapeSQL(s.tagline)}',
        '${escapeSQL(s.pitch)}',
        ${arrayToSQL(s.sectors)},
        ${arrayToSQL(s.sectors)},
        '${escapeSQL(s.stage)}',
        ${s.raise_amount ? `'${escapeSQL(s.raise_amount)}'` : 'NULL'},
        'rss',
        50,
        'pending'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;
    
    try {
      // Use fetch for raw SQL since supabase-js has cache issues
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        // Fallback: try with minimal fields that work
        const minimalInsert = await supabase
          .from('startup_uploads')
          .insert({
            name: s.name,
            tagline: s.tagline,
            pitch: s.pitch,
            sectors: s.sectors,
            source_type: 'rss'
          });
        
        if (minimalInsert.error) {
          console.log(`  ❌ ${s.name}: ${minimalInsert.error.message.substring(0, 50)}`);
        } else {
          console.log(`  ✅ ${s.name} (minimal)`);
          inserted++;
        }
      } else {
        console.log(`  ✅ ${s.name} (${s.stage})`);
        inserted++;
      }
    } catch (err) {
      console.log(`  ❌ ${s.name}: ${err.message.substring(0, 50)}`);
    }
  }
  
  return { found: startups.length, inserted, skipped };
}

// ============================================
// INVESTOR SCRAPER
// ============================================

async function scrapeInvestors() {
  console.log('\n💼 INVESTOR SCRAPER');
  console.log('═'.repeat(50));
  
  const articles = [];
  
  for (const feed of INVESTOR_FEEDS) {
    try {
      process.stdout.write(`  📰 ${feed.name}... `);
      const parsed = await parser.parseURL(feed.url);
      articles.push(...parsed.items.slice(0, 25));
      console.log(`✓ ${parsed.items.length}`);
    } catch (err) {
      console.log('✗');
    }
  }
  
  console.log(`\n  📊 Total articles: ${articles.length}`);
  
  // Extract investors
  const investors = [];
  const seen = new Set();
  
  for (const article of articles) {
    const text = `${article.title || ''} ${article.contentSnippet || ''} ${article.content || ''}`;
    
    // Pattern: VC firm names
    const vcPattern = /(?:led by|from|backed by|with participation from)\s+([A-Z][A-Za-z\s&\.]+(?:Capital|Ventures|Partners|Fund))/gi;
    
    let match;
    while ((match = vcPattern.exec(text)) !== null) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      
      if (name.length < 5 || name.length > 60) continue;
      
      const lowerName = name.toLowerCase();
      if (seen.has(lowerName)) continue;
      seen.add(lowerName);
      
      const sectors = classifySectors(text);
      const checkSize = extractCheckSize(text);
      
      investors.push({
        name,
        firm: name,
        type: 'VC',
        sectors: sectors,
        stage: ['Seed', 'Series A'],
        check_size_min: checkSize?.min || 500000,
        check_size_max: checkSize?.max || 10000000,
        bio: `Discovered from: ${article.title}`.substring(0, 400)
      });
    }
  }
  
  console.log(`  🔍 Extracted ${investors.length} investors\n`);
  
  // Insert investors
  let inserted = 0;
  let skipped = 0;
  
  for (const inv of investors) {
    // Check if exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id')
      .ilike('name', inv.name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`  ⏭️  ${inv.name} (exists)`);
      skipped++;
      continue;
    }
    
    // Insert with minimal fields that work
    const { error } = await supabase
      .from('investors')
      .insert({
        name: inv.name,
        firm: inv.firm,
        type: inv.type,
        sectors: inv.sectors,
        stage: inv.stage,
        check_size_min: inv.check_size_min,
        check_size_max: inv.check_size_max,
        bio: inv.bio,
        status: 'active'
      });
    
    if (error) {
      console.log(`  ❌ ${inv.name}: ${error.message.substring(0, 50)}`);
    } else {
      console.log(`  ✅ ${inv.name}`);
      inserted++;
    }
  }
  
  return { found: investors.length, inserted, skipped };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🔥 HOT MATCH SQL SCRAPER v1.0                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}`);
  
  const startupResults = await scrapeStartups();
  const investorResults = await scrapeInvestors();
  
  // Get counts
  const { count: startupCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  
  const { count: investorCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 FINAL SUMMARY                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Startups Added:  ${String(startupResults.inserted).padEnd(40)}║`);
  console.log(`║  Investors Added: ${String(investorResults.inserted).padEnd(40)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Startups in DB:  ${String(startupCount || 0).padEnd(34)}║`);
  console.log(`║  Total Investors in DB: ${String(investorCount || 0).padEnd(34)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Log to data_collection_log
  await supabase.from('data_collection_log').insert({
    source: 'sql-scraper',
    records_found: startupResults.found + investorResults.found,
    records_added: startupResults.inserted + investorResults.inserted,
    status: 'completed'
  }).catch(() => {});
}

main().catch(console.error);
