/**
 * AUTOMATIC MATCHING SERVICE
 * Uses vector embeddings to find best investor matches for startups
 * Triggers automatically when new startups are created
 */

import { supabase } from '../config/supabase';
import { generateStartupEmbedding } from './embeddingService';
import { calculateHotScore } from './startupScoringService';
import { validateProblem, quickProblemCheck } from './problemValidationAI';

interface MatchResult {
  investor_id: string;
  similarity: number;
  firm: string;
  name: string;
  stage_focus: string[];
  sector_focus: string[];
}

/**
 * Main function: Generate matches for a startup
 * Called automatically when startup is submitted/scraped
 */
export async function autoGenerateMatches(startupId: string): Promise<void> {
  console.log(`🤖 Auto-matching for startup: ${startupId}`);
  
  // 1. Fetch startup data (from startup_uploads table)
  const { data: startup, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('id', startupId)
    .single();
    
  if (fetchError || !startup) {
    throw new Error(`Startup not found: ${startupId}`);
  }
  
  // 2. PROBLEM VALIDATION (DISABLED FOR NOW - RSS scraped startups don't have detailed problem statements)
  // TODO: Re-enable with more lenient criteria or only for manual submissions
  console.log('  ⏭️  Skipping problem validation - proceeding to matching');
  
  /*
  console.log('  🔬 Validating problem statement...');
  
  // Quick check first (fast, no API call)
  const quickCheck = quickProblemCheck({
    problem_statement: startup.problem || '',
    solution_description: startup.solution || '',
    target_customer: startup.target_customer || startup.industries?.[0] || 'Not specified',
    customer_interviews_conducted: startup.customer_interviews,
    pilot_customers: startup.customers,
    market_size: startup.market_size,
  });
  
  if (!quickCheck.likely_passes) {
    console.log('  ❌ Failed quick problem validation:');
    quickCheck.concerns.forEach(c => console.log(`     - ${c}`));
    
    // Store validation failure in database
    await supabase
      .from('startup_uploads')
      .update({ 
        validation_status: 'needs_improvement',
        validation_feedback: quickCheck.concerns.join('; ')
      })
      .eq('id', startupId);
    
    console.log('  💡 Startup needs to improve problem clarity before matching');
    return; // Don't match yet
  }
  
  console.log('  ✅ Passed quick validation - proceeding to matching');
  */
  
  // 3. Generate/fetch embedding
  let embedding = startup.embedding;
  
  if (!embedding) {
    console.log('  📊 Generating embedding...');
    embedding = await generateStartupEmbedding({
      name: startup.name,
      tagline: startup.tagline,
      pitch: startup.pitch,
      industries: startup.industries,
      five_points: startup.five_points,
      stage: startup.stage
    });
    
    // Store embedding for future use
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ embedding })
      .eq('id', startupId);
      
    if (updateError) {
      console.error('Failed to store embedding:', updateError);
    }
  }
  
  // 2.5 Calculate hot score - determines match count
  const hotScore = calculateHotScore({
    team: startup.team,
    founders_count: startup.founders_count,
    technical_cofounders: startup.technical_cofounders,
    revenue: startup.revenue,
    mrr: startup.mrr,
    active_users: startup.active_users,
    growth_rate: startup.growth_rate,
    customers: startup.customers,
    signed_contracts: startup.signed_contracts,
    demo_available: startup.demo_available,
    launched: startup.launched,
    unique_ip: startup.unique_ip,
    defensibility: startup.defensibility,
    market_size: startup.market_size,
    industries: startup.industries,
    problem: startup.problem,
    solution: startup.solution,
    stage: startup.stage,
    previous_funding: startup.previous_funding,
    backed_by: startup.backed_by,
    founded_date: startup.founded_date,
    tagline: startup.tagline,
    pitch: startup.pitch
  });
  
  console.log(`  🎯 Hot Score: ${hotScore.total}/10 (${hotScore.tier.toUpperCase()}) - Will match ${hotScore.matchCount} investors`);
  console.log(`  📊 Breakdown: Team ${hotScore.breakdown.team}, Traction ${hotScore.breakdown.traction}, Market ${hotScore.breakdown.market}, Product ${hotScore.breakdown.product}`);
  
  const targetMatchCount = hotScore.matchCount;
  
  // 3. Find matching investors using vector similarity
  console.log('  🔍 Finding matching investors...');
  const { data: matches, error: matchError } = await supabase
    .rpc('match_investors_to_startup', {
      startup_embedding: embedding,
      match_threshold: 0.3,  // Lowered to 30% to get more candidates
      match_count: 20  // Get top 20 candidates for filtering
    });
    
  if (matchError) {
    throw new Error(`Matching failed: ${matchError.message}`);
  }
  
  if (!matches || matches.length === 0) {
    console.log('  ⚠️  No matches found above threshold');
    return;
  }
  
  console.log(`  ✅ Found ${matches.length} potential matches`);
  
  // 4. Apply business logic filters (stage, industry)
  const filteredMatches = filterMatchesByBusinessLogic(matches, startup);
  
  // 5. Keep top N based on hot score (5-20)
  const topMatches = filteredMatches.slice(0, targetMatchCount);
  
  if (topMatches.length === 0) {
    console.log('  ⚠️  No matches passed business logic filters');
    return;
  }
  
  // 6. Insert into startup_investor_matches table with hot score metadata
  const matchRecords = topMatches.map((match: MatchResult, index: number) => ({
    startup_id: startupId,
    investor_id: match.investor_id,
    match_score: Math.round(match.similarity * 100),
    confidence_level: getConfidenceLevel(match.similarity),
    reasoning: generateReasoning(match, startup, hotScore),
    status: 'suggested',
    fit_analysis: {
      hot_score: hotScore.total,
      hot_tier: hotScore.tier,
      similarity_rank: index + 1,
      total_matched: targetMatchCount,
      score_breakdown: hotScore.breakdown
    }
  }));
  
  const { error: insertError } = await supabase
    .from('startup_investor_matches')
    .insert(matchRecords);
    
  if (insertError) {
    throw new Error(`Failed to insert matches: ${insertError.message}`);
  }
  
  console.log(`  🎯 Created ${topMatches.length} matches`);
}

