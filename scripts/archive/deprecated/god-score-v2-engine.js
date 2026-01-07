#!/usr/bin/env node
/**
 * GOD SCORE V2 ENGINE
 * ==================
 * GOD = GRIT, Opportunity + Determination
 * 
 * Derives startup scores from Market Intelligence rather than direct scraping.
 * Incorporates Paul Graham / YC philosophy: fund founders who inspire,
 * who are always learning, who nail product-market fit unexpectedly.
 * 
 * KEY INSIGHT: Credentials open doors (weight 3), but GRIT predicts success (weight 5)
 * - PhD/academic pedigree → helps with grants/VCs, doesn't guarantee execution
 * - Customer obsession + shipping velocity → the real predictors
 * - Right problem at right time → timing is everything
 * 
 * SCORING APPROACH:
 * 1. VALUE PROPOSITION (20 pts) - What do they offer? Is it clear and compelling?
 * 2. PROBLEM (20 pts) - Why do we care? Severity of problem addressed
 * 3. SOLUTION (20 pts) - Show us your stuff! Innovation + execution signals
 * 4. TEAM (20 pts) - Who and why? GRIT signals > credentials
 * 5. INVESTMENT (20 pts) - Appropriate raise for stage? AI multiplier applied?
 * 
 * Run: node god-score-v2-engine.js
 * Run single: node god-score-v2-engine.js --startup-id=<uuid>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache for market intelligence (loaded once)
let marketIntelligence = {
  problems: [],
  teamPatterns: [],
  benchmarks: [],
  solutions: [],
  gritSignals: [],
  ecosystemSignals: []
};

/**
 * Load market intelligence from database
 */
async function loadMarketIntelligence() {
  console.log('📚 Loading market intelligence (GOD = GRIT + Opportunity + Determination)...');
  
  const [problemsRes, patternsRes, benchmarksRes, solutionsRes, gritRes, ecosystemRes] = await Promise.all([
    supabase.from('market_problems').select('*'),
    supabase.from('team_success_patterns').select('*'),
    supabase.from('investment_benchmarks').select('*'),
    supabase.from('solution_patterns').select('*, market_problems(industry, problem_title)'),
    supabase.from('grit_signals').select('*'),
    supabase.from('ecosystem_signals').select('*')
  ]);
  
  marketIntelligence = {
    problems: problemsRes.data || [],
    teamPatterns: patternsRes.data || [],
    benchmarks: benchmarksRes.data || [],
    solutions: solutionsRes.data || [],
    gritSignals: gritRes.data || [],
    ecosystemSignals: ecosystemRes.data || []
  };
  
  console.log(`   📊 Problems: ${marketIntelligence.problems.length}`);
  console.log(`   👥 Team Patterns: ${marketIntelligence.teamPatterns.length} (door openers vs success predictors)`);
  console.log(`   💰 Benchmarks: ${marketIntelligence.benchmarks.length}`);
  console.log(`   🔧 Solutions: ${marketIntelligence.solutions.length}`);
  console.log(`   🔥 GRIT Signals: ${marketIntelligence.gritSignals.length}`);
  console.log(`   🌐 Ecosystem: ${marketIntelligence.ecosystemSignals.length}`);
}

/**
 * Match startup sectors to normalized industry
 */
