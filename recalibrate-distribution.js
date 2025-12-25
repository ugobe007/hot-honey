require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function recalibrate() {
  console.log('RECALIBRATING GOD SCORE DISTRIBUTION\n');

  // Get ALL startups
  let allStartups = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase.from('startup_uploads')
      .select('id, name, total_god_score')
      .eq('status', 'approved')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allStartups = allStartups.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }

  console.log('Total startups:', allStartups.length);

  // Current distribution
  const scores = allStartups.map(s => s.total_god_score).filter(Boolean);
  const total = scores.length;

  const current = {
    'elite_55+': scores.filter(s => s >= 55).length,
    'strong_45-54': scores.filter(s => s >= 45 && s < 55).length,
    'good_40-44': scores.filter(s => s >= 40 && s < 45).length,
    'promising_35-39': scores.filter(s => s >= 35 && s < 40).length,
    'early_30-34': scores.filter(s => s >= 30 && s < 35).length,
    'very_early_<30': scores.filter(s => s < 30).length
  };

  const target = {
    'elite_55+': Math.round(total * 0.10),
    'strong_45-54': Math.round(total * 0.25),
    'good_40-44': Math.round(total * 0.40),
    'promising_35-39': Math.round(total * 0.15),
    'early_30-34': Math.round(total * 0.08),
    'very_early_<30': Math.round(total * 0.02)
  };

  console.log('\nCurrent vs Target:');
  for (const [bucket, curr] of Object.entries(current)) {
    const tgt = target[bucket];
    console.log(' ', bucket.padEnd(18), curr.toString().padStart(5), '->', tgt.toString().padStart(5));
  }

  // Strategy: Move startups from overcrowded buckets to underfilled ones
  // Sort all startups by score
  allStartups.sort((a, b) => (b.total_god_score || 0) - (a.total_god_score || 0));

  // Reassign scores based on target distribution
  const newScores = [];
  let idx = 0;

  // Assign top 10% to elite (55-65)
  for (let i = 0; i < target['elite_55+']; i++) {
    if (idx < allStartups.length) {
      const newScore = 55 + Math.floor(Math.random() * 10);
      newScores.push({ id: allStartups[idx].id, score: newScore });
      idx++;
    }
  }

  // Assign next 25% to strong (45-54)
  for (let i = 0; i < target['strong_45-54']; i++) {
    if (idx < allStartups.length) {
      const newScore = 45 + Math.floor(Math.random() * 10);
      newScores.push({ id: allStartups[idx].id, score: newScore });
      idx++;
    }
  }

  // Assign next 40% to good (40-44)
  for (let i = 0; i < target['good_40-44']; i++) {
    if (idx < allStartups.length) {
      const newScore = 40 + Math.floor(Math.random() * 5);
      newScores.push({ id: allStartups[idx].id, score: newScore });
      idx++;
    }
  }

  // Assign next 15% to promising (35-39)
  for (let i = 0; i < target['promising_35-39']; i++) {
    if (idx < allStartups.length) {
      const newScore = 35 + Math.floor(Math.random() * 5);
      newScores.push({ id: allStartups[idx].id, score: newScore });
      idx++;
    }
  }

  // Assign next 8% to early (30-34)
  for (let i = 0; i < target['early_30-34']; i++) {
    if (idx < allStartups.length) {
      const newScore = 30 + Math.floor(Math.random() * 5);
      newScores.push({ id: allStartups[idx].id, score: newScore });
      idx++;
    }
  }

  // Assign remaining to very early (<30)
  while (idx < allStartups.length) {
    const newScore = 25 + Math.floor(Math.random() * 5);
    newScores.push({ id: allStartups[idx].id, score: newScore });
    idx++;
  }

  console.log('\nUpdating', newScores.length, 'startups...');

  // Batch update
  let updated = 0;
  for (const ns of newScores) {
    await supabase.from('startup_uploads')
      .update({ total_god_score: ns.score })
      .eq('id', ns.id);
    updated++;
    if (updated % 200 === 0) process.stdout.write('\r  Updated: ' + updated);
  }

  console.log('\n\nDone. Updated:', updated);

  // Verify new distribution
  const { data: verify } = await supabase.from('startup_uploads')
    .select('total_god_score')
    .eq('status', 'approved');

  const newDist = {
    'elite_55+': 0, 'strong_45-54': 0, 'good_40-44': 0,
    'promising_35-39': 0, 'early_30-34': 0, 'very_early_<30': 0
  };

  verify.forEach(x => {
    const s = x.total_god_score;
    if (s >= 55) newDist['elite_55+']++;
    else if (s >= 45) newDist['strong_45-54']++;
    else if (s >= 40) newDist['good_40-44']++;
    else if (s >= 35) newDist['promising_35-39']++;
    else if (s >= 30) newDist['early_30-34']++;
    else newDist['very_early_<30']++;
  });

  console.log('\nNEW DISTRIBUTION:');
  for (const [bucket, count] of Object.entries(newDist)) {
    const pct = Math.round(count / verify.length * 100);
    console.log(' ', bucket.padEnd(18), count.toString().padStart(5), '(' + pct + '%)');
  }
}

recalibrate().catch(console.error);
