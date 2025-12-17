/**
 * INTEGRATED MATCHING SERVICE
 * Combines GOD algorithm (startup scoring) with AI-powered investor matching
 * 
 * MATCHING MODES:
 * 1. GOD Algorithm Only - Rule-based scoring (default)
 * 2. Semantic Matching - Vector embedding similarity (Option 2)
 * 3. Hybrid - 60% GOD + 40% Semantic (best results)
 */

import { calculateHotScore } from '../../server/services/startupScoringService';
import { getTeamReason, getTractionReason, getMarketReason, getProductReason } from './matchingHelpers';
import { findSemanticInvestorMatches, hasEmbedding } from './semanticMatchingService';

// Debug logging controls
const DEBUG_GOD = true; // Set to false in production

/**
 * DATA NORMALIZATION FUNCTIONS
 * These ensure consistent field access regardless of data source (direct fields vs extracted_data)
 */

/**
 * Normalize startup data to consistent format
 * Handles fallback from startup.field to startup.extracted_data.field
 */
function normalizeStartupData(startup: any) {
  const extracted = startup.extracted_data || {};
  
  return {
    // Basic info
    id: startup.id,
    name: startup.name,
    description: startup.description || startup.tagline || extracted.description || '',
    tagline: startup.tagline || extracted.tagline || '',
    
    // Stage and funding
    stage: startup.stage ?? extracted.stage ?? 0,
    raise_amount: startup.raise_amount || startup.raise || extracted.raise || extracted.raise_amount || '',
    funding_needed: startup.funding_needed || startup.raise || extracted.raise || '',
    previous_funding: startup.previous_funding || startup.raised || extracted.raised || 0,
    
    // Team data (critical for GOD algorithm)
    team: startup.team || extracted.team || [],
    founders_count: startup.founders_count || extracted.founders_count || startup.team?.length || 1,
    technical_cofounders: startup.technical_cofounders || extracted.technical_cofounders || 0,
    
    // Traction data (critical for GOD algorithm)
    traction: startup.traction || extracted.traction || '',
    revenue: startup.revenue || startup.arr || extracted.revenue || extracted.arr || 0,
    mrr: startup.mrr || extracted.mrr || (startup.arr ? startup.arr / 12 : 0),
    arr: startup.arr || extracted.arr || 0,
    active_users: startup.users || startup.active_users || extracted.users || extracted.active_users || 0,
    growth_rate: startup.growth_rate || startup.mom_growth || extracted.growth_rate || extracted.mom_growth || 0,
    customers: startup.customers || extracted.customers || 0,
    
    // Market data (critical for GOD algorithm)
    sectors: startup.sectors || startup.industries || extracted.sectors || extracted.industries || [],
    industries: startup.industries || startup.sectors || extracted.industries || extracted.sectors || [],
    market_size: startup.market_size || extracted.market || extracted.market_size || 0,
    
    // Product data
    pitch: startup.pitch || extracted.pitch || startup.description || '',
    problem: startup.problem || extracted.problem || '',
    solution: startup.solution || extracted.solution || '',
    demo_available: startup.demo_available || extracted.demo_available || false,
    launched: startup.launched || extracted.launched || false,
    unique_ip: startup.unique_ip || extracted.unique_ip || false,
    defensibility: startup.defensibility || extracted.defensibility || 'medium',
    
    // Additional fields
    fivePoints: extracted.fivePoints || startup.fivePoints || [],
    location: startup.location || extracted.location || '',
    website: startup.website || extracted.website || '',
    backed_by: startup.backed_by || startup.investors || extracted.investors || [],
    
    // First Round criteria
    contrarian_insight: startup.contrarian_insight || extracted.contrarian_insight,
    creative_strategy: startup.creative_strategy || extracted.creative_strategy,
    passionate_customers: startup.passionate_customers || extracted.passionate_customers || 0,
  };
}

/**
 * Normalize investor data to consistent format
 * Handles different field naming conventions (checkSize vs check_size, etc.)
 * Database columns: sector_focus, stage_focus (NOT sectors, stage)
 */
