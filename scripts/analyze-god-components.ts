/**
 * GOD Score Component Analysis
 * 
 * Analyzes individual component scores (team, traction, market, product, vision, etc.)
 * to identify which factors are contributing to score clustering and lack of differentiation.
 * 
 * This helps identify if specific components need weight adjustments or scoring logic changes.
 */

// Load environment variables FIRST
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ComponentStats {
  component: string;
  avg: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  zeroCount: number;
  highCount: number; // >75% of max
  distribution: { range: string; count: number; percentage: number }[];
}

interface ComponentCorrelation {
  component: string;
  correlation: number;
  avgWhenHigh: number; // Avg total_god_score when this component is high
  avgWhenLow: number; // Avg total_god_score when this component is low
}

async function analyzeComponents() {
  console.log('🔬 Analyzing GOD Score Components\n');
  console.log('═'.repeat(70));

  // Get startups with component scores
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, team_score, traction_score, market_score, product_score, vision_score, status')
    .not('total_god_score', 'is', null)
    .limit(1000);

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups with component scores found.');
    return;
  }

  console.log(`\n✅ Analyzing ${startups.length} startups with component scores\n`);

  // Define components to analyze
  const components = [
    { key: 'team_score', name: 'Team', max: 100 },
    { key: 'traction_score', name: 'Traction', max: 100 },
    { key: 'market_score', name: 'Market', max: 100 },
    { key: 'product_score', name: 'Product', max: 100 },
    { key: 'vision_score', name: 'Vision', max: 100 }
  ];

  const componentStats: ComponentStats[] = [];
  const correlations: ComponentCorrelation[] = [];

  // Analyze each component
  for (const comp of components) {
    const scores = startups
      .map(s => (s as any)[comp.key] as number | null)
      .filter((s): s is number => s !== null && s !== undefined)
      .map(s => s);

    if (scores.length === 0) {
      console.log(`⚠️  No data for ${comp.name}`);
      continue;
    }

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const zeroCount = scores.filter(s => s === 0 || s === null).length;
    const highThreshold = comp.max * 0.75;
    const highCount = scores.filter(s => s >= highThreshold).length;

    // Distribution by ranges
    const ranges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 21, max: 40, label: '21-40' },
      { min: 41, max: 60, label: '41-60' },
      { min: 61, max: 80, label: '61-80' },
      { min: 81, max: 100, label: '81-100' }
    ];

    const distribution = ranges.map(range => {
      const inRange = scores.filter(s => s >= range.min && s <= range.max);
      return {
        range: range.label,
        count: inRange.length,
        percentage: (inRange.length / scores.length) * 100
      };
    });

    componentStats.push({
      component: comp.name,
      avg,
      median,
      min,
      max,
      stdDev,
      zeroCount,
      highCount,
      distribution
    });

    // Calculate correlation with total_god_score
    const totalScores = startups
      .map(s => ({ component: (s as any)[comp.key] as number | null, total: s.total_god_score || 0 }))
      .filter(d => d.component !== null && d.component !== undefined);

    if (totalScores.length > 10) {
      // Simple correlation: compare high vs low component scores
      const highComponent = totalScores.filter(d => d.component! >= highThreshold);
      const lowComponent = totalScores.filter(d => d.component! < highThreshold / 2);

      const avgWhenHigh = highComponent.length > 0
        ? highComponent.reduce((sum, d) => sum + d.total, 0) / highComponent.length
        : 0;
      const avgWhenLow = lowComponent.length > 0
        ? lowComponent.reduce((sum, d) => sum + d.total, 0) / lowComponent.length
        : 0;

      // Simple correlation coefficient
      const componentAvg = totalScores.reduce((sum, d) => sum + d.component!, 0) / totalScores.length;
      const totalAvg = totalScores.reduce((sum, d) => sum + d.total, 0) / totalScores.length;

      let numerator = 0;
      let denomComponent = 0;
      let denomTotal = 0;

      for (const d of totalScores) {
        const compDiff = d.component! - componentAvg;
        const totalDiff = d.total - totalAvg;
        numerator += compDiff * totalDiff;
        denomComponent += compDiff * compDiff;
        denomTotal += totalDiff * totalDiff;
      }

      const correlation = denomComponent > 0 && denomTotal > 0
        ? numerator / Math.sqrt(denomComponent * denomTotal)
        : 0;

      correlations.push({
        component: comp.name,
        correlation,
        avgWhenHigh,
        avgWhenLow
      });
    }
  }

  // Display component statistics
  console.log('📊 Component Statistics:\n');
  console.log('Component'.padEnd(12) + 'Avg'.padStart(8) + 'Median'.padStart(8) + 'Min'.padStart(6) + 'Max'.padStart(6) + 'StdDev'.padStart(8) + 'High%'.padStart(8));
  console.log('─'.repeat(60));

  componentStats.forEach(stat => {
    const highPct = (stat.highCount / startups.length) * 100;
    console.log(
      stat.component.padEnd(12) +
      stat.avg.toFixed(1).padStart(8) +
      stat.median.toFixed(1).padStart(8) +
      stat.min.toString().padStart(6) +
      stat.max.toString().padStart(6) +
      stat.stdDev.toFixed(1).padStart(8) +
      highPct.toFixed(1).padStart(7) + '%'
    );
  });

  // Display distributions
  console.log('\n📈 Component Distributions:\n');
  componentStats.forEach(stat => {
    console.log(`${stat.component}:`);
    stat.distribution.forEach(dist => {
      const bar = '█'.repeat(Math.floor(dist.percentage / 3));
      console.log(`   ${dist.range.padEnd(10)}: ${dist.count.toString().padStart(4)} (${dist.percentage.toFixed(1)}%) ${bar}`);
    });
    console.log('');
  });

  // Display correlations
  console.log('🔗 Component Correlations with Total GOD Score:\n');
  console.log('Component'.padEnd(12) + 'Correlation'.padStart(12) + 'High→Total'.padStart(12) + 'Low→Total'.padStart(12) + 'Impact'.padStart(10));
  console.log('─'.repeat(60));

  correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  correlations.forEach(corr => {
    const impact = Math.abs(corr.avgWhenHigh - corr.avgWhenLow);
    const impactLabel = impact > 15 ? 'High' : impact > 8 ? 'Medium' : 'Low';
    console.log(
      corr.component.padEnd(12) +
      corr.correlation.toFixed(3).padStart(12) +
      corr.avgWhenHigh.toFixed(1).padStart(12) +
      corr.avgWhenLow.toFixed(1).padStart(12) +
      impactLabel.padStart(10)
    );
  });

  // Analysis and recommendations
  console.log('\n🔍 Analysis:\n');

  // Check for clustering issues
  const lowStdDevComponents = componentStats.filter(s => s.stdDev < 15);
  if (lowStdDevComponents.length > 0) {
    console.log('⚠️  Components with Low Differentiation (std dev < 15):');
    lowStdDevComponents.forEach(stat => {
      console.log(`   • ${stat.component}: std dev = ${stat.stdDev.toFixed(1)}`);
      console.log(`     → Consider reviewing scoring logic for this component`);
    });
    console.log('');
  }

  // Check for high clustering
  const highClustered = componentStats.filter(s => {
    const midRange = s.distribution.find(d => d.range === '41-60' || d.range === '61-80');
    return midRange && midRange.percentage > 60;
  });

  if (highClustered.length > 0) {
    console.log('⚠️  Components with High Clustering (>60% in middle ranges):');
    highClustered.forEach(stat => {
      const midRange = stat.distribution.find(d => d.range === '41-60' || d.range === '61-80');
      console.log(`   • ${stat.component}: ${midRange?.percentage.toFixed(1)}% in ${midRange?.range}`);
      console.log(`     → Scores are too similar, not differentiating startups`);
    });
    console.log('');
  }

  // Check correlations
  const weakCorrelations = correlations.filter(c => Math.abs(c.correlation) < 0.3);
  if (weakCorrelations.length > 0) {
    console.log('⚠️  Components with Weak Correlation to Total Score (<0.3):');
    weakCorrelations.forEach(corr => {
      console.log(`   • ${corr.component}: correlation = ${corr.correlation.toFixed(3)}`);
      console.log(`     → This component may not be contributing meaningfully to total score`);
    });
    console.log('');
  }

  const strongCorrelations = correlations.filter(c => Math.abs(c.correlation) > 0.7);
  if (strongCorrelations.length > 0) {
    console.log('✅ Components with Strong Correlation to Total Score (>0.7):');
    strongCorrelations.forEach(corr => {
      console.log(`   • ${corr.component}: correlation = ${corr.correlation.toFixed(3)}`);
      console.log(`     → This component is a strong predictor of total score`);
    });
    console.log('');
  }

  // Recommendations
  console.log('💡 Recommendations:\n');

  if (lowStdDevComponents.length > 0) {
    console.log('1. Improve Differentiation:');
    console.log('   • Review scoring logic for components with low std dev');
    console.log('   • Consider adjusting thresholds or weights');
    console.log('   • Ensure components can differentiate between startup quality levels');
    console.log('');
  }

  if (highClustered.length > 0) {
    console.log('2. Reduce Clustering:');
    console.log('   • Components with high clustering need more granular scoring');
    console.log('   • Consider adding more scoring tiers or adjusting ranges');
    console.log('   • Ensure the component can distinguish between different quality levels');
    console.log('');
  }

  const topCorrelation = correlations[0];
  if (topCorrelation) {
    console.log('3. Component Weights:');
    console.log(`   • ${topCorrelation.component} has the strongest correlation (${topCorrelation.correlation.toFixed(3)})`);
    console.log(`   • Consider if current weights reflect this importance`);
    console.log('');
  }

  console.log('4. Next Steps:');
  console.log('   • Monitor component distributions as more startups are added');
  console.log('   • Track which components predict investment outcomes');
  console.log('   • Adjust component weights based on real investment data');
  console.log('   • Run calibrate-god-scores.ts once you have outcome data');
  console.log('');

  console.log('═'.repeat(70));
  console.log('\n✅ Component analysis complete.\n');
}

// Main execution
async function main() {
  try {
    await analyzeComponents();
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { analyzeComponents };



