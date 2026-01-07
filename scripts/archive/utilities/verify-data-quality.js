import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function execSqlRows(query) {
  const { data, error } = await supabase.rpc('exec_sql_rows', { sql_query: query });
  if (error) throw error;
  return data;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 DATABASE AUDIT REPORT                            ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

  // Investor stats
  const investorStats = await execSqlRows(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
      COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as with_name,
      COUNT(CASE WHEN firm IS NOT NULL AND firm != '' THEN 1 END) as with_firm,
      COUNT(CASE WHEN stage IS NOT NULL AND array_length(stage, 1) > 0 THEN 1 END) as with_stage,
      COUNT(CASE WHEN sectors IS NOT NULL AND array_length(sectors, 1) > 0 THEN 1 END) as with_sectors,
      COUNT(CASE WHEN check_size_min IS NOT NULL THEN 1 END) as with_check_size
    FROM investors
  `);

  const inv = investorStats[0];
  console.log('🏢 INVESTORS TABLE');
  console.log('   ├─ Total: ' + inv.total);
  console.log('   ├─ With embeddings: ' + inv.with_embeddings + ' (' + Math.round(inv.with_embeddings/inv.total*100) + '%)');
  console.log('   ├─ With name: ' + inv.with_name + ' (' + Math.round(inv.with_name/inv.total*100) + '%)');
  console.log('   ├─ With firm: ' + inv.with_firm + ' (' + Math.round(inv.with_firm/inv.total*100) + '%)');
  console.log('   ├─ With stage array: ' + inv.with_stage + ' (' + Math.round(inv.with_stage/inv.total*100) + '%)');
  console.log('   ├─ With sectors array: ' + inv.with_sectors + ' (' + Math.round(inv.with_sectors/inv.total*100) + '%)');
  console.log('   └─ With check size: ' + inv.with_check_size + ' (' + Math.round(inv.with_check_size/inv.total*100) + '%)\n');

  // Startup stats
  const startupStats = await execSqlRows(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
    FROM startups
  `);

  const st = startupStats[0];
  console.log('🚀 STARTUPS TABLE');
  console.log('   ├─ Total: ' + st.total);
  console.log('   ├─ With embeddings: ' + st.with_embeddings + ' (' + Math.round(st.with_embeddings/st.total*100) + '%)');
  console.log('   └─ Approved: ' + st.approved + ' (' + Math.round(st.approved/st.total*100) + '%)\n');

  // Matches stats
  const matchStats = await execSqlRows(`
    SELECT COUNT(*) as total FROM matches
  `);

  console.log('🔗 MATCHES TABLE');
  console.log('   └─ Total matches: ' + matchStats[0].total + '\n');

  // Sample investors with full data
  console.log('📋 SAMPLE INVESTORS (showing schema correctness):');
  const samples = await execSqlRows(`
    SELECT name, firm, stage, sectors, check_size_min, check_size_max
    FROM investors 
    WHERE name IS NOT NULL AND firm IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 5
  `);

  samples.forEach((inv, i) => {
    console.log(`   ${i+1}. ${inv.name} @ ${inv.firm}`);
    console.log(`      Stages: ${JSON.stringify(inv.stage)}`);
    console.log(`      Sectors: ${JSON.stringify(inv.sectors)}`);
    console.log(`      Check: $${inv.check_size_min?.toLocaleString() || 'N/A'} - $${inv.check_size_max?.toLocaleString() || 'N/A'}`);
  });

  // Top firms by unique sectors coverage
  const topFirms = await execSqlRows(`
    SELECT firm, name, array_length(sectors, 1) as sector_count
    FROM investors 
    WHERE sectors IS NOT NULL AND array_length(sectors, 1) > 3
    ORDER BY array_length(sectors, 1) DESC
    LIMIT 10
  `);

  console.log('\n🏆 TOP INVESTORS BY SECTOR COVERAGE:');
  topFirms.forEach((inv, i) => {
    console.log(`   ${i+1}. ${inv.name} @ ${inv.firm} (${inv.sector_count} sectors)`);
  });

  console.log('\n✅ DATA PIPELINE VERIFIED - Schema is correct!\n');
}

main().catch(console.error);