function normalizeInvestorData(investor: any) {
  // Map from database column names (sector_focus, stage_focus) to normalized names
  const sectors = investor.sector_focus || investor.sectors || [];
  const stages = investor.stage_focus || investor.stages || investor.stage || [];
  
  return {
    // Basic info
    id: investor.id,
    name: investor.name,
    description: investor.description || investor.tagline || investor.bio || '',
    tagline: investor.tagline || investor.type || '',
    
    // Investment criteria - use sector_focus and stage_focus from DB
    type: investor.type || 'vc_firm',
    sectors: Array.isArray(sectors) ? sectors : (sectors ? [sectors] : []),
    stages: Array.isArray(stages) ? stages : (stages ? [stages] : []),
    stage: Array.isArray(stages) ? stages : (stages ? [stages] : []),
    
    // Financial
    checkSize: investor.checkSize || investor.check_size || '',
    check_size: investor.check_size || investor.checkSize || '',
    
    // Geographic
    geography: investor.geography || investor.location || '',
    location: investor.location || investor.geography || '',
  };
}

function logGOD(message: string, data?: any) {
  if (DEBUG_GOD) {
    if (data !== undefined) {
      console.log(`🧮 GOD: ${message}`, data);
    } else {
      console.log(`🧮 GOD: ${message}`);
    }
  }
}

function logScore(label: string, score: number, reason?: string) {
  if (DEBUG_GOD) {
    const paddedLabel = label.padEnd(20);
    const paddedScore = score.toString().padStart(3);
    const reasonText = reason ? ` (${reason})` : '';
    console.log(`   📊 ${paddedLabel} ${paddedScore}${reasonText}`);
  }
}

interface MatchPair {
  startup: {
    id: number | string;
    name: string;
    description: string;
    tags: string[];
    seeking: string;
    status: string;
  };
  investor: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    checkSize: string;
    status: string;
  };
  matchScore: number;
  reasoning: string[];
}

/**
 * Calculate match score using the GOD algorithm
 */
