/**
 * Helper functions for GOD algorithm logging and analysis
 */

export function getTeamReason(profile: any, score: number): string {
  if (score >= 2.5) {
    if (profile.team?.some((m: any) => m.background?.toLowerCase().includes('faang'))) {
      return 'Ex-FAANG founders detected';
    }
    if (profile.technical_cofounders >= 2) {
      return `${profile.technical_cofounders} technical co-founders`;
    }
    return 'Strong founding team';
  } else if (score >= 1.5) {
    return 'Solid team composition';
  } else {
    return 'First-time founders';
  }
}

export function getTractionReason(profile: any, score: number): string {
  const revenue = profile.revenue || profile.mrr * 12 || 0;
  const customers = profile.customers || 0;
  const growth = profile.growth_rate || 0;
  
  if (score >= 2.5) {
    if (revenue >= 1000000) {
      return `$${(revenue / 1000000).toFixed(1)}M ARR, ${customers} customers`;
    }
    if (growth >= 20) {
      return `${growth}% MoM growth`;
    }
    return 'Strong traction metrics';
  } else if (score >= 1.5) {
    if (revenue > 0) {
      return `$${(revenue / 1000).toFixed(0)}K revenue`;
    }
    if (customers > 0) {
      return `${customers} customers`;
    }
    return 'Early traction visible';
  } else if (score >= 0.5) {
    return 'Limited traction';
  } else {
    return 'No revenue yet';
  }
}

export function getMarketReason(profile: any, score: number): string {
  const marketSize = profile.market_size || 0;
  
  if (score >= 1.5) {
    if (marketSize >= 50) {
      return `$${marketSize}B TAM`;
    }
    return 'Large market opportunity';
  } else if (score >= 1.0) {
    return 'Significant market size';
  } else {
    return 'Niche market';
  }
}

export function getProductReason(profile: any, score: number): string {
  if (score >= 1.5) {
    if (profile.demo_available && profile.launched) {
      return 'Launched with demo';
    }
    if (profile.unique_ip) {
      return 'Unique IP/defensibility';
    }
    return 'Strong product differentiation';
  } else if (score >= 1.0) {
    if (profile.launched) {
      return 'Product launched';
    }
    return 'Product in development';
  } else {
    return 'Early concept stage';
  }
}

export function getCheckSizeReason(raiseAmount: number, checkSize: string): string {
  return `$${raiseAmount}M in ${checkSize} range`;
}

export function getGeographyReason(startupGeo: string, investorGeo: string): string {
  return `${startupGeo} ↔ ${investorGeo}`;
}

/**
 * Analyze score distribution for testing
 */
export function analyzeScoreDistribution(scores: number[]): {
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  std: number;
  distribution: { range: string; count: number; percentage: number }[];
} {
  if (scores.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      std: 0,
      distribution: []
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const count = scores.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = sum / count;
  const median = sorted[Math.floor(count / 2)];
  
  // Calculate standard deviation
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / count;
  const std = Math.sqrt(variance);

  // Create distribution buckets
  const buckets = [
    { range: '0-30', min: 0, max: 30 },
    { range: '31-45', min: 31, max: 45 },
    { range: '46-60', min: 46, max: 60 },
    { range: '61-75', min: 61, max: 75 },
    { range: '76-90', min: 76, max: 90 },
    { range: '91-100', min: 91, max: 100 }
  ];

  const distribution = buckets.map(bucket => {
    const bucketCount = scores.filter(s => s >= bucket.min && s <= bucket.max).length;
    return {
      range: bucket.range,
      count: bucketCount,
      percentage: (bucketCount / count * 100)
    };
  });

  return { count, min, max, avg, median, std, distribution };
}

/**
 * Validate GOD algorithm is working correctly
 */
export function validateGODAlgorithm(matches: any[]): {
  isWorking: boolean;
  issues: string[];
  warnings: string[];
  stats: any;
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  
  if (matches.length === 0) {
    issues.push('No matches generated');
    return { isWorking: false, issues, warnings, stats: null };
  }

  const scores = matches.map(m => m.matchScore || m.score);
  const stats = analyzeScoreDistribution(scores);

  // Check for all scores being the same (algorithm not differentiating)
  if (stats.std < 1) {
    issues.push(`No score variation (std: ${stats.std.toFixed(2)}) - algorithm may not be running`);
  }

  // Check if all scores are exactly 85 (default fallback)
  const all85 = scores.every(s => s === 85);
  if (all85) {
    issues.push('All scores are exactly 85 - default fallback being used, GOD algorithm not running');
  }

  // Check score range is reasonable
  if (stats.min > 50) {
    warnings.push(`Minimum score (${stats.min}) is too high - may be scoring too leniently`);
  }
  if (stats.max < 70) {
    warnings.push(`Maximum score (${stats.max}) is too low - may be scoring too harshly`);
  }

  // Check average is in expected range
  if (stats.avg < 50 || stats.avg > 85) {
    warnings.push(`Average score (${stats.avg.toFixed(1)}) outside expected 50-85 range`);
  }

  // Success criteria
  const isWorking = issues.length === 0 && 
                    stats.std >= 1 && 
                    stats.min >= 30 && 
                    stats.max <= 100 &&
                    !all85;

  return { isWorking, issues, warnings, stats };
}

/**
 * Generate test report
 */
export function generateTestReport(validation: ReturnType<typeof validateGODAlgorithm>): string {
  let report = '\n' + '═'.repeat(60) + '\n';
  report += '🧪 GOD ALGORITHM TEST REPORT\n';
  report += '═'.repeat(60) + '\n\n';

  report += `Status: ${validation.isWorking ? '✅ WORKING' : '❌ BROKEN'}\n\n`;

  if (validation.stats) {
    report += '📊 Score Distribution:\n';
    report += `   Count:      ${validation.stats.count}\n`;
    report += `   Min:        ${validation.stats.min.toFixed(1)}\n`;
    report += `   Max:        ${validation.stats.max.toFixed(1)}\n`;
    report += `   Average:    ${validation.stats.avg.toFixed(1)}\n`;
    report += `   Median:     ${validation.stats.median.toFixed(1)}\n`;
    report += `   Std Dev:    ${validation.stats.std.toFixed(2)}\n\n`;

    report += '📈 Distribution Buckets:\n';
    validation.stats.distribution.forEach((bucket: any) => {
      const bar = '█'.repeat(Math.floor(bucket.percentage / 2));
      report += `   ${bucket.range}:  ${bar} ${bucket.count} (${bucket.percentage.toFixed(1)}%)\n`;
    });
    report += '\n';
  }

  if (validation.issues.length > 0) {
    report += '🔴 CRITICAL ISSUES:\n';
    validation.issues.forEach((issue: string) => {
      report += `   • ${issue}\n`;
    });
    report += '\n';
  }

  if (validation.warnings.length > 0) {
    report += '⚠️  WARNINGS:\n';
    validation.warnings.forEach((warning: string) => {
      report += `   • ${warning}\n`;
    });
    report += '\n';
  }

  if (validation.isWorking) {
    report += '✅ All validation checks passed!\n';
    report += '   • Scores show variation (algorithm is differentiating)\n';
    report += '   • Score range is reasonable (30-98)\n';
    report += '   • Not using default fallback values\n\n';
  } else {
    report += '❌ GOD algorithm validation FAILED\n';
    report += '   Please review issues above and check:\n';
    report += '   1. Is startupScoringService.ts being imported?\n';
    report += '   2. Are all dependencies installed?\n';
    report += '   3. Is data being passed correctly to calculateHotScore()?\n\n';
  }

  report += '═'.repeat(60) + '\n';

  return report;
}
