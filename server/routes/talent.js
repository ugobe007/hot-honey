/**
 * Talent Matching API Routes
 * 
 * Provides REST API endpoints for talent matching and management
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Try to load talent matching service, but make it optional (it's TypeScript, so we'll use stubs)
let matchFounderToHires, getMatchQualityTier;

try {
  // Try to require JS version (if it exists)
  const service = require('../services/talentMatchingService');
  matchFounderToHires = service.matchFounderToHires;
  getMatchQualityTier = service.getMatchQualityTier;
} catch (error) {
  // Service doesn't exist or is TypeScript - use stub functions
  console.warn('⚠️  Talent matching service not available (TypeScript requires compilation). Using stubs.');
  matchFounderToHires = () => { 
    throw new Error('Talent matching service requires TypeScript compilation. Please compile the service or implement JS version.'); 
  };
  getMatchQualityTier = () => 'medium';
}

// Fallback credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in talent router');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/talent/matches/:startupId
 * Get talent matches for a startup
 */
router.get('/matches/:startupId', async (req, res) => {
  try {
    const { startupId } = req.params;
    const { minScore = 40, maxResults = 20, skillType } = req.query;

    // Get startup data
    const { data: startup, error: startupError } = await supabase
      .from('startup_uploads')
      .select('id, name, sectors, stage, technical_cofounders, total_god_score, extracted_data')
      .eq('id', startupId)
      .single();

    if (startupError || !startup) {
      return res.status(404).json({ error: 'Startup not found' });
    }

    // Extract founder attributes from startup data
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

    // Get talent pool
    let talentQuery = supabase
      .from('talent_pool')
      .select('*')
      .eq('availability_status', 'available');

    if (skillType) {
      talentQuery = talentQuery.eq('skill_type', skillType);
    }

    const { data: talentPool, error: talentError } = await talentQuery;

    if (talentError) {
      return res.status(500).json({ error: 'Failed to fetch talent pool', details: talentError });
    }

    // Get existing matches
    const { data: existingMatches } = await supabase
      .from('founder_hire_matches')
      .select('talent_id, match_score, status')
      .eq('startup_id', startupId);

    const existingTalentIds = new Set(existingMatches?.map(m => m.talent_id) || []);

    // Filter out already matched talent
    const availableTalent = (talentPool || []).filter(t => !existingTalentIds.has(t.id));

    // Calculate matches
    const matches = matchFounderToHires(
      founderProfile,
      availableTalent,
      {
        minScore: parseInt(minScore),
        maxResults: parseInt(maxResults),
        excludeCommitted: true
      }
    );

    // Enrich with talent details
    const enrichedMatches = matches.map(match => {
      const talent = availableTalent.find(t => t.id === match.talent_id);
      return {
        ...match,
        talent: talent ? {
          id: talent.id,
          name: talent.name,
          email: talent.email,
          linkedin_url: talent.linkedin_url,
          skill_type: talent.skill_type,
          experience_level: talent.experience_level,
          work_style: talent.work_style,
          location: talent.location,
          previous_startup_experience: talent.previous_startup_experience
        } : null,
        match_quality: getMatchQualityTier(match.match_score)
      };
    });

    res.json({
      startup: {
        id: startup.id,
        name: startup.name,
        founder_courage: founderProfile.founder_courage,
        founder_intelligence: founderProfile.founder_intelligence
      },
      matches: enrichedMatches,
      total: enrichedMatches.length
    });
  } catch (error) {
    console.error('Error fetching talent matches:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/talent/matches/:startupId/:talentId
 * Create or update a match
 */
router.post('/matches/:startupId/:talentId', async (req, res) => {
  try {
    const { startupId, talentId } = req.params;
    const { status = 'pending' } = req.body;

    // Get startup and talent data
    const [startupRes, talentRes] = await Promise.all([
      supabase.from('startup_uploads').select('id, name, extracted_data').eq('id', startupId).single(),
      supabase.from('talent_pool').select('*').eq('id', talentId).single()
    ]);

    if (startupRes.error || !startupRes.data) {
      return res.status(404).json({ error: 'Startup not found' });
    }
    if (talentRes.error || !talentRes.data) {
      return res.status(404).json({ error: 'Talent not found' });
    }

    const startup = startupRes.data;
    const talent = talentRes.data;
    const extractedData = startup.extracted_data || {};

    // Calculate match score
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

    const matchResult = matchFounderToHires(
      founderProfile,
      [talent],
      { minScore: 0, maxResults: 1 }
    )[0] || { match_score: 0, match_reasons: [], alignment_types: [], details: {} };

    // Upsert match
    const { data: match, error } = await supabase
      .from('founder_hire_matches')
      .upsert({
        startup_id: startupId,
        talent_id: talentId,
        match_score: matchResult.match_score,
        match_reasons: matchResult.match_reasons,
        alignment_type: matchResult.alignment_types,
        founder_courage: founderProfile.founder_courage,
        founder_intelligence: founderProfile.founder_intelligence,
        founder_speed_score: founderProfile.founder_speed,
        founder_technical: (startup.technical_cofounders || 0) > 0,
        candidate_courage: talent.candidate_courage,
        candidate_intelligence: talent.candidate_intelligence,
        candidate_skill_type: talent.skill_type,
        candidate_experience_level: talent.experience_level,
        status: status,
        ...(status === 'contacted' && { contacted_at: new Date().toISOString() }),
        ...(status === 'interviewed' && { interviewed_at: new Date().toISOString() }),
        ...(status === 'hired' && { hired_at: new Date().toISOString() }),
        ...(status === 'rejected' && { rejected_at: new Date().toISOString() })
      }, {
        onConflict: 'startup_id,talent_id'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create match', details: error });
    }

    res.json({ match });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/talent/pool
 * Get talent pool with filters
 */
router.get('/pool', async (req, res) => {
  try {
    const { skillType, experienceLevel, availabilityStatus = 'available', limit = 50 } = req.query;

    let query = supabase
      .from('talent_pool')
      .select('*')
      .eq('availability_status', availabilityStatus)
      .limit(parseInt(limit));

    if (skillType) {
      query = query.eq('skill_type', skillType);
    }
    if (experienceLevel) {
      query = query.eq('experience_level', experienceLevel);
    }

    const { data: talent, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch talent pool', details: error });
    }

    res.json({ talent: talent || [], total: talent?.length || 0 });
  } catch (error) {
    console.error('Error fetching talent pool:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * POST /api/talent/pool
 * Add talent to pool
 */
router.post('/pool', async (req, res) => {
  try {
    const talentData = req.body;

    const { data: talent, error } = await supabase
      .from('talent_pool')
      .insert(talentData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add talent', details: error });
    }

    res.status(201).json({ talent });
  } catch (error) {
    console.error('Error adding talent:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