export function calculateAdvancedMatchScore(startup: any, investor: any, verbose: boolean = false): number {
  try {
    // 🚀 CRITICAL FIX: Use pre-calculated total_god_score from database
    // The startup records already have GOD scores calculated (0-100 scale)
    // If available, use it directly instead of recalculating
    if (startup.total_god_score !== undefined && startup.total_god_score > 0) {
      const baseScore = startup.total_god_score;
      
      if (verbose) {
        console.log(`\n${'━'.repeat(60)}`);
        console.log(`🧮 Using Pre-Calculated GOD Score: "${startup.name}"`);
        console.log(`   Base Score: ${baseScore}/100 (from database)`);
        console.log('━'.repeat(60));
      }
      
      // Still apply matching bonuses with investor
      const normalizedInvestor = normalizeInvestorData(investor);
      let matchBonus = 0;
      
      // Stage match bonus
      if (normalizedInvestor.stage && startup.stage !== undefined) {
        const investorStages = Array.isArray(normalizedInvestor.stage) ? normalizedInvestor.stage : [normalizedInvestor.stage];
        const stageNum = typeof startup.stage === 'number' ? startup.stage : convertStageToNumber(startup.stage);
        let startupStageNames: string[] = [];
        
        if (stageNum === 0) startupStageNames = ['idea', 'pre-seed', 'preseed', '0'];
        else if (stageNum === 1) startupStageNames = ['pre-seed', 'preseed', 'pre seed', '1'];
        else if (stageNum === 2) startupStageNames = ['seed', '2'];
        else if (stageNum === 3) startupStageNames = ['series a', 'series_a', 'seriesa', 'a', '3'];
        else if (stageNum === 4) startupStageNames = ['series b', 'series_b', 'seriesb', 'b', '4'];
        else if (stageNum === 5) startupStageNames = ['series c', 'series_c', 'seriesc', 'c', '5'];
        
        const stageMatch = investorStages.some((s: string) => {
          const investorStage = String(s).toLowerCase().replace(/[_\s]/g, '');
          return startupStageNames.some(startupStage => {
            const normalizedStartupStage = startupStage.replace(/[_\s]/g, '');
            return investorStage.includes(normalizedStartupStage) || 
                   normalizedStartupStage.includes(investorStage);
          });
        });
        
        if (stageMatch) matchBonus += 10;
      }
      
      // Sector match bonus
      if (startup.industries && normalizedInvestor.sectors) {
        const startupIndustries = Array.isArray(startup.industries) ? startup.industries : [startup.industries];
        const investorSectors = Array.isArray(normalizedInvestor.sectors) ? normalizedInvestor.sectors : [normalizedInvestor.sectors];
        
        const commonSectors = startupIndustries.filter((ind: string) =>
          investorSectors.some((sec: string) => 
            String(sec).toLowerCase().includes(String(ind).toLowerCase()) ||
            String(ind).toLowerCase().includes(String(sec).toLowerCase())
          )
        );
        matchBonus += Math.min(commonSectors.length * 5, 10);
      }
      
      const finalScore = Math.min(baseScore + matchBonus, 99);
      
      if (verbose) {
        console.log(`   Match Bonus: +${matchBonus}`);
        console.log(`   Final Score: ${finalScore}/100`);
      }
      
      return Math.round(finalScore);
    }
    
    // FALLBACK: Calculate GOD score if not pre-calculated
    const normalizedStartup = normalizeStartupData(startup);
    const normalizedInvestor = normalizeInvestorData(investor);
    
    if (verbose) {
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`🧮 GOD Algorithm Scoring: "${normalizedStartup.name}"`);
      console.log('━'.repeat(60));
      
      // Log input data for debugging
      logGOD('Normalized Startup Data:', {
        stage: normalizedStartup.stage,
        sectors: normalizedStartup.sectors,
        raise: normalizedStartup.raise_amount,
        team: normalizedStartup.team ? `${normalizedStartup.team.length} members` : 'undefined',
        revenue: normalizedStartup.revenue || 'undefined',
        traction: normalizedStartup.traction ? normalizedStartup.traction.substring(0, 50) + '...' : 'undefined'
      });
    }
    
    // Convert normalized startup data to StartupProfile format for GOD algorithm
    const startupProfile = {
      // Team data - using normalized fields
      team: normalizedStartup.team,
      founders_count: normalizedStartup.founders_count,
      technical_cofounders: normalizedStartup.technical_cofounders,
      
      // Traction - using normalized fields
      revenue: normalizedStartup.revenue,
      mrr: normalizedStartup.mrr,
      active_users: normalizedStartup.active_users,
      growth_rate: normalizedStartup.growth_rate,
      customers: normalizedStartup.customers,
      
      // Product - using normalized fields
      demo_available: normalizedStartup.demo_available,
      launched: normalizedStartup.launched,
      unique_ip: normalizedStartup.unique_ip,
      defensibility: normalizedStartup.defensibility,
      
      // Market - using normalized fields
      market_size: normalizedStartup.market_size,
      industries: normalizedStartup.industries,
      problem: normalizedStartup.problem,
      solution: normalizedStartup.solution,
      
      // First Round criteria
      contrarian_insight: normalizedStartup.contrarian_insight,
      creative_strategy: normalizedStartup.creative_strategy,
      passionate_customers: normalizedStartup.passionate_customers,
      
      // Stage & Funding - using normalized fields
      stage: convertStageToNumber(normalizedStartup.stage),
      previous_funding: normalizedStartup.previous_funding,
      backed_by: normalizedStartup.backed_by,
      funding_needed: normalizedStartup.funding_needed,
    };

    // Get GOD score
    const godScore = calculateHotScore(startupProfile);
    
    if (verbose) {
      console.log('\n📊 Component Scores:');
      
      // Calculate percentage scores for display
      const teamPct = (godScore.breakdown.team / 3 * 100).toFixed(0);
      const tractionPct = (godScore.breakdown.traction / 3 * 100).toFixed(0);
      const marketPct = (godScore.breakdown.market / 2 * 100).toFixed(0);
      const productPct = (godScore.breakdown.product / 2 * 100).toFixed(0);
      const visionPct = (godScore.breakdown.vision / 2 * 100).toFixed(0);
      const ecosystemPct = (godScore.breakdown.ecosystem / 1.5 * 100).toFixed(0);
      const gritPct = (godScore.breakdown.grit / 1.5 * 100).toFixed(0);
      const problemPct = (godScore.breakdown.problem_validation / 2 * 100).toFixed(0);
      
      // Generate reasons for each score
      const teamReason = getTeamReason(startupProfile, godScore.breakdown.team);
      const tractionReason = getTractionReason(startupProfile, godScore.breakdown.traction);
      const marketReason = getMarketReason(startupProfile, godScore.breakdown.market);
      const productReason = getProductReason(startupProfile, godScore.breakdown.product);
      
      logScore('Team', Number(teamPct), teamReason);
      logScore('Traction', Number(tractionPct), tractionReason);
      logScore('Market', Number(marketPct), marketReason);
      logScore('Product', Number(productPct), productReason);
      logScore('Vision', Number(visionPct), `${godScore.breakdown.vision.toFixed(1)}/2`);
      logScore('Ecosystem', Number(ecosystemPct), `${godScore.breakdown.ecosystem.toFixed(1)}/1.5`);
      logScore('Grit', Number(gritPct), `${godScore.breakdown.grit.toFixed(1)}/1.5`);
      logScore('Problem Validation', Number(problemPct), `${godScore.breakdown.problem_validation.toFixed(1)}/2`);
      
      console.log(`\n   GOD Base Score:     ${godScore.total.toFixed(1)}/10 (${(godScore.total * 10).toFixed(0)}/100)`);
      
      // Show reasoning from GOD algorithm
      if (godScore.reasoning && godScore.reasoning.length > 0) {
        console.log(`\n💡 GOD Algorithm Insights:`);
        godScore.reasoning.slice(0, 3).forEach((reason: string) => {
          console.log(`   • ${reason}`);
        });
      }
    }
    
    // Base score from GOD algorithm (0-10 scale, convert to 0-100)
    let baseScore = godScore.total * 10;
    
    // Additional matching criteria with investor
    let matchBonus = 0;
    
    if (verbose) {
      console.log(`\n🎯 Matching Bonuses for "${normalizedInvestor.name}":`);
      
      // Log investor criteria for debugging
      logGOD('Normalized Investor Data:', {
        type: normalizedInvestor.type,
        stages: normalizedInvestor.stage,
        sectors: normalizedInvestor.sectors,
        checkSize: normalizedInvestor.checkSize,
        geography: normalizedInvestor.geography
      });
      console.log(''); // Empty line for spacing
    }
    
    // Stage match (0-10 bonus points) - using normalized data
    if (normalizedInvestor.stage && normalizedStartup.stage !== undefined) {
      const investorStages = Array.isArray(normalizedInvestor.stage) ? normalizedInvestor.stage : [normalizedInvestor.stage];
      
      // Convert numeric stage to name for better matching
      let startupStageStr = String(normalizedStartup.stage).toLowerCase();
      let startupStageNames: string[] = [startupStageStr];
      
      // If stage is a number, add corresponding stage names
      const stageNum = typeof normalizedStartup.stage === 'number' ? normalizedStartup.stage : convertStageToNumber(normalizedStartup.stage);
      if (stageNum === 0) startupStageNames = ['idea', 'pre-seed', 'preseed', '0'];
      else if (stageNum === 1) startupStageNames = ['pre-seed', 'preseed', 'pre seed', '1'];
      else if (stageNum === 2) startupStageNames = ['seed', '2'];
      else if (stageNum === 3) startupStageNames = ['series a', 'series_a', 'seriesa', 'a', '3'];
      else if (stageNum === 4) startupStageNames = ['series b', 'series_b', 'seriesb', 'b', '4'];
      else if (stageNum === 5) startupStageNames = ['series c', 'series_c', 'seriesc', 'c', '5'];
      
      const stageMatch = investorStages.some((s: string) => {
        const investorStage = String(s).toLowerCase().replace(/[_\s]/g, '');
        return startupStageNames.some(startupStage => {
          const normalizedStartupStage = startupStage.replace(/[_\s]/g, '');
          return investorStage.includes(normalizedStartupStage) || 
                 normalizedStartupStage.includes(investorStage) ||
                 investorStage === normalizedStartupStage;
        });
      });
      
      if (stageMatch) {
        matchBonus += 10;
        if (verbose) {
          const stageNames = startupStageNames.join(', ');
          console.log(`   Stage Match:        +10 (${stageNames} ↔ ${investorStages.join(', ')})`);
        }
      } else if (verbose) {
        console.log(`   Stage Match:        +0 (no match)`);
      }
    }
    
    // Sector/Industry match (0-10 bonus points) - using normalized data
    if (normalizedStartup.industries && normalizedInvestor.sectors) {
      const startupIndustries = Array.isArray(normalizedStartup.industries) ? normalizedStartup.industries : [normalizedStartup.industries];
      const investorSectors = Array.isArray(normalizedInvestor.sectors) ? normalizedInvestor.sectors : [normalizedInvestor.sectors];
      
      const commonSectors = startupIndustries.filter((ind: string) =>
        investorSectors.some((sec: string) => 
          String(sec).toLowerCase().includes(String(ind).toLowerCase()) ||
          String(ind).toLowerCase().includes(String(sec).toLowerCase())
        )
      );
      matchBonus += Math.min(commonSectors.length * 5, 10);
      
      if (verbose && commonSectors.length > 0) {
        console.log(`   Sector Match:       +${Math.min(commonSectors.length * 5, 10)} (${commonSectors.join(', ')})`);
      } else if (verbose) {
        console.log(`   Sector Match:       +0 (no match)`);
      }
    }
    
    // Check size fit (0-5 bonus points) - using normalized data
    if (normalizedInvestor.checkSize && normalizedStartup.raise_amount) {
      const raiseAmount = parseFloat(String(normalizedStartup.raise_amount).replace(/[^0-9.]/g, ''));
      const checkSizeRange = normalizedInvestor.checkSize;
      
      if (checkSizeRange) {
        // Simple check if raise amount is mentioned in check size string
        const checkSizeLower = String(checkSizeRange).toLowerCase();
        if (
          (raiseAmount >= 0.5 && raiseAmount <= 2 && checkSizeLower.includes('seed')) ||
          (raiseAmount >= 2 && raiseAmount <= 10 && checkSizeLower.includes('series')) ||
          checkSizeLower.includes(String(raiseAmount))
        ) {
          matchBonus += 5;
          if (verbose) {
            console.log(`   Check Size Fit:     +5 ($${raiseAmount}M in range)`);
          }
        } else if (verbose) {
          console.log(`   Check Size Fit:     +0 (outside range)`);
        }
      }
    }
    
    // Geography match (0-5 bonus points) - using normalized data
    if (normalizedInvestor.geography && normalizedStartup.location) {
      const investorGeo = Array.isArray(normalizedInvestor.geography) ? normalizedInvestor.geography : [normalizedInvestor.geography];
      const locationMatch = investorGeo.some((geo: string) =>
        String(normalizedStartup.location).toLowerCase().includes(String(geo).toLowerCase()) ||
        String(geo).toLowerCase().includes(String(normalizedStartup.location).toLowerCase())
      );
      if (locationMatch) {
        matchBonus += 5;
        if (verbose) {
          console.log(`   Geography Match:    +5 (${normalizedStartup.location} matches)`);
        }
      } else if (verbose) {
        console.log(`   Geography Match:    +0 (no match)`);
      }
    }
    
    // Calculate final score (cap at 99)
    const finalScore = Math.min(baseScore + matchBonus, 99);
    
    if (verbose) {
      console.log(`\n📈 Final Score: ${finalScore.toFixed(1)}/100`);
      console.log('━'.repeat(60));
      console.log(`Base Score (GOD):   ${baseScore.toFixed(0)}/100`);
      console.log(`Match Bonuses:      +${matchBonus}`);
      console.log(`Total:              ${finalScore.toFixed(1)}/100`);
      
      if (godScore.reasoning && godScore.reasoning.length > 0) {
        console.log(`\n💡 Reasoning:`);
        godScore.reasoning.forEach((reason: string) => {
          console.log(`   • ${reason}`);
        });
      }
      console.log('━'.repeat(60) + '\n');
    }
    
    return Math.round(finalScore);
  } catch (error) {
    console.error('Error calculating match score:', error);
    // Return a low default score on error - not 85 which would be misleading
    // This makes it obvious something went wrong while not breaking the UI
    return 30;
  }
}