function normalizeIndustry(sectors) {
  if (!sectors || sectors.length === 0) return 'SaaS'; // Default
  
  const sectorStr = sectors.join(' ').toLowerCase();
  
  // Expanded industry detection
  if (sectorStr.includes('ai') || sectorStr.includes('ml') || sectorStr.includes('machine learning') || sectorStr.includes('llm') || sectorStr.includes('deep learning')) {
    return 'AI/ML';
  }
  if (sectorStr.includes('biotech') || sectorStr.includes('bio tech') || sectorStr.includes('drug') || sectorStr.includes('therapeutics') || sectorStr.includes('genomic')) {
    return 'BioTech';
  }
  if (sectorStr.includes('robot') || sectorStr.includes('automat') || sectorStr.includes('drone') || sectorStr.includes('autonomous')) {
    return 'Robotics';
  }
  if (sectorStr.includes('space') || sectorStr.includes('satellite') || sectorStr.includes('aerospace') || sectorStr.includes('rocket')) {
    return 'SpaceTech';
  }
  if (sectorStr.includes('deep tech') || sectorStr.includes('hardware') || sectorStr.includes('semiconductor') || sectorStr.includes('quantum') || sectorStr.includes('materials')) {
    return 'DeepTech';
  }
  if (sectorStr.includes('fintech') || sectorStr.includes('finance') || sectorStr.includes('payment') || sectorStr.includes('banking') || sectorStr.includes('crypto')) {
    return 'FinTech';
  }
  if (sectorStr.includes('health') || sectorStr.includes('medical') || sectorStr.includes('pharma') || sectorStr.includes('clinical')) {
    return 'HealthTech';
  }
  if (sectorStr.includes('clean') || sectorStr.includes('climate') || sectorStr.includes('energy') || sectorStr.includes('sustainability') || sectorStr.includes('carbon')) {
    return 'CleanTech';
  }
  
  return 'SaaS'; // Default for tech companies
}

/**
 * SCORE 1: VALUE PROPOSITION (0-20 pts)
 * Does the startup clearly articulate what they offer?
 */
function scoreValueProposition(startup) {
  let score = 0; // Base - earn points, no freebies
  const reasons = [];
  
  // Has clear description
  if (startup.description && startup.description.length > 100) {
    score += 4;
    reasons.push('Clear description');
  }
  
  // Has tagline (shows focus)
  if (startup.tagline && startup.tagline.length > 10) {
    score += 3;
    reasons.push('Focused tagline');
  }
  
  // Has pitch deck (serious about fundraising)
  if (startup.deck_filename) {
    score += 3;
    reasons.push('Has pitch deck');
  }
  
  // Has website (legitimacy)
  if (startup.website) {
    score += 2;
    reasons.push('Has website');
  }
  
  // Has clear sectors (knows their market)
  if (startup.sectors && startup.sectors.length > 0) {
    score += 3;
    reasons.push('Clear sector focus');
  }
  
  return { score: Math.min(score, 20), reasons };
}

/**
 * SCORE 2: PROBLEM (0-20 pts)
 * Does the startup address a severe, known market problem?
 */
function scoreProblem(startup, industry) {
  let score = 0; // Base - earn points, no freebies
  const reasons = [];
  
  // Get industry problems
  const industryProblems = marketIntelligence.problems.filter(p => p.industry === industry);
  
  // Check if startup description/tagline matches any known problem keywords
  const startupText = `${startup.description || ''} ${startup.tagline || ''} ${startup.pitch || ''}`.toLowerCase();
  
  let matchedProblem = null;
  let bestMatchScore = 0;
  
  for (const problem of industryProblems) {
    if (!problem.keywords) continue;
    
    const matchCount = problem.keywords.filter(kw => startupText.includes(kw.toLowerCase())).length;
    const matchScore = matchCount / problem.keywords.length;
    
    if (matchScore > bestMatchScore) {
      bestMatchScore = matchScore;
      matchedProblem = problem;
    }
  }
  
  if (matchedProblem) {
    // Score based on problem severity and match quality
    const severityBonus = Math.floor((matchedProblem.severity_score / 10) * 10); // Up to 10 pts
    const matchBonus = Math.floor(bestMatchScore * 5); // Up to 5 pts
    
    score += severityBonus + matchBonus;
    reasons.push(`Addresses "${matchedProblem.problem_title}" (severity ${matchedProblem.severity_score}/10)`);
  } else if (startup.problem && startup.problem.length > 50) {
    // Has problem statement but doesn't match known problems (could be innovative)
    score += 5;
    reasons.push('Has problem statement');
  }
  
  return { score: Math.min(score, 20), reasons, matchedProblem };
}

