#!/usr/bin/env node
/**
 * SMART RE-MATCHING
 * ==================
 * Deletes old random matches and creates sector-aligned matches only.
 * Ensures every startup gets matched with relevant investors.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'ai/ml': 2.0, 'ai': 2.0, 'ml': 2.0, 'saas': 2.0, 'fintech': 2.0,
  'healthtech': 2.0, 'healthcare': 2.0, 'consumer': 2.0, 'robotics': 2.0,
  'crypto': 1.0, 'web3': 1.0,
  'cleantech': 0.5, 'climate': 0.5, 'gaming': 0.5, 'edtech': 0.5
};

function normalizeSector(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml') || s.includes('machine learning')) return 'ai';
  if (s.includes('saas') || s.includes('software') || s.includes('enterprise')) return 'saas';
  if (s.includes('fintech') || s.includes('finance') || s.includes('payment')) return 'fintech';
  if (s.includes('health') || s.includes('medical') || s.includes('biotech')) return 'health';
  if (s.includes('consumer') || s.includes('social')) return 'consumer';
  if (s.includes('robot')) return 'robotics';
  if (s.includes('crypto') || s.includes('web3') || s.includes('blockchain')) return 'crypto';
  if (s.includes('climate') || s.includes('clean') || s.includes('energy')) return 'climate';
  if (s.includes('gaming') || s.includes('game')) return 'gaming';
  if (s.includes('edtech') || s.includes('education')) return 'edtech';
  return 'other';
}

function calculateScore(startup, investor) {
  const godScore = startup.total_god_score || 40;
  const sSectors = (startup.sectors || []).map(s => normalizeSector(s));
  const iSectors = (investor.sectors || []).map(s => normalizeSector(s));
  
  let sectorBonus = 0;
  const matchedSectors = [];
  
  sSectors.forEach(sec => {
    if (iSectors.includes(sec)) {
      const w = SECTOR_WEIGHTS[sec] || 1.0;
      sectorBonus += 8 * w;
      matchedSectors.push(sec);
    }
  });
  sectorBonus = Math.min(sectorBonus, 32);

  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  const stageBonus = iStages.some(x => x.includes(sStage)) ? 10 : 0;

  return {
    score: Math.min(godScore + sectorBonus + stageBonus, 99),
    sectorBonus,
    stageBonus,
    matchedSectors
  };
}

async function smartRematch() {
  console.log('\n🎯 SMART RE-MATCHING ENGINE\n');
  console.log('This will create sector-aligned matches only.\n');

  // Load all data
  console.log('Loading startups and investors...');
  
  const [startupsRes, investorsRes] = await Promise.all([
    supabase.from('startup_uploads')
      .select('id, name, total_god_score, sectors, stage')
      .eq('status', 'approved')
      .order('total_god_score', { ascending: false }),
    supabase.from('investors')
      .select('id, name, sectors, stage, firm')
      .not('sectors', 'eq', '{}')
  ]);

  const startups = startupsRes.data || [];
  const investors = investorsRes.data || [];

  console.log('Startups:', startups.length);
  console.log('Investors:', investors.length);

  // Build investor index by sector
  console.log('\nBuilding sector index...');
  const investorsBySector = {};
  
  investors.forEach(inv => {
    const sectors = (inv.sectors || []).map(s => normalizeSector(s));
    sectors.forEach(sec => {
      if (!investorsBySector[sec]) investorsBySector[sec] = [];
      investorsBySector[sec].push(inv);
    });
  });

  console.log('Sectors indexed:', Object.keys(investorsBySector).join(', '));
  Object.entries(investorsBySector).forEach(([sec, invs]) => {
    console.log('  ' + sec + ': ' + invs.length + ' investors');
  });

  // Delete old matches (in batches to avoid timeout)
  console.log('\nClearing old matches...');
  let deleted = 0;
  while (true) {
    const { data, error } = await supabase
      .from('startup_investor_matches')
      .delete()
      .lt('match_score', 60)
      .select('id')
      .limit(1000);
    
    if (error || !data || data.length === 0) break;
    deleted += data.length;
    console.log('  Deleted:', deleted);
    if (data.length < 1000) break;
  }
  console.log('Total deleted:', deleted);

  // Create smart matches
  console.log('\nCreating sector-aligned matches...');
  
  let created = 0;
  let skipped = 0;
  const batchSize = 100;
  let batch = [];

  for (const startup of startups) {
    const sSectors = (startup.sectors || []).map(s => normalizeSector(s));
    
    // Find matching investors
    const candidateInvestors = new Set();
    sSectors.forEach(sec => {
      (investorsBySector[sec] || []).forEach(inv => candidateInvestors.add(inv));
    });

    // Also add some general investors if no sector match
    if (candidateInvestors.size === 0) {
      (investorsBySector['saas'] || []).slice(0, 5).forEach(inv => candidateInvestors.add(inv));
      (investorsBySector['ai'] || []).slice(0, 5).forEach(inv => candidateInvestors.add(inv));
    }

    // Score and filter
    const matches = [];
    candidateInvestors.forEach(inv => {
      const result = calculateScore(startup, inv);
      if (result.score >= 50) {
        matches.push({
          startup_id: startup.id,
          investor_id: inv.id,
          match_score: result.score,
          created_at: new Date().toISOString()
        });
      }
    });

    // Keep top 10 matches per startup
    matches.sort((a, b) => b.match_score - a.match_score);
    const topMatches = matches.slice(0, 10);
    
    batch.push(...topMatches);
    
    if (batch.length >= batchSize) {
      const { error } = await supabase.from('startup_investor_matches').insert(batch);
      if (!error) created += batch.length;
      else skipped += batch.length;
      batch = [];
      process.stdout.write('\r  Created: ' + created + ' | Skipped: ' + skipped);
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    const { error } = await supabase.from('startup_investor_matches').insert(batch);
    if (!error) created += batch.length;
    else skipped += batch.length;
  }

  console.log('\n\n✅ Smart matching complete!');
  console.log('  Created:', created, 'new matches');
  console.log('  Skipped:', skipped);

  // Check new distribution
  console.log('\n📊 New Match Distribution:');
  const { data: sample } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(1000);

  const scores = sample.map(m => m.match_score).filter(Boolean);
  const buckets = { '90+': 0, '80-89': 0, '70-79': 0, '60-69': 0, '50-59': 0, '<50': 0 };
  
  scores.forEach(sc => {
    if (sc >= 90) buckets['90+']++;
    else if (sc >= 80) buckets['80-89']++;
    else if (sc >= 70) buckets['70-79']++;
    else if (sc >= 60) buckets['60-69']++;
    else if (sc >= 50) buckets['50-59']++;
    else buckets['<50']++;
  });

  Object.entries(buckets).forEach(([range, count]) => {
    const pct = Math.round(count / scores.length * 100);
    console.log('  ' + range.padEnd(8) + count.toString().padStart(5) + ' (' + pct + '%)');
  });

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const goodFits = scores.filter(s => s >= 60).length;
  console.log('\n  Average:', avg);
  console.log('  Good fits (60+):', goodFits, '(' + Math.round(goodFits / scores.length * 100) + '%)');
}

smartRematch().catch(console.error);
