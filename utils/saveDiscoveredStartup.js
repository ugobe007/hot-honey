/**
 * UNIFIED SAVE FUNCTION FOR DISCOVERED STARTUPS
 * 
 * All scrapers should use this function to ensure consistent schema usage
 * Prevents schema mismatches and data loss
 */

const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

function initSupabase() {
  if (!supabaseClient) {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase credentials');
    }
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

/**
 * Save a discovered startup with proper schema validation
 * @param {Object} startup - Startup data object
 * @param {Object} options - Options for saving
 * @returns {Promise<{success: boolean, id?: string, error?: string, skipped?: boolean}>}
 */
async function saveDiscoveredStartup(startup, options = {}) {
  const { checkDuplicates = true, skipIfExists = true } = options;
  const supabase = initSupabase();

  // Validate required fields
  if (!startup.name || startup.name.trim() === '') {
    return { success: false, error: 'Name is required' };
  }

  // Filter unwanted companies
  const { shouldFilterCompany } = require('./companyFilters');
  const filterCheck = shouldFilterCompany(startup.name, startup.description, startup.funding_stage);
  if (filterCheck.shouldFilter) {
    return { success: false, error: `Filtered: ${filterCheck.reason}`, filtered: true };
  }

  // Check for duplicates if requested
  if (checkDuplicates) {
    const { data: existing } = await supabase
      .from('discovered_startups')
      .select('id')
      .ilike('name', startup.name)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: true, skipped: true, id: existing.id };
    }
  }

  // Prepare data with proper schema mapping
  const dataToInsert = {
    // Required
    name: startup.name.trim(),
    
    // Basic info
    website: startup.website && startup.website !== 'null' ? startup.website.trim() : null,
    description: startup.description || null,
    
    // Funding info (from inference extraction)
    funding_amount: startup.funding_amount && startup.funding_amount !== 'null' ? startup.funding_amount : null,
    funding_stage: startup.funding_stage && startup.funding_stage !== 'null' ? startup.funding_stage : null,
    investors_mentioned: Array.isArray(startup.investors_mentioned) && startup.investors_mentioned.length > 0
      ? startup.investors_mentioned
      : (startup.investors && Array.isArray(startup.investors) && startup.investors.length > 0
          ? startup.investors
          : null),
    
    // Article/source info (ALL AVAILABLE FIELDS)
    article_url: startup.article_url || startup.source_url || null,
    article_title: startup.article_title || null,
    article_date: startup.article_date 
      ? (startup.article_date instanceof Date 
          ? startup.article_date.toISOString() 
          : new Date(startup.article_date).toISOString())
      : null,
    rss_source: startup.rss_source || startup.source_name || null,
    
    // 5-point format (if available)
    value_proposition: startup.value_proposition || null,
    problem: startup.problem || null,
    solution: startup.solution || null,
    market_size: startup.market_size || null,
    team_companies: Array.isArray(startup.team_companies) ? startup.team_companies : null,
    sectors: Array.isArray(startup.sectors) ? startup.sectors : null,
    
    // Inference-extracted signals for GOD Score (NEW!)
    has_technical_cofounder: startup.has_technical_cofounder || false,
    is_launched: startup.is_launched || false,
    has_demo: startup.has_demo || false,
    has_revenue: startup.has_revenue || false,
    lead_investor: startup.lead_investor || null,
    execution_signals: Array.isArray(startup.execution_signals) ? startup.execution_signals : null,
    team_signals: Array.isArray(startup.team_signals) ? startup.team_signals : null,
    grit_signals: Array.isArray(startup.grit_signals) ? startup.grit_signals : null,
    
    // Status
    discovered_at: startup.discovered_at || new Date().toISOString(),
    imported_to_startups: false,
    website_verified: false,
    website_status: startup.website ? 'not_checked' : null
  };

  // Insert
  const { data, error } = await supabase
    .from('discovered_startups')
    .insert(dataToInsert)
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Batch save multiple startups
 * @param {Array} startups - Array of startup objects
 * @param {Object} options - Options for saving
 * @returns {Promise<{saved: number, skipped: number, errors: number}>}
 */
async function saveDiscoveredStartupsBatch(startups, options = {}) {
  const results = {
    saved: 0,
    skipped: 0,
    errors: 0
  };

  for (const startup of startups) {
    const result = await saveDiscoveredStartup(startup, options);
    
    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else {
        results.saved++;
      }
    } else {
      results.errors++;
      if (options.verbose) {
        console.error(`Error saving ${startup.name}:`, result.error);
      }
    }
  }

  return results;
}

module.exports = {
  saveDiscoveredStartup,
  saveDiscoveredStartupsBatch
};

