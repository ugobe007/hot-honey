/**
 * Startup & Investor Funding Insights Script
 * Lists recent funded startups, summarizes active investors, and aggregates common signals.
 * Usage: npx tsx scripts/funding-insights.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // 1. List most recently funded startups
  const { data: startups, error: startupErr } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, stage, mrr, arr, team_size, customer_count, growth_rate_monthly, total_god_score, traction_score, market_score, product_score, vision_score, created_at, extracted_data, raise_amount, raise_type')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);
  if (startupErr) throw startupErr;

  console.log('\n=== Most Recently Funded Startups ===');
  for (const s of startups || []) {
    console.log(`- ${s.name} | Sectors: ${s.sectors?.join(', ') || 'N/A'} | Stage: ${s.stage || 'N/A'} | MRR: ${s.mrr || 'N/A'} | ARR: ${s.arr || 'N/A'} | Team: ${s.team_size || 'N/A'} | Customers: ${s.customer_count || 'N/A'} | Growth: ${s.growth_rate_monthly || 'N/A'} | GOD: ${s.total_god_score || 'N/A'} | Raised: ${s.raise_amount || 'N/A'} (${s.raise_type || 'N/A'})`);
  }

  // 2. Summarize most active investors (by count of matches)
  const { data: matches, error: matchErr } = await supabase
    .from('startup_investor_matches')
    .select('investor_id, startup_id')
    .not('investor_id', 'is', null);
  if (matchErr) throw matchErr;
  const investorCounts: Record<string, number> = {};
  for (const m of matches || []) {
    if (m.investor_id) investorCounts[m.investor_id] = (investorCounts[m.investor_id] || 0) + 1;
  }
  const topInvestors = Object.entries(investorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topInvestors.length) {
    const { data: investors, error: invErr } = await supabase
      .from('investors')
      .select('id, name, sectors, stage, notable_investments')
      .in('id', topInvestors.map(([id]) => id));
    if (invErr) throw invErr;
    console.log('\n=== Most Active Investors ===');
    for (const inv of investors || []) {
      const count = investorCounts[inv.id] || 0;
      console.log(`- ${inv.name} | Sectors: ${inv.sectors?.join(', ') || 'N/A'} | Stage: ${inv.stage?.join(', ') || 'N/A'} | Deals: ${count} | Notable: ${Array.isArray(inv.notable_investments) ? inv.notable_investments.join(', ') : 'N/A'}`);
    }
  }

  // 3. Aggregate most common signals among funded startups
  const sectorCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  const growths: number[] = [];
  for (const s of startups || []) {
    if (Array.isArray(s.sectors)) for (const sec of s.sectors) sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    if (s.stage) stageCounts[s.stage] = (stageCounts[s.stage] || 0) + 1;
    if (typeof s.growth_rate_monthly === 'number') growths.push(s.growth_rate_monthly);
  }
  const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const avgGrowth = growths.length ? (growths.reduce((a, b) => a + b, 0) / growths.length) : null;
  console.log('\n=== Most Common Signals Among Funded Startups ===');
  console.log(`Top Sectors: ${topSectors.map(([s, n]) => `${s} (${n})`).join(', ')}`);
  console.log(`Top Stages: ${topStages.map(([s, n]) => `${s} (${n})`).join(', ')}`);
  if (avgGrowth !== null) console.log(`Average Monthly Growth Rate: ${avgGrowth.toFixed(2)}%`);
}

main();
