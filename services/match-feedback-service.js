/**
 * MATCH FEEDBACK SERVICE
 * 
 * Tracks user interactions with matches (swipes, clicks, saves)
 * and uses them to improve the matching algorithm over time.
 * 
 * Features:
 * 1. Track all match interactions (view, save, contact, pass, etc.)
 * 2. Calculate implicit fit signals from behavior
 * 3. Generate training data for ML model improvement
 * 4. A/B test match algorithm variations
 * 5. Provide feedback-adjusted match scoring
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Feedback weights for implicit scoring
const FEEDBACK_WEIGHTS = {
  viewed: 0.1,          // Just viewed the match
  expanded: 0.2,        // Expanded details
  saved: 0.5,           // Saved for later
  contacted: 0.8,       // Reached out
  meeting_scheduled: 0.9, // Scheduled a meeting
  invested: 1.0,        // Actually invested (goal!)
  passed: -0.3,         // Explicitly passed
  reported: -0.5        // Reported as bad match
};

// Time decay factor (older feedback worth less)
const TIME_DECAY_HALF_LIFE_DAYS = 90;

class MatchFeedbackService {
  
  /**
   * Record a user interaction with a match
   */
  async recordFeedback(matchId, userId, feedbackType, metadata = {}) {
    try {
      // Get match details
      const { data: match } = await supabase
        .from('startup_investor_matches')
        .select('startup_id, investor_id, match_score')
        .eq('id', matchId)
        .single();

      if (!match) {
        throw new Error('Match not found');
      }

      // Insert feedback record
      const { error } = await supabase
        .from('match_feedback')
        .upsert({
          match_id: matchId,
          user_id: userId,
          feedback_type: feedbackType,
          startup_id: match.startup_id,
          investor_id: match.investor_id,
          original_score: match.match_score,
          metadata,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'match_id,user_id,feedback_type'
        });

      if (error) throw error;

      // Update match status
      await this.updateMatchStatus(matchId, feedbackType);

      // Trigger async learning update
      this.triggerLearningUpdate(match.startup_id, match.investor_id);

      return { success: true };
    } catch (err) {
      console.error('Error recording feedback:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update match status based on feedback
   */
  async updateMatchStatus(matchId, feedbackType) {
    const statusMap = {
      viewed: 'viewed',
      saved: 'in_queue',
      contacted: 'contacted',
      meeting_scheduled: 'meeting_scheduled',
      interested: 'interested',
      passed: 'passed'
    };

    const newStatus = statusMap[feedbackType];
    if (!newStatus) return;

    const updateField = feedbackType === 'viewed' ? 'viewed_at' :
                        feedbackType === 'contacted' ? 'contacted_at' : null;

    const update = { status: newStatus };
    if (updateField) {
      update[updateField] = new Date().toISOString();
    }

    await supabase
      .from('startup_investor_matches')
      .update(update)
      .eq('id', matchId);
  }

  /**
   * Trigger async learning from new feedback
   * This updates sector affinities and pattern learning
   */
  async triggerLearningUpdate(startupId, investorId) {
    // Debounced - runs in background, updates learning signals
    setTimeout(async () => {
      try {
        await this.updateSectorAffinity(investorId);
        await this.updateStageAffinity(investorId);
      } catch (err) {
        console.error('Learning update failed:', err);
      }
    }, 5000);
  }

  /**
   * Calculate sector affinity from feedback history
   */
  async updateSectorAffinity(investorId) {
    const { data: feedback } = await supabase
      .from('match_feedback')
      .select(`
        feedback_type,
        created_at,
        startup_uploads!match_feedback_startup_id_fkey(sectors)
      `)
      .eq('investor_id', investorId)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (!feedback || feedback.length === 0) return;

    // Calculate sector scores from feedback
    const sectorScores = {};
    
    for (const fb of feedback) {
      const weight = FEEDBACK_WEIGHTS[fb.feedback_type] || 0;
      const timeDecay = this.calculateTimeDecay(fb.created_at);
      const sectors = fb.startup_uploads?.sectors || [];

      for (const sector of sectors) {
        if (!sectorScores[sector]) {
          sectorScores[sector] = { positive: 0, negative: 0, count: 0 };
        }
        
        if (weight > 0) {
          sectorScores[sector].positive += weight * timeDecay;
        } else {
          sectorScores[sector].negative += Math.abs(weight) * timeDecay;
        }
        sectorScores[sector].count++;
      }
    }

    // Store learned sector affinity
    await supabase
      .from('investor_learned_preferences')
      .upsert({
        investor_id: investorId,
        preference_type: 'sector_affinity',
        preference_data: sectorScores,
        confidence: Math.min(feedback.length / 20, 1.0), // More feedback = more confident
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'investor_id,preference_type'
      });
  }

  /**
   * Calculate stage affinity from feedback history
   */
  async updateStageAffinity(investorId) {
    const { data: feedback } = await supabase
      .from('match_feedback')
      .select(`
        feedback_type,
        created_at,
        startup_uploads!match_feedback_startup_id_fkey(stage, latest_funding_round)
      `)
      .eq('investor_id', investorId)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (!feedback || feedback.length === 0) return;

    const stageScores = {};
    
    for (const fb of feedback) {
      const weight = FEEDBACK_WEIGHTS[fb.feedback_type] || 0;
      const timeDecay = this.calculateTimeDecay(fb.created_at);
      const stage = fb.startup_uploads?.latest_funding_round || 
                   this.stageNumberToName(fb.startup_uploads?.stage);

      if (stage) {
        if (!stageScores[stage]) {
          stageScores[stage] = { positive: 0, negative: 0, count: 0 };
        }
        
        if (weight > 0) {
          stageScores[stage].positive += weight * timeDecay;
        } else {
          stageScores[stage].negative += Math.abs(weight) * timeDecay;
        }
        stageScores[stage].count++;
      }
    }

    await supabase
      .from('investor_learned_preferences')
      .upsert({
        investor_id: investorId,
        preference_type: 'stage_affinity',
        preference_data: stageScores,
        confidence: Math.min(feedback.length / 20, 1.0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'investor_id,preference_type'
      });
  }

  /**
   * Get feedback-adjusted match score
   */
  async getAdjustedMatchScore(startupId, investorId, baseScore) {
    try {
      // Get learned preferences
      const { data: preferences } = await supabase
        .from('investor_learned_preferences')
        .select('preference_type, preference_data, confidence')
        .eq('investor_id', investorId);

      if (!preferences || preferences.length === 0) {
        return baseScore; // No learned data yet
      }

      // Get startup details for matching
      const { data: startup } = await supabase
        .from('startup_uploads')
        .select('sectors, stage, latest_funding_round')
        .eq('id', startupId)
        .single();

      if (!startup) return baseScore;

      let adjustment = 0;
      let confidenceSum = 0;

      // Apply sector affinity
      const sectorPref = preferences.find(p => p.preference_type === 'sector_affinity');
      if (sectorPref && startup.sectors) {
        for (const sector of startup.sectors) {
          const affinity = sectorPref.preference_data[sector];
          if (affinity) {
            const sectorBoost = (affinity.positive - affinity.negative) / Math.max(affinity.count, 1);
            adjustment += sectorBoost * 10 * sectorPref.confidence;
            confidenceSum += sectorPref.confidence;
          }
        }
      }

      // Apply stage affinity
      const stagePref = preferences.find(p => p.preference_type === 'stage_affinity');
      const stage = startup.latest_funding_round || this.stageNumberToName(startup.stage);
      if (stagePref && stage) {
        const affinity = stagePref.preference_data[stage];
        if (affinity) {
          const stageBoost = (affinity.positive - affinity.negative) / Math.max(affinity.count, 1);
          adjustment += stageBoost * 10 * stagePref.confidence;
          confidenceSum += stagePref.confidence;
        }
      }

      // Normalize adjustment
      if (confidenceSum > 0) {
        adjustment = adjustment / confidenceSum;
      }

      // Apply adjustment (max ±15 points)
      const adjustedScore = Math.max(0, Math.min(100, baseScore + Math.max(-15, Math.min(15, adjustment))));
      
      return adjustedScore;
    } catch (err) {
      console.error('Error calculating adjusted score:', err);
      return baseScore;
    }
  }

  /**
   * Generate training data for fine-tuning
   */
  async generateTrainingData(limit = 1000) {
    // Get high-quality positive examples (contacted or better)
    const { data: positiveMatches } = await supabase
      .from('match_feedback')
      .select(`
        startup_uploads!match_feedback_startup_id_fkey(
          name, description, tagline, pitch, sectors, total_god_score
        ),
        investors!match_feedback_investor_id_fkey(
          name, firm, bio, sectors, investment_thesis
        ),
        feedback_type,
        original_score
      `)
      .in('feedback_type', ['contacted', 'meeting_scheduled', 'invested', 'saved'])
      .limit(limit / 2);

    // Get negative examples (passed or reported)
    const { data: negativeMatches } = await supabase
      .from('match_feedback')
      .select(`
        startup_uploads!match_feedback_startup_id_fkey(
          name, description, tagline, pitch, sectors, total_god_score
        ),
        investors!match_feedback_investor_id_fkey(
          name, firm, bio, sectors, investment_thesis
        ),
        feedback_type,
        original_score
      `)
      .in('feedback_type', ['passed', 'reported'])
      .limit(limit / 2);

    // Format for training
    const trainingData = [];

    for (const match of (positiveMatches || [])) {
      if (match.startup_uploads && match.investors) {
        trainingData.push({
          startup_text: this.formatStartupForTraining(match.startup_uploads),
          investor_text: this.formatInvestorForTraining(match.investors),
          label: 1, // Good match
          feedback_type: match.feedback_type,
          original_score: match.original_score
        });
      }
    }

    for (const match of (negativeMatches || [])) {
      if (match.startup_uploads && match.investors) {
        trainingData.push({
          startup_text: this.formatStartupForTraining(match.startup_uploads),
          investor_text: this.formatInvestorForTraining(match.investors),
          label: 0, // Bad match
          feedback_type: match.feedback_type,
          original_score: match.original_score
        });
      }
    }

    return trainingData;
  }

  /**
   * Calculate time decay factor
   */
  calculateTimeDecay(dateStr) {
    const age = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
    return Math.pow(0.5, age / TIME_DECAY_HALF_LIFE_DAYS);
  }

  /**
   * Convert stage number to name
   */
  stageNumberToName(stage) {
    const stages = { 0: 'Pre-seed', 1: 'Seed', 2: 'Series A', 3: 'Series B', 4: 'Series C+' };
    return stages[stage] || null;
  }

  /**
   * Format startup for training text
   */
  formatStartupForTraining(startup) {
    return [
      startup.name,
      startup.tagline || '',
      startup.description || '',
      startup.pitch || '',
      `Sectors: ${(startup.sectors || []).join(', ')}`,
      `GOD Score: ${startup.total_god_score || 'N/A'}`
    ].filter(Boolean).join('\n');
  }

  /**
   * Format investor for training text
   */
  formatInvestorForTraining(investor) {
    return [
      `${investor.firm || ''} - ${investor.name}`,
      investor.bio || '',
      investor.investment_thesis || '',
      `Focus: ${(investor.sectors || []).join(', ')}`
    ].filter(Boolean).join('\n');
  }

  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('match_feedback')
      .select('feedback_type, original_score')
      .gte('created_at', since);

    if (!data) return null;

    // Group by feedback type
    const analytics = {};
    for (const fb of data) {
      if (!analytics[fb.feedback_type]) {
        analytics[fb.feedback_type] = { count: 0, avgOriginalScore: 0, scores: [] };
      }
      analytics[fb.feedback_type].count++;
      analytics[fb.feedback_type].scores.push(fb.original_score);
    }

    // Calculate averages
    for (const type in analytics) {
      const scores = analytics[type].scores;
      analytics[type].avgOriginalScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      delete analytics[type].scores;
    }

    return analytics;
  }
}

module.exports = { MatchFeedbackService, FEEDBACK_WEIGHTS };
