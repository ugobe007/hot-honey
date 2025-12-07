import OpenAI from 'openai';
import { supabase } from '../config/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================================
// INVESTOR INTELLIGENCE SERVICE
// Analyzes investor profiles, patterns, and generates positioning recommendations
// =============================================

interface Startup {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  stage?: string;
  sector?: string;
  industry?: string;
  funding_raised?: number;
  target_raise?: number;
  location?: string;
  team_size?: number;
  revenue?: number;
  traction_metrics?: any;
}

interface InvestorProfile {
  id: string;
  name: string;
  firm: string;
  title: string;
  stage_focus: string[];
  sector_focus: string[];
  check_size_min: number;
  check_size_max: number;
  investment_thesis: string;
  bio: string;
  portfolio_companies: string[];
  notable_investments: any;
  investor_type: string;
  leads_rounds?: boolean;
  follows_rounds?: boolean;
  preferred_intro_method?: string;
}

interface PositioningRecommendation {
  investor_id: string;
  fit_score: number;
  thesis_alignment: string;
  portfolio_synergies: string[];
  competitive_concerns: string[];
  approach_strategy: string;
  recommended_intro_path: any;
  talking_points: string[];
  avoid_topics: string[];
  best_contact_timing: string;
  timing_rationale: string;
  partner_specific_notes: string;
  intro_email_subject: string;
  intro_email_body: string;
  followup_email_body: string;
}

/**
 * Generate comprehensive positioning recommendations for a startup
 */
export async function generatePositioningRecommendations(
  startup: Startup,
  userId: string,
  limit: number = 10
): Promise<PositioningRecommendation[]> {
  try {
    // 1. Get all active investors
    const { data: investors, error: investorsError } = await supabase
      .from('investors')
      .select('*')
      .eq('status', 'active');

    if (investorsError || !investors || investors.length === 0) {
      throw new Error('No active investors found');
    }

    // 2. Pre-filter investors based on basic criteria
    const relevantInvestors = preFilterInvestors(startup, investors);

    // 3. Generate detailed positioning for top candidates
    const recommendations: PositioningRecommendation[] = [];

    for (const investor of relevantInvestors.slice(0, limit)) {
      const recommendation = await generateInvestorPositioning(startup, investor);
      recommendations.push(recommendation);
    }

    // 4. Sort by fit score
    recommendations.sort((a, b) => b.fit_score - a.fit_score);

    // 5. Save recommendations to database
    for (const rec of recommendations) {
      await saveRecommendation(startup.id, userId, rec);
    }

    // 6. Track analytics
    await trackAnalytics(userId, startup.id, 'recommendations_generated', {
      count: recommendations.length,
      top_fit_score: recommendations[0]?.fit_score,
    });

    return recommendations;
  } catch (error) {
    console.error('Error generating positioning recommendations:', error);
    throw error;
  }
}

/**
 * Pre-filter investors based on stage, sector, and check size
 */
function preFilterInvestors(startup: Startup, investors: InvestorProfile[]): InvestorProfile[] {
  const startupStage = (startup.stage || 'seed').toLowerCase();
  const startupSector = (startup.sector || startup.industry || '').toLowerCase();
  const targetRaise = startup.target_raise || 0;

  return investors
    .map(investor => {
      let score = 0;

      // Stage fit (40 points)
      const stageMatch = investor.stage_focus?.some(s => 
        startupStage.includes(s.toLowerCase()) || s.toLowerCase().includes(startupStage)
      );
      if (stageMatch) score += 40;

      // Sector fit (40 points)
      const sectorMatch = investor.sector_focus?.some(s => 
        startupSector.includes(s.toLowerCase()) || s.toLowerCase().includes(startupSector)
      );
      if (sectorMatch) score += 40;

      // Check size fit (20 points)
      const checkSizeFit = 
        targetRaise >= (investor.check_size_min || 0) &&
        targetRaise <= (investor.check_size_max || Infinity);
      if (checkSizeFit) score += 20;

      return { investor, score };
    })
    .filter(item => item.score >= 40) // At least stage OR sector match
    .sort((a, b) => b.score - a.score)
    .map(item => item.investor);
}

