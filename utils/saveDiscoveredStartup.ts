/**
 * UNIFIED SAVE FUNCTION FOR DISCOVERED STARTUPS (TypeScript)
 * 
 * TypeScript wrapper for the unified save function
 * All scrapers should use this function to ensure consistent schema usage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function initSupabase(): SupabaseClient {
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

export interface DiscoveredStartupInput {
  name: string;
  website?: string | null;
  description?: string | null;
  funding_amount?: string | null;
  funding_stage?: string | null;
  investors_mentioned?: string[] | null;
  article_url?: string | null;
  article_title?: string | null;
  article_date?: string | Date | null;
  rss_source?: string | null;
  value_proposition?: string | null;
  problem?: string | null;
  solution?: string | null;
  market_size?: string | null;
  team_companies?: string[] | null;
  sectors?: string[] | null;
  discovered_at?: string | Date | null;
}

export interface SaveOptions {
  checkDuplicates?: boolean;
  skipIfExists?: boolean;
}

export interface SaveResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Save a discovered startup with proper schema validation
 */
export async function saveDiscoveredStartup(
  startup: DiscoveredStartupInput,
  options: SaveOptions = {}
): Promise<SaveResult> {
  const { checkDuplicates = true, skipIfExists = true } = options;
  const supabase = initSupabase();

  // Validate required fields
  if (!startup.name || startup.name.trim() === '') {
    return { success: false, error: 'Name is required' };
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
  const dataToInsert: any = {
    // Required
    name: startup.name.trim(),
    
    // Basic info
    website: startup.website && startup.website !== 'null' ? startup.website.trim() : null,
    description: startup.description || null,
    
    // Funding info
    funding_amount: startup.funding_amount && startup.funding_amount !== 'null' ? startup.funding_amount : null,
    funding_stage: startup.funding_stage && startup.funding_stage !== 'null' ? startup.funding_stage : null,
    investors_mentioned: Array.isArray(startup.investors_mentioned) && startup.investors_mentioned.length > 0
      ? startup.investors_mentioned
      : null,
    
    // Article/source info (ALL AVAILABLE FIELDS)
    article_url: startup.article_url || null,
    article_title: startup.article_title || null,
    article_date: startup.article_date 
      ? (startup.article_date instanceof Date 
          ? startup.article_date.toISOString() 
          : new Date(startup.article_date).toISOString())
      : null,
    rss_source: startup.rss_source || null,
    
    // 5-point format (if available)
    value_proposition: startup.value_proposition || null,
    problem: startup.problem || null,
    solution: startup.solution || null,
    market_size: startup.market_size || null,
    team_companies: Array.isArray(startup.team_companies) ? startup.team_companies : null,
    sectors: Array.isArray(startup.sectors) ? startup.sectors : null,
    
    // Status
    discovered_at: startup.discovered_at 
      ? (startup.discovered_at instanceof Date 
          ? startup.discovered_at.toISOString() 
          : new Date(startup.discovered_at).toISOString())
      : new Date().toISOString(),
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
 */
export async function saveDiscoveredStartupsBatch(
  startups: DiscoveredStartupInput[],
  options: SaveOptions = {}
): Promise<{ saved: number; skipped: number; errors: number }> {
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





