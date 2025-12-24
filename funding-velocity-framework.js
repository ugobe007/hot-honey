/**
 * Funding Velocity Framework
 * 
 * Calculates funding velocity (time between rounds) adjusted for:
 * - Sector type (software, hardware, medtech, deeptech, IoT)
 * - Company stage (pre-seed, seed, Series A, B, C+)
 * - Market timing (2021 vs 2025 benchmarks)
 * 
 * Only applies to startups with 2+ funding rounds.
 */

// Sector-specific funding velocity benchmarks (in months)
const SECTOR_BENCHMARKS = {
  'Software': {
    'pre-seed_to_seed': 9,        // 9 months typical
    'seed_to_series_a': 18,       // 18 months typical
    'series_a_to_series_b': 18,   // 18 months typical
    'series_b_to_series_c': 24,   // 24 months typical
    'series_c_to_series_d': 24,   // 24 months typical
  },
  'Hardware': {
    'pre-seed_to_seed': 15,        // 15 months (CapEx, R&D)
    'seed_to_series_a': 27,       // 27 months (prototype development)
    'series_a_to_series_b': 36,   // 36 months (manufacturing scale)
    'series_b_to_series_c': 36,   // 36 months
  },
  'MedTech': {
    'pre-seed_to_seed': 21,        // 21 months (early trials)
    'seed_to_series_a': 36,       // 36 months (clinical trials)
    'series_a_to_series_b': 48,   // 48 months (advanced trials)
    'series_b_to_series_c': 60,   // 60 months
  },
  'DeepTech': {
    'pre-seed_to_seed': 27,        // 27 months (extreme R&D)
    'seed_to_series_a': 48,       // 48 months (long development)
    'series_a_to_series_b': 60,   // 60 months
  },
  'SpaceTech': {
    'pre-seed_to_seed': 27,        // 27 months
    'seed_to_series_a': 48,       // 48 months
    'series_a_to_series_b': 60,   // 60 months
  },
  'IoT': {
    'pre-seed_to_seed': 15,        // 15 months (hardware + software)
    'seed_to_series_a': 27,       // 27 months
    'series_a_to_series_b': 36,   // 36 months
  },
  'Default': {  // Fallback for unknown sectors
    'pre-seed_to_seed': 12,
    'seed_to_series_a': 24,
    'series_a_to_series_b': 24,
    'series_b_to_series_c': 24,
  }
};

// Market timing adjustment (2025 is slower than 2021)
const MARKET_TIMING_ADJUSTMENT = {
  '2021': 1.0,    // Baseline (fast market)
  '2022': 1.2,    // 20% slower
  '2023': 1.4,    // 40% slower
  '2024': 1.6,    // 60% slower
  '2025': 1.8,    // 80% slower (current market)
};

/**
 * Normalize round type to standard format
 */
function normalizeRoundType(roundType) {
  if (!roundType) return null;
  
  const normalized = roundType.toLowerCase().trim();
  
  // Map variations to standard types
  const mapping = {
    'pre-seed': 'pre-seed',
    'preseed': 'pre-seed',
    'pre seed': 'pre-seed',
    'seed': 'seed',
    'seed round': 'seed',
    'series a': 'series_a',
    'series-a': 'series_a',
    'seriesa': 'series_a',
    'series a+': 'series_a_plus',
    'series-a+': 'series_a_plus',
    'series a plus': 'series_a_plus',
    'series b': 'series_b',
    'series-b': 'series_b',
    'seriesb': 'series_b',
    'series c': 'series_c',
    'series-c': 'series_c',
    'seriesc': 'series_c',
    'series d': 'series_d',
    'series-d': 'series_d',
    'seriesd': 'series_d',
    'series e': 'series_e',
    'series-e': 'series_e',
    'seriese': 'series_e',
  };
  
  return mapping[normalized] || normalized;
}

/**
 * Classify sector from startup data
 */
