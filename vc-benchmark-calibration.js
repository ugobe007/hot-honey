#!/usr/bin/env node
/**
 * VC BENCHMARK CALIBRATION SYSTEM
 * ================================
 * Ground-truths GOD scores against real VC investment criteria.
 * 
 * Uses:
 * 1. Known VC investment theses (YC, a16z, Sequoia, Founders Fund, etc.)
 * 2. Their actual portfolio companies and what stage/sector they invested
 * 3. Public signals about what makes them say "yes"
 * 
 * Output: Calibration recommendations for GOD scoring
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ══════════════════════════════════════════════════════════════════════════════
// REAL VC INVESTMENT CRITERIA (Based on public statements, blogs, portfolios)
// ══════════════════════════════════════════════════════════════════════════════

const VC_BENCHMARKS = {
  'Y Combinator': {
    thesis: 'Fund founders early, bet on people not ideas. Look for determination, domain expertise, and speed of iteration.',
    stage: ['Pre-Seed', 'Seed'],
    check_size: { min: 125000, max: 500000 },
    sectors: ['AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Developer Tools', 'Consumer'],
    signals: {
      // What YC looks for (from public YC partners statements)
      team: {
        weight: 0.40,
        criteria: [
          { signal: 'technical_cofounder', points: 15, description: 'At least one technical founder' },
          { signal: 'domain_expertise', points: 15, description: 'Deep knowledge of the problem space' },
          { signal: 'prior_startup_experience', points: 10, description: 'Have built before (success or failure)' },
          { signal: 'speed_of_execution', points: 10, description: 'Ship fast, iterate faster' },
        ]
      },
      product: {
        weight: 0.25,
        criteria: [
          { signal: 'launched', points: 15, description: 'Something live users can try' },
          { signal: 'user_love', points: 20, description: 'Small group that LOVES it (not likes)' },
          { signal: 'growing_organically', points: 15, description: 'Word of mouth growth' },
        ]
      },
      market: {
        weight: 0.20,
        criteria: [
          { signal: 'large_tam', points: 10, description: '$1B+ market opportunity' },
          { signal: 'timing', points: 15, description: 'Why now? What changed?' },
        ]
      },
      traction: {
        weight: 0.15,
        criteria: [
          { signal: 'revenue', points: 10, description: 'Any revenue is a positive signal' },
          { signal: 'growth_rate', points: 15, description: '15%+ week-over-week' },
        ]
      }
    },
    portfolio_examples: [
      { name: 'Airbnb', sector: 'Marketplace', invested_stage: 'Seed', outcome: 'IPO $100B+' },
      { name: 'Stripe', sector: 'Fintech', invested_stage: 'Seed', outcome: 'Private $95B' },
      { name: 'Coinbase', sector: 'Crypto', invested_stage: 'Seed', outcome: 'IPO $85B peak' },
      { name: 'DoorDash', sector: 'Logistics', invested_stage: 'Seed', outcome: 'IPO $70B+' },
      { name: 'Instacart', sector: 'Logistics', invested_stage: 'Seed', outcome: 'IPO $10B' },
    ],
    typical_entry_metrics: {
      mrr: { min: 0, ideal: 10000, exceptional: 50000 },
      growth_rate_monthly: { min: 0, ideal: 20, exceptional: 50 },
      users: { min: 100, ideal: 1000, exceptional: 10000 },
    }
  },

  'Andreessen Horowitz (a16z)': {
    thesis: 'Software is eating the world. Back technical founders building category-defining companies.',
    stage: ['Seed', 'Series A', 'Series B', 'Growth'],
    check_size: { min: 1000000, max: 100000000 },
    sectors: ['AI/ML', 'Crypto/Web3', 'Enterprise', 'Consumer', 'Bio', 'Gaming'],
    signals: {
      team: {
        weight: 0.35,
        criteria: [
          { signal: 'technical_depth', points: 20, description: 'Deep technical moat' },
          { signal: 'network_effects_understanding', points: 15, description: 'Can build flywheels' },
          { signal: 'category_creator', points: 15, description: 'Defining new market' },
        ]
      },
      product: {
        weight: 0.30,
        criteria: [
          { signal: 'platform_potential', points: 20, description: 'Can become a platform others build on' },
          { signal: '10x_better', points: 20, description: '10x improvement over status quo' },
          { signal: 'defensibility', points: 10, description: 'Technical or network moat' },
        ]
      },
      market: {
        weight: 0.25,
        criteria: [
          { signal: 'massive_tam', points: 15, description: '$10B+ market' },
          { signal: 'winner_take_all', points: 15, description: 'Market structure favors dominance' },
        ]
      },
      traction: {
        weight: 0.10,
        criteria: [
          { signal: 'product_market_fit', points: 15, description: 'Clear PMF signals' },
          { signal: 'retention', points: 10, description: 'Users come back' },
        ]
      }
    },
    portfolio_examples: [
      { name: 'Facebook', sector: 'Consumer', invested_stage: 'Series A', outcome: 'IPO $1T+' },
      { name: 'GitHub', sector: 'Developer Tools', invested_stage: 'Series A', outcome: 'Acquired $7.5B' },
      { name: 'Coinbase', sector: 'Crypto', invested_stage: 'Series A', outcome: 'IPO $85B peak' },
      { name: 'Figma', sector: 'SaaS', invested_stage: 'Series A', outcome: 'Acquired $20B' },
    ],
    typical_entry_metrics: {
      mrr: { min: 50000, ideal: 200000, exceptional: 1000000 },
      growth_rate_monthly: { min: 15, ideal: 30, exceptional: 50 },
      users: { min: 10000, ideal: 100000, exceptional: 1000000 },
    }
  },

  'Sequoia Capital': {
    thesis: 'The creative and the determined find a way. Back founders who are missionaries, not mercenaries.',
    stage: ['Seed', 'Series A', 'Series B', 'Growth'],
    check_size: { min: 500000, max: 100000000 },
    sectors: ['Enterprise', 'Consumer', 'Fintech', 'Healthcare', 'AI/ML'],
    signals: {
      team: {
        weight: 0.40,
        criteria: [
          { signal: 'missionary_founder', points: 20, description: 'Building something they deeply believe in' },
          { signal: 'clarity_of_thought', points: 15, description: 'Can explain complex things simply' },
          { signal: 'talent_magnet', points: 15, description: 'Great people want to work with them' },
        ]
      },
      product: {
        weight: 0.25,
        criteria: [
          { signal: 'simple_value_prop', points: 15, description: 'One sentence explains it' },
          { signal: 'must_have', points: 20, description: 'Customers would be devastated without it' },
        ]
      },
      market: {
        weight: 0.20,
        criteria: [
          { signal: 'expanding_market', points: 15, description: 'Market growing fast' },
          { signal: 'clear_wedge', points: 10, description: 'Path to land and expand' },
        ]
      },
      traction: {
        weight: 0.15,
        criteria: [
          { signal: 'revenue_quality', points: 15, description: 'Recurring, predictable' },
          { signal: 'customer_love', points: 10, description: 'NPS 50+' },
        ]
      }
    },
    portfolio_examples: [
      { name: 'Apple', sector: 'Consumer', invested_stage: 'Seed', outcome: '$3T company' },
      { name: 'Google', sector: 'Consumer', invested_stage: 'Series A', outcome: '$1.5T company' },
      { name: 'Stripe', sector: 'Fintech', invested_stage: 'Series A', outcome: 'Private $95B' },
      { name: 'Zoom', sector: 'Enterprise', invested_stage: 'Series A', outcome: 'IPO $160B peak' },
    ],
    typical_entry_metrics: {
      mrr: { min: 25000, ideal: 100000, exceptional: 500000 },
      growth_rate_monthly: { min: 10, ideal: 25, exceptional: 40 },
      users: { min: 1000, ideal: 10000, exceptional: 100000 },
    }
  },

  'Founders Fund': {
    thesis: 'We wanted flying cars, instead we got 140 characters. Back contrarian founders building the future.',
    stage: ['Seed', 'Series A', 'Series B'],
    check_size: { min: 500000, max: 50000000 },
    sectors: ['DeepTech', 'SpaceTech', 'AI/ML', 'Defense', 'Healthcare', 'Robotics'],
    signals: {
      team: {
        weight: 0.35,
        criteria: [
          { signal: 'contrarian_conviction', points: 20, description: 'Believes something others dont' },
          { signal: 'technical_genius', points: 20, description: 'World-class technical ability' },
          { signal: 'determination', points: 10, description: 'Will not give up' },
        ]
      },
      product: {
        weight: 0.30,
        criteria: [
          { signal: 'hard_problem', points: 20, description: 'Solving actually hard problems' },
          { signal: 'monopoly_potential', points: 15, description: 'Can own the market' },
          { signal: 'real_innovation', points: 15, description: 'Not incremental improvement' },
        ]
      },
      market: {
        weight: 0.20,
        criteria: [
          { signal: 'frontier_market', points: 15, description: 'Creating new market' },
          { signal: 'defensible_monopoly', points: 15, description: 'Winner take all dynamics' },
        ]
      },
      traction: {
        weight: 0.15,
        criteria: [
          { signal: 'technical_milestones', points: 15, description: 'Proving the impossible is possible' },
          { signal: 'government_contracts', points: 10, description: 'For defense/space' },
        ]
      }
    },
    portfolio_examples: [
      { name: 'SpaceX', sector: 'SpaceTech', invested_stage: 'Series A', outcome: 'Private $150B+' },
      { name: 'Palantir', sector: 'Enterprise', invested_stage: 'Series A', outcome: 'IPO $45B' },
      { name: 'Anduril', sector: 'Defense', invested_stage: 'Series A', outcome: 'Private $8B+' },
      { name: 'Neuralink', sector: 'Healthcare', invested_stage: 'Series A', outcome: 'Private $5B+' },
    ],
    typical_entry_metrics: {
      mrr: { min: 0, ideal: 50000, exceptional: 500000 },
      growth_rate_monthly: { min: 0, ideal: 20, exceptional: 50 },
      technical_milestones: { min: 1, ideal: 3, exceptional: 5 },
    }
  },

  'First Round Capital': {
    thesis: 'The first check in. Help founders from day zero.',
    stage: ['Pre-Seed', 'Seed'],
    check_size: { min: 500000, max: 5000000 },
    sectors: ['SaaS', 'Consumer', 'Enterprise', 'Fintech'],
    signals: {
      team: {
        weight: 0.45,
        criteria: [
          { signal: 'founder_market_fit', points: 20, description: 'This founder should build this company' },
          { signal: 'coachability', points: 15, description: 'Listens and learns' },
          { signal: 'resilience', points: 15, description: 'Has overcome adversity' },
        ]
      },
      product: {
        weight: 0.25,
        criteria: [
          { signal: 'clear_insight', points: 20, description: 'Unique insight about the problem' },
          { signal: 'early_users', points: 15, description: 'Even 10 passionate users' },
        ]
      },
      market: {
        weight: 0.15,
        criteria: [
          { signal: 'underserved_market', points: 15, description: 'Clear gap in market' },
        ]
      },
      traction: {
        weight: 0.15,
        criteria: [
          { signal: 'any_traction', points: 15, description: 'Any proof of concept' },
          { signal: 'customer_conversations', points: 10, description: 'Deep customer understanding' },
        ]
      }
    },
    portfolio_examples: [
      { name: 'Uber', sector: 'Marketplace', invested_stage: 'Seed', outcome: 'IPO $120B peak' },
      { name: 'Square', sector: 'Fintech', invested_stage: 'Seed', outcome: 'IPO $100B+' },
      { name: 'Notion', sector: 'SaaS', invested_stage: 'Seed', outcome: 'Private $10B' },
      { name: 'Roblox', sector: 'Gaming', invested_stage: 'Seed', outcome: 'IPO $45B' },
    ],
    typical_entry_metrics: {
      mrr: { min: 0, ideal: 5000, exceptional: 25000 },
      growth_rate_monthly: { min: 0, ideal: 15, exceptional: 30 },
      users: { min: 10, ideal: 500, exceptional: 5000 },
    }
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// CALIBRATION FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate what a specific VC would likely score this startup
 */
