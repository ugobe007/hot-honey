/**
 * INVESTOR ADAPTERS
 * 
 * Converts between database types (SSOT) and component/legacy types
 * 
 * SSOT: src/lib/database.types.ts -> Investor (from investors table)
 * Legacy: src/data/investorData.ts -> InvestorFirm (static data format)
 * 
 * All adapters should read from SSOT and convert to needed format.
 */

import type { Investor } from '../lib/database.types';
import type { InvestorComponent } from '../types';

/**
 * Convert database Investor to component format
 * Handles field mapping and computed values
 */
export function adaptInvestorForComponent(dbInvestor: Investor): InvestorComponent {
  // Parse JSONB fields if they're strings
  const sectors = Array.isArray(dbInvestor.sectors) 
    ? dbInvestor.sectors 
    : (typeof dbInvestor.sectors === 'string' ? JSON.parse(dbInvestor.sectors) : []);
  
  const stage = Array.isArray(dbInvestor.stage)
    ? dbInvestor.stage
    : (typeof dbInvestor.stage === 'string' ? JSON.parse(dbInvestor.stage) : []);
  
  const geography = Array.isArray(dbInvestor.geography)
    ? dbInvestor.geography
    : (typeof dbInvestor.geography === 'string' ? JSON.parse(dbInvestor.geography) : []);
  
  return {
    // Core fields (direct mapping)
    ...dbInvestor,
    
    // Ensure arrays are properly typed
    sectors: sectors || [],
    stage: stage || [],
    geography: geography || [],
    
    // Computed/display fields (from metadata or defaults)
    // SSOT: Database has total_investments, not portfolio_size or portfolio_count
    portfolioCount: dbInvestor.total_investments || (dbInvestor as any).portfolio_count || (dbInvestor as any).portfolioCount || undefined,
    exits: dbInvestor.successful_exits || (dbInvestor as any).exits || undefined,
    unicorns: (dbInvestor as any).unicorns || undefined,
    notableInvestments: Array.isArray(dbInvestor.notable_investments) 
      ? dbInvestor.notable_investments 
      : (typeof dbInvestor.notable_investments === 'string' 
          ? JSON.parse(dbInvestor.notable_investments) 
          : (dbInvestor.notable_investments || [])),
    totalInvestments: dbInvestor.total_investments || undefined,
    investmentPace: (dbInvestor as any).investment_pace || (dbInvestor as any).investmentPace || undefined,
    lastInvestmentDate: (dbInvestor as any).last_investment_date || (dbInvestor as any).lastInvestmentDate || undefined,
    hotHoneyInvestments: (dbInvestor as any).hot_honey_investments || (dbInvestor as any).hotHoneyInvestments || undefined,
    hotHoneyStartups: (dbInvestor as any).hot_honey_startups || (dbInvestor as any).hotHoneyStartups || [],
  };
}

/**
 * Convert component Investor back to database format
 * Used when saving/updating investors
 */
export function adaptInvestorForDatabase(componentInvestor: Partial<InvestorComponent>): Partial<Investor> {
  const {
    // Remove component-only fields
    portfolioCount,
    exits,
    unicorns,
    notableInvestments,
    totalInvestments,
    investmentPace,
    lastInvestmentDate,
    hotHoneyInvestments,
    hotHoneyStartups,
    // Keep database fields
    ...dbFields
  } = componentInvestor;
  
  return {
    ...dbFields,
    // Map component fields to database fields
    // SSOT: Database uses total_investments, not portfolio_count
    ...(totalInvestments !== undefined && { total_investments: totalInvestments }),
    ...(portfolioCount !== undefined && { total_investments: portfolioCount }), // Map portfolioCount to total_investments
    ...(exits !== undefined && { successful_exits: exits }), // Map exits to successful_exits
    ...(unicorns !== undefined && { unicorns }),
    ...(notableInvestments && { notable_investments: notableInvestments }),
    ...(investmentPace !== undefined && { investment_pace: investmentPace }),
    ...(lastInvestmentDate && { last_investment_date: lastInvestmentDate }),
    ...(hotHoneyInvestments !== undefined && { hot_honey_investments: hotHoneyInvestments }),
    ...(hotHoneyStartups && { hot_honey_startups: hotHoneyStartups }),
  };
}

/**
 * Convert legacy InvestorFirm format to database format
 * Used for migration/import
 */
export function adaptLegacyInvestorToDatabase(legacyInvestor: any): Partial<Investor> {
  return {
    name: legacyInvestor.name,
    type: legacyInvestor.type || 'vc_firm',
    tagline: legacyInvestor.tagline,
    bio: legacyInvestor.description || legacyInvestor.bio,
    website: legacyInvestor.website || '',
    sectors: legacyInvestor.sectors || legacyInvestor.focusAreas?.map((f: any) => f.sector || f) || [],
    stage: legacyInvestor.stage || [],
    geography: Array.isArray(legacyInvestor.geography) 
      ? legacyInvestor.geography 
      : legacyInvestor.geography ? [legacyInvestor.geography] : [],
    check_size_min: legacyInvestor.checkSizeMin,
    check_size_max: legacyInvestor.checkSizeMax,
    linkedin: legacyInvestor.linkedin,
    twitter: legacyInvestor.twitter,
    contact_email: legacyInvestor.contactEmail,
    status: 'active',
  };
}