function classifySector(startup) {
  const sectors = startup.sectors || [];
  const sectorStr = sectors.join(' ').toLowerCase();
  const description = (startup.description || '').toLowerCase();
  const combined = `${sectorStr} ${description}`;
  
  // Hardware/Robotics
  if (combined.includes('robot') || combined.includes('automat') || 
      combined.includes('drone') || combined.includes('autonomous') ||
      combined.includes('manufacturing') || combined.includes('industrial')) {
    return 'Hardware';
  }
  
  // MedTech/Pharma
  if (combined.includes('medtech') || combined.includes('biotech') || 
      combined.includes('pharma') || combined.includes('therapeutic') ||
      combined.includes('clinical trial') || combined.includes('fda') ||
      combined.includes('medical device') || combined.includes('implant') ||
      combined.includes('pacemaker') || combined.includes('drug')) {
    return 'MedTech';
  }
  
  // Space Tech
  if (combined.includes('space') || combined.includes('satellite') ||
      combined.includes('aerospace') || combined.includes('rocket') ||
      combined.includes('orbital')) {
    return 'SpaceTech';
  }
  
  // DeepTech
  if (combined.includes('deeptech') || combined.includes('deep tech') ||
      combined.includes('quantum') || combined.includes('nuclear') ||
      combined.includes('fusion') || combined.includes('battery system')) {
    return 'DeepTech';
  }
  
  // IoT/Electronics
  if (combined.includes('iot') || combined.includes('internet of things') ||
      combined.includes('sensor') || combined.includes('edge device') ||
      combined.includes('cpu') || combined.includes('gpu') ||
      combined.includes('electronics') || combined.includes('memory')) {
    return 'IoT';
  }
  
  // Default to Software (most common)
  return 'Software';
}

/**
 * Get market timing adjustment for a given year
 */
function getMarketTimingAdjustment(year) {
  if (!year) return MARKET_TIMING_ADJUSTMENT['2025']; // Default to current
  
  const yearStr = year.toString();
  if (yearStr in MARKET_TIMING_ADJUSTMENT) {
    return MARKET_TIMING_ADJUSTMENT[yearStr];
  }
  
  // Interpolate for years between benchmarks
  if (year >= 2021 && year <= 2025) {
    const baseYear = Math.floor(year);
    const nextYear = baseYear + 1;
    const baseAdjustment = MARKET_TIMING_ADJUSTMENT[baseYear.toString()] || 1.8;
    const nextAdjustment = MARKET_TIMING_ADJUSTMENT[nextYear.toString()] || 1.8;
    const interpolation = year - baseYear;
    return baseAdjustment + (nextAdjustment - baseAdjustment) * interpolation;
  }
  
  return MARKET_TIMING_ADJUSTMENT['2025']; // Default to current
}

/**
 * Calculate funding velocity score
 * 
 * @param {Array} fundingRounds - Array of {round_type, date, amount}
 * @param {Object} startup - Startup data with sectors, stage, etc.
 * @returns {Object|null} - Velocity score or null if insufficient data
 */
