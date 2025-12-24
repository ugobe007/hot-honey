/**
 * MATCHING SERVICES - Unified Exports
 * 
 * Import matching services from here for clean, organized imports.
 * 
 * Usage:
 *   import { calculateAdvancedMatchScore, generateAdvancedMatches } from '@/services';
 */

// Main matching service (frontend)
export {
  calculateAdvancedMatchScore,
  generateAdvancedMatches,
  getHybridMatches
} from './matchingService';

// Semantic matching
export {
  findSemanticInvestorMatches,
  findSimilarStartups,
  findSimilarInvestors,
  hasEmbedding
} from './semanticMatchingService';

// System status
export {
  getSystemStatus
} from './systemStatus';


