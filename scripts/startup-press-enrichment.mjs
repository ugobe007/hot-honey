#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function enrichStartup(startup) {
  console.log(`\n📰 ${startup.name}`);
  
  // Step 1: Search for news
  const searchResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Search for recent news, press coverage, or investor quotes about the startup "${startup.name}"${startup.website ? ` (website: ${startup.website})` : ''}. I need to find what people are saying about them.`
    }]
  });
  
  // Collect all text from the response
  let searchText = '';
  for (const block of searchResponse.content) {
    if (block.type === 'text') {
      searchText += block.text + '\n';
    }
  }
  
  if (!searchText.trim()) {
    console.log('  No search results');
    return;
  }
  
  console.log('  Found search results, extracting quotes...');
  
  // Step 2: Extract quotes from search results
  const extractResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `From this information about "${startup.name}", extract 1-3 SHORT positive quotes (7 words MAX each).

${searchText.slice(0, 3000)}

Return ONLY valid JSON, no other text:
{"quotes":[{"text":"seven words max here","source":"TechCrunch","sentiment":"positive"}]}

Rules:
- Each quote MAX 7 words
- Only positive sentiment
- If nothing found, return {"quotes":[]}`
    }]
  });
  
  const textBlock = extractResponse.content.find(b => b.type === 'text');
  if (!textBlock) { console.log('  No extraction response'); return; }
  
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log('  No JSON in response'); return; }
    
    const data = JSON.parse(jsonMatch[0]);
    
    if (data.quotes?.length > 0) {
      console.log(`  ✅ Found ${data.quotes.length} quotes:`);
      data.quotes.forEach(q => console.log(`     "${q.text}" - ${q.source} [${q.sentiment}]`));
      
      const existing = startup.extracted_data || {};
      await supabase.from('startup_uploads').update({
        extracted_data: { ...existing, press_quotes: data.quotes, press_updated: new Date().toISOString() }
      }).eq('id', startup.id);
      console.log('  💾 Saved to database');
    } else {
      console.log('  No positive quotes found');
    }
  } catch (e) {
    console.log('  Parse error:', e.message);
    console.log('  Raw:', textBlock.text.slice(0, 200));
  }
}

async function main() {
  const limit = parseInt(process.argv[2]) || 3;
  console.log(`🚀 Press Enrichment - ${limit} startups\n`);
  
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, website, extracted_data')
    .eq('status', 'approved')
    .order('total_god_score', { ascending: false })
    .limit(limit);
  
  for (const s of startups) {
    if (s.extracted_data?.press_quotes?.length) {
      console.log(`⏭️  ${s.name} - already has quotes`);
      continue;
    }
    await enrichStartup(s);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\n✅ Done');
}

main().catch(console.error);
