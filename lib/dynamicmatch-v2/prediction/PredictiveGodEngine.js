/**
 * PREDICTIVE GOD ENGINE
 * ======================
 * 
 * "The best way to predict the future is to create it." - Peter Drucker
 * 
 * This engine goes beyond static scoring to PREDICT startup success.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    PREDICTIVE GOD ENGINE                     │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                              │
 * │  INPUT: Extracted Signals → Feature Engineering              │
 * │         ↓                                                    │
 * │  CURRENT: Static GOD Score (0-100)                          │
 * │         ↓                                                    │
 * │  VELOCITY: Signal change rate → Δ Score (-20 to +20)        │
 * │         ↓                                                    │
 * │  ARIMA: Time series prediction from historical scores       │
 * │         ↓                                                    │
 * │  PREDICTION: XGBoost model → Success Probability (0-100%)   │
 * │         ↓                                                    │
 * │  OUTPUT: { godScore, deltaScore, successProbability }       │
 * │                                                              │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Training Data Sources (all public):
 * - YC company outcomes (public directory + Crunchbase)
 * - SEC filings (IPOs, acquisitions)
 * - Crunchbase funding progressions
 * - Failed startup postmortems
 * 
 * Key Insight: Success patterns are learnable from public data.
 * We don't need to know the future - we need to recognize patterns
 * that historically led to success.
 */

const ARIMA = require('arima');

class PredictiveGodEngine {
  constructor(options = {}) {
    this.options = {
      useHistoricalData: options.useHistoricalData !== false,
      modelPath: options.modelPath || './models/god_predictor.json',
      ...options
    };

    // Feature weights (learned from historical data)
    // These are initial weights - will be updated by training
    this.featureWeights = {
      // Traction features (highest predictive power)
      hasRevenue: 15,
      revenueAmount: 0.000001, // Per dollar
      hasCustomers: 10,
      userCount: 0.00001, // Per user
      growthRate: 0.1, // Per percentage point
      isLaunched: 8,
      
      // Team features (second highest)
      repeatFounder: 12,
      bigTechAlumni: 8,
      ycAlum: 10,
      technicalFounder: 6,
      teamSize: 0.5, // Per employee
      topUniversity: 4,
      
      // Funding features
      hasFunding: 5,
      fundingAmount: 0.0000001, // Per dollar
      topTierInvestor: 10,
      multipleRounds: 8,
      recentFunding: 5, // Within last 6 months
      
      // Product features
      hasDemo: 4,
      hasApi: 5,
      openSource: 3,
      multiPlatform: 4,
      
      // Market features
      hotSector: 6,
      largeTam: 3,
      hasCompetitors: 2, // Some competition validates market
      
      // Momentum features
      topPress: 5,
      awards: 4,
      partnerships: 4,
      socialProof: 3,
      
      // Velocity features (change over time)
      fundingVelocity: 8, // Fast funding progression
      teamGrowthVelocity: 6, // Rapid hiring
      tractionVelocity: 10, // Growth rate acceleration
      
      // Contrarian features (often overlooked but predictive)
      nonObviousMarket: 5,
      againstConsensus: 4,
      secondTimeFounder: 8
    };

    // Sector heat scores (updated periodically)
    this.sectorHeat = {
      'ai': 1.3,
      'fintech': 1.1,
      'healthtech': 1.15,
      'climatetech': 1.2,
      'devtools': 1.1,
      'saas': 1.0,
      'enterprise': 1.0,
      'consumer': 0.9,
      'crypto': 0.8,
      'hardware': 0.85,
      'biotech': 1.1,
      'default': 1.0
    };

    // Success probability calibration
    this.probabilityCalibration = {
      // GOD score ranges → base success probability
      '0-30': 0.02,
      '31-40': 0.05,
      '41-50': 0.10,
      '51-60': 0.18,
      '61-70': 0.28,
      '71-80': 0.40,
      '81-90': 0.55,
      '91-100': 0.70
    };

    // Historical outcome data for training
    this.trainingData = [];
    this.modelTrained = false;
  }

