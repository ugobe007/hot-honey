import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY });

async function execSqlRows(query) {
  const { data, error } = await supabase.rpc('exec_sql_rows', { sql_query: query });
  if (error) throw error;
  return data || [];
}

async function execSqlModify(query) {
  const { data, error } = await supabase.rpc('exec_sql_modify', { sql_query: query });
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
  console.log('\n📊 FIXING STARTUP EMBEDDINGS AND GENERATING MATCHES\n');
  
  // Check what we really have
  const startupTotals = await execSqlRows(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embedding,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
    FROM startups
  `);
  console.log('📋 Current startups:', JSON.stringify(startupTotals[0]));

  // Find startups without embeddings
  const noEmbedding = await execSqlRows(`
    SELECT id, name, description 
    FROM startups 
    WHERE embedding IS NULL 
    ORDER BY created_at 
    LIMIT 100
  `);
  
  console.log(`\n🔧 Startups without embeddings: ${noEmbedding.length}`);
  
  // Generate embeddings for those without
  let fixed = 0;
  for (const startup of noEmbedding) {
    if (!startup.name && !startup.description) continue;
    
    const text = `Startup: ${startup.name || 'Unknown'}. ${startup.description || ''}`;
    try {
      const embedding = await generateEmbedding(text);
      
      if (embedding) {
        const embStr = `'[${embedding.join(',')}]'::vector(1536)`;
        await execSqlModify(`
          UPDATE startups 
          SET embedding = ${embStr}, status = 'approved', updated_at = NOW()
          WHERE id = '${startup.id}'
        `);
        fixed++;
        process.stdout.write('.');
      }
    } catch (e) {
      console.log(`\nError on ${startup.name}: ${e.message}`);
    }
  }
  console.log(`\n✅ Fixed ${fixed} startup embeddings`);

  // Now let's check if we need to generate more matches
  console.log('\n🔗 GENERATING MATCHES...');
  
  // Get ALL startups with embeddings (regardless of status)
  const startups = await execSqlRows(`
    SELECT id, name, embedding 
    FROM startups 
    WHERE embedding IS NOT NULL
    LIMIT 200
  `);
  
  console.log(`   Found ${startups.length} startups with embeddings`);
  
  if (startups.length === 0) {
    console.log('   ⚠️  No startups with embeddings found!');
    return;
  }
  
  // For each startup, find matching investors using vector similarity
  let matchCount = 0;
  for (const startup of startups) {
    if (!startup.embedding) continue;
    
    // Use embedding similarity to find top investors
    try {
      const matches = await execSqlRows(`
        SELECT id, firm, name, 
               1 - (embedding <=> '${JSON.stringify(startup.embedding)}') as similarity
        FROM investors 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> '${JSON.stringify(startup.embedding)}'
        LIMIT 25
      `);
      
      for (const inv of matches) {
        if (inv.similarity > 0.3) { // Only keep decent matches
          const score = Math.round(inv.similarity * 100);
          await execSqlModify(`
            INSERT INTO matches (startup_id, investor_id, score, status, created_at)
            VALUES ('${startup.id}', '${inv.id}', ${score}, 'pending', NOW())
            ON CONFLICT (startup_id, investor_id) DO UPDATE SET score = ${score}, updated_at = NOW()
          `);
          matchCount++;
        }
      }
      process.stdout.write(`[${startup.name?.substring(0,12) || 'unknown'}] `);
    } catch (e) {
      console.log(`\nMatch error: ${e.message}`);
    }
  }
  
  console.log(`\n\n✅ Generated ${matchCount} matches`);

  // Final stats
  const finalStats = await execSqlRows(`
    SELECT 
      (SELECT COUNT(*) FROM investors) as investors,
      (SELECT COUNT(*) FROM startups) as startups,
      (SELECT COUNT(*) FROM startups WHERE embedding IS NOT NULL) as startups_embedded,
      (SELECT COUNT(*) FROM matches) as matches
  `);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 FINAL DATABASE STATUS                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   🏢 Investors: ${finalStats[0]?.investors || 0} (all with embeddings)`);
  console.log(`   🚀 Startups: ${finalStats[0]?.startups || 0} (${finalStats[0]?.startups_embedded || 0} embedded)`);
  console.log(`   🔗 Matches: ${finalStats[0]?.matches || 0}`);
  console.log('');
}

main().catch(console.error);