/**
 * SCORE 3: SOLUTION (0-20 pts)
 * Does the startup have a viable, differentiated solution?
 * Now matches against known effective solution patterns
 */
function scoreSolution(startup, matchedProblem, industry) {
  let score = 0; // Base - earn points, no freebies
  const reasons = [];
  
  // Has demo (showing, not telling)
  if (startup.has_demo) {
    score += 3;
    reasons.push('Has working demo');
  }
  
  // Is launched (shipped!)
  if (startup.is_launched) {
    score += 3;
    reasons.push('Product launched');
  }
  
  // Has technical cofounder (can build)
  if (startup.has_technical_cofounder) {
    score += 2;
    reasons.push('Technical cofounder');
  }
  
  // Check if solution matches known effective patterns
  if (matchedProblem) {
    const relevantSolutions = marketIntelligence.solutions.filter(s => 
      s.problem_id === matchedProblem.id
    );
    
    const startupText = `${startup.description || ''} ${startup.solution || ''} ${startup.tagline || ''}`.toLowerCase();
    
    for (const solution of relevantSolutions) {
      if (!solution.key_features) continue;
      
      const matchCount = solution.key_features.filter(kw => 
        startupText.includes(kw.toLowerCase())
      ).length;
      
      if (matchCount >= 2) {
        // Matches a known effective solution pattern
        const effectivenessBonus = Math.floor((solution.effectiveness_score / 10) * 5); // Up to 5 pts
        score += effectivenessBonus;
        reasons.push(`Matches "${solution.solution_type}" pattern (effectiveness ${solution.effectiveness_score}/10)`);
        break;
      }
    }
  }
  
  // AI-native bonus (AI solutions are more competitive in most verticals)
  const sectorStr = (startup.sectors || []).join(' ').toLowerCase();
  if (sectorStr.includes('ai') || sectorStr.includes('ml') || sectorStr.includes('llm')) {
    score += 2;
    reasons.push('AI-native solution');
  }
  
  return { score: Math.min(score, 20), reasons };
}

/**
 * SCORE 4: TEAM (0-20 pts)
 * Does the team match success patterns for their industry?
 * 
 * KEY INSIGHT: Credentials open doors (weight 3), GRIT predicts success (weight 5)
 * - PhD/Ex-FAANG = credibility for grants, VC meetings (door opener)
 * - Serial entrepreneur, PLG builder = knows how to execute (success predictor)
 */
function scoreTeam(startup, industry) {
  let score = 0; // Base - earn points, no freebies
  const reasons = [];
  
  // Separate patterns by their predictive power
  const doorOpeners = marketIntelligence.teamPatterns.filter(p => p.industry === industry && p.weight <= 3);
  const successPredictors = marketIntelligence.teamPatterns.filter(p => p.industry === industry && p.weight >= 4);
  
  // Check team size (minimum viable team)
  if (startup.team_size >= 2) {
    score += 2;
    reasons.push(`Team of ${startup.team_size}`);
  }
  
  // Has technical cofounder (critical for tech - this is a SUCCESS PREDICTOR, not just door opener)
  if (startup.has_technical_cofounder) {
    score += 4;
    reasons.push('Technical cofounder (can ship!)');
  }
  
  // Build searchable text from team info
  const teamText = [
    startup.team || '',
    (startup.team_companies || []).join(' '),
    startup.description || '',
    startup.background || ''
  ].join(' ').toLowerCase();
  
  // Check for SUCCESS PREDICTORS first (weight 5 patterns)
  let foundSuccessPredictor = false;
  for (const pattern of successPredictors) {
    if (!pattern.criteria?.previous_employers && !pattern.criteria?.signals) continue;
    
    const employers = pattern.criteria?.previous_employers || [];
    const signals = pattern.criteria?.signals || [];
    
    const hasEmployerMatch = employers.some(emp => teamText.includes(emp.toLowerCase()));
    const hasSignalMatch = signals.some(sig => teamText.includes(sig.toLowerCase()));
    
    if (hasEmployerMatch || hasSignalMatch) {
      score += 5; // Success predictors worth full 5 points
      reasons.push(`🔥 ${pattern.pattern_name} (GRIT indicator)`);
      foundSuccessPredictor = true;
      break;
    }
  }
  
  // Check for DOOR OPENERS (weight 3 patterns) - helpful but not deterministic
  if (!foundSuccessPredictor) {
    for (const pattern of doorOpeners) {
      if (!pattern.criteria?.previous_employers && !pattern.criteria?.signals) continue;
      
      const employers = pattern.criteria?.previous_employers || [];
      const signals = pattern.criteria?.signals || [];
      
      const hasEmployerMatch = employers.some(emp => teamText.includes(emp.toLowerCase()));
      const hasSignalMatch = signals.some(sig => teamText.includes(sig.toLowerCase()));
      
      if (hasEmployerMatch || hasSignalMatch) {
        score += 3; // Door openers worth 3 points
        reasons.push(`📄 ${pattern.pattern_name} (credibility)`);
        break;
      }
    }
  }
  
  // Check for GRIT signals (intangibles that predict success)
  const gritBonus = scoreGritSignals(startup);
  if (gritBonus.score > 0) {
    score += gritBonus.score;
    reasons.push(...gritBonus.reasons);
  }
  
  // Check for ECOSYSTEM signals (top-tier connections)
  const ecosystemBonus = scoreEcosystemSignals(startup);
  if (ecosystemBonus.score > 0) {
    score += ecosystemBonus.score;
    reasons.push(...ecosystemBonus.reasons);
  }
  
  return { score: Math.min(score, 20), reasons };
}