/**
 * Convert stage string to number for GOD algorithm
 */
function convertStageToNumber(stage: string | number | undefined): number {
  if (!stage) return 0;
  
  // If already a number, return it
  if (typeof stage === 'number') return stage;
  
  // Convert to string and lowercase
  const stageLower = String(stage).toLowerCase();
  
  if (stageLower.includes('idea')) return 0;
  if (stageLower.includes('pre-seed') || stageLower.includes('preseed')) return 1;
  if (stageLower.includes('seed') && !stageLower.includes('pre')) return 2;
  if (stageLower.includes('series a') || stageLower.includes('series_a') || stageLower.includes('a')) return 3;
  if (stageLower.includes('series b') || stageLower.includes('series_b') || stageLower.includes('b')) return 4;
  if (stageLower.includes('series c') || stageLower.includes('series_c') || stageLower.includes('c')) return 5;
  
  return 2; // Default to seed
}

/**
 * Generate matches with GOD algorithm integration
 * UPDATED: Now uses pre-calculated scores from database (Option A architecture)
 */
export function generateAdvancedMatches(startups: any[], investors: any[], limit: number = 100): MatchPair[] {
  const matchPairs: MatchPair[] = [];
  
  try {
    // SIMPLIFIED: Use pre-calculated GOD scores from database instead of calculating on-the-fly
    const scoredStartups = startups.map(startup => {
      // NORMALIZE DATA FIRST - prevents field mapping bugs
      const normalized = normalizeStartupData(startup);
      
      // Read pre-calculated GOD score from database (default to 50 if not set)
      const totalScore = startup.total_god_score || 50;
      
      // Build godScore object for backward compatibility
      const godScore = {
        total: totalScore,
        matchCount: Math.min(Math.floor(totalScore / 10), 10), // 50→5, 80→8, 90→9 matches
        reasoning: [`Pre-calculated GOD score: ${totalScore}`],
        breakdown: {
          team: startup.team_score || 0,
          traction: startup.traction_score || 0,
          market: startup.market_score || 0,
          product: startup.product_score || 0,
          vision: startup.vision_score || 0,
          ecosystem: 0,
          grit: 0,
          problem_validation: 0
        },
        tier: (totalScore >= 80 ? 'hot' : totalScore >= 60 ? 'warm' : 'cold') as 'hot' | 'warm' | 'cold'
      };
      
      return { startup, normalized, godScore };
    }).sort((a, b) => b.godScore.total - a.godScore.total); // Sort by GOD score
    
    // Generate matches for top-scored startups
    for (let i = 0; i < Math.min(limit, scoredStartups.length); i++) {
      const { startup, normalized, godScore } = scoredStartups[i];
      
      // Match with appropriate number of investors based on GOD score
      const investorCount = Math.min(godScore.matchCount || 5, investors.length);
      
      // Find best investor match
      let bestInvestor = investors[i % investors.length];
      let bestScore = 0;
      
      // Try to find best fitting investor
      for (let j = 0; j < Math.min(5, investors.length); j++) {
        const investor = investors[(i + j) % investors.length];
        const score = calculateAdvancedMatchScore(startup, investor, i < 3);
        if (score > bestScore) {
          bestScore = score;
          bestInvestor = investor;
        }
      }
      
      const matchScore = calculateAdvancedMatchScore(startup, bestInvestor, i < 5);
      const normalizedInvestor = normalizeInvestorData(bestInvestor);
      
      matchPairs.push({
        startup: {
          id: normalized.id,
          name: normalized.name,
          description: normalized.tagline || normalized.description || '',
          tags: extractTags(normalized),
          seeking: normalized.raise_amount || normalized.funding_needed || '$2M Seeking',
          status: 'Active'
        },
        investor: {
          id: normalizedInvestor.id,
          name: normalizedInvestor.name,
          description: normalizedInvestor.tagline || normalizedInvestor.description || '',
          tags: normalizedInvestor.sectors.slice(0, 3),
          checkSize: normalizedInvestor.checkSize || '$1-5M',
          status: 'Active'
        },
        matchScore,
        reasoning: godScore.reasoning
      });
    }
  } catch (error) {
    console.error('Error generating matches:', error);
  }
  
  return matchPairs;
}

