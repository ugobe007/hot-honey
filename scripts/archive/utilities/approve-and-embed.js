import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY });

async function execSql(query) {
  const { data, error } = await supabase.rpc('exec_sql_rows', { sql_query: query });
  if (error) throw error;
  return data;
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000),
    dimensions: 1536
  });
  return response.data[0]?.embedding;
}

async function main() {
  // Get all startups without embeddings
  const startups = await execSql(`
    SELECT id, name, tagline, pitch, sectors, stage, raise_amount 
    FROM startup_uploads 
    WHERE embedding IS NULL 
    LIMIT 50
  `);
  
  console.log(`Found ${startups.length} startups without embeddings\n`);
  
  let success = 0;
  for (const startup of startups) {
    process.stdout.write(`   Processing ${startup.name.substring(0, 30).padEnd(30)}...`);
    
    const text = [
      `Company: ${startup.name}`,
      startup.tagline ? `Tagline: ${startup.tagline}` : '',
      startup.pitch ? `Pitch: ${startup.pitch}` : '',
      startup.sectors?.length ? `Sectors: ${startup.sectors.join(', ')}` : '',
      startup.stage ? `Stage: ${startup.stage}` : ''
    ].filter(p => p).join('. ');
    
    try {
      const embedding = await generateEmbedding(text);
      if (embedding) {
        const embeddingStr = `[${embedding.join(',')}]`;
        await execSql(`
          UPDATE startup_uploads 
          SET embedding = '${embeddingStr}'::vector(1536), 
              status = 'approved',
              updated_at = NOW() 
          WHERE id = '${startup.id}'
        `);
        console.log(' ✅');
        success++;
      }
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }
  
  console.log(`\n✅ Embedded ${success} startups`);
}

main().catch(console.error);
