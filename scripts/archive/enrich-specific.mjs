import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const targets = ['Decagon', 'Delphi', 'Crisp', 'nexos.ai', 'Dub.co'];

async function enrichStartup(startup) {
  console.log(`\n📰 ${startup.name} (${startup.website})`);
  
  const searchResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Search for news, funding announcements, or press about "${startup.name}" startup (${startup.website}). Find what investors or tech press say about them.`
    }]
  });
  
  let searchText = searchResponse.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  if (!searchText.trim()) { console.log('  No results'); return; }
  
  console.log('  Extracting quotes...');
  
  const extractResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Extract 1-3 SHORT positive quotes (7 words MAX) about "${startup.name}" from:

${searchText.slice(0, 3000)}

Return ONLY JSON: {"quotes":[{"text":"max seven words","source":"TechCrunch","sentiment":"positive"}]}
If nothing found: {"quotes":[]}`
    }]
  });
  
  const text = extractResponse.content.find(b => b.type === 'text')?.text || '';
  try {
    const data = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
    if (data.quotes?.length) {
      console.log(`  ✅ ${data.quotes.length} quotes:`);
      data.quotes.forEach(q => console.log(`     "${q.text}" - ${q.source}`));
      
      const existing = startup.extracted_data || {};
      await supabase.from('startup_uploads').update({
        extracted_data: { ...existing, press_quotes: data.quotes, press_updated: new Date().toISOString() }
      }).eq('id', startup.id);
      console.log('  💾 Saved');
    } else {
      console.log('  No quotes found');
    }
  } catch (e) {
    console.log('  Parse error');
  }
}

async function main() {
  for (const name of targets) {
    const { data } = await supabase
      .from('startup_uploads')
      .select('id, name, website, extracted_data')
      .ilike('name', `%${name}%`)
      .limit(1);
    
    if (data?.[0]) {
      await enrichStartup(data[0]);
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log(`\n❌ ${name} not found`);
    }
  }
}

main();