function calculateVCScore(startup, vcName) {
  const vc = VC_BENCHMARKS[vcName];
  if (!vc) return null;

  let score = 0;
  const breakdown = {};

  // Team scoring
  const teamScore = scoreTeamForVC(startup, vc);
  score += teamScore.score * vc.signals.team.weight;
  breakdown.team = teamScore;

  // Product scoring
  const productScore = scoreProductForVC(startup, vc);
  score += productScore.score * vc.signals.product.weight;
  breakdown.product = productScore;

  // Market scoring
  const marketScore = scoreMarketForVC(startup, vc);
  score += marketScore.score * vc.signals.market.weight;
  breakdown.market = marketScore;

  // Traction scoring
  const tractionScore = scoreTractionForVC(startup, vc);
  score += tractionScore.score * vc.signals.traction.weight;
  breakdown.traction = tractionScore;

  // Stage fit bonus/penalty
  const stageFit = checkStageFit(startup, vc);
  
  // Sector fit bonus
  const sectorFit = checkSectorFit(startup, vc);

  return {
    vc: vcName,
    rawScore: Math.round(score),
    stageFit,
    sectorFit,
    finalScore: Math.round(score * stageFit.multiplier * sectorFit.multiplier),
    breakdown,
    wouldInvest: score >= 60 && stageFit.fit && sectorFit.fit,
  };
}

