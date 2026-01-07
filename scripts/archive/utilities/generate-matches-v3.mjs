import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n🔗 GENERATING MATCHES: 120 Startups x 571 Investors\n');
  
  // Get all startups with embeddings  
  const { data: startups } = await supabase.rpc('exec_sql_rows', { 
    sql_query: "SELECT id, name, embedding FROM startups WHERE embedding IS NOT NULL" 
  });
  
  console.log(`Found ${startups.length} startups with embeddings`);
  
  let totalMatches = 0;
  let startupCount = 0;
  
  for (const startup of startups) {
    startupCount++;
    if (!startup.embedding) continue;
    
    // Format embedding as array string for vector comparison
    // The embedding is already an array, convert to postgres vector format
    const embVector = '[' + startup.embedding.join(',') + ']';
    
    const { data: matches, error } = await supabase.rpc('exec_sql_rows', { 
      sql_query: `
        SELECT id, firm, name, 
               1 - (embedding <=> '${embVector}') as similarity
        FROM investors 
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> '${embVector}'
        LIMIT 25
      `
    });
    
    if (error) {
      console.log(`\nError for ${startup.name}:`, error);
      continue;
    }
    
    if (!matches || matches.error) {
      console.log(`\nQuery error for ${startup.name}:`, matches?.error || 'no data');
      continue;
    }
    
    if (!Array.isArray(matches)) {
      continue;
    }
    
    // Insert matches - startup_id is text, investor_id is uuid
    for (const inv of matches) {
      if (inv.similarity > 0.30) {
        const score = Math.round(inv.similarity * 100);
        const { data: result } = await supabase.rpc('exec_sql_modify', { 
          sql_query: `
            INSERT INTO matches (startup_id, investor_id, match_score, status, created_at)
            VALUES ('${startup.id}', '${inv.id}'::uuid, ${score}, 'pending', NOW())
            ON CONFLICT (startup_id, investor_id) DO UPDATE SET match_score = ${score}, updated_at = NOW()
          `
        });
        
        if (result?.success) {
          totalMatches++;
        }
      }
    }
    
    process.stdout.write(`[${startupCount}] `);
    if (startupCount % 20 === 0) console.log('');
  }
  
  // Final count
  const { data: matchCount } = await supabase.rpc('exec_sql_rows', { 
    sql_query: "SELECT COUNT(*) as total FROM matches" 
  });
  
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ MATCHING COMPLETE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   🚀 Startups processed: ${startupCount}`);
  console.log(`   🔗 Total matches in DB: ${matchCount?.[0]?.total || 0}`);
  console.log('');
}

main();
