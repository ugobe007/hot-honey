#!/usr/bin/env node
/**
 * EMBEDDING GENERATOR
 * ====================
 * Generate OpenAI embeddings for existing startups and investors
 * 
 * This backfills embeddings for records that don't have them yet.
 * Used for semantic matching (Option 2).
 * 
 * Run: node generate-embeddings.js
 * Run with limit: node generate-embeddings.js --limit 50
 * Run for investors only: node generate-embeddings.js --investors
 * Run for startups only: node generate-embeddings.js --startups
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('❌ Missing credentials. Need SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// Parse args
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 100;
const DO_STARTUPS = !args.includes('--investors');
const DO_INVESTORS = !args.includes('--startups');

// ============================================
// EMBEDDING GENERATION
// ============================================

async function generateEmbedding(text) {
  try {
    const truncated = text.substring(0, 8000);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated,
      dimensions: 1536
    });

    return response.data[0]?.embedding;
  } catch (error) {
    console.error(`   ⚠️  Embedding error:`, error.message);
    return null;
  }
}

// ============================================
// STARTUP EMBEDDINGS
// ============================================

function createStartupEmbeddingText(startup) {
  const parts = [
    `Company: ${startup.name}`,
    startup.tagline ? `Tagline: ${startup.tagline}` : '',
    startup.pitch ? `Pitch: ${startup.pitch}` : '',
    startup.sectors?.length ? `Sectors: ${startup.sectors.join(', ')}` : '',
    startup.stage ? `Stage: ${startup.stage}` : '',
    startup.raise_amount ? `Raising: ${startup.raise_amount}` : ''
  ];
  return parts.filter(p => p).join('. ');
}

async function processStartups() {
  console.log('\n📊 Processing Startups...\n');
  
  // Use minimal column set that works with PostgREST
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline, pitch, sectors, stage, raise_amount')
    .is('embedding', null)
    .eq('status', 'approved')
    .limit(LIMIT);
  
  if (error) {
    console.error('❌ Failed to fetch startups:', error.message);
    return 0;
  }

  console.log(`   Found ${startups?.length || 0} startups without embeddings\n`);
  
  let success = 0;
  for (let i = 0; i < startups.length; i++) {
    const startup = startups[i];
    process.stdout.write(`   [${i + 1}/${startups.length}] ${startup.name.substring(0, 30).padEnd(30)}...`);
    
    const text = createStartupEmbeddingText(startup);
    const embedding = await generateEmbedding(text);
    
    if (embedding) {
      // Update with embedding using direct SQL (PostgREST schema cache may be stale)
      const embeddingStr = `[${embedding.join(',')}]`;
      const { error: updateError } = await supabase.rpc('exec_raw', {
        query: `UPDATE startup_uploads SET embedding = '${embeddingStr}'::vector(1536), updated_at = NOW() WHERE id = '${startup.id}'`
      });
      
      // If exec_raw doesn't exist, try REST API
      if (updateError && updateError.code === 'PGRST202') {
        // Try direct update via REST
        const { error: restError } = await supabase
          .from('startup_uploads')
          .update({ embedding: embeddingStr })
          .eq('id', startup.id);
        
        if (restError) {
          process.stdout.write(` ❌ (${restError.message})\n`);
          continue;
        }
      } else if (updateError) {
        process.stdout.write(` ❌ (${updateError.message})\n`);
        continue;
      }
      
      console.log(' ✅');
      success++;
    } else {
      console.log(' ⚠️');
    }
    
    // Rate limiting
    if ((i + 1) % 10 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return success;
}

// ============================================
// INVESTOR EMBEDDINGS
// ============================================

function createInvestorEmbeddingText(investor) {
  const parts = [
    `Investor: ${investor.name}`,
    investor.firm ? `Firm: ${investor.firm}` : '',
    investor.bio ? `Bio: ${investor.bio}` : '',
    investor.sectors?.length ? `Sectors: ${investor.sectors.join(', ')}` : '',
    investor.stage?.length ? `Stages: ${investor.stage.join(', ')}` : '',
    investor.geography_focus?.length ? `Geography: ${investor.geography_focus.join(', ')}` : '',
    investor.check_size_min && investor.check_size_max 
      ? `Check size: $${(investor.check_size_min/1000000).toFixed(1)}M - $${(investor.check_size_max/1000000).toFixed(1)}M` 
      : '',
    investor.notable_investments?.length 
      ? `Portfolio: ${investor.notable_investments.slice(0, 5).join(', ')}` 
      : ''
  ];
  return parts.filter(p => p).join('. ');
}

async function processInvestors() {
  console.log('\n💰 Processing Investors...\n');
  
  // Use columns that match PostgREST schema cache
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, bio, sectors, stage, geography_focus, check_size_min, check_size_max, notable_investments')
    .is('embedding', null)
    .limit(LIMIT);

  if (error) {
    console.error('❌ Failed to fetch investors:', error.message);
    return 0;
  }

  console.log(`   Found ${investors?.length || 0} investors without embeddings\n`);
  
  if (!investors || investors.length === 0) {
    return 0;
  }
  
  let success = 0;
  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    process.stdout.write(`   [${i + 1}/${investors.length}] ${investor.name.substring(0, 30).padEnd(30)}...`);
    
    const text = createInvestorEmbeddingText(investor);
    const embedding = await generateEmbedding(text);
    
    if (embedding) {
      // Update with embedding using REST API
      const embeddingStr = `[${embedding.join(',')}]`;
      const { error: updateError } = await supabase
        .from('investors')
        .update({ embedding: embeddingStr })
        .eq('id', investor.id);
      
      if (updateError) {
        process.stdout.write(` ❌ (${updateError.message})\n`);
        continue;
      }
      
      console.log(' ✅');
      success++;
    } else {
      console.log(' ⚠️');
    }
    
    // Rate limiting
    if ((i + 1) % 10 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return success;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          📊 EMBEDDING GENERATOR                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Limit: ${LIMIT} per table`);
  console.log(`  Startups: ${DO_STARTUPS ? '✅' : '❌'}`);
  console.log(`  Investors: ${DO_INVESTORS ? '✅' : '❌'}`);
  
  let startupCount = 0;
  let investorCount = 0;
  
  if (DO_STARTUPS) {
    startupCount = await processStartups();
  }
  
  if (DO_INVESTORS) {
    investorCount = await processInvestors();
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          📊 SUMMARY                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   Startups embedded:  ${startupCount}`);
  console.log(`   Investors embedded: ${investorCount}`);
  console.log('');
}

main().catch(console.error);
