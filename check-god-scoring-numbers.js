/**
 * Check GOD Scoring System Numbers
 * 
 * Provides comprehensive statistics on GOD scoring status
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkGODScoringNumbers() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        ⚡ GOD SCORING SYSTEM STATUS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  try {
    // 1. Total Startups
    const { count: totalStartups, error: totalError } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (totalError) {
      console.error('❌ Error fetching total startups:', totalError);
      return;
    }

    // 2. Scored Startups
    const { data: scoredStartups, error: scoredError } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score, team_score, traction_score, market_score, product_score, vision_score, created_at, updated_at')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null)
      .gt('total_god_score', 0);

    if (scoredError) {
      console.error('❌ Error fetching scored startups:', scoredError);
      return;
    }

    // 3. Unscored Startups
    const { data: unscoredStartups, error: unscoredError } = await supabase
      .from('startup_uploads')
      .select('id, name, created_at')
      .eq('status', 'approved')
      .or('total_god_score.is.null,total_god_score.eq.0');

    if (unscoredError) {
      console.error('❌ Error fetching unscored startups:', unscoredError);
      return;
    }

    const scoredCount = scoredStartups?.length || 0;
    const unscoredCount = unscoredStartups?.length || 0;
    const totalApproved = totalStartups || 0;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 OVERALL STATISTICS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`   📤 Total Approved Startups: ${totalApproved.toLocaleString()}`);
    console.log(`   ✅ Scored by GOD: ${scoredCount.toLocaleString()}`);
    console.log(`   ⏳ Pending Scoring: ${unscoredCount.toLocaleString()}`);
    console.log(`   📈 Scoring Coverage: ${totalApproved > 0 ? Math.round((scoredCount / totalApproved) * 100) : 0}%\n`);

    // 4. Score Distribution
    if (scoredStartups && scoredStartups.length > 0) {
      const scores = scoredStartups
        .map(s => {
          const score = s.total_god_score;
          return typeof score === 'number' && score > 0 ? score : null;
        })
        .filter(s => s !== null);

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const median = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

        const excellent = scores.filter(s => s >= 80).length;
        const good = scores.filter(s => s >= 60 && s < 80).length;
        const average = scores.filter(s => s >= 40 && s < 60).length;
        const below = scores.filter(s => s < 40).length;

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📈 GOD SCORE DISTRIBUTION');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`   Average Score: ${avg.toFixed(1)}`);
        console.log(`   Median Score: ${median.toFixed(1)}`);
        console.log(`   Range: ${min} - ${max}\n`);
        console.log('   Distribution:');
        console.log(`      🏆 Excellent (80-100): ${excellent.toLocaleString()} (${Math.round((excellent / scores.length) * 100)}%)`);
        console.log(`      ✅ Good (60-79): ${good.toLocaleString()} (${Math.round((good / scores.length) * 100)}%)`);
        console.log(`      📊 Average (40-59): ${average.toLocaleString()} (${Math.round((average / scores.length) * 100)}%)`);
        console.log(`      ⚠️  Below Average (<40): ${below.toLocaleString()} (${Math.round((below / scores.length) * 100)}%)\n`);
      }
    }

    // 5. Component Score Averages
    if (scoredStartups && scoredStartups.length > 0) {
      const teamScores = scoredStartups.map(s => s.team_score).filter(s => typeof s === 'number' && s > 0);
      const tractionScores = scoredStartups.map(s => s.traction_score).filter(s => typeof s === 'number' && s > 0);
      const marketScores = scoredStartups.map(s => s.market_score).filter(s => typeof s === 'number' && s > 0);
      const productScores = scoredStartups.map(s => s.product_score).filter(s => typeof s === 'number' && s > 0);
      const visionScores = scoredStartups.map(s => s.vision_score).filter(s => typeof s === 'number' && s > 0);

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🧩 COMPONENT SCORE AVERAGES');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      if (teamScores.length > 0) {
        const avgTeam = teamScores.reduce((a, b) => a + b, 0) / teamScores.length;
        console.log(`   👥 Team Score: ${avgTeam.toFixed(1)} (${teamScores.length} startups)`);
      }
      if (tractionScores.length > 0) {
        const avgTraction = tractionScores.reduce((a, b) => a + b, 0) / tractionScores.length;
        console.log(`   📈 Traction Score: ${avgTraction.toFixed(1)} (${tractionScores.length} startups)`);
      }
      if (marketScores.length > 0) {
        const avgMarket = marketScores.reduce((a, b) => a + b, 0) / marketScores.length;
        console.log(`   🎯 Market Score: ${avgMarket.toFixed(1)} (${marketScores.length} startups)`);
      }
      if (productScores.length > 0) {
        const avgProduct = productScores.reduce((a, b) => a + b, 0) / productScores.length;
        console.log(`   ⚙️  Product Score: ${avgProduct.toFixed(1)} (${productScores.length} startups)`);
      }
      if (visionScores.length > 0) {
        const avgVision = visionScores.reduce((a, b) => a + b, 0) / visionScores.length;
        console.log(`   🔮 Vision Score: ${avgVision.toFixed(1)} (${visionScores.length} startups)`);
      }
      console.log('');
    }

    // 6. Recent Scoring Activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    const { count: recentScored, error: recentError } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .not('total_god_score', 'is', null)
      .gt('total_god_score', 0)
      .gte('updated_at', oneWeekAgoISO);

    const { count: recentUnscored, error: recentUnscoredError } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .or('total_god_score.is.null,total_god_score.eq.0')
      .gte('created_at', oneWeekAgoISO);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🕐 RECENT ACTIVITY (Last 7 Days)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`   ✅ Newly Scored: ${recentScored || 0}`);
    console.log(`   ⏳ Newly Added (Unscored): ${recentUnscored || 0}\n`);

    // 7. Top Scored Startups
    if (scoredStartups && scoredStartups.length > 0) {
      const topStartups = [...scoredStartups]
        .sort((a, b) => (b.total_god_score || 0) - (a.total_god_score || 0))
        .slice(0, 10);

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🏆 TOP 10 SCORED STARTUPS');
      console.log('═══════════════════════════════════════════════════════════════\n');
      topStartups.forEach((startup, i) => {
        console.log(`   ${i + 1}. ${startup.name}`);
        console.log(`      GOD Score: ${startup.total_god_score}`);
        console.log(`      Components: Team ${startup.team_score || '-'} | Traction ${startup.traction_score || '-'} | Market ${startup.market_score || '-'} | Product ${startup.product_score || '-'} | Vision ${startup.vision_score || '-'}`);
        console.log('');
      });
    }

    // 8. Unscored Startups Sample
    if (unscoredStartups && unscoredStartups.length > 0) {
      const sampleUnscored = unscoredStartups.slice(0, 5);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('⏳ SAMPLE UNSCORED STARTUPS (First 5)');
      console.log('═══════════════════════════════════════════════════════════════\n');
      sampleUnscored.forEach((startup, i) => {
        const createdDate = startup.created_at ? new Date(startup.created_at).toLocaleDateString() : 'Unknown';
        console.log(`   ${i + 1}. ${startup.name} (Created: ${createdDate})`);
      });
      console.log('');
    }

    // 9. Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`   ✅ ${scoredCount.toLocaleString()} startups scored (${totalApproved > 0 ? Math.round((scoredCount / totalApproved) * 100) : 0}% coverage)`);
    console.log(`   ⏳ ${unscoredCount.toLocaleString()} startups pending scoring`);
    if (scoredCount > 0 && scoredStartups) {
      const avgScore = scoredStartups
        .map(s => s.total_god_score)
        .filter(s => typeof s === 'number' && s > 0)
        .reduce((a, b) => a + b, 0) / scoredStartups.length;
      console.log(`   📈 Average GOD Score: ${avgScore.toFixed(1)}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error checking GOD scoring:', error);
  }
}

checkGODScoringNumbers().catch(console.error);