/**
 * Extract relevant tags from startup (works with normalized data)
 */
function extractTags(startup: any): string[] {
  const tags = [];
  
  // Check both direct and normalized fields
  const industries = startup.industries || startup.sectors || [];
  if (industries && industries.length > 0) {
    tags.push(...industries.slice(0, 2));
  }
  
  if (startup.stage !== undefined && startup.stage !== null) {
    const stageNum = typeof startup.stage === 'number' ? startup.stage : convertStageToNumber(startup.stage);
    const stageNames = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
    tags.push(stageNames[stageNum] || 'Seed');
  }
  
  if (startup.launched) {
    tags.push('Launched');
  }
  
  return tags.slice(0, 3);
}

// ============================================
// HYBRID MATCHING (GOD + SEMANTIC)
// ============================================

/**
 * Get matches using hybrid approach:
 * - If startup has embedding: 60% GOD score + 40% semantic similarity
 * - If no embedding: 100% GOD score (fallback)
 */
export async function getHybridMatches(
  startupId: string,
  investors: any[],
  limit: number = 10
): Promise<Array<{
  investor: any;
  matchScore: number;
  semanticScore: number;
  godScore: number;
  matchType: 'hybrid' | 'god-only';
}>> {
  // Check if startup has embedding for semantic matching
  const canUseSemanticMatching = await hasEmbedding(startupId);
  
  if (canUseSemanticMatching) {
    console.log('🧠 Using HYBRID matching (GOD + Semantic)');
    
    // Get semantic matches
    const semanticMatches = await findSemanticInvestorMatches(startupId, limit * 2);
    
    if (semanticMatches.length > 0) {
      // Create investor lookup map
      const investorMap = new Map(investors.map(i => [i.id, i]));
      
      // Combine semantic matches with full investor data
      const hybridMatches = semanticMatches
        .map(sm => {
          const investor = investorMap.get(sm.investorId);
          if (!investor) return null;
          
          return {
            investor,
            matchScore: Math.round(sm.combinedScore),
            semanticScore: Math.round(sm.similarityScore * 100),
            godScore: Math.round(sm.combinedScore / 0.6 - sm.similarityScore * 100 * 0.4 / 0.6),
            matchType: 'hybrid' as const
          };
        })
        .filter(m => m !== null)
        .slice(0, limit);
      
      if (hybridMatches.length > 0) {
        return hybridMatches as any;
      }
    }
  }
  
  console.log('🎯 Using GOD-only matching (no embedding available)');
  
  // Fallback to GOD-only scoring
  return investors.slice(0, limit).map(investor => ({
    investor,
    matchScore: 50, // Will be calculated by existing GOD algorithm
    semanticScore: 0,
    godScore: 50,
    matchType: 'god-only' as const
  }));
}

