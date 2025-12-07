/**
 * INTEGRATED MATCHING SERVICE
 * Combines GOD algorithm (startup scoring) with AI-powered investor matching
 */

import { calculateHotScore } from '../../server/services/startupScoringService';
import { getTeamReason, getTractionReason, getMarketReason, getProductReason } from './matchingHelpers';

// Debug logging controls
const DEBUG_GOD = true; // Set to false in production

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
    if (verbose) {
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`🧮 GOD Algorithm Scoring: "${startup.name}"`);
      console.log('━'.repeat(60));
      
      // Log input data for debugging
      logGOD('Startup Input Data:', {
        stage: startup.stage,
        sectors: startup.industries || startup.sectors,
        raise: startup.raise_amount || startup.funding_needed,
        team: startup.team ? `${startup.team.length} members` : 'undefined',
        revenue: startup.revenue || startup.arr || 'undefined',
        traction: startup.traction ? startup.traction.substring(0, 50) + '...' : 'undefined'
      });
    }
    
    // Convert startup data to StartupProfile format for GOD algorithm
    const startupProfile = {
      // Team data
      team: startup.team || [],
      founders_count: startup.founders_count || startup.team?.length || 1,
      technical_cofounders: startup.technical_cofounders || 0,
      
      // Traction
      revenue: startup.revenue || startup.arr || 0,
      mrr: startup.mrr || (startup.arr ? startup.arr / 12 : 0),
      active_users: startup.users || startup.active_users || 0,
      growth_rate: startup.growth_rate || startup.mom_growth || 0,
      customers: startup.customers || 0,
      
      // Product
      demo_available: startup.demo_available || startup.launched || false,
      launched: startup.launched || startup.stage !== 'idea',
      unique_ip: startup.unique_ip || false,
      defensibility: startup.defensibility || 'medium',
      
      // Market
      market_size: startup.market_size || 0,
      industries: startup.industries || startup.sectors || [],
      problem: startup.problem || startup.description,
      solution: startup.solution || startup.tagline,
      
      // First Round criteria
      contrarian_insight: startup.contrarian_insight,
      creative_strategy: startup.creative_strategy,
      passionate_customers: startup.passionate_customers || 0,
      
      // Stage & Funding
      stage: convertStageToNumber(startup.stage),
      previous_funding: startup.previous_funding || startup.raised || 0,
      backed_by: startup.backed_by || startup.investors || [],
      funding_needed: startup.funding_needed || startup.raise || 0,
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
      console.log(`\n🎯 Matching Bonuses for "${investor.name}":`);
      
      // Log investor criteria for debugging
      logGOD('Investor Criteria:', {
        type: investor.type,
        stages: investor.stage,
        sectors: investor.sectors,
        checkSize: investor.check_size,
        geography: investor.geography
      });
      console.log(''); // Empty line for spacing
    }
    
    // Stage match (0-10 bonus points)
    if (investor.stage && startup.stage !== undefined) {
      const investorStages = Array.isArray(investor.stage) ? investor.stage : [investor.stage];
      
      // Convert numeric stage to name for better matching
      let startupStageStr = String(startup.stage).toLowerCase();
      let startupStageNames: string[] = [startupStageStr];
      
      // If stage is a number, add corresponding stage names
      const stageNum = typeof startup.stage === 'number' ? startup.stage : convertStageToNumber(startup.stage);
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
    
    // Sector/Industry match (0-10 bonus points)
    if (startup.industries && investor.sectors) {
      const startupIndustries = Array.isArray(startup.industries) ? startup.industries : [startup.industries];
      const investorSectors = Array.isArray(investor.sectors) ? investor.sectors : [investor.sectors];
      
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
    
    // Check size fit (0-5 bonus points)
    if (investor.check_size && startup.raise) {
      const raiseAmount = parseFloat(String(startup.raise).replace(/[^0-9.]/g, ''));
      const checkSizeRange = investor.check_size || investor.checkSize;
      
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
    
    // Geography match (0-5 bonus points)
    if (investor.geography && startup.location) {
      const investorGeo = Array.isArray(investor.geography) ? investor.geography : [investor.geography];
      const locationMatch = investorGeo.some((geo: string) =>
        String(startup.location).toLowerCase().includes(String(geo).toLowerCase()) ||
        String(geo).toLowerCase().includes(String(startup.location).toLowerCase())
      );
      if (locationMatch) {
        matchBonus += 5;
        if (verbose) {
          console.log(`   Geography Match:    +5 (${startup.location} matches)`);
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
    // Return a default score if there's an error
    return 85;
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
 */
export function generateAdvancedMatches(startups: any[], investors: any[], limit: number = 100): MatchPair[] {
  const matchPairs: MatchPair[] = [];
  
  try {
    // Calculate GOD scores for all startups first
    const scoredStartups = startups.map(startup => {
      try {
        const profile = {
          team: startup.team || [],
          founders_count: startup.founders_count || 1,
          revenue: startup.revenue || 0,
          growth_rate: startup.growth_rate || 0,
          industries: startup.industries || [],
          stage: convertStageToNumber(startup.stage),
          launched: startup.launched || false,
        };
        
        const godScore = calculateHotScore(profile);
        return { startup, godScore };
      } catch (error) {
        console.error(`Error scoring startup ${startup.name}:`, error);
        // Return default score if error
        return { 
          startup, 
          godScore: { 
            total: 5, 
            matchCount: 5,
            reasoning: ['Default score due to error'],
            breakdown: { team: 0, traction: 0, market: 0, product: 0, vision: 0, ecosystem: 0, grit: 0, problem_validation: 0 },
            tier: 'warm' as const
          } 
        };
      }
    }).sort((a, b) => b.godScore.total - a.godScore.total); // Sort by GOD score
    
    // Generate matches for top-scored startups
    for (let i = 0; i < Math.min(limit, scoredStartups.length); i++) {
      const { startup, godScore } = scoredStartups[i];
      
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
      
      matchPairs.push({
        startup: {
          id: startup.id,
          name: startup.name,
          description: startup.tagline || startup.description || '',
          tags: extractTags(startup),
          seeking: startup.raise || startup.funding_needed || '$2M Seeking',
          status: 'Active'
        },
        investor: {
          id: bestInvestor.id,
          name: bestInvestor.name,
          description: bestInvestor.tagline || bestInvestor.type || bestInvestor.bio || '',
          tags: bestInvestor.sectors?.slice(0, 3) || bestInvestor.stage?.slice(0, 3) || [],
          checkSize: bestInvestor.check_size || bestInvestor.checkSize || '$1-5M',
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
 * Extract relevant tags from startup
 */
function extractTags(startup: any): string[] {
  const tags = [];
  
  if (startup.industries && startup.industries.length > 0) {
    tags.push(...startup.industries.slice(0, 2));
  }
  
  if (startup.stage) {
    tags.push(startup.stage);
  }
  
  if (startup.launched) {
    tags.push('Launched');
  }
  
  return tags.slice(0, 3);
}
