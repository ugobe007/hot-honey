#!/usr/bin/env node
/**
 * GOD SCORE CALIBRATION
 * =====================
 * Adjusts GOD scores to align with VC benchmark reality.
 * 
 * Current gap: +42 points (we're too generous)
 * Target: Within ±5 points of VC average
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Calibration factor based on benchmark analysis
const CALIBRATION = {
  // Score adjustment: multiply current scores to bring them in line
  scaleFactor: 0.55, // Brings 76 → 42 (closer to VC avg of 34)
  
  // Minimum score floor
  floor: 25,
  
  // Maximum score ceiling (only elite startups hit 80+)
  ceiling: 85,
  
  // Traction reality check - synthetic data gets penalized
  syntheticPenalty: 15, // Startups with suspicious MRR patterns
  
  // Real signals that should boost scores
  realSignalBonus: {
    hasRealWebsite: 5,
    hasLinkedIn: 3,
    hasRealDescription: 5,
    recentlyActive: 5,
  }
};

async function calibrateScores() {
  console.log('\n🔧 GOD SCORE CALIBRATION');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Adjusting scores to align with VC benchmark reality...\n');
  console.log('Scale factor:', CALIBRATION.scaleFactor);
  console.log('Target range:', CALIBRATION.floor, '-', CALIBRATION.ceiling);
  console.log('');

  // Get all startups
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, mrr, website, linkedin, description, source_type, created_at')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null);

  console.log('Processing', startups.length, 'startups...\n');

  let adjusted = 0;
  const changes = [];

  for (const startup of startups) {
    const oldScore = startup.total_god_score;
    
    // Base calibration
    let newScore = Math.round(oldScore * CALIBRATION.scaleFactor);
    
    // Detect synthetic/suspicious data
    const isSuspicious = detectSuspiciousData(startup);
    if (isSuspicious) {
      newScore -= CALIBRATION.syntheticPenalty;
    }
    
    // Real signal bonuses
    if (isRealWebsite(startup.website)) {
      newScore += CALIBRATION.realSignalBonus.hasRealWebsite;
    }
    if (startup.linkedin) {
      newScore += CALIBRATION.realSignalBonus.hasLinkedIn;
    }
    if (startup.description && startup.description.length > 100) {
      newScore += CALIBRATION.realSignalBonus.hasRealDescription;
    }
    if (isRecentlyActive(startup.created_at)) {
      newScore += CALIBRATION.realSignalBonus.recentlyActive;
    }
    
    // Apply floor and ceiling
    newScore = Math.max(CALIBRATION.floor, Math.min(newScore, CALIBRATION.ceiling));
    
    // Only update if changed
    if (newScore !== oldScore) {
      changes.push({
        name: startup.name,
        old: oldScore,
        new: newScore,
        diff: newScore - oldScore,
        suspicious: isSuspicious,
      });
      
      await supabase
        .from('startup_uploads')
        .update({ 
          total_god_score: newScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', startup.id);
      
      adjusted++;
    }
  }

  // Show sample changes
  console.log('📊 SAMPLE ADJUSTMENTS\n');
  console.log('Startup'.padEnd(30) + 'Old'.padStart(5) + 'New'.padStart(5) + 'Diff'.padStart(6) + '  Notes');
  console.log('─'.repeat(70));
  
  changes.slice(0, 20).forEach(c => {
    const notes = c.suspicious ? '⚠️ Suspicious data' : '';
    console.log(
      c.name.substring(0, 29).padEnd(30) +
      c.old.toString().padStart(5) +
      c.new.toString().padStart(5) +
      (c.diff >= 0 ? '+' : '') + c.diff.toString().padStart(5) +
      '  ' + notes
    );
  });

  // Summary stats
  console.log('\n\n📈 CALIBRATION SUMMARY\n');
  
  const newScores = changes.map(c => c.new);
  const avgNew = newScores.length ? Math.round(newScores.reduce((a,b) => a+b, 0) / newScores.length) : 0;
  const avgOld = changes.length ? Math.round(changes.reduce((a,b) => a + b.old, 0) / changes.length) : 0;
  
  console.log('Startups adjusted:', adjusted);
  console.log('Average score: ' + avgOld + ' → ' + avgNew + ' (' + (avgNew - avgOld) + ')');
  console.log('Suspicious data flagged:', changes.filter(c => c.suspicious).length);
  
  // New distribution
  const buckets = { '70+': 0, '60-69': 0, '50-59': 0, '40-49': 0, '30-39': 0, '<30': 0 };
  newScores.forEach(sc => {
    if (sc >= 70) buckets['70+']++;
    else if (sc >= 60) buckets['60-69']++;
    else if (sc >= 50) buckets['50-59']++;
    else if (sc >= 40) buckets['40-49']++;
    else if (sc >= 30) buckets['30-39']++;
    else buckets['<30']++;
  });
  
  console.log('\nNew Distribution:');
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = newScores.length ? Math.round(count / newScores.length * 100) : 0;
    console.log('  ' + range.padEnd(8) + count.toString().padStart(5) + ' (' + pct + '%)');
  });

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ Calibration Complete - Run VC benchmark again to verify');
  console.log('════════════════════════════════════════════════════════════════\n');
}

function detectSuspiciousData(startup) {
  // Synthetic startups often have:
  // - Generic names (UltraSpace, DataWorks, etc.)
  // - Suspiciously round MRR numbers
  // - Website matching name exactly
  
  const genericPatterns = [
    /^(Ultra|Stellar|Wave|Auto|Spark|Neural|Swift|Hyper|Vertex|Data|Apex|Next|Digital|Smart)[A-Z]/,
    /Works$/, /Labs$/, /Solutions$/, /Systems$/, /Mind$/, /Hub$/, /Cloud$/, /AI$/
  ];
  
  const hasGenericName = genericPatterns.some(p => p.test(startup.name));
  
  // Suspicious MRR (too perfect)
  const suspiciousMRR = startup.mrr && (
    startup.mrr % 1000 === 0 || // Round thousands
    startup.mrr > 100000 // Very high for seed
  );
  
  // Website is just name.com
  const genericWebsite = startup.website && 
    startup.website.toLowerCase().includes(startup.name.toLowerCase().replace(/\s/g, ''));
  
  return hasGenericName && (suspiciousMRR || genericWebsite);
}

function isRealWebsite(website) {
  if (!website) return false;
  // Real websites have actual domains, not just name.com patterns
  const realDomains = ['techcrunch', 'producthunt', 'ycombinator', 'linkedin', 'twitter', 'github'];
  return !realDomains.some(d => website.includes(d)) && website.includes('.');
}

function isRecentlyActive(createdAt) {
  if (!createdAt) return false;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(createdAt) > thirtyDaysAgo;
}

calibrateScores().catch(console.error);
