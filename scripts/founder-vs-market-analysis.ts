/**
 * Founder Metrics vs Market Signals Analysis
 * Compares founder-centric metrics to traction/product signals in the current dataset.
 * Usage: npx tsx scripts/founder-vs-market-analysis.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, team_size, traction_score, market_score, product_score, mrr, arr, growth_rate_monthly, customer_count, total_god_score, extracted_data, created_at')
    .eq('status', 'approved');
  if (error) throw error;
  if (!startups || startups.length === 0) {
    console.log('No startups found.');
    return;
  }

  // Founder-centric metrics (from extracted_data)
  let courageCount = 0, intelligenceCount = 0, youngFounders = 0, pivots = 0, techCofounders = 0, teamSum = 0, teamCount = 0;
  // Traction/product metrics
  let mrrCount = 0, arrCount = 0, growthCount = 0, customerCount = 0;
  // Score sums
  let tractionSum = 0, marketSum = 0, productSum = 0, godSum = 0;

  for (const s of startups) {
    // Check extracted_data for founder metrics
    const extracted = s.extracted_data as any;
    if (extracted) {
      if (extracted.founder_courage) courageCount++;
      if (extracted.founder_intelligence) intelligenceCount++;
      if (extracted.founders_under_30 && extracted.founders_under_30 > 0) youngFounders++;
      if (extracted.pivots_made && extracted.pivots_made > 0) pivots++;
      if (extracted.technical_cofounders && extracted.technical_cofounders > 0) techCofounders++;
      // Also check team array
      if (extracted.team && Array.isArray(extracted.team) && extracted.team.length > 0) {
        const hasTechCofounder = extracted.team.some((member: any) => 
          member.role?.toLowerCase().includes('cto') || 
          member.role?.toLowerCase().includes('technical') ||
          member.role?.toLowerCase().includes('engineer')
        );
        if (hasTechCofounder) techCofounders++;
      }
    }
    
    if (typeof s.team_size === 'number') { teamSum += s.team_size; teamCount++; }
    if (s.mrr) mrrCount++;
    if (s.arr) arrCount++;
    if (s.growth_rate_monthly) growthCount++;
    if (s.customer_count) customerCount++;
    if (typeof s.traction_score === 'number') tractionSum += s.traction_score;
    if (typeof s.market_score === 'number') marketSum += s.market_score;
    if (typeof s.product_score === 'number') productSum += s.product_score;
    if (typeof s.total_god_score === 'number') godSum += s.total_god_score;
  }

  const n = startups.length;
  console.log('\n=== Founder-Centric Metrics ===');
  console.log(`Courage present: ${courageCount} (${((courageCount/n)*100).toFixed(1)}%)`);
  console.log(`Intelligence present: ${intelligenceCount} (${((intelligenceCount/n)*100).toFixed(1)}%)`);
  console.log(`Founders under 30: ${youngFounders} (${((youngFounders/n)*100).toFixed(1)}%)`);
  console.log(`Startups with pivots: ${pivots} (${((pivots/n)*100).toFixed(1)}%)`);
  console.log(`Technical cofounders: ${techCofounders} (${((techCofounders/n)*100).toFixed(1)}%)`);
  console.log(`Avg team size: ${(teamCount ? (teamSum/teamCount).toFixed(2) : 'N/A')}`);

  console.log('\n=== Traction/Product Metrics ===');
  console.log(`MRR present: ${mrrCount} (${((mrrCount/n)*100).toFixed(1)}%)`);
  console.log(`ARR present: ${arrCount} (${((arrCount/n)*100).toFixed(1)}%)`);
  console.log(`Growth rate present: ${growthCount} (${((growthCount/n)*100).toFixed(1)}%)`);
  console.log(`Customer count present: ${customerCount} (${((customerCount/n)*100).toFixed(1)}%)`);

  console.log('\n=== Average Scores ===');
  console.log(`Avg traction score: ${(tractionSum/n).toFixed(2)}`);
  console.log(`Avg market score: ${(marketSum/n).toFixed(2)}`);
  console.log(`Avg product score: ${(productSum/n).toFixed(2)}`);
  console.log(`Avg GOD score: ${(godSum/n).toFixed(2)}`);
}

main().catch((error) => {
  console.error('Error running analysis:', error);
  process.exit(1);
});