function scoreTeamForVC(startup, vc) {
  let score = 30; // Base score
  const signals = [];

  if (startup.has_technical_cofounder) {
    score += 15;
    signals.push('technical_cofounder');
  }
  
  if (startup.team_size >= 2) {
    score += 10;
    signals.push('has_team');
  }

  // Infer from description/pitch
  const text = `${startup.description || ''} ${startup.pitch || ''}`.toLowerCase();
  
  if (text.includes('years experience') || text.includes('worked at') || text.includes('ex-google') || text.includes('ex-meta')) {
    score += 15;
    signals.push('domain_expertise');
  }

  if (text.includes('previously founded') || text.includes('serial entrepreneur')) {
    score += 10;
    signals.push('prior_startup_experience');
  }

  return { score: Math.min(score, 100), signals };
}

function scoreProductForVC(startup, vc) {
  let score = 25;
  const signals = [];

  if (startup.is_launched || startup.website) {
    score += 20;
    signals.push('launched');
  }

  if (startup.has_demo) {
    score += 10;
    signals.push('has_demo');
  }

  // Check for PMF signals in description
  const text = `${startup.description || ''} ${startup.tagline || ''}`.toLowerCase();
  
  if (text.includes('customers') || text.includes('users love') || text.includes('growing')) {
    score += 15;
    signals.push('early_traction_signals');
  }

  if (text.includes('10x') || text.includes('revolutionary') || text.includes('first')) {
    score += 10;
    signals.push('differentiation');
  }

  return { score: Math.min(score, 100), signals };
}