/**
 * GRIT SIGNALS (0-6 bonus pts)
 * 
 * GOD = GRIT + Opportunity + Determination
 * Plus: Creativity, Cleverness, Cunning (the "founder edge")
 * 
 * These are the intangibles that separate great founders from good ones:
 * - Customer obsession (Travis, Brian, Zuckerberg)
 * - Learned from failure (Elon at PayPal → SpaceX)
 * - Shipping velocity (move fast, iterate)
 * - Contrarian conviction (believed when others didn't)
 * - Creative problem solving (novel approaches)
 * - Competitive moat building (strategic defensibility)
 * - Asymmetric advantage (found what others missed)
 */
function scoreGritSignals(startup) {
  let score = 0;
  const reasons = [];
  
  const startupText = [
    startup.description || '',
    startup.team || '',
    startup.background || '',
    startup.pitch || '',
    startup.solution || '',
    startup.value_proposition || '',
    startup.problem || ''
  ].join(' ').toLowerCase();
  
  const gritSignals = (marketIntelligence.gritSignals || []).filter(s => s && s.keywords);
  
  // Category icons for display
  const categoryIcons = {
    'grit': '💪',
    'opportunity': '⏰', 
    'determination': '🎯',
    'creativity': '💡',      // NEW: Creative thinking
    'cleverness': '🧠',      // NEW: Smart execution
    'cunning': '🦊'          // NEW: Strategic savvy
  };
  
  // Look for each signal in startup text
  for (const signal of gritSignals) {
    const matchCount = signal.keywords.filter(kw => 
      startupText.includes(kw.toLowerCase())
    ).length;
    
    // Need at least 2 keyword matches to trigger
    if (matchCount >= 2) {
      const bonus = Math.min(2, Math.floor(signal.weight / 5)); // Up to 2 pts per signal
      score += bonus;
      
      // Use signal_category (database column name)
      const category = signal.signal_category || signal.category || 'grit';
      const icon = categoryIcons[category] || '✨';
      reasons.push(`${icon} ${signal.signal_name}`);
      
      // Cap at 4 signals max (increased from 3 to catch founder edge signals)
      if (reasons.length >= 4) break;
    }
  }
  
  return { score: Math.min(score, 8), reasons }; // Increased cap from 6 to 8 for founder edge
}

