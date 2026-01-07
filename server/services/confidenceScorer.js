/**
 * CONFIDENCE SCORER
 * ==================
 * 
 * Calculates how confident we should be in extracted data.
 * 
 * Factors:
 * - Source reliability (Crunchbase > random blog)
 * - Data consistency (same info from multiple sources)
 * - Signal strength (exact numbers vs vague mentions)
 * - Recency (newer data more reliable)
 * - Completeness (more data points = more confidence)
 */

class ConfidenceScorer {
  constructor() {
    // Source reliability scores
    this.sourceReliability = {
      'crunchbase': 0.95,
      'pitchbook': 0.95,
      'linkedin': 0.85,
      'sec': 0.99,
      'pressrelease': 0.85,
      'techcrunch': 0.80,
      'news': 0.75,
      'producthunt': 0.80,
      'github': 0.90,
      'yc': 0.95,
      'wellfound': 0.85,
      'generic': 0.50,
      'text': 0.40
    };

    // Field importance weights
    this.fieldWeights = {
      funding: {
        amount: 0.9,
        stage: 0.8,
        investors: 0.7,
        date: 0.6,
        valuation: 0.9
      },
      traction: {
        revenue: 0.95,
        arr: 0.95,
        users: 0.8,
        growth: 0.85,
        launched: 0.7
      },
      team: {
        founders: 0.8,
        employees: 0.7,
        credentials: 0.75
      },
      product: {
        category: 0.6,
        techStack: 0.5,
        hasDemo: 0.4
      },
      market: {
        tam: 0.5,
        competitors: 0.4
      },
      momentum: {
        press: 0.6,
        awards: 0.7,
        partnerships: 0.6
      }
    };
  }

  /**
   * Calculate overall confidence score
   */
  score(signals, structure, entities) {
    const breakdown = {
      source: this.scoreSource(structure),
      funding: this.scoreFunding(signals.funding),
      traction: this.scoreTraction(signals.traction),
      team: this.scoreTeam(signals.team),
      product: this.scoreProduct(signals.product),
      market: this.scoreMarket(signals.market),
      momentum: this.scoreMomentum(signals.momentum),
      completeness: this.scoreCompleteness(signals, entities)
    };

    // Calculate weighted average
    const weights = {
      source: 0.15,
      funding: 0.20,
      traction: 0.25,
      team: 0.15,
      product: 0.10,
      market: 0.05,
      momentum: 0.05,
      completeness: 0.05
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, score] of Object.entries(breakdown)) {
      if (score > 0) {
        weightedSum += score * weights[key];
        totalWeight += weights[key];
      }
    }