function scoreMarketForVC(startup, vc) {
  let score = 30;
  const signals = [];

  const sectors = (startup.sectors || []).map(s => s.toLowerCase());
  
  // Hot sectors get bonus
  const hotSectors = ['ai', 'ml', 'saas', 'fintech', 'healthcare'];
  if (sectors.some(s => hotSectors.some(h => s.includes(h)))) {
    score += 20;
    signals.push('hot_sector');
  }

  // Check for market size signals
  const text = `${startup.description || ''} ${startup.pitch || ''}`.toLowerCase();
  
  if (text.includes('billion') || text.includes('massive market') || text.includes('huge opportunity')) {
    score += 15;
    signals.push('large_tam_claimed');
  }

  if (text.includes('why now') || text.includes('timing') || text.includes('shift')) {
    score += 15;
    signals.push('timing_argument');
  }

  return { score: Math.min(score, 100), signals };
}

function scoreTractionForVC(startup, vc) {
  let score = 20;
  const signals = [];
  const metrics = vc.typical_entry_metrics;

  // MRR scoring
  if (startup.mrr > 0) {
    if (startup.mrr >= (metrics.mrr?.exceptional || 100000)) {
      score += 40;
      signals.push('exceptional_mrr');
    } else if (startup.mrr >= (metrics.mrr?.ideal || 10000)) {
      score += 25;
      signals.push('ideal_mrr');
    } else {
      score += 15;
      signals.push('has_revenue');
    }
  }

  // Growth rate scoring
  if (startup.growth_rate_monthly > 0) {
    if (startup.growth_rate_monthly >= (metrics.growth_rate_monthly?.exceptional || 50)) {
      score += 30;
      signals.push('exceptional_growth');
    } else if (startup.growth_rate_monthly >= (metrics.growth_rate_monthly?.ideal || 20)) {
      score += 20;
      signals.push('good_growth');
    } else {
      score += 10;
      signals.push('growing');
    }
  }

  // Customer count
  if (startup.customer_count > 0) {
    score += 15;
    signals.push('has_customers');
  }

  return { score: Math.min(score, 100), signals };
}

function checkStageFit(startup, vc) {
  const stageNames = ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
  const startupStage = stageNames[startup.stage || 2] || 'Seed';
  const fit = vc.stage.some(s => s.toLowerCase() === startupStage.toLowerCase());
  
  return {
    startupStage,
    vcStages: vc.stage,
    fit,
    multiplier: fit ? 1.0 : 0.5,
  };
}

