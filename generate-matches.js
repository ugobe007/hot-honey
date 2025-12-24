#!/usr/bin/env node

/**
 * Generate Startup-Investor Matches
 * 
 * Creates matches between startups and investors based on:
 * - Industry/sector alignment
 * - Funding stage fit
 * - Investment thesis match
 * - Geographic preferences
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

  // Enhanced matching algorithm using GOD scores
function calculateMatch(startup, investor) {
  let score = 0;
  let reasons = [];
  
  // Base score from GOD score (55 points max) - INCREASED from 40%
  const godScore = startup.total_god_score || 50;
  score += Math.floor(godScore * 0.55);
  reasons.push(`GOD score: ${godScore}`);
  
  // BONUS for high GOD scores - ensures quality startups get better matches
  if (godScore >= 80) {
    score += 15;
    reasons.push('Elite startup bonus (+15)');
  } else if (godScore >= 75) {
    score += 10;
    reasons.push('High-quality startup bonus (+10)');
  } else if (godScore >= 70) {
    score += 5;
    reasons.push('Quality startup bonus (+5)');
  }
  
  // Stage fit (15 points) - REDUCED from 20 to make room for GOD score
  const startupStage = startup.stage || 2; // Default to seed (stage 2)
  // Handle both array and string formats for investor stages
  let investorStages = '';
  if (Array.isArray(investor.stage)) {
    investorStages = investor.stage.map(s => s.toString().toLowerCase()).join(' ');
  } else {
    investorStages = (investor.stage || '').toString().toLowerCase();
  }
  
  if (startupStage === 1 && investorStages.includes('pre')) {
    score += 15;
    reasons.push('Stage fit: Pre-seed');
  } else if (startupStage === 2 && investorStages.includes('seed')) {
    score += 15;
    reasons.push('Stage fit: Seed');
  } else if (startupStage >= 3 && investorStages.includes('series')) {
    score += 15;
    reasons.push('Stage fit: Series');
  } else if (investorStages.includes('early')) {
    score += 10;
    reasons.push('Stage fit: Early stage');
  } else if (investorStages.includes('any') || investorStages.includes('all')) {
    score += 8; // Partial credit for flexible investors
    reasons.push('Stage fit: Flexible investor');
  }
  
  // Sector fit (20 points) - IMPROVED matching logic
  const startupSectors = Array.isArray(startup.sectors) 
    ? startup.sectors.map(s => s.toLowerCase().trim())
    : (startup.sectors || '').toString().split(',').map(s => s.trim().toLowerCase());
  
  const investorSectors = Array.isArray(investor.sectors)
    ? investor.sectors.map(s => s.toLowerCase().trim())
    : (investor.sectors || investor.investment_thesis || '').toString().toLowerCase();
  
  let sectorMatches = 0;
  if (Array.isArray(startupSectors) && startupSectors.length > 0) {
    startupSectors.forEach(sector => {
      // More flexible matching - check if sector is mentioned anywhere
      if (Array.isArray(investorSectors)) {
        if (investorSectors.some(invS => invS.toLowerCase().includes(sector) || sector.includes(invS.toLowerCase()))) {
          sectorMatches++;
          reasons.push(`Sector match: ${sector}`);
        }
      } else if (investorSectors.includes(sector) || investorSectors.includes(sector.replace(/\s+/g, ''))) {
        sectorMatches++;
        reasons.push(`Sector match: ${sector}`);
      }
    });
  } else {
    // Fallback to keyword matching with more keywords
    const commonKeywords = ['ai', 'ml', 'machine learning', 'fintech', 'saas', 'healthcare', 'health', 'climate', 'crypto', 'blockchain', 'b2b', 'enterprise', 'edtech', 'proptech', 'biotech', 'medtech', 'cybersecurity', 'security', 'devtools', 'developer tools'];
    
    // Build startup text from description and sectors (handle both array and string)
    let startupSectorsText = '';
    if (Array.isArray(startup.sectors)) {
      startupSectorsText = startup.sectors.join(' ').toLowerCase();
    } else if (startup.sectors) {
      startupSectorsText = startup.sectors.toString().toLowerCase();
    }
    const startupText = ((startup.description || '').toLowerCase() + ' ' + startupSectorsText).trim();
    
    commonKeywords.forEach(keyword => {
      if (startupText.includes(keyword) && investorSectors.includes(keyword)) {
        sectorMatches++;
        reasons.push(`Sector match: ${keyword}`);
      }
    });
  }
  
  score += Math.min(sectorMatches * 7, 20); // 7 points per match, max 20
  
  // Geography fit (5 points) - REDUCED from 10
  if (startup.location) {
    const startupLoc = startup.location.toLowerCase();
    // Check geography_focus array or string
    let investorGeos = [];
    if (Array.isArray(investor.geography_focus)) {
      investorGeos = investor.geography_focus.map(g => g.toString().toLowerCase());
    } else if (investor.geography_focus) {
      investorGeos = [investor.geography_focus.toString().toLowerCase()];
    }
    
    // Check if startup location matches any investor geography preference
    const hasMatch = investorGeos.some(geo => 
      startupLoc.includes(geo) || geo.includes(startupLoc) ||
      startupLoc.includes(geo.replace(/\s+/g, '')) || geo.includes(startupLoc.replace(/\s+/g, ''))
    );
    
    if (hasMatch) {
      score += 5;
      reasons.push('Geography match');
    }
  }
  
  // Investor quality bonus (5 points) - NEW
  const investorScore = investor.investor_score || investor.quality_score || 5;
  if (investorScore >= 8) {
    score += 5;
    reasons.push('Elite investor bonus');
  } else if (investorScore >= 6) {
    score += 3;
    reasons.push('Quality investor bonus');
  }
  
  // Check Size Fit (5-10 points) - NEW
  const startupRaiseAmount = startup.raise_amount || startup.extracted_data?.raise_amount;
  const investorCheckMin = investor.check_size_min;
  const investorCheckMax = investor.check_size_max;
  
  if (startupRaiseAmount && investorCheckMin && investorCheckMax) {
    // Parse raise amount (could be "$5M", "5000000", etc.)
    let raiseValue = 0;
    if (typeof startupRaiseAmount === 'string') {
      const match = startupRaiseAmount.match(/(\d+\.?\d*)/);
      if (match) {
        raiseValue = parseFloat(match[1]);
        if (startupRaiseAmount.toLowerCase().includes('m') || startupRaiseAmount.toLowerCase().includes('million')) {
          raiseValue *= 1000000;
        } else if (startupRaiseAmount.toLowerCase().includes('k') || startupRaiseAmount.toLowerCase().includes('thousand')) {
          raiseValue *= 1000;
        } else if (startupRaiseAmount.toLowerCase().includes('b') || startupRaiseAmount.toLowerCase().includes('billion')) {
          raiseValue *= 1000000000;
        }
      }
    } else if (typeof startupRaiseAmount === 'number') {
      raiseValue = startupRaiseAmount;
    }
    
    if (raiseValue > 0) {
      // Check if raise amount fits within investor's check size range
      if (raiseValue >= investorCheckMin && raiseValue <= investorCheckMax) {
        // Perfect fit - in the middle of range gets bonus
        const rangeMid = (investorCheckMin + investorCheckMax) / 2;
        const distanceFromMid = Math.abs(raiseValue - rangeMid);
        const rangeSize = investorCheckMax - investorCheckMin;
        const fitRatio = 1 - (distanceFromMid / rangeSize);
        
        if (fitRatio > 0.7) {
          score += 10;
          reasons.push('Perfect check size fit (+10)');
        } else if (fitRatio > 0.4) {
          score += 7;
          reasons.push('Good check size fit (+7)');
        } else {
          score += 5;
          reasons.push('Check size fit (+5)');
        }
      } else if (raiseValue < investorCheckMin) {
        // Too small - might still work if close
        const ratio = raiseValue / investorCheckMin;
        if (ratio > 0.7) {
          score += 3;
          reasons.push('Check size close fit (+3)');
        }
      } else if (raiseValue > investorCheckMax) {
        // Too large - might still work if close
        const ratio = investorCheckMax / raiseValue;
        if (ratio > 0.7) {
          score += 3;
          reasons.push('Check size close fit (+3)');
        }
      }
    }
  } else {
    // Fallback: Use stage to estimate check size
    const stage = startup.stage || 2;
    const estimatedRaise = stage === 1 ? 500000 : stage === 2 ? 2000000 : stage === 3 ? 5000000 : 10000000;
    
    if (investorCheckMin && investorCheckMax) {
      if (estimatedRaise >= investorCheckMin && estimatedRaise <= investorCheckMax) {
        score += 5;
        reasons.push('Estimated check size fit (+5)');
      }
    }
  }
  
  // Investment Activity/Recency (3-5 points) - NEW
  if (investor.last_investment_date) {
    const lastInvestment = new Date(investor.last_investment_date);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    if (lastInvestment > sixMonthsAgo) {
      score += 3;
      reasons.push('Recent investment activity (+3)');
    }
  }
  
  // Investment pace bonus
  const investmentPace = investor.investment_pace_per_year || 0;
  if (investmentPace >= 10) {
    score += 2;
    reasons.push('High investment pace (+2)');
  } else if (investmentPace >= 5) {
    score += 1;
    reasons.push('Active investor (+1)');
  }
  
  // Lead investor bonus
  if (investor.leads_rounds === true) {
    score += 2;
    reasons.push('Lead investor (+2)');
  }
  
  // Portfolio Fit Analysis (5-10 points) - NEW Phase 2
  if (investor.portfolio_companies && Array.isArray(investor.portfolio_companies) && investor.portfolio_companies.length > 0) {
    const portfolio = investor.portfolio_companies.map(c => c.toString().toLowerCase());
    const startupName = (startup.name || '').toLowerCase();
    const startupDesc = (startup.description || '').toLowerCase();
    const startupSectorsText = Array.isArray(startup.sectors) 
      ? startup.sectors.join(' ').toLowerCase()
      : (startup.sectors || '').toString().toLowerCase();
    
    // Check for similar companies (same sector/stage)
    let similarCount = 0;
    portfolio.forEach(company => {
      // Check if portfolio company is in similar sector
      if (startupSectorsText && company) {
        const commonSectors = ['ai', 'fintech', 'saas', 'healthcare', 'ecommerce', 'marketplace', 'b2b', 'enterprise'];
        commonSectors.forEach(sector => {
          if (company.includes(sector) && startupSectorsText.includes(sector)) {
            similarCount++;
          }
        });
      }
    });
    
    if (similarCount > 0) {
      score += 5;
      reasons.push(`Portfolio fit: Similar companies (+5)`);
    } else {
      // Check for complementary companies (adjacent sectors)
      let complementaryCount = 0;
      portfolio.forEach(company => {
        // Adjacent sector logic (e.g., fintech + payments, healthcare + biotech)
        if ((company.includes('fintech') || company.includes('payments')) && 
            (startupSectorsText.includes('fintech') || startupSectorsText.includes('payments'))) {
          complementaryCount++;
        }
        if ((company.includes('healthcare') || company.includes('biotech')) && 
            (startupSectorsText.includes('healthcare') || startupSectorsText.includes('biotech'))) {
          complementaryCount++;
        }
      });
      
      if (complementaryCount > 0) {
        score += 3;
        reasons.push(`Portfolio fit: Complementary companies (+3)`);
      } else {
        // Portfolio gap - investor doesn't have companies in this sector (new opportunity)
        score += 2;
        reasons.push(`Portfolio gap: New opportunity (+2)`);
      }
    }
  } else if (investor.notable_investments && Array.isArray(investor.notable_investments) && investor.notable_investments.length > 0) {
    // Use notable_investments as fallback
    const notable = investor.notable_investments.map(c => c.toString().toLowerCase());
    const startupSectorsText = Array.isArray(startup.sectors) 
      ? startup.sectors.join(' ').toLowerCase()
      : (startup.sectors || '').toString().toLowerCase();
    
    let hasSimilar = false;
    notable.forEach(company => {
      const commonSectors = ['ai', 'fintech', 'saas', 'healthcare', 'ecommerce', 'marketplace'];
      commonSectors.forEach(sector => {
        if (company.includes(sector) && startupSectorsText.includes(sector)) {
          hasSimilar = true;
        }
      });
    });
    
    if (hasSimilar) {
      score += 5;
      reasons.push(`Portfolio fit: Notable investments (+5)`);
    }
  }
  
  // Investor Tier-Based Matching (5 points) - NEW Phase 2
  const investorTier = investor.investor_tier || 'emerging';
  if (investorTier === 'elite' && godScore >= 75) {
    score += 5;
    reasons.push('Elite investor + elite startup (+5)');
  } else if (investorTier === 'strong' && godScore >= 65) {
    score += 3;
    reasons.push('Strong investor + quality startup (+3)');
  } else if (investorTier === 'emerging') {
    // Emerging investors see all startups (no penalty, but no bonus either)
    // This helps emerging investors get deal flow
  }
  
  // Traction Metrics Bonus (5-10 points) - NEW Phase 2
  const growthRate = startup.growth_rate_monthly || startup.extracted_data?.growth_rate_monthly || 0;
  const mrr = startup.mrr || startup.extracted_data?.mrr || 0;
  const arr = startup.arr || startup.extracted_data?.arr || 0;
  const customerCount = startup.customer_count || startup.extracted_data?.customer_count || 0;
  const teamSize = startup.team_size || startup.extracted_data?.team_size || 0;
  
  // High growth bonus
  if (growthRate > 20) {
    score += 5;
    reasons.push(`High growth (${growthRate}% MoM) (+5)`);
  } else if (growthRate > 10) {
    score += 3;
    reasons.push(`Strong growth (${growthRate}% MoM) (+3)`);
  } else if (growthRate > 5) {
    score += 1;
    reasons.push(`Positive growth (${growthRate}% MoM) (+1)`);
  }
  
  // Revenue bonus
  if (arr > 120000 || mrr > 10000) {
    score += 3;
    reasons.push(`Revenue traction (+3)`);
  } else if (arr > 60000 || mrr > 5000) {
    score += 2;
    reasons.push(`Early revenue (+2)`);
  }
  
  // Customer base bonus
  if (customerCount > 100) {
    score += 2;
    reasons.push(`Customer base (${customerCount}+) (+2)`);
  } else if (customerCount > 50) {
    score += 1;
    reasons.push(`Growing customer base (+1)`);
  }
  
  // Team size bonus (more established)
  if (teamSize > 10) {
    score += 2;
    reasons.push(`Established team (${teamSize}+) (+2)`);
  } else if (teamSize > 5) {
    score += 1;
    reasons.push(`Growing team (+1)`);
  }
  
  const confidence = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
  
  return {
    score: Math.min(score, 100),
    confidence,
    reason: reasons.join('; ') || 'Basic compatibility match',
    stage_fit: score >= 15,
    sector_fit: sectorMatches > 0
  };
}

async function generateMatches() {
  console.log('🎯 Generating Startup-Investor Matches...\n');
  
  // Get all approved startups with GOD scores (ready for matching)
  const { data: startups, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('id, name, description, sectors, stage, total_god_score, team_score, traction_score, market_score, product_score, vision_score, location, website, raise_amount, mrr, arr, growth_rate_monthly, customer_count, team_size, extracted_data')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .gt('total_god_score', 0);
  
  if (startupsError) {
    console.error('❌ Error fetching startups:', startupsError);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No scored startups found. Run GOD scoring first.');
    return;
  }
  
  // Get all investors with relevant fields for matching
  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('id, name, sectors, stage, check_size_min, check_size_max, geography_focus, investor_score, investor_tier, last_investment_date, investment_pace_per_year, leads_rounds, follows_rounds, portfolio_companies, notable_investments, investment_thesis');
  
  if (investorsError) {
    console.error('❌ Error fetching investors:', investorsError);
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups and ${investors.length} investors`);
  console.log('🔄 Calculating matches...\n');
  
  const matches = [];
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  
  // Generate matches for each startup (increased for ML training)
  let processedStartups = 0;
  const startupsWithMatches = new Set();
  
  for (const startup of startups) {
    let startupMatchCount = 0;
    
    // Dynamic threshold based on startup quality - NEW
    const godScore = startup.total_god_score || 50;
    let minMatchScore = 15; // Default
    if (godScore >= 80) {
      minMatchScore = 25; // Elite startups get higher threshold
    } else if (godScore >= 70) {
      minMatchScore = 20; // High-quality startups
    } else if (godScore >= 60) {
      minMatchScore = 18; // Good startups
    } else if (godScore < 50) {
      minMatchScore = 10; // Lower startups can have lower threshold
    }
    
    for (const investor of investors) {
      const match = calculateMatch(startup, investor);
      
      // Dynamic threshold based on startup quality
      // Generate up to 50 matches per startup for ML training
      if (match.score > minMatchScore && startupMatchCount < 50) {
        matches.push({
          startup_id: startup.id,
          investor_id: investor.id,
          match_score: match.score,
          confidence_level: match.confidence,
          reasoning: match.reason, // Use 'reasoning' instead of 'match_reason'
          status: 'suggested'
        });
        
        if (match.confidence === 'high') highConfidence++;
        else if (match.confidence === 'medium') mediumConfidence++;
        else lowConfidence++;
        
        startupMatchCount++;
        startupsWithMatches.add(startup.id);
      }
    }
    processedStartups++;
    
    // Log progress every 100 startups
    if (processedStartups % 100 === 0) {
      console.log(`   Processed ${processedStartups}/${startups.length} startups, ${matches.length} matches so far...`);
    }
  }
  
  console.log(`\n✅ Processed all ${processedStartups} startups`);
  console.log(`   ${startupsWithMatches.size} startups will have matches`);
  
  console.log(`✅ Generated ${matches.length} potential matches:`);
  console.log(`   🟢 High confidence: ${highConfidence}`);
  console.log(`   🟡 Medium confidence: ${mediumConfidence}`);
  console.log(`   🔴 Low confidence: ${lowConfidence}`);
  
  if (matches.length === 0) {
    console.log('\n⚠️  No matches found. Check your data.');
    return;
  }
  
  // Insert matches into database (use upsert to avoid duplicates)
  console.log('\n💾 Saving matches to database...');
  
  // Batch insert in chunks of 1000 to avoid timeout
  const BATCH_SIZE = 1000;
  let totalSaved = 0;
  
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('startup_investor_matches')
      .upsert(batch, { 
        onConflict: 'startup_id,investor_id',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error(`❌ Error saving batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
      continue;
    }
    
    totalSaved += data?.length || 0;
    console.log(`   ✅ Saved batch ${Math.floor(i/BATCH_SIZE) + 1}: ${data?.length || 0} matches`);
  }
  
  console.log(`\n✅ Successfully saved ${totalSaved} total matches!\n`);
  
  // Show statistics
  const { data: stats } = await supabase
    .from('match_statistics')
    .select('*')
    .single();
  
  if (stats) {
    console.log('📊 MATCH STATISTICS:');
    console.log(`   Total matches: ${stats.total_matches}`);
    console.log(`   Unique startups matched: ${stats.unique_startups_matched}`);
    console.log(`   Unique investors matched: ${stats.unique_investors_matched}`);
    console.log(`   Average match score: ${stats.avg_match_score?.toFixed(2)}`);
    console.log(`   High confidence matches: ${stats.high_confidence_matches}`);
  }
  
  // Show top matches
  const { data: topMatches } = await supabase
    .from('startup_investor_matches')
    .select(`
      *,
      startup_uploads!startup_investor_matches_startup_id_fkey(name),
      investors!startup_investor_matches_investor_id_fkey(name)
    `)
    .order('match_score', { ascending: false })
    .limit(5);
  
  if (topMatches && topMatches.length > 0) {
    console.log('\n🏆 TOP 5 MATCHES:');
    topMatches.forEach((match, i) => {
      const startupName = match.startup_uploads?.name || 'Unknown';
      const investorName = match.investors?.name || 'Unknown';
      const reason = match.reasoning || match.match_reason || 'No reason provided';
      console.log(`   ${i + 1}. ${startupName} ↔ ${investorName}`);
      console.log(`      Score: ${match.match_score} | Confidence: ${match.confidence_level}`);
      console.log(`      Reason: ${reason.substring(0, 80)}${reason.length > 80 ? '...' : ''}`);
    });
  }
}

// Run the matching
generateMatches().catch(console.error);
