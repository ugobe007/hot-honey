require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Market intelligence storage
const mi = { grit: [], problems: [], benchmarks: [], team: [], solutions: [], ecosystem: [] };

async function loadMarketIntelligence() {
  const [g, p, b, t, s, e] = await Promise.all([
    supabase.from('grit_signals').select('*'),
    supabase.from('market_problems').select('*'),
    supabase.from('funding_benchmarks').select('*'),
    supabase.from('team_success_patterns').select('*'),
    supabase.from('solution_patterns').select('*'),
    supabase.from('ecosystem_signals').select('*')
  ]);
  
  mi.grit = g.data || [];
  mi.problems = p.data || [];
  mi.benchmarks = b.data || [];
  mi.team = t.data || [];
  mi.solutions = s.data || [];
  mi.ecosystem = e.data || [];
  
  console.log(`📚 Loaded: ${mi.grit.length} GRIT, ${mi.problems.length} Problems, ${mi.benchmarks.length} Benchmarks, ${mi.team.length} Team Patterns`);
}

function detectIndustry(startup) {
  const sectors = (startup.sectors || []).map(s => (s || '').toLowerCase());
  const text = ((startup.description || '') + ' ' + (startup.tagline || '')).toLowerCase();
  
  if (sectors.some(s => s.includes('ai') || s.includes('ml')) || text.includes('ai') || text.includes('machine learning')) return 'AI/ML';
  if (sectors.some(s => s.includes('fintech') || s.includes('finance'))) return 'FinTech';
  if (sectors.some(s => s.includes('health'))) return 'HealthTech';
  if (sectors.some(s => s.includes('climate') || s.includes('clean') || s.includes('energy'))) return 'CleanTech';
  if (sectors.some(s => s.includes('bio'))) return 'BioTech';
  if (sectors.some(s => s.includes('robot'))) return 'Robotics';
  if (sectors.some(s => s.includes('deep') || s.includes('quantum'))) return 'DeepTech';
  return 'SaaS';
}

function scoreGRIT(startup) {
  let score = 0;
  const reasons = [];
  const text = [startup.description, startup.tagline, startup.pitch, startup.team, startup.background].filter(Boolean).join(' ').toLowerCase();
  
  for (const signal of mi.grit) {
    if (!signal.keywords) continue;
    const matches = signal.keywords.filter(kw => text.includes(kw.toLowerCase()));
    if (matches.length >= 1) {
      const pts = Math.min(Math.ceil(signal.weight / 2), 5); // Max 5 pts per signal
      score += pts;
      reasons.push(`${signal.signal_name} (+${pts})`);
    }
  }
  
  return { score: Math.min(score, 25), reasons };
}

function scorePMF(startup, industry) {
  let score = 0;
  const reasons = [];
  const text = [startup.description, startup.tagline, startup.pitch].filter(Boolean).join(' ').toLowerCase();
  
  // Match against known industry problems
  const industryProblems = mi.problems.filter(p => p.industry === industry);
  
  for (const problem of industryProblems) {
    if (!problem.keywords) continue;
    const matches = problem.keywords.filter(kw => text.includes(kw.toLowerCase()));
    if (matches.length >= 2) {
      const pts = Math.ceil(problem.severity_score / 2); // Severity 10 = 5 pts
      score += pts;
      reasons.push(`Solving: ${problem.problem_title} (+${pts})`);
      break; // Only count best match
    }
  }
  
  // Market size signals
  if (text.includes('billion') || text.includes('trillion')) { score += 4; reasons.push('Large market'); }
  if (text.includes('enterprise') || text.includes('b2b')) { score += 3; reasons.push('Enterprise focus'); }
  if (text.includes('platform')) { score += 2; reasons.push('Platform play'); }
  
  // Timing signals (hot markets)
  const hotKeywords = ['ai', 'llm', 'automation', 'climate', 'security', 'fintech'];
  if (hotKeywords.some(kw => text.includes(kw))) { score += 3; reasons.push('Hot market'); }
  
  return { score: Math.min(score, 25), reasons };
}

function scoreFundingVelocity(startup, industry) {
  let score = 0;
  const reasons = [];
  
  // Get benchmark for this industry/stage
  const stage = (startup.stage || 'seed').toString().toLowerCase();
  const benchmark = mi.benchmarks.find(b => b.industry === industry && b.stage.toLowerCase() === stage);
  
  // Revenue signals (best funding = customer revenue)
  if (startup.mrr > 100000) { score += 10; reasons.push('MRR > $100K'); }
  else if (startup.mrr > 10000) { score += 6; reasons.push('MRR > $10K'); }
  else if (startup.mrr > 0) { score += 3; reasons.push('Has MRR'); }
  
  if (startup.arr > 1000000) { score += 5; reasons.push('ARR > $1M'); }
  else if (startup.arr > 0) { score += 2; reasons.push('Has ARR'); }
  
  // Growth signals
  if (startup.growth_rate_monthly > 20) { score += 5; reasons.push('20%+ MoM growth'); }
  else if (startup.growth_rate_monthly > 10) { score += 3; reasons.push('10%+ MoM growth'); }
  
  // Customer signals
  if (startup.customer_count > 100) { score += 4; reasons.push('100+ customers'); }
  else if (startup.customer_count > 10) { score += 2; reasons.push('10+ customers'); }
  
  // Funding raised
  if (startup.raise_amount > 5000000) { score += 5; reasons.push('Raised $5M+'); }
  else if (startup.raise_amount > 1000000) { score += 3; reasons.push('Raised $1M+'); }
  else if (startup.raise_amount > 0) { score += 2; reasons.push('Has funding'); }
  
  // Scrappy signals from text
  const text = (startup.description || '').toLowerCase();
  if (text.includes('bootstrap') || text.includes('profitable')) { score += 3; reasons.push('Bootstrapped/Profitable'); }
  if (text.includes('grant') || text.includes('award')) { score += 2; reasons.push('Won grants'); }
  
  return { score: Math.min(score, 25), reasons };
}

