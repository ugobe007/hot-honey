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
  let score = 20; // Base score
  
  const startupSectors = (startup.sectors || []).map(s => (s || '').toString().toLowerCase()).filter(Boolean);
  const investorSectors = (investor.sectors || []).map(s => (s || '').toString().toLowerCase()).filter(Boolean);

  // SECTOR FIT (0-25 points)
  if (startupSectors.length > 0 && investorSectors.length > 0) {
    const directMatch = startupSectors.some(s =>
      investorSectors.some(is => is.includes(s) || s.includes(is))
    );

    if (directMatch) {
      score += 25;
    } else {
      const primarySector = startupSectors[0];
      const related = SECTOR_AFFINITY[primarySector] || [];
      const affinityMatch = related.some(r =>
        investorSectors.some(is => is.includes(r) || r.includes(is))
      );
      score += affinityMatch ? 12 : 0;
    }
  }

  // STAGE FIT (0-20 points)
  const startupStage = STAGE_MAP[getStageString(startup.stage)] ?? 1;
  const investorStage = STAGE_MAP[getStageString(investor.stage)] ?? 1;
  const stageDiff = Math.abs(startupStage - investorStage);

  if (stageDiff === 0) score += 20;
  else if (stageDiff === 1) score += 12;
  else if (stageDiff === 2) score += 5;

  // TRACTION (0-15 points)
  if (startup.has_revenue) score += 10;
  else if (startup.has_customers) score += 6;
  else if (startup.is_launched) score += 3;

  // GOD SCORE BONUS (0-15 points)
  const godScore = startup.total_god_score || 0;
  if (godScore >= 58) score += 15;
  else if (godScore >= 50) score += 10;
  else if (godScore >= 40) score += 5;

  return Math.min(95, Math.max(20, Math.round(score)));
}

async function loadAll(table, selectFields, eqField, eqValue) {
  let all = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    let query = supabase.from(table).select(selectFields);
    if (eqField) query = query.eq(eqField, eqValue);
    query = query.range(offset, offset + batchSize - 1);
    
    const { data, error } = await query;
    if (error) { console.error('Load error:', error); break; }
    if (!data || data.length === 0) break;
    
    all = all.concat(data);
    offset += batchSize;
    if (data.length < batchSize) break;
  }
  return all;
}

async function rescore() {
  console.log('═'.repeat(60));
  console.log('🔄 ENHANCED MATCH RE-SCORING');
  console.log('═'.repeat(60));
  console.log('');

  console.log('Loading all startups...');
  const startups = await loadAll(
    'startup_uploads', 
    'id, sectors, stage, total_god_score, has_revenue, has_customers, is_launched',
    'status', 'approved'
  );
  const startupMap = new Map(startups.map(s => [s.id, s]));
  console.log('Loaded', startups.length, 'startups');

  console.log('Loading all investors...');
  const investors = await loadAll(
    'investors',
    'id, sectors, stage',
    'status', 'active'
  );
  const investorMap = new Map(investors.map(i => [i.id, i]));
  console.log('Loaded', investors.length, 'investors');

  let offset = 0, updated = 0, processed = 0, skipped = 0;
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
      if (!startup || !investor) { skipped++; continue; }

      const newScore = calculateEnhancedScore(startup, investor);
      processed++;
      
      if (Math.abs(newScore - (m.match_score || 0)) >= 2) {
        updates.push({ 
          id: m.id, 
          match_score: newScore, 
          confidence_level: newScore >= 60 ? 'high' : newScore >= 45 ? 'medium' : 'low' 
        });
      }
    }

    if (updates.length > 0) {
      const { error } = await supabase.from('startup_investor_matches').upsert(updates);
      if (error) console.error('Update error:', error.message);
      else updated += updates.length;
    }

    offset += batchSize;
    if (offset % 100000 === 0) console.log('Processed', offset, '- Updated', updated);
    if (matches.length < batchSize) break;
  }

  console.log('\n✅ Done!');
  console.log('  Processed:', processed);
  console.log('  Updated:', updated);
  console.log('  Skipped:', skipped);

  // Show distribution
  console.log('\n📊 Calculating new distribution...');
  const { data: scores } = await supabase.from('startup_investor_matches').select('match_score').limit(50000);
  const buckets = { '20-35': 0, '36-50': 0, '51-65': 0, '66-80': 0, '81-95': 0 };
  let sum = 0;
  scores.forEach(r => {
    const sc = r.match_score || 0;
    sum += sc;
    if (sc <= 35) buckets['20-35']++;
    else if (sc <= 50) buckets['36-50']++;
    else if (sc <= 65) buckets['51-65']++;
    else if (sc <= 80) buckets['66-80']++;
    else buckets['81-95']++;
  });
  console.log('\n📈 NEW DISTRIBUTION:');
  Object.entries(buckets).forEach(([r, c]) => {
    const pct = (c/scores.length*100).toFixed(1);
    const bar = '#'.repeat(Math.round(pct/2));
    console.log('  ' + r + ': ' + bar + ' ' + pct + '%');
  });
  console.log('  Average:', (sum/scores.length).toFixed(1));
  console.log('');
  console.log('═'.repeat(60));
}

rescore().catch(console.error);