/**
 * ECOSYSTEM SIGNALS (0-4 bonus pts)
 * 
 * The ecosystem matters - Fenwick, WSGR, Cooley shape startups through connections.
 * YC, Sequoia, a16z provide more than money - network effects.
 * 
 * Tier 1 = 2 pts (YC, Sequoia, WSGR)
 * Tier 2 = 1 pt (Techstars, Goodwin)
 */
function scoreEcosystemSignals(startup) {
  let score = 0;
  const reasons = [];
  
  const startupText = [
    startup.investors || '',
    startup.accelerator || '',
    startup.legal || '',
    startup.description || '',
    startup.background || '',
    (startup.team_companies || []).join(' ')
  ].join(' ').toLowerCase();
  
  const ecosystemSignals = (marketIntelligence.ecosystemSignals || []).filter(s => s && s.signal_name);
  
  // Group by type for better scoring
  const lawFirms = ecosystemSignals.filter(s => s.signal_type === 'law_firm');
  const accelerators = ecosystemSignals.filter(s => s.signal_type === 'accelerator');
  const investors = ecosystemSignals.filter(s => s.signal_type === 'investor');
  
  // Check each category (max 1 match per category to prevent over-weighting)
  
  for (const signal of lawFirms) {
    if (startupText.includes(signal.signal_name.toLowerCase())) {
      const pts = signal.tier === 1 ? 1 : 0.5;
      score += pts;
      reasons.push(`⚖️ ${signal.signal_name}`);
      break;
    }
  }
  
  for (const signal of accelerators) {
    if (startupText.includes(signal.signal_name.toLowerCase())) {
      const pts = signal.tier === 1 ? 2 : 1;
      score += pts;
      reasons.push(`🚀 ${signal.signal_name}`);
      break;
    }
  }
  
  for (const signal of investors) {
    if (startupText.includes(signal.signal_name.toLowerCase())) {
      const pts = signal.tier === 1 ? 1 : 0.5;
      score += pts;
      reasons.push(`💰 ${signal.signal_name}`);
      break;
    }
  }
  
  return { score: Math.min(score, 4), reasons };
}

/**
 * SCORE 5: INVESTMENT (0-20 pts)
 * Is the raise amount appropriate for stage and sector?
 */
function scoreInvestment(startup, industry) {
  let score = 0; // Base - earn points, no freebies
  const reasons = [];
  
  // Normalize stage (could be string, array, or null)
  let stage = startup.stage;
  if (Array.isArray(stage)) {
    stage = stage[0] || 'Seed';
  }
  stage = (stage || 'Seed').toString();
  
  // Get benchmark for industry/stage
  const benchmark = marketIntelligence.benchmarks.find(
    b => b.industry === industry && b.stage.toLowerCase() === stage.toLowerCase()
  );
  
  if (!benchmark) {
    // No benchmark data, give neutral score
    return { score: 10, reasons: ['No benchmark data for stage'] };
  }
  
  const raiseAmount = startup.raise_amount || startup.latest_funding_amount || 0;
  
  if (raiseAmount > 0) {
    // Check if raise is within normal range
    if (raiseAmount >= benchmark.median_raise_min && raiseAmount <= benchmark.median_raise_max) {
      score += 8;
      reasons.push(`Raise $${(raiseAmount/1000000).toFixed(1)}M within ${industry} ${stage} range`);
    } else if (raiseAmount < benchmark.median_raise_min) {
      score += 5;
      reasons.push('Lean raise (capital efficient)');
    } else if (raiseAmount <= benchmark.median_raise_max * 1.5) {
      score += 6;
      reasons.push('Slightly above typical raise');
    } else {
      score += 3;
      reasons.push('Large raise - needs strong traction');
    }
  }
  
  // AI multiplier bonus
  if (industry === 'AI/ML' && benchmark.ai_multiplier > 1) {
    score += 3;
    reasons.push(`AI ${benchmark.ai_multiplier}x valuation premium`);
  }
  
  // Has revenue (justifies valuation)
  if (startup.mrr && startup.mrr > 0) {
    score += 4;
    reasons.push(`$${(startup.mrr/1000).toFixed(0)}K MRR`);
  }
  
  return { score: Math.min(score, 20), reasons };
}

