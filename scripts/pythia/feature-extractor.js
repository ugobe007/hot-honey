/**
 * Pythia Feature Extractor
 * Extracts linguistic features from text for Pythia scoring
 */

/**
 * Normalize apostrophes (curly to straight) for pattern matching
 */
function normalizeApostrophes(text) {
  return (text || '').replace(/[''`´]/g, "'");
}

/**
 * Extract constraint language markers
 * Looks for: commitments, tradeoffs, exclusions, priorities
 */
function extractConstraintMarkers(text) {
  const normalizedText = normalizeApostrophes(text);
  const textLower = normalizedText.toLowerCase();
  let count = 0;
  
  // Negative commitments
  const negativeCommitments = [
    /\bwon't\b/gi,
    /\bwill not\b/gi,
    /\bdon't\b/gi,
    /\bdo not\b/gi,
    /\bnever\b/gi,
    /\bcannot\b/gi,
    /\bcan't\b/gi,
    /\bno longer\b/gi,
    /\brefuse to\b/gi
  ];
  
  // Hard commitments
  const hardCommitments = [
    /\bwe will\b/gi,
    /\bmust\b/gi,
    /\bonly\b/gi,
    /\bnon-negotiable\b/gi,
    /\balways\b/gi,
    /\bwe decided\b/gi,
    /\bwe committed\b/gi,
    /\bwe're committing\b/gi,
    /\bwe're shipping\b/gi,
    /\bwe're focusing\b/gi,
    /\bwe're not pursuing\b/gi
  ];
  
  // Exclusions / killing scope
  const exclusions = [
    /\bwe are not doing\b/gi,
    /\bwe killed\b/gi,
    /\bno plans to\b/gi,
    /\bwe removed\b/gi,
    /\bwe cut\b/gi,
    /\bwe dropped\b/gi,
    /\bwe scrapped\b/gi,
    /\bdeprecated\b/gi,
    /\bsunset\b/gi,
    /\bend-of-life\b/gi,
    /\beol\b/gi,
    /\bexcluded\b/gi
  ];
  
  // Tradeoffs / prioritization
  const tradeoffs = [
    /\boptimize.*at the expense of\b/gi,
    /\bchoose.*over\b/gi,
    /\btrade.*for\b/gi,
    /\btradeoff\b/gi,
    /\bsacrifice\b/gi,
    /\bprioritize.*over\b/gi,
    /\bdeprioritize\b/gi,
    /\bfocus on\b/gi,
    /\boptimize for\b/gi,
    /\binstead of\b/gi,
    /\brather than\b/gi,
    /\bthe only thing that matters is\b/gi
  ];
  
  // Constraint framing
  const constraintFraming = [
    /\bconstraint\b/gi,
    /\bbounded by\b/gi,
    /\blimited by\b/gi,
    /\brequired\b/gi
  ];
  
  negativeCommitments.forEach(regex => {
    count += (normalizedText.match(regex) || []).length;
  });
  
  hardCommitments.forEach(regex => {
    count += (normalizedText.match(regex) || []).length;
  });
  
  exclusions.forEach(regex => {
    count += (normalizedText.match(regex) || []).length;
  });
  
  tradeoffs.forEach(regex => {
    count += (normalizedText.match(regex) || []).length;
  });
  
  constraintFraming.forEach(regex => {
    count += (normalizedText.match(regex) || []).length;
  });
  
  // Normalize per 1000 words
  const wordCount = normalizedText.split(/\s+/).length;
  const normalized = wordCount > 0 ? (count / wordCount) * 1000 : 0;
  
  return {
    count,
    normalized,
    hasNegativeCommitments: negativeCommitments.some(r => r.test(normalizedText)),
    hasHardCommitments: hardCommitments.some(r => r.test(normalizedText)),
    hasExclusions: exclusions.some(r => r.test(normalizedText)),
    hasTradeoffs: tradeoffs.some(r => r.test(normalizedText)),
    hasConstraintFraming: constraintFraming.some(r => r.test(normalizedText))
  };
}

/**
 * Extract mechanism density (causal structure)
 * Looks for: causal connectors, mechanisms, if/then reasoning
 */
function extractMechanismDensity(text) {
  const textLower = text.toLowerCase();
  let count = 0;
  
  // Causal connectors
  const causalConnectors = [
    /\bbecause\b/gi,
    /\btherefore\b/gi,
    /\bleads to\b/gi,
    /\bdrives\b/gi,
    /\bcauses\b/gi,
    /\bresults in\b/gi,
    /\bcreates\b/gi,
    /\benables\b/gi,
    /\bif.*then\b/gi
  ];
  
  // Mechanism tokens
  const mechanisms = [
    /\bincentives\b/gi,
    /\bswitching costs\b/gi,
    /\bdistribution\b/gi,
    /\blatency\b/gi,
    /\bcost curves\b/gi,
    /\badoption loops\b/gi,
    /\bnetwork effects\b/gi,
    /\bworkflow\b/gi,
    /\bchurn\b/gi,
    /\bretention\b/gi
  ];
  
  // Multi-step causality indicators
  const multiStep = [
    /\bbecause.*which.*then\b/gi,
    /\bwhen.*leads to.*which\b/gi,
    /\bif.*then.*because\b/gi
  ];
  
  causalConnectors.forEach(regex => {
    count += (text.match(regex) || []).length;
  });
  
  mechanisms.forEach(regex => {
    count += (text.match(regex) || []).length;
  });
  
  multiStep.forEach(regex => {
    count += (text.match(regex) || []).length * 2; // Double weight for multi-step
  });
  
  // Normalize per 1000 words
  const wordCount = text.split(/\s+/).length;
  const normalized = wordCount > 0 ? (count / wordCount) * 1000 : 0;
  
  return {
    count,
    normalized,
    hasCausalStructure: causalConnectors.some(r => r.test(text)),
    hasMechanisms: mechanisms.some(r => r.test(text)),
    hasMultiStep: multiStep.some(r => r.test(text))
  };
}

/**
 * Extract reality contact (ground truth indicators)
 * Looks for: metrics, experiments, shipping verbs, failures/fixes
 */
function extractRealityContact(text) {
  const textLower = text.toLowerCase();
  let count = 0;
  
  // Metrics/numbers
  const metrics = [
    /\d+%/g,  // Percentages
    /\$\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*[kKmMbB]?\b/g,  // Money ($1.2M, $10,000, etc.)
    /\d+\s*(million|billion|thousand|k|m|b)\b/gi,  // Large numbers
    /\d+\s*(users|customers|revenue|arr|mrr|churn|retention)\b/gi,
    /\b\d+(?:\.\d+)?\s*(ms|s|secs?|minutes?|hours?|days?)\b/gi  // Time units
  ];
  
  // Experimentation
  const experiments = [
    /\bwe tested\b/gi,
    /\ba\/b test\b/gi,
    /\bran experiments\b/gi,
    /\bexperiment\b/gi,
    /\btrial\b/gi,
    /\bhypothesis\b/gi
  ];
  
  // Shipping/operations verbs
  const shippingVerbs = [
    /\bshipped\b/gi,
    /\bdeployed\b/gi,
    /\brolled out\b/gi,
    /\bfixed\b/gi,
    /\bbroke\b/gi,
    /\breleased\b/gi,
    /\bmeasured\b/gi,
    /\bobserved\b/gi
  ];
  
  // Postmortem/learning language
  const postmortem = [
    /\bwe were wrong\b/gi,
    /\broot cause\b/gi,
    /\blearned\b/gi,
    /\bfailure\b/gi,
    /\bpostmortem\b/gi,
    /\bwe changed\b/gi,
    /\bwe pivoted\b/gi
  ];
  
  metrics.forEach(regex => {
    count += (text.match(regex) || []).length;
  });
  
  experiments.forEach(regex => {
    count += (text.match(regex) || []).length;
  });
  
  shippingVerbs.forEach(regex => {
    count += (text.match(regex) || []).length;
  });
  
  postmortem.forEach(regex => {
    count += (text.match(regex) || []).length * 1.5; // Higher weight for learning language
  });
  
  // Normalize per 1000 words
  const wordCount = text.split(/\s+/).length;
  const normalized = wordCount > 0 ? (count / wordCount) * 1000 : 0;
  
  return {
    count,
    normalized,
    hasMetrics: metrics.some(r => r.test(text)),
    hasExperiments: experiments.some(r => r.test(text)),
    hasShipping: shippingVerbs.some(r => r.test(text)),
    hasPostmortem: postmortem.some(r => r.test(text))
  };
}

/**
 * Extract adjective-to-verb ratio (for penalty)
 */
function extractAdjectiveVerbRatio(text) {
  // Common marketing adjectives (vague)
  const vagueAdjectives = [
    /\brevolutionary\b/gi,
    /\bleading\b/gi,
    /\btransformative\b/gi,
    /\bcutting-edge\b/gi,
    /\binnovative\b/gi,
    /\bdisruptive\b/gi,
    /\bgroundbreaking\b/gi,
    /\bgame-changing\b/gi,
    /\bnext-generation\b/gi
  ];
  
  // Concrete action verbs
  const actionVerbs = [
    /\bshipped\b/gi,
    /\bmeasured\b/gi,
    /\breduced\b/gi,
    /\btested\b/gi,
    /\bdeployed\b/gi,
    /\bfixed\b/gi,
    /\bimproved\b/gi,
    /\bscaled\b/gi,
    /\bachieved\b/gi,
    /\bbuilt\b/gi
  ];
  
  let adjectiveCount = 0;
  let verbCount = 0;
  
  vagueAdjectives.forEach(regex => {
    adjectiveCount += (text.match(regex) || []).length;
  });
  
  actionVerbs.forEach(regex => {
    verbCount += (text.match(regex) || []).length;
  });
  
  const total = adjectiveCount + verbCount;
  const ratio = total > 0 ? adjectiveCount / total : 0;
  
  return {
    adjectiveCount,
    verbCount,
    ratio,
    isHypeHeavy: ratio > 0.6 && adjectiveCount > 3
  };
}

/**
 * Check for unfalsifiable claims (penalty)
 */
function extractUnfalsifiableClaims(text) {
  const textLower = text.toLowerCase();
  let count = 0;
  
  const unfalsifiable = [
    /\bredefining\s+the\s+future\b/gi,
    /\bchanging\s+the\s+world\b/gi,
    /\btransforming\s+the\s+industry\b/gi,
    /\bwe are the future\b/gi,
    /\bwe will change everything\b/gi
  ];
  
  unfalsifiable.forEach(regex => {
    count += (text.match(regex) || []).length;
  });
  
  // Check for claims without time horizon or metrics
  const noTimeHorizon = !/\d{4}|\d+\s*(month|year|quarter|week)/gi.test(text);
  const hasUnfalsifiablePhrases = unfalsifiable.some(r => r.test(text));
  
  return {
    count,
    hasUnfalsifiable: hasUnfalsifiablePhrases && noTimeHorizon,
    penalty: count * 2 // 2 points per unfalsifiable claim
  };
}

/**
 * Extract all features from text
 */
function extractAllFeatures(text) {
  if (!text || text.length < 10) {
    return {
      constraint: { count: 0, normalized: 0 },
      mechanism: { count: 0, normalized: 0 },
      reality: { count: 0, normalized: 0 },
      adjectiveVerb: { ratio: 0, isHypeHeavy: false },
      unfalsifiable: { count: 0, hasUnfalsifiable: false }
    };
  }
  
  return {
    constraint: extractConstraintMarkers(text),
    mechanism: extractMechanismDensity(text),
    reality: extractRealityContact(text),
    adjectiveVerb: extractAdjectiveVerbRatio(text),
    unfalsifiable: extractUnfalsifiableClaims(text)
  };
}

module.exports = {
  extractConstraintMarkers,
  extractMechanismDensity,
  extractRealityContact,
  extractAdjectiveVerbRatio,
  extractUnfalsifiableClaims,
  extractAllFeatures
};
