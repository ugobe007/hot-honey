#!/usr/bin/env node
/**
 * AUTOMATED TALENT MATCHING
 * 
 * Automatically matches startups with available talent in the pool
 * Runs periodically to find new matches for startups
 * 
 * Run manually: node auto-match-talent.js
 * Or via automation-engine.js (scheduled)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Simplified matching logic (full version in TypeScript service)
function calculateMatchScore(founder, candidate) {
  let score = 0;
  const reasons = [];
  
  // Courage alignment (0-25)
  if (founder.founder_courage && candidate.candidate_courage) {
    const courageLevels = { low: 1, moderate: 2, high: 3, exceptional: 4 };
    const founderLevel = courageLevels[founder.founder_courage] || 0;
    const candidateLevel = courageLevels[candidate.candidate_courage] || 0;
    
    if (founderLevel >= 3 && candidateLevel >= 3) {
      score += 25;
      reasons.push('High courage alignment');
    } else if (founderLevel === 2 && candidateLevel >= 2) {
      score += 15;
      reasons.push('Moderate courage alignment');
    }
  }
  
  // Intelligence alignment (0-25)
  if (founder.founder_intelligence && candidate.candidate_intelligence) {
    const intLevels = { low: 1, moderate: 2, high: 3, exceptional: 4 };
    const founderLevel = intLevels[founder.founder_intelligence] || 0;
    const candidateLevel = intLevels[candidate.candidate_intelligence] || 0;
    
    if (founderLevel >= 3 && candidateLevel >= 3) {
      score += 25;
      reasons.push('High intelligence alignment');
    } else if (founderLevel >= 3 && candidateLevel === 2) {
      score += 20;
      reasons.push('Intelligence complement');
    }
  }
  
  // Work style match (0-20)
  if (founder.founder_speed >= 2 && candidate.execution_speed === 'fast') {
    score += 20;
    reasons.push('Fast execution alignment');
  }
  
  // Skill complement (0-20)
  if (founder.technical_cofounders > 0 && ['business', 'operations', 'sales'].includes(candidate.skill_type)) {
    score += 20;
    reasons.push('Skill complement: Technical founder + business hire');
  } else if (founder.technical_cofounders === 0 && candidate.skill_type === 'technical') {
    score += 20;
    reasons.push('Skill complement: Non-technical founder + technical hire');
  }
  
  // Experience bonus (0-10)
  if (candidate.previous_startup_experience) {
    score += 10;
    reasons.push('Previous startup experience');
  }
  
  // Sector match (0-10)
  if (founder.sectors && candidate.sectors) {
    const overlap = founder.sectors.filter(s => 
      candidate.sectors.some(cs => cs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(cs.toLowerCase()))
    );
    if (overlap.length > 0) {
      score += 10;
      reasons.push(`Sector match: ${overlap[0]}`);
    }
  }
  
  return {
    match_score: Math.min(Math.round(score), 100),
    match_reasons: reasons,
    alignment_types: reasons.map(r => r.toLowerCase().replace(/\s+/g, '_'))
  };
}

// Fallback credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Match all startups with available talent
 */
async function autoMatchTalent() {
  console.log('🔍 Starting automated talent matching...\n');

  // Get all approved startups
  const { data: startups, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, stage, technical_cofounders, extracted_data')
    .eq('status', 'approved')
    .limit(50); // Process in batches

  if (startupsError) {
    console.error('❌ Error fetching startups:', startupsError);
    return;
  }

  // Get available talent
  const { data: talentPool, error: talentError } = await supabase
    .from('talent_pool')
    .select('*')
    .eq('availability_status', 'available');

  if (talentError) {
    console.error('❌ Error fetching talent pool:', talentError);
    return;
  }

  if (!talentPool || talentPool.length === 0) {
    console.log('⚠️  No available talent in pool. Add talent first.');
    return;
  }

  console.log(`📊 Processing ${startups?.length || 0} startups against ${talentPool.length} available candidates\n`);

  let totalMatches = 0;
  let newMatches = 0;
  let updatedMatches = 0;

  for (const startup of startups || []) {
    try {
      const extractedData = startup.extracted_data || {};
      
      const founderProfile = {
        id: startup.id,
        name: startup.name,
        founder_courage: extractedData.founder_courage || 'moderate',
        founder_intelligence: extractedData.founder_intelligence || 'moderate',
        founder_speed: extractedData.founder_speed || 1.5,
        technical_cofounders: startup.technical_cofounders || 0,
        sectors: startup.sectors || [],
        stage: startup.stage
      };

      // Get existing matches for this startup
      const { data: existingMatches } = await supabase
        .from('founder_hire_matches')
        .select('talent_id')
        .eq('startup_id', startup.id);

      const existingTalentIds = new Set(existingMatches?.map(m => m.talent_id) || []);

      // Filter out already matched talent
      const availableTalent = talentPool.filter(t => !existingTalentIds.has(t.id));

      if (availableTalent.length === 0) {
        continue; // Skip if all talent already matched
      }

      // Calculate matches
      const matches = availableTalent
        .map(talent => ({
          talent_id: talent.id,
          ...calculateMatchScore(founderProfile, talent)
        }))
        .filter(m => m.match_score >= 50) // Only high-quality matches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10); // Top 10

      // Store matches
      for (const match of matches) {
        const talent = availableTalent.find(t => t.id === match.talent_id);
        if (!talent) continue;

        // Check if match already exists
        const { data: existing } = await supabase
          .from('founder_hire_matches')
          .select('id, match_score')
          .eq('startup_id', startup.id)
          .eq('talent_id', match.talent_id)
          .single();

        if (existing) {
          // Update if score changed significantly
          if (Math.abs(existing.match_score - match.match_score) > 5) {
            await supabase
              .from('founder_hire_matches')
              .update({
                match_score: match.match_score,
                match_reasons: match.match_reasons,
                alignment_type: match.alignment_types,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            updatedMatches++;
          }
        } else {
          // Create new match
          await supabase
            .from('founder_hire_matches')
            .insert({
              startup_id: startup.id,
              talent_id: match.talent_id,
              match_score: match.match_score,
              match_reasons: match.match_reasons,
              alignment_type: match.alignment_types,
              founder_courage: founderProfile.founder_courage,
              founder_intelligence: founderProfile.founder_intelligence,
              founder_speed_score: founderProfile.founder_speed,
              founder_technical: (startup.technical_cofounders || 0) > 0,
              candidate_courage: talent.candidate_courage,
              candidate_intelligence: talent.candidate_intelligence,
              candidate_skill_type: talent.skill_type,
              candidate_experience_level: talent.experience_level,
              status: 'pending'
            });
          newMatches++;
        }
        totalMatches++;
      }

      if (matches.length > 0) {
        console.log(`  ✅ ${startup.name}: ${matches.length} matches found`);
      }
    } catch (error) {
      console.error(`  ❌ Error matching ${startup.name}:`, error.message);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Matching Summary:');
  console.log(`   Total matches processed: ${totalMatches}`);
  console.log(`   New matches created: ${newMatches}`);
  console.log(`   Existing matches updated: ${updatedMatches}`);
  console.log('✅ Automated talent matching complete!');
}

/**
 * Main execution
 */
async function main() {
  try {
    await autoMatchTalent();
  } catch (error) {
    console.error('❌ Error in automated talent matching:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };

