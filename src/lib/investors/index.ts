/**
 * INVESTOR SERVICES - Unified Exports
 * 
 * Import investor services from here for clean, organized imports.
 * 
 * Usage:
 *   import { getAllInvestors, getInvestorById } from '@/lib/investors';
 */

// Main investor service
export {
  getAllInvestors,
  getInvestorById,
  getInvestorsBySector,
  createInvestor,
  updateInvestor,
  getStartupUploads,
  updateStartupStatus
} from '../investorService';

// Investor enrichment
export {
  enrichInvestorData,
  enrichInvestorFromWebsite
} from '../investorEnrichmentService';

// Investor news
export {
  getInvestorNews,
  getRecentInvestorActivity
} from '../investorNewsService';




