#!/usr/bin/env node
/**
 * Data Quality Analysis for Matching Algorithm
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyze() {
  console.log('═'.repeat(60));
  console.log('📊 DATA QUALITY ANALYSIS');
  console.log('═'.repeat(60));
  
  // Startup analysis
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score')
    .eq('status', 'approved')
    .limit(500);
  
  console.log('\n🚀 STARTUPS (' + startups.length + ' sampled)');
  
  let noSectors = 0, emptySectors = 0, nullStage = 0, lowGod = 0;
  const stageDist = {};
  const sectorCounts = {};
  
  startups.forEach(s => {
    if (!s.sectors) noSectors++;
    else if (s.sectors.length === 0) emptySectors++;
    else s.sectors.forEach(sec => { sectorCounts[sec] = (sectorCounts[sec] || 0) + 1; });
    
    if (s.stage === null || s.stage === undefined) nullStage++;
    else stageDist[s.stage] = (stageDist[s.stage] || 0) + 1;
    
    if ((s.total_god_score || 0) < 40) lowGod++;
  });
  
  console.log('  Missing sectors: ' + noSectors + ' (' + (noSectors/startups.length*100).toFixed(1) + '%)');
  console.log('  Empty sectors[]: ' + emptySectors + ' (' + (emptySectors/startups.length*100).toFixed(1) + '%)');
  console.log('  Null stage: ' + nullStage + ' (' + (nullStage/startups.length*100).toFixed(1) + '%)');
  console.log('  Low GOD (<40): ' + lowGod + ' (' + (lowGod/startups.length*100).toFixed(1) + '%)');
  console.log('  Stage distribution:', stageDist);
  console.log('  Top sectors:', Object.entries(sectorCounts).sort((a,b) => b[1]-a[1]).slice(0,15));
  
  // Investor analysis
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, sectors, stage')
    .eq('status', 'active')
    .limit(500);
  
  console.log('\n💰 INVESTORS (' + investors.length + ' sampled)');
  
  let invNoSectors = 0, invEmptySectors = 0, invNullStage = 0;
  const invStageDist = {};
  const invSectorCounts = {};
  
  investors.forEach(i => {
    if (!i.sectors) invNoSectors++;
    else if (i.sectors.length === 0) invEmptySectors++;
    else i.sectors.forEach(sec => { invSectorCounts[sec] = (invSectorCounts[sec] || 0) + 1; });
    
    if (!i.stage || (Array.isArray(i.stage) && i.stage.length === 0)) invNullStage++;
    else {
      const stages = Array.isArray(i.stage) ? i.stage : [i.stage];
      stages.forEach(st => { invStageDist[st] = (invStageDist[st] || 0) + 1; });
    }
  });
  
  console.log('  Missing sectors: ' + invNoSectors + ' (' + (invNoSectors/investors.length*100).toFixed(1) + '%)');
  console.log('  Empty sectors[]: ' + invEmptySectors + ' (' + (invEmptySectors/investors.length*100).toFixed(1) + '%)');
  console.log('  No stage data: ' + invNullStage + ' (' + (invNullStage/investors.length*100).toFixed(1) + '%)');
  console.log('  Stage distribution:', invStageDist);
  console.log('  Top sectors:', Object.entries(invSectorCounts).sort((a,b) => b[1]-a[1]).slice(0,15));
  
  // Cross-reference: sector vocabulary overlap
  console.log('\n🔗 SECTOR VOCABULARY OVERLAP');
  const startupSectorSet = new Set(Object.keys(sectorCounts).map(s => s.toLowerCase()));
  const investorSectorSet = new Set(Object.keys(invSectorCounts).map(s => s.toLowerCase()));
  
  const overlap = [...startupSectorSet].filter(s => investorSectorSet.has(s));
  const startupOnly = [...startupSectorSet].filter(s => !investorSectorSet.has(s));
  const investorOnly = [...investorSectorSet].filter(s => !startupSectorSet.has(s));
  
  console.log('  Overlapping sectors:', overlap.length);
  console.log('  Startup-only sectors:', startupOnly.slice(0, 10));
  console.log('  Investor-only sectors:', investorOnly.slice(0, 10));
}

analyze().catch(console.error);