/**
 * Generate detailed positioning recommendation for a specific investor
 */
async function generateInvestorPositioning(
  startup: Startup,
  investor: InvestorProfile
): Promise<PositioningRecommendation> {
  try {
    const prompt = `You are an expert fundraising advisor helping a startup position themselves for a specific investor.

STARTUP PROFILE:
- Name: ${startup.name}
- Tagline: ${startup.tagline || 'N/A'}
- Description: ${startup.description || 'N/A'}
- Stage: ${startup.stage || 'Seed'}
- Sector: ${startup.sector || startup.industry || 'Technology'}
- Funding Raised: $${(startup.funding_raised || 0).toLocaleString()}
- Target Raise: $${(startup.target_raise || 0).toLocaleString()}
- Location: ${startup.location || 'N/A'}
- Team Size: ${startup.team_size || 'N/A'}
- Revenue: ${startup.revenue ? `$${startup.revenue.toLocaleString()}` : 'Pre-revenue'}

INVESTOR PROFILE:
- Name: ${investor.name}
- Firm: ${investor.firm}
- Title: ${investor.title}
- Type: ${investor.investor_type || 'VC'}
- Stage Focus: ${investor.stage_focus?.join(', ') || 'N/A'}
- Sector Focus: ${investor.sector_focus?.join(', ') || 'N/A'}
- Check Size: $${(investor.check_size_min || 0).toLocaleString()} - $${(investor.check_size_max || 0).toLocaleString()}
- Investment Thesis: ${investor.investment_thesis || 'N/A'}
- Bio: ${investor.bio || 'N/A'}
- Portfolio Companies: ${investor.portfolio_companies?.join(', ') || 'N/A'}
- Leads Rounds: ${investor.leads_rounds ? 'Yes' : 'No'}
- Follows Rounds: ${investor.follows_rounds ? 'Yes' : 'No'}
- Preferred Intro: ${investor.preferred_intro_method || 'warm_intro'}

Generate a comprehensive positioning strategy as JSON:
{
  "fit_score": <0-100 overall fit score>,
  "thesis_alignment": "<2-3 sentences on how startup aligns with investor's thesis>",
  "portfolio_synergies": ["<company 1 in portfolio that's synergistic>", "<company 2>", ...],
  "competitive_concerns": ["<potential portfolio conflict 1>", ...] (empty if none),
  "approach_strategy": "<'warm_intro' | 'cold_outreach' | 'event' | 'content_engagement'>",
  "recommended_intro_path": {
    "strategy": "<best way to get introduced>",
    "potential_connectors": ["<type of person who could intro>", ...]
  },
  "talking_points": ["<key point 1 to emphasize>", "<key point 2>", "<key point 3>", ...],
  "avoid_topics": ["<topic to avoid>", ...],
  "best_contact_timing": "<'now' | 'after_milestone' | 'wait'>",
  "timing_rationale": "<why this timing>",
  "partner_specific_notes": "<specific insights about this partner's interests/style>",
  "intro_email_subject": "<compelling subject line>",
  "intro_email_body": "<personalized 2-paragraph intro email with {founder_name} and {investor_name} placeholders>",
  "followup_email_body": "<follow-up email if no response after 1 week>"
}

Be specific and actionable. Reference the investor's actual thesis and portfolio.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert startup fundraising advisor. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      investor_id: investor.id,
      fit_score: response.fit_score || 50,
      thesis_alignment: response.thesis_alignment || '',
      portfolio_synergies: response.portfolio_synergies || [],
      competitive_concerns: response.competitive_concerns || [],
      approach_strategy: response.approach_strategy || 'warm_intro',
      recommended_intro_path: response.recommended_intro_path || {},
      talking_points: response.talking_points || [],
      avoid_topics: response.avoid_topics || [],
      best_contact_timing: response.best_contact_timing || 'now',
      timing_rationale: response.timing_rationale || '',
      partner_specific_notes: response.partner_specific_notes || '',
      intro_email_subject: response.intro_email_subject || `Introduction: ${startup.name}`,
      intro_email_body: response.intro_email_body || '',
      followup_email_body: response.followup_email_body || '',
    };
  } catch (error) {
    console.error('Error generating positioning for investor:', investor.name, error);
    
    // Fallback recommendation
    return {
      investor_id: investor.id,
      fit_score: 50,
      thesis_alignment: 'Basic stage and sector alignment detected.',
      portfolio_synergies: [],
      competitive_concerns: [],
      approach_strategy: 'warm_intro',
      recommended_intro_path: { strategy: 'Find mutual connections via LinkedIn' },
      talking_points: ['Stage fit', 'Sector expertise', 'Growth potential'],
      avoid_topics: [],
      best_contact_timing: 'now',
      timing_rationale: 'Standard outreach timing',
      partner_specific_notes: '',
      intro_email_subject: `Introduction: ${startup.name}`,
      intro_email_body: `Dear {investor_name},\n\nI'd like to introduce you to ${startup.name}.\n\nBest regards,\n{founder_name}`,
      followup_email_body: 'Following up on my previous email...',
    };
  }
}

