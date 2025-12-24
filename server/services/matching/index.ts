/**
 * MATCHING SERVICES - Consolidated Exports
 * 
 * All matching-related services exported from a single location.
 * 
 * Usage:
 *   import { searchStartupMatches, searchInvestorMatches } from '@/server/services/matching';
 */

// Search services
export * from '../startupMatchSearchService';
export * from '../investorMatchSearchService';

// Matching services
export * from '../investorMatching';
export * from '../autoMatchService';

// Analysis services
export * from '../matchInsightsService';
export * from '../matchInvestigationService';
export * from '../matchReportsService';


