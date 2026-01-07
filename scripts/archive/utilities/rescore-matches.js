require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SECTOR_AFFINITY = {
  'ai': ['devtools', 'enterprise', 'saas', 'healthtech'],
  'fintech': ['crypto', 'enterprise', 'saas'],
  'healthtech': ['biotech', 'ai', 'consumer'],
  'devtools': ['ai', 'saas', 'enterprise'],
  'saas': ['enterprise', 'devtools', 'ai'],
  'consumer': ['marketplace', 'fintech'],
  'climatetech': ['hardware', 'enterprise'],
  'crypto': ['fintech', 'consumer'],
  'enterprise': ['saas', 'ai', 'devtools']
};

const STAGE_MAP = {
  'pre-seed': 0, 'angel': 0, 'seed': 1,
  'series a': 2, 'series-a': 2,
  'series b': 3, 'series-b': 3,
  'series c': 4, 'series-c': 4,
  'growth': 5, 'late': 6
};

function getStageString(stage) {
  if (!stage) return '';
  if (typeof stage === 'string') return stage.toLowerCase();
  if (Array.isArray(stage)) return (stage[0] || '').toString().toLowerCase();
  if (typeof stage === 'object') return (stage.name || stage.value || '').toString().toLowerCase();
  return '';
}

function calculateEnhancedScore(startup, investor) {
  let score = 0;
  const startupSectors = (startup.sectors || []).map(s => (s || '').toString().toLowerCase());
  const investorSectors = (investor.sectors || []).map(s => (s || '').toString().toLowerCase());

  const directMatch = startupSectors.some(s =>
    s && investorSectors.some(is => is && (is.includes(s) || s.includes(is)))
  );

  if (directMatch) score += 30;
  else {
    const primarySector = startupSectors[0] || '';
    const related = SECTOR_AFFINITY[primarySector] || [];
    const affinityMatch = related.some(r =>
      investorSectors.some(is => is && (is.includes(r) || r.includes(is)))
    );
    score += affinityMatch ? 18 : 8;
  }

  const startupStage = STAGE_MAP[getStageString(startup.stage)] ?? 1;
  const investorStage = STAGE_MAP[getStageString(investor.stage)] ?? 1;
  const stageDiff = Math.abs(startupStage - investorStage);

  if (stageDiff === 0) score += 25;
  else if (stageDiff === 1) score += 18;
  else if (stageDiff === 2) score += 10;
  else score += 5;

  if (startup.has_revenue) score += 12;
  else if (startup.has_customers) score += 8;
  else if (startup.is_launched) score += 4;

  const extracted = startup.extracted_data || {};
  if (extracted.repeatFounder) score += 6;
  if (extracted.yc) score += 5;
  if (extracted.bigTechAlumni) score += 3;

  const godScore = startup.total_god_score || 0;
  if (godScore >= 58) score += 15;
  else if (godScore >= 50) score += 10;
  else if (godScore >= 40) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

async function rescore() {
  console.log('Loading startups...');
  const { data: startups, error: sErr } = await supabase
    .from('startup_uploads')
    .select('id, sectors, stage, total_god_score, has_revenue, has_customers, is_launched, extracted_data')
    .eq('status', 'approved');
  
  if (sErr) { console.error('Startup error:', sErr); return; }
  const startupMap = new Map(startups.map(s => [s.id, s]));
  console.log('Loaded', startups.length, 'startups');

  console.log('Loading investors...');
  const { data: investors, error: iErr } = await supabase
    .from('investors')
    .select('id, sectors, stage')
    .eq('status', 'active');
  
  if (iErr) { console.error('Investor error:', iErr); return; }
  const investorMap = new Map(investors.map(i => [i.id, i]));
  console.log('Loaded', investors.length, 'investors');

  let offset = 0, updated = 0, processed = 0;
  const batchSize = 5000;

  console.log('\nRe-scoring matches...');
  while (true) {
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score')
      .range(offset, offset + batchSize - 1);

    if (!matches || matches.length === 0) break;

    const updates = [];
    for (const m of matches) {
      const startup = startupMap.get(m.startup_id);
      const investor = investorMap.get(m.investor_id);
      if (!startup || !investor) continue;

      const newScore = calculateEnhancedScore(startup, investor);
      processed++;
      if (Math.abs(newScore - m.match_score) >= 3) {
        updates.push({ id: m.id, match_score: newScore, confidence_level: newScore >= 60 ? 'high' : newScore >= 45 ? 'medium' : 'low' });
      }
    }

    if (updates.length > 0) {
      await supabase.from('startup_investor_matches').upsert(updates);
      updated += updates.length;
    }

    offset += batchSize;
    console.log('Processed', offset, '- Updated', updated);
    if (matches.length < batchSize) break;
  }

  console.log('\nDone! Updated', updated, 'of', processed, 'matches');

  const { data: scores } = await supabase.from('startup_investor_matches').select('match_score').limit(50000);
  const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  let sum = 0;
  scores.forEach(r => {
    sum += r.match_score;
    if (r.match_score <= 20) buckets['0-20']++;
    else if (r.match_score <= 40) buckets['21-40']++;
    else if (r.match_score <= 60) buckets['41-60']++;
    else if (r.match_score <= 80) buckets['61-80']++;
    else buckets['81-100']++;
  });
  console.log('\nNEW DISTRIBUTION:');
  Object.entries(buckets).forEach(([r, c]) => console.log('  ' + r + ': ' + (c/scores.length*100).toFixed(1) + '%'));
  console.log('  Average:', (sum/scores.length).toFixed(1));
}

rescore();