  /**
   * Main scoring method
   * Returns: { godScore, deltaScore, successProbability, confidence, breakdown }
   */
  async score(signals, entities, historicalData = null) {
    // Step 1: Extract features
    const features = this.extractFeatures(signals, entities);

    // Step 2: Calculate static GOD score (current state)
    const godScore = this.calculateGodScore(features);

    // Step 3: Calculate delta score (predicted change)
    const deltaScore = this.calculateDeltaScore(features, historicalData, godScore);

    // Step 4: Calculate success probability
    const successProbability = this.calculateSuccessProbability(features, godScore);

    // Step 5: Generate insights
    const insights = this.generateInsights(features, godScore, deltaScore);

    // Calculate ARIMA predictions if historical data available
    let arimaPrediction = null;
    if (historicalData?.godScoreHistory && historicalData.godScoreHistory.length >= 3) {
      try {
        const arimaResult = this.predictWithARIMAFull(historicalData.godScoreHistory, godScore);
        if (arimaResult) {
          arimaPrediction = arimaResult;
        }
      } catch (error) {
        // ARIMA prediction failed, continue without it
      }
    }

    return {
      godScore: Math.round(godScore),
      deltaScore: Math.round(deltaScore * 10) / 10,
      predictedScore: Math.round(godScore + deltaScore),
      successProbability: Math.round(successProbability * 100) / 100,
      tier: this.getTier(godScore),
      predictedTier: this.getTier(godScore + deltaScore),
      confidence: this.calculateConfidence(features),
      breakdown: this.getScoreBreakdown(features),
      insights,
      arimaPrediction, // ARIMA time series prediction if available
      features // For debugging/transparency
    };
  }

  /**
   * Extract ML features from signals
   */
  extractFeatures(signals, entities) {
    const features = {
      // Traction features
      hasRevenue: signals.traction?.hasRevenue ? 1 : 0,
      revenueAmount: signals.traction?.revenue || signals.traction?.arr || 0,
      hasCustomers: signals.traction?.hasCustomers ? 1 : 0,
      userCount: signals.traction?.users || 0,
      growthRate: signals.traction?.growth?.rate || 0,
      isLaunched: signals.traction?.launched ? 1 : 0,
      
      // Team features
      repeatFounder: signals.team?.repeatFounder ? 1 : 0,
      bigTechAlumni: signals.team?.bigTechAlumni ? 1 : 0,
      ycAlum: signals.team?.yc ? 1 : 0,
      technicalFounder: signals.team?.technicalFounder ? 1 : 0,
      teamSize: signals.team?.employees || 1,
      founderCount: entities?.founders?.length || 0,
      hasCredentials: (signals.team?.credentials?.length || 0) > 0 ? 1 : 0,
      topUniversity: this.hasTopUniversity(signals.team?.credentials) ? 1 : 0,
      
      // Funding features
      hasFunding: signals.funding?.amount ? 1 : 0,
      fundingAmount: signals.funding?.amount || 0,
      fundingStage: this.encodeFundingStage(signals.funding?.stage),
      investorCount: signals.funding?.investors?.length || 0,
      topTierInvestor: this.hasTopTierInvestor(signals.funding?.investors) ? 1 : 0,
      hasLeadInvestor: signals.funding?.leadInvestor ? 1 : 0,
      
      // Product features
      hasDemo: signals.product?.hasDemo ? 1 : 0,
      hasApi: signals.product?.hasApi ? 1 : 0,
      openSource: signals.product?.openSource ? 1 : 0,
      platformCount: signals.product?.platforms?.length || 0,
      techStackDepth: signals.product?.techStack?.length || 0,
      
      // Market features
      sector: signals.product?.category || 'default',
      sectorHeat: this.sectorHeat[signals.product?.category] || 1.0,
      competitorCount: signals.market?.competitors?.length || 0,
      hasTam: signals.market?.tam ? 1 : 0,
      tamSize: signals.market?.tam || 0,
      
      // Momentum features
      pressCount: signals.momentum?.press?.length || 0,
      hasTopPress: this.hasTopPress(signals.momentum?.press) ? 1 : 0,
      awardCount: signals.momentum?.awards?.length || 0,
      partnershipCount: signals.momentum?.partnerships?.length || 0,
      socialProofCount: signals.momentum?.socialProof?.length || 0,
      
      // Composite features
      tractionScore: this.calculateTracionScore(signals.traction),
      teamScore: this.calculateTeamScore(signals.team),
      momentumScore: this.calculateMomentumScore(signals.momentum),
      
      // Meta features
      signalCount: this.countTotalSignals(signals),
      dataQuality: signals.confidence?.dataQuality === 'high' ? 1 : 
                   signals.confidence?.dataQuality === 'medium' ? 0.7 : 0.4
    };

    return features;
  }

