import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY });

async function main() {
  console.log('📊 Fixing startups without embeddings...\n');
  
  // Get startups needing embeddings - use correct column names!
  const { data: noEmb, error } = await supabase.rpc('exec_sql_rows', { 
    sql_query: "SELECT id, name, tagline, pitch FROM startups WHERE embedding IS NULL LIMIT 120" 
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Check if noEmb has an error property (returned as object not array)
  if (noEmb && noEmb.error) {
    console.error('Query error:', noEmb.error);
    return;
  }
  
  if (!Array.isArray(noEmb)) {
    console.error('Unexpected response:', noEmb);
    return;
  }
  
  console.log('Found:', noEmb.length, 'startups without embeddings');
  
  let fixed = 0;
  for (const s of noEmb) {
    const text = 'Startup: ' + (s.name || 'Unknown') + '. ' + (s.tagline || '') + ' ' + (s.pitch || '');
    try {
      const resp = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000),
        dimensions: 1536
      });
      const emb = resp.data[0]?.embedding;
      
      if (emb) {
        const embStr = "'[" + emb.join(',') + "]'::vector(1536)";
        await supabase.rpc('exec_sql_modify', { 
          sql_query: "UPDATE startups SET embedding = " + embStr + ", status = 'approved', updated_at = NOW() WHERE id = '" + s.id + "'"
        });
        fixed++;
        process.stdout.write('.');
      }
    } catch(e) { 
      console.log('\nErr on ' + s.name + ':', e.message); 
    }
  }
  
  console.log('\n\n✅ Fixed:', fixed, 'startups');
  
  // Check final count
  const { data: cnt } = await supabase.rpc('exec_sql_rows', { 
    sql_query: "SELECT COUNT(*) as total, COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_emb FROM startups" 
  });
  console.log('Final startup stats:', JSON.stringify(cnt[0]));
}

main();
