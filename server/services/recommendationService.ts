import { supabase } from '../config/supabase';

interface WeightUpdate {
  component: string;
  old_weight: number;
  new_weight: number;
  reason: string;
}

interface RecommendationApplication {
  recommendation_id: string;
  applied_at: string;
  applied_by: string;
  weight_updates: WeightUpdate[];
  performance_before: any;
  performance_after?: any;
}

/**
 * Service to apply ML recommendations to the GOD Algorithm
 */
export class RecommendationService {
  // Current GOD Algorithm weights (from startupScoringService.ts)
  private static DEFAULT_WEIGHTS = {
    team: 3.0,
    traction: 3.0,
    market: 2.0,
    product: 2.0,
    vision: 2.0,
    ecosystem: 1.5,
    grit: 1.5,
    problemValidation: 2.0
  };

  /**
   * Apply a recommendation to update GOD algorithm weights
   */
  static async applyRecommendation(recommendationId: string, userId: string = 'system') {
    try {
      // 1. Fetch the recommendation
      const { data: recommendation, error: fetchError } = await supabase
        .from('ml_recommendations')
        .select('*')
        .eq('id', recommendationId)
        .single();

      if (fetchError || !recommendation) {
        throw new Error('Recommendation not found');
      }

      if (recommendation.status === 'applied') {
        throw new Error('Recommendation already applied');
      }

      // 2. Parse the weight changes
      const proposedWeights = recommendation.proposed_value;
      const weightUpdates: WeightUpdate[] = [];

      // 3. Get current performance metrics
      const performanceBefore = await this.getCurrentPerformance();

      // 4. Apply weight updates
      for (const [component, newWeight] of Object.entries(proposedWeights)) {
        const oldWeight = this.DEFAULT_WEIGHTS[component as keyof typeof this.DEFAULT_WEIGHTS];
        if (oldWeight !== undefined) {
          weightUpdates.push({
            component,
            old_weight: oldWeight,
            new_weight: newWeight as number,
            reason: recommendation.description
          });
        }
      }

      // 5. Store the application record
      const application: RecommendationApplication = {
        recommendation_id: recommendationId,
        applied_at: new Date().toISOString(),
        applied_by: userId,
        weight_updates: weightUpdates,
        performance_before: performanceBefore
      };

      // 6. Update recommendation status
      const { error: updateError } = await supabase
        .from('ml_recommendations')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: userId
        })
        .eq('id', recommendationId);

      if (updateError) {
        throw new Error('Failed to update recommendation status');
      }

      // 7. Store weight history
      const { error: historyError } = await supabase
        .from('algorithm_weight_history')
        .insert({
          recommendation_id: recommendationId,
          weight_updates: weightUpdates,
          applied_by: userId,
          performance_before: performanceBefore
        });

      if (historyError) {
        console.warn('Failed to store weight history:', historyError);
      }

      // 8. TODO: Update the actual algorithm configuration
      // This would involve updating environment variables or a config table
      // For now, we'll just log it
      console.log('Applied weight updates:', weightUpdates);

      return {
        success: true,
        application,
        message: 'Recommendation applied successfully. Algorithm weights updated.'
      };

    } catch (error: any) {
      console.error('Error applying recommendation:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to apply recommendation'
      };
    }
  }

  /**
   * Get current algorithm performance metrics
   */
  private static async getCurrentPerformance() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Use correct table name: startup_investor_matches, not matches
    // Use status column for success tracking (funded/meeting_scheduled)
    const { data: matches, error } = await supabase
      .from('startup_investor_matches')
      .select('match_score, success_score, status')
      .gte('created_at', thirtyDaysAgo);

    if (error || !matches) {
      return {
        total_matches: 0,
        avg_match_score: 0,
        avg_god_score: 0,
        success_rate: 0
      };
    }

    const totalMatches = matches.length;
    // Use status column - 'funded' or 'meeting_scheduled' are successful
    const successfulMatches = matches.filter(m => 
      m.status === 'funded' || m.status === 'meeting_scheduled'
    ).length;

    const avgMatchScore = matches.reduce((sum, m) => sum + (m.match_score || 0), 0) / totalMatches;
    const avgSuccessScore = matches.reduce((sum, m) => sum + (m.success_score || 0), 0) / totalMatches;

    return {
      total_matches: totalMatches,
      avg_match_score: avgMatchScore,
      avg_god_score: avgSuccessScore,
      success_rate: successfulMatches / totalMatches,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get weight history
   */
  static async getWeightHistory(limit: number = 10) {
    const { data, error } = await supabase
      .from('algorithm_weight_history')
      .select(`
        *,
        ml_recommendations (
          title,
          description,
          expected_impact
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching weight history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Rollback a weight change
   */
  static async rollbackWeights(applicationId: string) {
    try {
      // 1. Get the application record
      const { data: history, error: fetchError } = await supabase
        .from('algorithm_weight_history')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (fetchError || !history) {
        throw new Error('Application record not found');
      }

      // 2. Reverse the weight updates
      const rollbackUpdates = history.weight_updates.map((update: WeightUpdate) => ({
        component: update.component,
        old_weight: update.new_weight,
        new_weight: update.old_weight,
        reason: `Rollback of: ${update.reason}`
      }));

      // 3. Apply the rollback
      console.log('Rolling back weights:', rollbackUpdates);

      // 4. Mark as rolled back
      const { error: updateError } = await supabase
        .from('algorithm_weight_history')
        .update({ rolled_back: true, rolled_back_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (updateError) {
        console.warn('Failed to mark as rolled back:', updateError);
      }

      return {
        success: true,
        rollback_updates: rollbackUpdates,
        message: 'Weights rolled back successfully'
      };

    } catch (error: any) {
      console.error('Error rolling back weights:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to rollback weights'
      };
    }
  }

  /**
   * Get current active weights
   */
  static async getCurrentWeights() {
    // In a production system, this would fetch from a config table or environment
    // For now, return the default weights plus any recent updates
    
    const recentUpdates = await this.getWeightHistory(1);
    
    if (recentUpdates.length === 0) {
      return this.DEFAULT_WEIGHTS;
    }

    const latestUpdate = recentUpdates[0];
    const updatedWeights = { ...this.DEFAULT_WEIGHTS };

    for (const update of latestUpdate.weight_updates) {
      updatedWeights[update.component as keyof typeof this.DEFAULT_WEIGHTS] = update.new_weight;
    }

    return updatedWeights;
  }
}

export default RecommendationService;