/**
 * Filter matches by business rules (RELAXED)
 * - Stage alignment (optional)
 * - Industry overlap (optional)
 */
function filterMatchesByBusinessLogic(matches: MatchResult[], startup: any): MatchResult[] {
  return matches.filter(match => {
    // No strict filtering - just check if investor has ANY relevant data
    // This ensures we get matches even if metadata is sparse
    
    // Optional stage filter (only if investor explicitly excludes this stage)
    if (match.stage_focus && match.stage_focus.length > 0 && startup.stage !== undefined) {
      const startupStage = getStageText(startup.stage);
      const hasStageMatch = match.stage_focus.some((focus: string) => 
        focus.toLowerCase().replace('_', ' ').includes(startupStage.toLowerCase()) ||
        startupStage.toLowerCase().includes(focus.toLowerCase().replace('_', ' '))
      );
      // Don't exclude if no match - investor might be flexible
    }
    
    // Optional industry filter (don't be too strict)
    // If startup has no industries, allow all matches
    // If investor has no focus, allow match
    
    return true; // Accept all candidates above similarity threshold
  });
}

/**
 * Convert similarity score to confidence level
 */
function getConfidenceLevel(similarity: number): string {
  if (similarity >= 0.9) return 'very_high';
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.7) return 'medium';
  return 'low';
}

/**
 * Generate human-readable reasoning for the match
 */
function generateReasoning(match: MatchResult, startup: any, hotScore: any): string {
  const reasons = [];
  
  reasons.push(`${Math.round(match.similarity * 100)}% semantic similarity match`);
  
  // Add hot score context
  if (hotScore.total >= 7) {
    reasons.push(`🔥 HOT STARTUP (Score: ${hotScore.total}/10)`);
  } else if (hotScore.total >= 4) {
    reasons.push(`⚡ WARM STARTUP (Score: ${hotScore.total}/10)`);
  }
  
  if (match.stage_focus?.length) {
    reasons.push(`Invests in ${match.stage_focus.join(', ')} stage companies`);
  }
  
  if (match.sector_focus?.length) {
    const overlap = startup.industries?.filter((ind: string) =>
      match.sector_focus.some((sector: string) => 
        sector.toLowerCase().includes(ind.toLowerCase())
      )
    );
    if (overlap?.length) {
      reasons.push(`Focus on ${overlap.join(', ')}`);
    }
  }
  
  return reasons.join('. ');
}

/**
 * Convert stage number to readable text
 */
function getStageText(stage?: number): string {
  const stages: Record<number, string> = {
    0: 'pre-seed',
    1: 'seed',
    2: 'series a',
    3: 'series b',
    4: 'series c',
    5: 'growth'
  };
  return stage !== undefined ? stages[stage] || 'unknown' : 'unknown';
}
