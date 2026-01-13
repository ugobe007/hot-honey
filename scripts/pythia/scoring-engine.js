/**
 * Pythia Scoring Engine v0.2
 * Computes pythia_score (0-100) and confidence (0.10-0.95)
 */

const { extractAllFeatures } = require('./feature-extractor');

/**
 * Score Constraint Language (0-10)
 */
function scoreConstraintLanguage(features, tier) {
  const normalized = features.constraint.normalized;
  let score = 0;
  
  // Base score from normalized count
  if (normalized >= 15) score = 9;
  else if (normalized >= 10) score = 8;
  else if (normalized >= 7) score = 7;
  else if (normalized >= 5) score = 6;
  else if (normalized >= 3) score = 5;
  else if (normalized >= 2) score = 4;
  else if (normalized >= 1) score = 3;
  else if (normalized >= 0.5) score = 2;
  else if (normalized > 0) score = 1;
  else score = 0;
  
  // Bonus for having multiple types
  if (features.constraint.hasHardCommitments && features.constraint.hasExclusions) score += 1;
  if (features.constraint.hasTradeoffs) score += 0.5;
  
  // Tier 3 discount (unless corroborated elsewhere)
  if (tier === 3) score = score * 0.7;
  
  return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
}

/**
 * Score Mechanism Density (0-10)
 */
function scoreMechanismDensity(features, tier) {
  const normalized = features.mechanism.normalized;
  let score = 0;
  
  // Base score from normalized count
  if (normalized >= 20) score = 9;
  else if (normalized >= 15) score = 8;
  else if (normalized >= 10) score = 7;
  else if (normalized >= 7) score = 6;
  else if (normalized >= 5) score = 5;
  else if (normalized >= 3) score = 4;
  else if (normalized >= 2) score = 3;
  else if (normalized >= 1) score = 2;
  else if (normalized >= 0.5) score = 1;
  else score = 0;
  
  // Bonus for multi-step causality
  if (features.mechanism.hasMultiStep) score += 1;
  if (features.mechanism.hasCausalStructure && features.mechanism.hasMechanisms) score += 0.5;
  
  // Tier 3 discount
  if (tier === 3) score = score * 0.7;
  
  return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
}

/**
 * Score Reality Contact (0-10)
 */
function scoreRealityContact(features, tier) {
  const normalized = features.reality.normalized;
  let score = 0;
  
  // Base score from normalized count
  if (normalized >= 25) score = 9;
  else if (normalized >= 18) score = 8;
  else if (normalized >= 12) score = 7;
  else if (normalized >= 8) score = 6;
  else if (normalized >= 5) score = 5;
  else if (normalized >= 3) score = 4;
  else if (normalized >= 2) score = 3;
  else if (normalized >= 1) score = 2;
  else if (normalized >= 0.5) score = 1;
  else score = 0;
  
  // Bonus for having multiple types
  if (features.reality.hasMetrics && features.reality.hasExperiments) score += 1;
  if (features.reality.hasPostmortem) score += 1.5; // High value for learning language
  
  // Tier 3 discount
  if (tier === 3) score = score * 0.7;
  
  return Math.min(10, Math.max(0, Math.round(score * 10) / 10));
}

/**
 * Calculate penalties (0-25 total)
 */
function calculatePenalties(features) {
  let totalPenalty = 0;
  
  // Adjective-to-Verb Penalty (0-10)
  if (features.adjectiveVerb.isHypeHeavy) {
    const ratio = features.adjectiveVerb.ratio;
    if (ratio >= 0.8) totalPenalty += 10;
    else if (ratio >= 0.7) totalPenalty += 8;
    else if (ratio >= 0.6) totalPenalty += 6;
    else if (ratio >= 0.5) totalPenalty += 4;
    else totalPenalty += 2;
  }
  
  // Narrative without constraint penalty (0-10)
  // If we have narrative but no constraints
  if (features.constraint.normalized < 1 && features.mechanism.normalized < 2) {
    // Text exists but no structure
    totalPenalty += 8;
  } else if (features.constraint.normalized < 0.5) {
    totalPenalty += 5;
  }
  
  // Unfalsifiable claims penalty (0-5)
  if (features.unfalsifiable.hasUnfalsifiable) {
    totalPenalty += Math.min(5, features.unfalsifiable.count * 2);
  }
  
  return Math.min(25, totalPenalty);
}

/**
 * Calculate confidence score (0.10-0.95)
 */