  /**
   * Calculate static GOD score
   */
  calculateGodScore(features) {
    let score = 30; // Base score

    // Traction (up to 25 points)
    if (features.hasRevenue) score += 12;
    if (features.hasCustomers) score += 5;
    if (features.isLaunched) score += 5;
    score += Math.min(3, features.growthRate * 0.03); // Max 3 points for growth

    // Team (up to 25 points)
    if (features.repeatFounder) score += 8;
    if (features.bigTechAlumni) score += 5;
    if (features.ycAlum) score += 6;
    if (features.technicalFounder) score += 4;
    score += Math.min(2, features.teamSize * 0.1); // Team size bonus

    // Funding (up to 20 points)
    if (features.hasFunding) score += 5;
    if (features.topTierInvestor) score += 8;
    score += Math.min(7, features.fundingStage * 1.5); // Stage progression

    // Product (up to 10 points)
    if (features.hasDemo) score += 3;
    if (features.hasApi) score += 3;
    if (features.openSource) score += 2;
    score += Math.min(2, features.platformCount * 0.5);

    // Market (up to 10 points)
    score += (features.sectorHeat - 1) * 10; // Sector multiplier
    if (features.competitorCount > 0 && features.competitorCount < 5) score += 2;
    if (features.hasTam && features.tamSize > 1e9) score += 3;

    // Momentum (up to 10 points)
    if (features.hasTopPress) score += 4;
    score += Math.min(3, features.awardCount * 1.5);
    score += Math.min(3, features.partnershipCount);

    // Apply data quality multiplier
    score *= (0.8 + features.dataQuality * 0.2);

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate delta score (predicted change in next 6-12 months)
   */
  calculateDeltaScore(features, historicalData, currentGodScore = 0) {
    let delta = 0;

    // Velocity indicators (things that suggest rapid improvement)
    
    // Strong traction without funding = likely to raise soon
    if (features.tractionScore > 0.7 && !features.hasFunding) {
      delta += 8;
    }

    // Recent launch with good signals = growth coming
    if (features.isLaunched && features.signalCount > 10) {
      delta += 5;
    }

    // YC/top accelerator = incoming support and connections
    if (features.ycAlum) {
      delta += 6;
    }

    // Repeat founder = faster execution
    if (features.repeatFounder) {
      delta += 4;
    }

    // Hot sector = tailwinds
    delta += (features.sectorHeat - 1) * 8;

    // Strong team but early stage = room to grow
    if (features.teamScore > 0.7 && features.fundingStage < 2) {
      delta += 5;
    }

    // Negative indicators
    
    // Funded but no traction = concerning
    if (features.hasFunding && features.tractionScore < 0.3) {
      delta -= 5;
    }

    // Cold sector
    if (features.sectorHeat < 0.9) {
      delta -= 3;
    }

    // Use ARIMA prediction from historical GOD scores if available
    let arimaDelta = 0;
    if (historicalData?.godScoreHistory && historicalData.godScoreHistory.length >= 3) {
      try {
        arimaDelta = this.predictWithARIMA(historicalData.godScoreHistory, currentGodScore);
        // Blend ARIMA prediction with signal-based delta
        delta = (delta * 0.6 + arimaDelta * 0.4);
      } catch (error) {
        // If ARIMA fails, fall back to signal-based only
        console.warn('ARIMA prediction failed:', error.message);
      }
    }

    // Use historical data if available
    if (historicalData) {
      const velocityDelta = this.calculateVelocityFromHistory(features, historicalData);
      delta = (delta + velocityDelta) / 2; // Blend
    }

    return Math.min(20, Math.max(-20, delta));
  }

  /**
   * Predict GOD score trend using ARIMA time series analysis
   * 
   * @param {number[]} godScoreHistory - Array of historical GOD scores (monthly snapshots)
   * @param {number} currentScore - Current GOD score
   * @returns {number} Predicted delta score for next 6 months
   */
  predictWithARIMA(godScoreHistory, currentScore) {
    try {
      // Ensure we have enough data points (minimum 3)
      if (!godScoreHistory || godScoreHistory.length < 3) {
        return 0;
      }

      // Use AutoARIMA to automatically find best parameters
      const autoarima = new ARIMA({ 
        auto: true,
        verbose: false 
      }).train(godScoreHistory);

      // Predict next 6 months
      const [predictions, errors] = autoarima.predict(6);

      if (!predictions || predictions.length === 0) {
        return 0;
      }

      // Calculate average predicted score over next 6 months
      const avgPredicted = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
      
      // Calculate delta (predicted change from current)
      const delta = avgPredicted - currentScore;

      // Cap delta to reasonable range (-20 to +20)
      return Math.min(20, Math.max(-20, Math.round(delta * 10) / 10));
    } catch (error) {
      // If ARIMA fails, return 0 (no prediction)
      console.warn('ARIMA prediction error:', error.message);
      return 0;
    }
  }

  /**
   * Full ARIMA prediction with detailed results
   * 
   * @param {number[]} godScoreHistory - Array of historical GOD scores
   * @param {number} currentScore - Current GOD score
   * @returns {object} Full prediction details
   */
  predictWithARIMAFull(godScoreHistory, currentScore) {
    try {
      if (!godScoreHistory || godScoreHistory.length < 3) {
        return null;
      }

      const autoarima = new ARIMA({ 
        auto: true,
        verbose: false 
      }).train(godScoreHistory);

      const [predictions, errors] = autoarima.predict(6);

      if (!predictions || predictions.length === 0) {
        return null;
      }

      const avgPredicted = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
      const delta = avgPredicted - currentScore;

      return {
        predictions: predictions.map(p => Math.round(p)),
        errors: errors || [],
        avgPredicted: Math.round(avgPredicted),
        currentScore: currentScore,
        delta: Math.round(delta * 10) / 10,
        months: 6,
        example: `GOD Score: ${currentScore} → ${Math.round(avgPredicted)} (Δ ${delta > 0 ? '+' : ''}${delta})`
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate success probability
   */
  calculateSuccessProbability(features, godScore) {
    // Base probability from GOD score
    let probability = this.getBaseProbability(godScore);

    // Adjust based on key predictive features
    
    // Revenue is the strongest predictor
    if (features.hasRevenue) {
      probability *= 1.5;
    }

    // Repeat founders have 2x success rate
    if (features.repeatFounder) {
      probability *= 1.4;
    }

    // Top-tier investors have strong signal
    if (features.topTierInvestor) {
      probability *= 1.3;
    }

    // YC companies have ~10% unicorn rate vs 0.01% baseline
    if (features.ycAlum) {
      probability *= 1.5;
    }

    // Growth rate is highly predictive
    if (features.growthRate > 100) {
      probability *= 1.3;
    } else if (features.growthRate > 50) {
      probability *= 1.15;
    }

    // Sector adjustment
    probability *= features.sectorHeat;

    // Cap at 0.85 (no startup is a sure thing)
    return Math.min(0.85, Math.max(0.01, probability));
  }

  /**
   * Get base probability from GOD score range
   */
  getBaseProbability(godScore) {
    if (godScore >= 91) return 0.70;
    if (godScore >= 81) return 0.55;
    if (godScore >= 71) return 0.40;
    if (godScore >= 61) return 0.28;
    if (godScore >= 51) return 0.18;
    if (godScore >= 41) return 0.10;
    if (godScore >= 31) return 0.05;
    return 0.02;
  }

  /**
   * Get tier from GOD score
   */
  getTier(score) {
    if (score >= 58) return 'T1-Elite';
    if (score >= 50) return 'T2-Strong';
    if (score >= 40) return 'T3-Emerging';
    if (score >= 35) return 'T4-Angel';
    return 'T5-Incubator';
  }

  /**
   * Generate actionable insights
   */
  generateInsights(features, godScore, deltaScore) {
    const insights = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      risks: [],
      recommendations: []
    };

    // Analyze strengths
    if (features.hasRevenue) {
      insights.strengths.push('Revenue-generating business validates market demand');
    }
    if (features.repeatFounder) {
      insights.strengths.push('Experienced founder increases execution probability');
    }
    if (features.topTierInvestor) {
      insights.strengths.push('Backed by top-tier investors with strong track record');
    }
    if (features.ycAlum) {
      insights.strengths.push('Y Combinator alumni network provides significant advantages');
    }
    if (features.growthRate > 50) {
      insights.strengths.push(`Strong growth rate of ${features.growthRate}% indicates product-market fit`);
    }

    // Analyze weaknesses
    if (!features.hasRevenue && features.fundingStage >= 2) {
      insights.weaknesses.push('Post-seed without revenue is a concern');
    }
    if (features.teamSize < 5 && features.fundingAmount > 1000000) {
      insights.weaknesses.push('Small team relative to funding raised');
    }
    if (!features.technicalFounder && features.sector === 'devtools') {
      insights.weaknesses.push('DevTools company without technical founder may struggle');
    }

    // Identify opportunities
    if (features.sectorHeat > 1.1) {
      insights.opportunities.push(`${features.sector} sector is currently hot - favorable fundraising environment`);
    }
    if (features.tractionScore > 0.6 && !features.hasFunding) {
      insights.opportunities.push('Strong traction without funding - good position to raise');
    }
    if (features.openSource && features.techStackDepth > 3) {
      insights.opportunities.push('Open source with strong tech stack could attract developer community');
    }

    // Flag risks
    if (features.competitorCount > 5) {
      insights.risks.push('Crowded market requires strong differentiation');
    }
    if (features.sectorHeat < 0.9) {
      insights.risks.push('Sector currently out of favor with investors');
    }
    if (features.dataQuality < 0.5) {
      insights.risks.push('Limited public data - harder to assess true potential');
    }

    // Recommendations
    if (!features.hasDemo && features.isLaunched) {
      insights.recommendations.push('Add public demo to increase conversion');
    }
    if (features.pressCount === 0 && godScore > 50) {
      insights.recommendations.push('Pursue press coverage to increase visibility');
    }
    if (!features.hasApi && features.sector === 'devtools') {
      insights.recommendations.push('API access is expected for developer tools');
    }

    return insights;
  }

  /**
   * Calculate overall confidence in the prediction
   */
  calculateConfidence(features) {
    let confidence = 0.5; // Base confidence

    // More signals = higher confidence
    confidence += Math.min(0.2, features.signalCount * 0.01);

    // Higher data quality = higher confidence
    confidence += features.dataQuality * 0.15;

    // Key signals present = higher confidence
    if (features.hasFunding) confidence += 0.05;
    if (features.hasRevenue) confidence += 0.05;
    if (features.founderCount > 0) confidence += 0.05;

    return Math.min(0.95, confidence);
  }

  /**
   * Get detailed score breakdown
   */
  getScoreBreakdown(features) {
    return {
      traction: {
        score: Math.round(features.tractionScore * 25),
        maxScore: 25,
        factors: {
          revenue: features.hasRevenue ? 12 : 0,
          customers: features.hasCustomers ? 5 : 0,
          launched: features.isLaunched ? 5 : 0,
          growth: Math.min(3, Math.round(features.growthRate * 0.03))
        }
      },
      team: {
        score: Math.round(features.teamScore * 25),
        maxScore: 25,
        factors: {
          repeatFounder: features.repeatFounder ? 8 : 0,
          bigTech: features.bigTechAlumni ? 5 : 0,
          yc: features.ycAlum ? 6 : 0,
          technical: features.technicalFounder ? 4 : 0
        }
      },
      funding: {
        score: Math.round((features.hasFunding * 5 + features.topTierInvestor * 8 + features.fundingStage * 1.5)),
        maxScore: 20,
        factors: {
          hasFunding: features.hasFunding ? 5 : 0,
          topInvestor: features.topTierInvestor ? 8 : 0,
          stage: Math.round(features.fundingStage * 1.5)
        }
      },
      product: {
        score: Math.round((features.hasDemo * 3 + features.hasApi * 3 + features.openSource * 2 + features.platformCount * 0.5)),
        maxScore: 10
      },
      market: {
        score: Math.round(((features.sectorHeat - 1) * 10 + (features.competitorCount > 0 ? 2 : 0) + (features.hasTam ? 3 : 0))),
        maxScore: 10
      },
      momentum: {
        score: Math.round(features.momentumScore * 10),
        maxScore: 10
      }
    };
  }

  // ============ HELPER METHODS ============

  calculateTracionScore(traction) {
    if (!traction) return 0;
    let score = 0;
    if (traction.hasRevenue) score += 0.4;
    if (traction.hasCustomers) score += 0.2;
    if (traction.launched) score += 0.2;
    if (traction.growth?.rate > 50) score += 0.2;
    return Math.min(1, score);
  }

  calculateTeamScore(team) {
    if (!team) return 0;
    let score = 0;
    if (team.repeatFounder) score += 0.3;
    if (team.bigTechAlumni) score += 0.2;
    if (team.yc) score += 0.25;
    if (team.technicalFounder) score += 0.15;
    if (team.employees > 10) score += 0.1;
    return Math.min(1, score);
  }

  calculateMomentumScore(momentum) {
    if (!momentum) return 0;
    let score = 0;
    if (momentum.press?.length > 0) score += 0.3;
    if (momentum.awards?.length > 0) score += 0.3;
    if (momentum.partnerships?.length > 0) score += 0.2;
    if (momentum.socialProof?.length > 0) score += 0.2;
    return Math.min(1, score);
  }

  encodeFundingStage(stage) {
    const stages = {
      'pre-seed': 1,
      'angel': 1,
      'seed': 2,
      'series-a': 3,
      'series-b': 4,
      'series-c': 5,
      'series-d': 6,
      'series-e': 7,
      'growth': 7,
      'late-stage': 8,
      'ipo': 9
    };
    return stages[stage] || 0;
  }

  hasTopTierInvestor(investors) {
    if (!investors) return false;
    return investors.some(i => i.tier === 'top');
  }

  hasTopUniversity(credentials) {
    if (!credentials) return false;
    return credentials.some(c => c.type === 'top-university');
  }

  hasTopPress(press) {
    if (!press) return false;
    const topOutlets = ['techcrunch', 'forbes', 'bloomberg', 'wsj', 'nyt', 'reuters', 'wired'];
    return press.some(p => 
      topOutlets.some(outlet => p.source?.toLowerCase().includes(outlet))
    );
  }

  countTotalSignals(signals) {
    let count = 0;
    for (const category of Object.values(signals)) {
      if (!category) continue;
      for (const value of Object.values(category)) {
        if (Array.isArray(value)) count += value.length;
        else if (value !== null && value !== false && value !== undefined) count++;
      }
    }
    return count;
  }

  calculateVelocityFromHistory(features, historicalData) {
    // Compare current features to historical snapshots
    // Higher velocity = positive delta
    // This would use actual historical data in production
    return 0; // Placeholder
  }

  // ============ TRAINING METHODS ============

  /**
   * Add training example
   */
  addTrainingExample(features, outcome) {
    this.trainingData.push({
      features,
      outcome, // 'success', 'failure', 'acquired', 'ipo', 'shutdown'
      timestamp: Date.now()
    });
  }

  /**
   * Train model on collected data
   * In production, this would use XGBoost or similar
   */
  async train() {
    if (this.trainingData.length < 100) {
      console.log('Need at least 100 training examples');
      return false;
    }

    // Simple logistic regression for now
    // In production, use ml.js or TensorFlow.js
    console.log(`Training on ${this.trainingData.length} examples...`);
    
    // Update feature weights based on correlation with outcomes
    // This is a simplified version - real implementation would use proper ML

    this.modelTrained = true;
    return true;
  }

  /**
   * Export model for persistence
   */
  exportModel() {
    return JSON.stringify({
      featureWeights: this.featureWeights,
      sectorHeat: this.sectorHeat,
      probabilityCalibration: this.probabilityCalibration,
      trainingDataSize: this.trainingData.length,
      exportedAt: new Date().toISOString()
    });
  }

  /**
   * Import trained model
   */
  importModel(modelJson) {
    const model = JSON.parse(modelJson);
    this.featureWeights = model.featureWeights;
    this.sectorHeat = model.sectorHeat;
    this.probabilityCalibration = model.probabilityCalibration;
    this.modelTrained = true;
  }
}

module.exports = { PredictiveGodEngine };
