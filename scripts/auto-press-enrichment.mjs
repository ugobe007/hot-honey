#!/usr/bin/env node
/**
 * AUTO PRESS ENRICHMENT - Run daily via PM2
 * Enriches startups that have real websites but no press quotes yet
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BATCH_SIZE = 10; // Process 10 per run
const DELAY_MS = 3000;

async function enrichStartup(startup) {
  console.log(`📰 ${startup.name} (${startup.website})`);
  
  try {
    const searchResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for news, funding, or press about "${startup.name}" startup (${startup.website}). Find investor or press quotes.`
      }]
    });
    
    let searchText = searchResponse.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (!searchText.trim()) { console.log('  No results'); return false; }
    
    const extractResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract 1-3 SHORT positive quotes (7 words MAX) about "${startup.name}":

${searchText.slice(0, 3000)}

Return ONLY JSON: {"quotes":[{"text":"max seven words","source":"Source","sentiment":"positive"}]}
If nothing: {"quotes":[]}`
      }]
    });
    
    const text = extractResponse.content.find(b => b.type === 'text')?.text || '';
    const data = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
    
    const existing = startup.extracted_data || {};
    await supabase.from('startup_uploads').update({
      extracted_data: { 
        ...existing, 
        press_quotes: data.quotes || [],
        press_updated: new Date().toISOString() 
      }
    }).eq('id', startup.id);
    
    if (data.quotes?.length) {
      console.log(`  ✅ ${data.quotes.length} quotes saved`);
      return true;
    } else {
      console.log('  No quotes (marked as checked)');
      return false;
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n🚀 Auto Press Enrichment - ${new Date().toISOString()}\n`);
  
  // Get startups with real websites, no press quotes yet
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, website, extracted_data')
    .eq('status', 'approved')
    .not('website', 'is', null)
    .order('total_god_score', { ascending: false })
    .limit(100);
  
  // Filter to those without press_updated (never checked)
  const needsEnrichment = startups?.filter(s => 
    s.website && 
    s.website.length > 5 &&
    !s.website.includes('wellfound') &&
    !s.website.includes('linkedin') &&
    !s.extracted_data?.press_updated
  ).slice(0, BATCH_SIZE);
  
  console.log(`Found ${needsEnrichment?.length || 0} startups to enrich\n`);
  
  let enriched = 0;
  for (const s of needsEnrichment || []) {
    if (await enrichStartup(s)) enriched++;
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  
  console.log(`\n✅ Done - ${enriched}/${needsEnrichment?.length || 0} enriched`);
}

main().catch(console.error);