/**
 * Save recommendation to database
 */
async function saveRecommendation(
  startupId: string,
  userId: string,
  recommendation: PositioningRecommendation
): Promise<void> {
  try {
    const { error } = await supabase.from('startup_recommendations').upsert({
      startup_id: startupId,
      user_id: userId,
      investor_id: recommendation.investor_id,
      fit_score: recommendation.fit_score,
      thesis_alignment: recommendation.thesis_alignment,
      portfolio_synergies: recommendation.portfolio_synergies,
      competitive_concerns: recommendation.competitive_concerns,
      approach_strategy: recommendation.approach_strategy,
      recommended_intro_path: recommendation.recommended_intro_path,
      talking_points: recommendation.talking_points,
      avoid_topics: recommendation.avoid_topics,
      best_contact_timing: recommendation.best_contact_timing,
      timing_rationale: recommendation.timing_rationale,
      partner_specific_notes: recommendation.partner_specific_notes,
      intro_email_subject: recommendation.intro_email_subject,
      intro_email_body: recommendation.intro_email_body,
      followup_email_body: recommendation.followup_email_body,
      status: 'recommended',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'startup_id,investor_id',
    });

    if (error) {
      console.error('Error saving recommendation:', error);
    }
  } catch (error) {
    console.error('Error in saveRecommendation:', error);
  }
}

/**
 * Get existing recommendations for a startup
 */