    const overall = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      overall: Math.round(overall * 100) / 100,
      breakdown,
      dataQuality: this.assessDataQuality(breakdown)
    };
  }

  /**
   * Score based on source reliability
   */
  scoreSource(structure) {
    if (!structure) return 0.5;

    let score = 0.5; // Default for unknown sources

    // Higher score if we have Schema.org data
    if (structure.schemaOrg?.length > 0) {
      score += 0.2;
    }

    // Higher score if we have JSON-LD
    if (structure.jsonLd?.length > 0) {
      score += 0.15;
    }

    // Higher score if we have OpenGraph
    if (structure.openGraph?.title) {
      score += 0.1;
    }

    // Higher score if we have unified data
    if (structure.unified?.name && structure.unified?.description) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Score funding signals
   */
  scoreFunding(funding) {
    if (!funding) return 0;

    let score = 0;
    let maxScore = 0;

    // Check each field
    if (funding.amount) {
      score += 0.3 * (funding.confidence || 0.7);
      maxScore += 0.3;
    }

    if (funding.stage) {
      score += 0.25 * (funding.confidence || 0.7);
      maxScore += 0.25;
    }

    if (funding.investors?.length > 0) {
      const avgInvestorConf = funding.investors.reduce((s, i) => s + (i.confidence || 0.6), 0) 
                              / funding.investors.length;
      score += 0.25 * avgInvestorConf;
      maxScore += 0.25;
    }

    if (funding.valuation) {
      score += 0.2 * (funding.confidence || 0.7);
      maxScore += 0.2;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Score traction signals
   */
  scoreTraction(traction) {
    if (!traction) return 0;

    let score = 0;
    let factors = 0;

    // Revenue is highest signal
    if (traction.revenue || traction.arr || traction.mrr) {
      score += 0.95;
      factors++;
    }

    // Users/customers
    if (traction.users || traction.customers) {
      score += 0.8;
      factors++;
    }

    // Growth rate
    if (traction.growth) {
      score += 0.85;
      factors++;
    }

    // Launched status
    if (traction.launched) {
      score += 0.7;
      factors++;
    }

    // Has any metrics
    if (traction.metrics?.length > 0) {
      score += 0.5;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Score team signals
   */
  scoreTeam(team) {
    if (!team) return 0;

    let score = 0;
    let factors = 0;

    // Founders identified
    if (team.founders?.length > 0) {
      score += 0.8;
      factors++;
    }

    // Employee count
    if (team.employees) {
      score += 0.7;
      factors++;
    }

    // Strong credentials
    if (team.bigTechAlumni) {
      score += 0.85;
      factors++;
    }

    if (team.repeatFounder) {
      score += 0.9;
      factors++;
    }

    if (team.yc) {
      score += 0.9;
      factors++;
    }

    if (team.technicalFounder) {
      score += 0.75;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Score product signals
   */
  scoreProduct(product) {
    if (!product) return 0;

    let score = 0;
    let factors = 0;

    if (product.category) {
      score += 0.6;
      factors++;
    }

    if (product.techStack?.length > 0) {
      score += 0.5;
      factors++;
    }

    if (product.hasDemo) {
      score += 0.7;
      factors++;
    }

    if (product.hasApi) {
      score += 0.7;
      factors++;
    }

    if (product.platforms?.length > 0) {
      score += 0.6;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Score market signals
   */
  scoreMarket(market) {
    if (!market) return 0;

    let score = 0;
    let factors = 0;

    if (market.tam) {
      score += 0.6;
      factors++;
    }

    if (market.competitors?.length > 0) {
      score += 0.5;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Score momentum signals
   */
  scoreMomentum(momentum) {
    if (!momentum) return 0;

    let score = 0;
    let factors = 0;

    if (momentum.press?.length > 0) {
      score += 0.7;
      factors++;
    }

    if (momentum.awards?.length > 0) {
      score += 0.8;
      factors++;
    }

    if (momentum.partnerships?.length > 0) {
      score += 0.7;
      factors++;
    }

    if (momentum.socialProof?.length > 0) {
      score += 0.6;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Score data completeness
   */
  scoreCompleteness(signals, entities) {
    const requiredFields = [
      entities?.company?.name,
      entities?.company?.description,
      signals?.funding?.amount || signals?.funding?.stage,
      signals?.traction?.launched,
      signals?.team?.founders?.length > 0 || signals?.team?.employees
    ];

    const filled = requiredFields.filter(Boolean).length;
    return filled / requiredFields.length;
  }

  /**
   * Assess overall data quality
   */
  assessDataQuality(breakdown) {
    const avgScore = Object.values(breakdown).reduce((s, v) => s + v, 0) / Object.keys(breakdown).length;

    if (avgScore >= 0.8) return 'high';
    if (avgScore >= 0.6) return 'medium';
    if (avgScore >= 0.4) return 'low';
    return 'very-low';
  }

  /**
   * Compare confidence between two extractions
   */
  compare(extraction1, extraction2) {
    const score1 = extraction1.confidence?.overall || 0;
    const score2 = extraction2.confidence?.overall || 0;

    return {
      winner: score1 >= score2 ? 'first' : 'second',
      difference: Math.abs(score1 - score2),
      shouldMerge: Math.abs(score1 - score2) < 0.2 // Merge if similar confidence
    };
  }
}

module.exports = { ConfidenceScorer };