function scoreTeamMagnetism(startup, industry) {
  let score = 0;
  const reasons = [];
  const text = [startup.description, startup.team, startup.background].filter(Boolean).join(' ').toLowerCase();
  
  // Team size
  if (startup.team_size >= 20) { score += 6; reasons.push('20+ team'); }
  else if (startup.team_size >= 10) { score += 4; reasons.push('10+ team'); }
  else if (startup.team_size >= 5) { score += 3; reasons.push('5+ team'); }
  else if (startup.team_size >= 2) { score += 2; reasons.push('2+ team'); }
  
  // Technical cofounder
  if (startup.has_technical_cofounder) { score += 4; reasons.push('Technical cofounder'); }
  
  // Match against team success patterns
  for (const pattern of mi.team.filter(p => p.industry === industry)) {
    const employers = pattern.criteria?.previous_employers || [];
    const signals = pattern.criteria?.signals || [];
    
    if (employers.some(e => text.includes(e.toLowerCase()))) {
      score += Math.ceil(pattern.weight / 2);
      reasons.push(pattern.pattern_name);
      break;
    }
    if (signals.some(s => text.includes(s.toLowerCase()))) {
      score += Math.ceil(pattern.weight / 2);
      reasons.push(pattern.pattern_name);
      break;
    }
  }
  
  // Ecosystem signals (accelerators, top VCs)
  for (const eco of mi.ecosystem) {
    if (!eco.keywords) continue;
    if (eco.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      score += 3;
      reasons.push(eco.signal_name || 'Ecosystem');
      break;
    }
  }
  
  // Pedigree signals
  if (/google|meta|amazon|microsoft|apple|stripe/i.test(text)) { score += 3; reasons.push('FAANG alumni'); }
  if (/stanford|mit|harvard|berkeley/i.test(text)) { score += 2; reasons.push('Top school'); }
  if (/yc|y combinator|techstars/i.test(text)) { score += 3; reasons.push('Top accelerator'); }
  
  return { score: Math.min(score, 25), reasons };
}

function scoreStartup(startup) {
  const industry = detectIndustry(startup);
  
  const grit = scoreGRIT(startup);
  const pmf = scorePMF(startup, industry);
  const funding = scoreFundingVelocity(startup, industry);
  const team = scoreTeamMagnetism(startup, industry);
  
  const total = grit.score + pmf.score + funding.score + team.score;
  
  return {
    industry,
    total_god_score: total,
    vision_score: grit.score,      // GRIT = Founder intensity
    market_score: pmf.score,       // PMF = Market timing
    traction_score: funding.score, // Funding velocity
    team_score: team.score,        // Team magnetism
    product_score: Math.round((grit.score + pmf.score) / 2), // Derived
    breakdown: { grit: grit.reasons, pmf: pmf.reasons, funding: funding.reasons, team: team.reasons }
  };
}

async function main() {
  console.log('\n🔥 GOD SCORE V3 - Using Market Intelligence\n');
  await loadMarketIntelligence();
  
  let offset = 0, updated = 0, samples = [];
  const batchSize = 500;
  
  while (true) {
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .range(offset, offset + batchSize - 1);
    
    if (error) { console.error(error); break; }
    if (!startups || startups.length === 0) break;
    
    for (const s of startups) {
      const scores = scoreStartup(s);
      
      await supabase.from('startup_uploads').update({
        total_god_score: scores.total_god_score,
        market_score: scores.market_score,
        vision_score: scores.vision_score,
        traction_score: scores.traction_score,
        team_score: scores.team_score,
        product_score: scores.product_score,
        updated_at: new Date().toISOString()
      }).eq('id', s.id);
      
      // Collect samples for display
      if (samples.length < 5 || scores.total_god_score > 30) {
        if (samples.length < 10) samples.push({ name: s.name, ...scores });
      }
      
      updated++;
    }
    
    console.log(`  ${updated} scored...`);
    offset += batchSize;
    if (startups.length < batchSize) break;
  }
  
  console.log(`\n✅ Done: ${updated} startups scored`);
  
  // Show samples
  console.log('\n📊 Sample scores:');
  samples.slice(0, 5).forEach(s => {
    console.log(`  ${s.name}: ${s.total_god_score} (G:${s.vision_score} P:${s.market_score} F:${s.traction_score} T:${s.team_score}) [${s.industry}]`);
  });
}

main();