function checkSectorFit(startup, vc) {
  const startupSectors = (startup.sectors || []).map(s => s.toLowerCase());
  const vcSectors = vc.sectors.map(s => s.toLowerCase());
  
  const fit = startupSectors.some(ss => 
    vcSectors.some(vs => ss.includes(vs.split('/')[0]) || vs.includes(ss.split('/')[0]))
  );

  return {
    startupSectors: startup.sectors || [],
    vcSectors: vc.sectors,
    fit,
    multiplier: fit ? 1.0 : 0.7,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CALIBRATION ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

async function runCalibration() {
  console.log('\n🎯 VC BENCHMARK CALIBRATION SYSTEM');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('Comparing GOD scores against real VC investment criteria...\n');

  // Get sample startups
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved')
    .order('total_god_score', { ascending: false })
    .limit(20);

  const vcNames = Object.keys(VC_BENCHMARKS);
  const calibrationResults = [];

  console.log('📊 STARTUP vs VC BENCHMARK COMPARISON\n');
  console.log('Startup'.padEnd(25) + 'GOD'.padStart(5) + '  YC'.padStart(5) + ' a16z'.padStart(6) + '  SEQ'.padStart(5) + '   FF'.padStart(5) + '   FR'.padStart(5) + '  Avg'.padStart(5) + '  Gap'.padStart(5));
  console.log('─'.repeat(80));

  for (const startup of startups) {
    const vcScores = {};
    let totalVCScore = 0;
    let vcCount = 0;

    for (const vcName of vcNames) {
      const result = calculateVCScore(startup, vcName);
      if (result) {
        vcScores[vcName] = result.finalScore;
        totalVCScore += result.finalScore;
        vcCount++;
      }
    }

    const avgVCScore = Math.round(totalVCScore / vcCount);
    const godScore = startup.total_god_score || 50;
    const gap = godScore - avgVCScore;

    calibrationResults.push({
      name: startup.name,
      godScore,
      avgVCScore,
      gap,
      vcScores,
    });

    console.log(
      (startup.name || 'Unknown').substring(0, 24).padEnd(25) +
      godScore.toString().padStart(5) +
      (vcScores['Y Combinator'] || '-').toString().padStart(5) +
      (vcScores['Andreessen Horowitz (a16z)'] || '-').toString().padStart(6) +
      (vcScores['Sequoia Capital'] || '-').toString().padStart(5) +
      (vcScores['Founders Fund'] || '-').toString().padStart(5) +
      (vcScores['First Round Capital'] || '-').toString().padStart(5) +
      avgVCScore.toString().padStart(5) +
      (gap >= 0 ? '+' : '') + gap.toString().padStart(4)
    );
  }

  // Calculate calibration statistics
  console.log('\n\n📈 CALIBRATION ANALYSIS\n');
  
  const gaps = calibrationResults.map(r => r.gap);
  const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  const maxOverscored = Math.max(...gaps);
  const maxUnderscored = Math.min(...gaps);

  console.log('Average GOD vs VC Gap:', avgGap > 0 ? '+' + avgGap : avgGap, 'points');
  console.log('Max Overscored:', '+' + maxOverscored, 'points');
  console.log('Max Underscored:', maxUnderscored, 'points');

  // Recommendations
  console.log('\n\n📋 CALIBRATION RECOMMENDATIONS\n');

  if (avgGap > 5) {
    console.log('⚠️  GOD scores are INFLATED by ~' + avgGap + ' points on average');
    console.log('   Recommendation: Reduce base scores or increase criteria strictness');
  } else if (avgGap < -5) {
    console.log('⚠️  GOD scores are DEFLATED by ~' + Math.abs(avgGap) + ' points on average');
    console.log('   Recommendation: Increase base scores or reduce criteria strictness');
  } else {
    console.log('✅ GOD scores are well-calibrated with VC benchmarks (±5 points)');
  }

  // Specific VC alignment
  console.log('\n\n🏢 VC-SPECIFIC CALIBRATION\n');
  
  for (const vcName of vcNames) {
    const vcGaps = calibrationResults.map(r => r.godScore - (r.vcScores[vcName] || 0));
    const vcAvgGap = Math.round(vcGaps.reduce((a, b) => a + b, 0) / vcGaps.length);
    const alignment = Math.abs(vcAvgGap) <= 5 ? '✅' : vcAvgGap > 0 ? '⬆️' : '⬇️';
    console.log(alignment + ' ' + vcName.padEnd(30) + 'Gap: ' + (vcAvgGap >= 0 ? '+' : '') + vcAvgGap);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ VC Benchmark Calibration Complete');
  console.log('════════════════════════════════════════════════════════════════\n');

  return calibrationResults;
}

// Run calibration
runCalibration().catch(console.error);