function calculateConfidence(snippets) {
  if (!snippets || snippets.length === 0) return 0.10;
  
  let confidence = 0.20; // Start at 0.20
  
  // Source diversity (+0.10 per additional source, cap +0.40)
  const uniqueSources = new Set(snippets.map(s => s.source_url || s.source_type)).size;
  confidence += Math.min(0.40, (uniqueSources - 1) * 0.10);
  
  // Tier mix
  const tier1Count = snippets.filter(s => s.tier === 1).length;
  const tier2Count = snippets.filter(s => s.tier === 2).length;
  const tier3Count = snippets.filter(s => s.tier === 3).length;
  const total = snippets.length;
  
  if (tier1Count > 0) confidence += 0.20;
  if (tier2Count > 0) confidence += 0.10;
  
  const tier3Pct = tier3Count / total;
  if (tier3Pct >= 0.70) confidence -= 0.20;
  
  // Context diversity (+0.10 if >= 2 contexts)
  const uniqueContexts = new Set(snippets.map(s => s.context_label).filter(Boolean)).size;
  if (uniqueContexts >= 2) confidence += 0.10;
  
  // Temporal diversity (check date spread)
  const dates = snippets.map(s => s.date_published).filter(Boolean).sort();
  if (dates.length >= 2) {
    const span = new Date(dates[dates.length - 1]) - new Date(dates[0]);
    const spanDays = span / (1000 * 60 * 60 * 24);
    if (spanDays < 7) confidence -= 0.10; // All from same week
  }
  
  // PR-polished check (high adjective ratio, no mechanisms, no metrics)
  // This will be done in computePythiaScore where features are already extracted
  // Skip here to avoid double extraction
  
  // Clamp between 0.10 and 0.95
  return Math.max(0.10, Math.min(0.95, Math.round(confidence * 100) / 100));
}

/**
 * Calculate source mix percentages
 */
function calculateSourceMix(snippets) {
  const total = snippets.length;
  if (total === 0) return { tier1_pct: 0, tier2_pct: 0, tier3_pct: 0 };
  
  const tier1Count = snippets.filter(s => s.tier === 1).length;
  const tier2Count = snippets.filter(s => s.tier === 2).length;
  const tier3Count = snippets.filter(s => s.tier === 3).length;
  
  return {
    tier1_pct: Math.round((tier1Count / total) * 100 * 100) / 100,
    tier2_pct: Math.round((tier2Count / total) * 100 * 100) / 100,
    tier3_pct: Math.round((tier3Count / total) * 100 * 100) / 100
  };
}

/**
 * Main scoring function
 * Returns: { pythia_score, confidence, breakdown }
 */
function computePythiaScore(snippets, includeOntologies = false) {
  if (!snippets || snippets.length === 0) {
    return {
      pythia_score: 0,
      confidence: 0.10,
      source_mix: { tier1_pct: 0, tier2_pct: 0, tier3_pct: 0 },
      breakdown: {
        constraint_score: 0,
        mechanism_score: 0,
        reality_contact_score: 0,
        penalties: 0,
        ontology_addon: 0
      }
    };
  }
  
  // Combine all snippets
  const allText = snippets.map(s => s.text).join('\n\n');
  
  // Extract features
  const allFeatures = extractAllFeatures(allText);
  
  // Get average tier (for discounting)
  const avgTier = Math.round(snippets.reduce((sum, s) => sum + s.tier, 0) / snippets.length);
  
  // Score core invariants (0-10 each, weighted x2 = 60 max)
  const constraintScore = scoreConstraintLanguage(allFeatures, avgTier);
  const mechanismScore = scoreMechanismDensity(allFeatures, avgTier);
  const realityScore = scoreRealityContact(allFeatures, avgTier);
  
  const coreScore = (constraintScore * 2) + (mechanismScore * 2) + (realityScore * 2);
  
  // Calculate penalties
  const penalties = calculatePenalties(allFeatures);
  
  // Optional ontology addon (0-15) - for now, skip (requires more complex logic)
  const ontologyAddon = 0;
  
  // Final score
  const pythiaScore = Math.max(0, Math.min(100, Math.round(coreScore + ontologyAddon - penalties)));
  
  // Confidence and source mix
  const confidence = calculateConfidence(snippets);
  const sourceMix = calculateSourceMix(snippets);
  
  return {
    pythia_score: pythiaScore,
    confidence: confidence,
    source_mix: sourceMix,
    breakdown: {
      constraint_score: constraintScore,
      mechanism_score: mechanismScore,
      reality_contact_score: realityScore,
      core_score: coreScore,
      penalties: penalties,
      ontology_addon: ontologyAddon
    },
    features: {
      constraint_markers: allFeatures.constraint.count,
      mechanism_tokens: allFeatures.mechanism.count,
      reality_markers: allFeatures.reality.count,
      adjective_count: allFeatures.adjectiveVerb.adjectiveCount,
      verb_count: allFeatures.adjectiveVerb.verbCount
    }
  };
}

module.exports = {
  computePythiaScore,
  scoreConstraintLanguage,
  scoreMechanismDensity,
  scoreRealityContact,
  calculatePenalties,
  calculateConfidence,
  calculateSourceMix
};