function calculateFundingVelocity(fundingRounds, startup) {
  // Need at least 2 rounds
  if (!fundingRounds || fundingRounds.length < 2) {
    return null;
  }
  
  // Sort rounds by date
  const sortedRounds = fundingRounds
    .filter(r => r.date && r.round_type)
    .map(r => ({
      ...r,
      date: new Date(r.date),
      round_type: normalizeRoundType(r.round_type)
    }))
    .sort((a, b) => a.date - b.date);
  
  if (sortedRounds.length < 2) {
    return null;
  }
  
  // Classify sector
  const sector = classifySector(startup);
  const benchmarks = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS['Default'];
  
  // Calculate intervals between rounds
  const intervals = [];
  for (let i = 1; i < sortedRounds.length; i++) {
    const prevRound = sortedRounds[i - 1];
    const currRound = sortedRounds[i];
    
    const daysDiff = (currRound.date - prevRound.date) / (1000 * 60 * 60 * 24);
    const monthsDiff = daysDiff / 30;
    
    const transitionKey = `${prevRound.round_type}_to_${currRound.round_type}`;
    const expectedMonths = benchmarks[transitionKey] || 24; // Default 24 months
    
    // Apply market timing adjustment
    const year = currRound.date.getFullYear();
    const timingAdjustment = getMarketTimingAdjustment(year);
    const adjustedExpectedMonths = expectedMonths * timingAdjustment;
    
    // Calculate velocity ratio (expected / actual)
    // > 1 = faster than expected (good)
    // < 1 = slower than expected (concerning)
    const velocityRatio = adjustedExpectedMonths / monthsDiff;
    
    intervals.push({
      from: prevRound.round_type,
      to: currRound.round_type,
      actualMonths: monthsDiff,
      expectedMonths: adjustedExpectedMonths,
      velocityRatio: velocityRatio,
      year: year,
      score: calculateIntervalScore(velocityRatio)
    });
  }
  
  // Calculate overall metrics
  const averageVelocity = intervals.reduce((sum, i) => sum + i.actualMonths, 0) / intervals.length;
  const averageExpected = intervals.reduce((sum, i) => sum + i.expectedMonths, 0) / intervals.length;
  const overallRatio = averageExpected / averageVelocity;
  const trend = getVelocityTrend(intervals);
  
  // Calculate final score (0-10 points for GOD scoring)
  const baseScore = Math.min(overallRatio * 5, 10); // Cap at 10 points
  const trendBonus = trend === 'accelerating' ? 2 : trend === 'consistent' ? 1 : 0;
  const finalScore = Math.min(baseScore + trendBonus, 10);
  
  return {
    sector: sector,
    intervals: intervals,
    averageVelocity: averageVelocity,
    averageExpected: averageExpected,
    overallRatio: overallRatio,
    trend: trend,
    score: finalScore,
    applicable: true
  };
}

/**
 * Calculate score for a single interval
 */
function calculateIntervalScore(velocityRatio) {
  if (velocityRatio >= 1.5) return 10; // Much faster than expected
  if (velocityRatio >= 1.2) return 8;  // Faster than expected
  if (velocityRatio >= 1.0) return 6;  // On pace
  if (velocityRatio >= 0.8) return 4;  // Slightly slow
  if (velocityRatio >= 0.6) return 2;  // Slow
  return 0; // Very slow
}

/**
 * Determine velocity trend
 */
function getVelocityTrend(intervals) {
  if (intervals.length < 2) return 'unknown';
  
  const ratios = intervals.map(i => i.velocityRatio);
  const firstHalf = ratios.slice(0, Math.floor(ratios.length / 2));
  const secondHalf = ratios.slice(Math.floor(ratios.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  if (secondAvg > firstAvg * 1.1) return 'accelerating';
  if (secondAvg < firstAvg * 0.9) return 'decelerating';
  return 'consistent';
}

/**
 * Check if funding velocity is applicable
 */
function isVelocityApplicable(startup, fundingRounds) {
  // Need 2+ rounds
  if (!fundingRounds || fundingRounds.length < 2) {
    return { applicable: false, reason: 'Insufficient funding rounds (need 2+)' };
  }
  
  // Need valid dates
  const validRounds = fundingRounds.filter(r => r.date && r.round_type);
  if (validRounds.length < 2) {
    return { applicable: false, reason: 'Missing round dates or types' };
  }
  
  // Check for bridge rounds (extensions don't count)
  const hasBridgeRounds = fundingRounds.some(r => {
    const type = (r.round_type || '').toLowerCase();
    return type.includes('bridge') || type.includes('extension') || type.includes('convertible');
  });
  
  if (hasBridgeRounds) {
    return { applicable: false, reason: 'Contains bridge/extension rounds (not comparable)' };
  }
  
  // Check for down rounds (might indicate struggles)
  // This is a warning, not a blocker
  const hasDownRound = false; // TODO: Implement down round detection
  
  return { applicable: true, reason: null, warning: hasDownRound ? 'Contains down rounds' : null };
}

module.exports = {
  calculateFundingVelocity,
  isVelocityApplicable,
  classifySector,
  SECTOR_BENCHMARKS,
  MARKET_TIMING_ADJUSTMENT
};