export async function getRecommendations(
  startupId: string,
  userId: string,
  options: { status?: string; limit?: number } = {}
): Promise<any[]> {
  try {
    let query = supabase
      .from('startup_recommendations')
      .select(`
        *,
        investors:investor_id (
          id,
          name,
          firm,
          title,
          photo_url,
          linkedin_url,
          stage_focus,
          sector_focus,
          check_size_min,
          check_size_max,
          investor_type,
          investment_thesis
        )
      `)
      .eq('startup_id', startupId)
      .eq('user_id', userId)
      .order('fit_score', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw error;
  }
}

/**
 * Update recommendation status (e.g., when outreach is started)
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: string,
  notes?: string
): Promise<void> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'outreach_started') {
      updates.outreach_date = new Date().toISOString();
    } else if (status === 'meeting_scheduled' || status === 'passed') {
      updates.response_date = new Date().toISOString();
    }

    if (notes) {
      updates.notes = notes;
    }

    await supabase
      .from('startup_recommendations')
      .update(updates)
      .eq('id', recommendationId);
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    throw error;
  }
}

/**
 * Get investor connection map (who invests with whom)
 */
export async function getInvestorConnections(investorId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('investor_connections')
      .select(`
        *,
        connected_investor:connected_investor_id (
          id,
          name,
          firm,
          title,
          photo_url,
          investor_type
        )
      `)
      .eq('investor_id', investorId)
      .order('connection_strength', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting investor connections:', error);
    return [];
  }
}

/**
 * Get syndicate information for an investor
 */
export async function getInvestorSyndicates(investorId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('syndicate_members')
      .select(`
        *,
        syndicate:syndicate_id (
          id,
          name,
          platform,
          syndicate_url,
          min_check_size,
          max_allocation,
          sector_focus,
          stage_focus
        )
      `)
      .eq('investor_id', investorId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting investor syndicates:', error);
    return [];
  }
}

/**
 * Analyze co-investment patterns
 */
export async function analyzeCoInvestmentPatterns(investorId: string): Promise<{
  frequentCoInvestors: any[];
  preferredStages: string[];
  avgRoundSize: number;
  leadsVsFollows: { leads: number; follows: number };
}> {
  try {
    // Get investment history
    const { data: investments, error } = await supabase
      .from('investment_history')
      .select('*')
      .eq('investor_id', investorId)
      .order('investment_date', { ascending: false });

    if (error || !investments) {
      return {
        frequentCoInvestors: [],
        preferredStages: [],
        avgRoundSize: 0,
        leadsVsFollows: { leads: 0, follows: 0 },
      };
    }

    // Analyze co-investors
    const coInvestorCounts: Record<string, number> = {};
    investments.forEach(inv => {
      (inv.co_investors || []).forEach((coInv: string) => {
        coInvestorCounts[coInv] = (coInvestorCounts[coInv] || 0) + 1;
      });
    });

    const frequentCoInvestors = Object.entries(coInvestorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Analyze stages
    const stageCounts: Record<string, number> = {};
    investments.forEach(inv => {
      if (inv.stage) {
        stageCounts[inv.stage] = (stageCounts[inv.stage] || 0) + 1;
      }
    });

    const preferredStages = Object.entries(stageCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([stage]) => stage);

    // Calculate averages
    const roundSizes = investments.filter(i => i.round_size).map(i => i.round_size);
    const avgRoundSize = roundSizes.length > 0 
      ? roundSizes.reduce((a, b) => a + b, 0) / roundSizes.length 
      : 0;

    const leads = investments.filter(i => i.is_lead).length;
    const follows = investments.length - leads;

    return {
      frequentCoInvestors,
      preferredStages,
      avgRoundSize,
      leadsVsFollows: { leads, follows },
    };
  } catch (error) {
    console.error('Error analyzing co-investment patterns:', error);
    return {
      frequentCoInvestors: [],
      preferredStages: [],
      avgRoundSize: 0,
      leadsVsFollows: { leads: 0, follows: 0 },
    };
  }
}

/**
 * Track analytics event
 */
async function trackAnalytics(
  userId: string,
  startupId: string | undefined,
  eventType: string,
  metadata: any = {}
): Promise<void> {
  try {
    await supabase.from('recommendation_analytics').insert({
      user_id: userId,
      startup_id: startupId,
      event_type: eventType,
      metadata,
    });
  } catch (error) {
    console.error('Error tracking analytics:', error);
  }
}

/**
 * Check subscription limits
 */
export async function checkSubscriptionLimits(
  userId: string,
  actionType: 'match' | 'recommendation' | 'intro_email'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  try {
    // Get user's subscription
    const { data: subscription, error } = await supabase
      .from('startup_subscriptions')
      .select(`
        *,
        plan:plan_id (
          name,
          limits
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      // Free tier defaults
      const freeLimit = actionType === 'match' ? 3 : actionType === 'recommendation' ? 1 : 0;
      return { allowed: true, remaining: freeLimit, limit: freeLimit };
    }

    const limits = subscription.plan?.limits || {};
    const limitKey = `${actionType}s_per_month`;
    const usedKey = `${actionType}s_used_this_period`;

    const limit = limits[limitKey] ?? 3;
    const used = subscription[usedKey] ?? 0;

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, remaining: -1, limit: -1 };
    }

    return {
      allowed: used < limit,
      remaining: Math.max(0, limit - used),
      limit,
    };
  } catch (error) {
    console.error('Error checking subscription limits:', error);
    return { allowed: true, remaining: 3, limit: 3 };
  }
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  userId: string,
  actionType: 'match' | 'recommendation' | 'intro_email'
): Promise<void> {
  try {
    const columnName = `${actionType}s_used_this_period`;
    
    await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_column: columnName,
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}