/**
 * Enhanced match score that combines GOD algorithm with semantic similarity
 */
export function calculateHybridMatchScore(
  godScore: number,
  semanticSimilarity: number,
  godWeight: number = 0.6
): number {
  const semanticWeight = 1 - godWeight;
  const combinedScore = (godScore * godWeight) + (semanticSimilarity * 100 * semanticWeight);
  return Math.round(Math.min(Math.max(combinedScore, 0), 99));
}

// ============================================
// VC GOD ALGORITHM INTEGRATION
// ============================================

/**
 * Calculate a combined match quality score that factors in:
 * 1. Startup quality (GOD score)
 * 2. Investor quality (VC GOD score)
 * 3. Startup-Investor fit
 * 
 * This creates a truly bidirectional matching system where
 * high-quality startups are matched with high-quality VCs.
 */
export function calculateBidirectionalMatchScore(
  startup: any,
  investor: any,
  verbose: boolean = false
): {
  totalScore: number;
  startupScore: number;
  investorScore: number;
  fitScore: number;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  reasoning: string[];
} {
  const reasoning: string[] = [];
  
  // 1. STARTUP QUALITY (0-100, from GOD algorithm)
  const startupScore = startup.total_god_score || 50;
  reasoning.push(`Startup GOD Score: ${startupScore}/100`);
  
  // 2. INVESTOR QUALITY (0-10, from VC GOD algorithm)
  const investorScoreRaw = investor.investor_score || 2; // Default low if not scored
  const investorScore = investorScoreRaw * 10; // Convert to 0-100 scale
  const investorTier = investor.investor_tier || 'emerging';
  reasoning.push(`Investor Score: ${investorScoreRaw}/10 (${investorTier})`);
  
  // 3. FIT SCORE (calculated from match criteria)
  const baseFitScore = calculateAdvancedMatchScore(startup, investor, false);
  const fitScore = baseFitScore;
  reasoning.push(`Fit Score: ${fitScore}/100`);
  
  // 4. COMBINED SCORE CALCULATION
  // Weights: 40% startup quality + 20% investor quality + 40% fit
  // This ensures high-quality startups get priority but fit is still crucial
  const weights = {
    startup: 0.4,
    investor: 0.2,
    fit: 0.4
  };
  
  const rawTotal = 
    (startupScore * weights.startup) +
    (investorScore * weights.investor) +
    (fitScore * weights.fit);
  
  const totalScore = Math.round(Math.min(rawTotal, 99));
  
  // Determine tier based on combined quality
  let tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  if (startupScore >= 80 && investorScore >= 60 && fitScore >= 70) {
    tier = 'platinum'; // Top startup + Top VC + Great fit
    reasoning.push('🏆 Platinum match: Top startup meets elite VC with strong fit');
  } else if (startupScore >= 60 && investorScore >= 40 && fitScore >= 60) {
    tier = 'gold';
    reasoning.push('🥇 Gold match: Quality startup meets solid VC');
  } else if (fitScore >= 70) {
    tier = 'silver';
    reasoning.push('🥈 Silver match: Good fit despite lower quality scores');
  } else {
    tier = 'bronze';
    reasoning.push('🥉 Bronze match: Potential but needs validation');
  }
  
  if (verbose) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎯 BIDIRECTIONAL MATCH: ${startup.name} ↔ ${investor.name || investor.firm}`);
    console.log('═'.repeat(60));
    console.log(`   Startup Quality:  ${startupScore}/100 (GOD algorithm)`);
    console.log(`   Investor Quality: ${investorScoreRaw}/10 (${investorTier})`);
    console.log(`   Fit Score:        ${fitScore}/100`);
    console.log(`   ─────────────────────────────`);
    console.log(`   TOTAL SCORE:      ${totalScore}/100 [${tier.toUpperCase()}]`);
    reasoning.forEach(r => console.log(`   • ${r}`));
    console.log('═'.repeat(60) + '\n');
  }
  
  return {
    totalScore,
    startupScore,
    investorScore,
    fitScore,
    tier,
    reasoning
  };
}

/**
 * Generate matches sorted by bidirectional quality
 * High-quality startups get matched with high-quality investors first
 */
export function generateBidirectionalMatches(
  startups: any[],
  investors: any[],
  limit: number = 100
): Array<{
  startup: any;
  investor: any;
  score: ReturnType<typeof calculateBidirectionalMatchScore>;
}> {
  const allMatches: Array<{
    startup: any;
    investor: any;
    score: ReturnType<typeof calculateBidirectionalMatchScore>;
  }> = [];
  
  // Score all possible startup-investor pairs
  for (const startup of startups) {
    for (const investor of investors) {
      const score = calculateBidirectionalMatchScore(startup, investor, false);
      allMatches.push({ startup, investor, score });
    }
  }
  
  // Sort by total score (best matches first)
  allMatches.sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  // Return top matches (avoiding duplicate startups if desired)
  const seen = new Set<string>();
  const uniqueMatches = allMatches.filter(m => {
    const key = `${m.startup.id}-${m.investor.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return uniqueMatches.slice(0, limit);
}