/**
 * Calculate full GOD Score v2 for a startup
 */
function calculateGODScoreV2(startup) {
  const industry = normalizeIndustry(startup.sectors);
  
  const vp = scoreValueProposition(startup);
  const problem = scoreProblem(startup, industry);
  const solution = scoreSolution(startup, problem.matchedProblem, industry);
  const team = scoreTeam(startup, industry);
  const investment = scoreInvestment(startup, industry);
  
  const totalScore = vp.score + problem.score + solution.score + team.score + investment.score;
  
  return {
    industry,
    total_god_score: totalScore,
    value_prop_score: vp.score,
    problem_score: problem.score,
    solution_score: solution.score,
    team_score: team.score,
    investment_score: investment.score,
    breakdown: {
      value_proposition: vp.reasons,
      problem: problem.reasons,
      solution: solution.reasons,
      team: team.reasons,
      investment: investment.reasons
    }
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n');
  console.log('🔥'.repeat(30));
  console.log('🔥  GOD SCORE V2 ENGINE - Market Intelligence Powered  🔥');
  console.log('🔥'.repeat(30));
  console.log(`\n⏰ Started: ${new Date().toISOString()}\n`);
  
  // Load market intelligence
  await loadMarketIntelligence();
  
  // Check for single startup mode
  const singleId = process.argv.find(a => a.startsWith('--startup-id='));
  
  let startups;
  if (singleId) {
    const id = singleId.split('=')[1];
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error('❌ Startup not found:', id);
      process.exit(1);
    }
    startups = [data];
  } else {
    // Get startups that need scoring (pending or recently imported)
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .in('status', ['pending', 'approved'])
      .eq('status', 'approved')  // Rescore all
      .order('created_at', { ascending: false })
      .limit(5000); // Process all startups
    
    if (error) {
      console.error('❌ Error fetching startups:', error);
      process.exit(1);
    }
    startups = data || [];
  }
  
  console.log(`\n📊 Processing ${startups.length} startups...\n`);
  console.log('─'.repeat(70));
  
  let updated = 0;
  let improved = 0;
  
  for (const startup of startups) {
    const oldScore = startup.total_god_score || 0;
    const result = calculateGODScoreV2(startup);
    
    // Only update if new score is higher (additive improvement)
    if (true) { // Always update - allow recalibration
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update({
          total_god_score: result.total_god_score,
          market_score: result.problem_score,  // Using problem score as market indicator
          team_score: result.team_score,
          product_score: result.solution_score,
          vision_score: result.value_prop_score,
          traction_score: result.investment_score, // Investment readiness as traction proxy
          updated_at: new Date().toISOString()
        })
        .eq('id', startup.id);
      
      if (!updateError) {
        console.log(`✅ ${startup.name.substring(0, 25).padEnd(27)} ${oldScore.toString().padStart(2)} → ${result.total_god_score.toString().padStart(2)} (+${result.total_god_score - oldScore}) [${result.industry}]`);
        
        // Log breakdown for significant improvements
        if (result.total_god_score - oldScore >= 10) {
          console.log(`   └─ VP:${result.value_prop_score} Prob:${result.problem_score} Sol:${result.solution_score} Team:${result.team_score} Inv:${result.investment_score}`);
        }
        
        updated++;
        improved++;
      }
    } else {
      // Score same or lower - preserve existing
      updated++;
    }
  }
  
  console.log('\n' + '─'.repeat(70));
  console.log('\n📊 SUMMARY');
  console.log(`   Processed: ${startups.length}`);
  console.log(`   Improved:  ${improved}`);
  console.log(`   Preserved: ${updated - improved}`);
  console.log(`\n⏰ Completed: ${new Date().toISOString()}`);
  
  // Log to ai_logs
  await supabase.from('ai_logs').insert({
    type: 'god_score_v2',
    action: 'batch_scoring',
    input: { count: startups.length },
    output: { processed: updated, improved },
    status: 'success'
  });
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
