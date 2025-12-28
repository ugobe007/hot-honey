/**
 * STARTUP ADAPTERS
 * 
 * Converts between database types (SSOT) and component/legacy types
 * 
 * SSOT: src/lib/database.types.ts -> Startup (from startup_uploads table)
 * Legacy: src/types.ts -> Startup (old component interface)
 * 
 * All adapters should read from SSOT and convert to needed format.
 */

import type { Startup } from '../lib/database.types';
import type { StartupComponent } from '../types';

/**
 * Convert database Startup to component format
 * Handles field mapping and computed values
 */
export function adaptStartupForComponent(dbStartup: Startup): StartupComponent {
  const extracted = (dbStartup.extracted_data as any) || {};
  
  return {
    // Core fields (direct mapping)
    ...dbStartup,
    
    // Extract from extracted_data if not in main fields
    description: dbStartup.description || extracted.description || extracted.pitch || '',
    tagline: dbStartup.tagline || extracted.tagline || extracted.value_proposition || '',
    pitch: dbStartup.pitch || extracted.pitch || extracted.description || '',
    
    // Legacy field mappings
    marketSize: extracted.marketSize || extracted.market_size || '',
    unique: extracted.unique || extracted.differentiator || '',
    raise: dbStartup.raise_amount || extracted.raise || extracted.funding || '',
    video: extracted.video || '',
    deck: dbStartup.deck_filename || extracted.deck || extracted.pitch_deck_url || '',
    press: extracted.press || '',
    tech: extracted.tech || extracted.technology || '',
    teamLogos: extracted.teamLogos || extracted.team_logos || [],
    
    // Stage conversion (number to stage mapping if needed)
    stage: dbStartup.stage || extracted.stage || undefined,
    
    // Five points array
    fivePoints: extracted.fivePoints || extracted.five_points || [
      extracted.value_proposition || '',
      extracted.marketSize || extracted.market_size || '',
      extracted.unique || extracted.differentiator || '',
      extracted.team || '',
      extracted.funding || extracted.raise || ''
    ].filter(p => p),
    
    // Industries/sectors
    industries: dbStartup.sectors || extracted.industries || extracted.sectors || [],
    
    // Extended fields
    founders: extracted.founders || [],
    ipFilings: extracted.ipFilings || extracted.ip_filings || [],
    teamHires: extracted.teamHires || extracted.team_hires || [],
    advisors: extracted.advisors || [],
    boardMembers: extracted.boardMembers || extracted.board_members || [],
    customerTraction: extracted.customerTraction || extracted.customer_traction || [],
    
    // Computed fields (defaults)
    hotness: dbStartup.total_god_score ? dbStartup.total_god_score / 20 : undefined, // Convert 0-100 to 0-5
    yesVotes: extracted.yesVotes || 0,
    noVotes: extracted.noVotes || 0,
    rating: extracted.rating || undefined,
    comments: extracted.comments || [],
    answersCount: extracted.answersCount || extracted.answers_count || 0,
  };
}

/**
 * Convert component Startup back to database format
 * Used when saving/updating startups
 */
export function adaptStartupForDatabase(componentStartup: Partial<StartupComponent>): Partial<Startup> {
  const { 
    // Remove component-only fields
    hotness,
    yesVotes,
    noVotes,
    rating,
    comments,
    marketSize,
    unique,
    raise,
    video,
    deck,
    press,
    tech,
    teamLogos,
    fivePoints,
    founders,
    ipFilings,
    teamHires,
    advisors,
    boardMembers,
    customerTraction,
    industries,
    answersCount,
    // Keep database fields
    ...dbFields
  } = componentStartup;
  
  // Build extracted_data from legacy fields
  const extracted_data: any = {
    ...(componentStartup.extracted_data || {}),
    ...(marketSize && { marketSize }),
    ...(unique && { unique }),
    ...(video && { video }),
    ...(press && { press }),
    ...(tech && { tech }),
    ...(teamLogos && { teamLogos }),
    ...(fivePoints && { fivePoints }),
    ...(founders && { founders }),
    ...(ipFilings && { ipFilings }),
    ...(teamHires && { teamHires }),
    ...(advisors && { advisors }),
    ...(boardMembers && { boardMembers }),
    ...(customerTraction && { customerTraction }),
    ...(yesVotes && { yesVotes }),
    ...(noVotes && { noVotes }),
    ...(rating && { rating }),
    ...(comments && { comments }),
    ...(answersCount && { answersCount }),
  };
  
  return {
    ...dbFields,
    ...(Object.keys(extracted_data).length > 0 && { extracted_data }),
    // Map legacy fields to database fields
    ...(raise && { raise_amount: raise }),
    ...(industries && { sectors: industries }),
  };
}

/**
 * Convert legacy Startup format to database format
 * Used for migration/import
 */
export function adaptLegacyStartupToDatabase(legacyStartup: any): Partial<Startup> {
  return {
    name: legacyStartup.name,
    description: legacyStartup.description || legacyStartup.pitch,
    tagline: legacyStartup.tagline,
    website: legacyStartup.website || '',
    pitch: legacyStartup.pitch || legacyStartup.description,
    stage: legacyStartup.stage,
    sectors: legacyStartup.industries || [],
    extracted_data: {
      marketSize: legacyStartup.marketSize,
      unique: legacyStartup.unique,
      raise: legacyStartup.raise,
      video: legacyStartup.video,
      deck: legacyStartup.deck,
      press: legacyStartup.press,
      tech: legacyStartup.tech,
      teamLogos: legacyStartup.teamLogos,
      fivePoints: legacyStartup.fivePoints,
      founders: legacyStartup.founders,
      ipFilings: legacyStartup.ipFilings,
      teamHires: legacyStartup.teamHires,
      advisors: legacyStartup.advisors,
      boardMembers: legacyStartup.boardMembers,
      customerTraction: legacyStartup.customerTraction,
      yesVotes: legacyStartup.yesVotes,
      noVotes: legacyStartup.noVotes,
      rating: legacyStartup.rating,
      comments: legacyStartup.comments,
      answersCount: legacyStartup.answersCount,
    }
  };
}




