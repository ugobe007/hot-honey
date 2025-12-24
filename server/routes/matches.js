/**
 * Match API Routes
 * 
 * Provides REST API endpoints for match search, filtering, insights, and reports
 */

const express = require('express');
const router = express.Router();

// Import services from TypeScript modules (using dynamic import for CommonJS compatibility)
// Note: These functions are loaded asynchronously on first use
let searchStartupMatches, getStartupMatchStats, getTopStartupMatches;
let searchInvestorMatches, getInvestorMatchStats, getTopInvestorMatches;
let getStartupMatchInsights, getInvestorMatchInsights, getMatchTrends;
let getMatchBreakdown, getPortfolioAnalysis, getFitAnalysis;
let generateStartupMatchReport, generateInvestorMatchReport, exportMatchesToCSV;

// Lazy load TypeScript services
async function loadServices() {
  if (!searchStartupMatches) {
    const startupMatchService = await import('../services/startupMatchSearchService');
    const investorMatchService = await import('../services/investorMatchSearchService');
    const matchReportsService = await import('../services/matchReportsService');
    const matchInsightsService = await import('../services/matchInsightsService');
    const matchInvestigationService = await import('../services/matchInvestigationService');
    
    searchStartupMatches = startupMatchService.searchStartupMatches;
    getStartupMatchStats = startupMatchService.getStartupMatchStats;
    getTopStartupMatches = startupMatchService.getTopStartupMatches;
    
    searchInvestorMatches = investorMatchService.searchInvestorMatches;
    getInvestorMatchStats = investorMatchService.getInvestorMatchStats;
    getTopInvestorMatches = investorMatchService.getTopInvestorMatches;
    
    getStartupMatchInsights = matchInsightsService.getStartupMatchInsights;
    getInvestorMatchInsights = matchInsightsService.getInvestorMatchInsights;
    getMatchTrends = matchInsightsService.getMatchTrends;
    
    getMatchBreakdown = matchInvestigationService.getMatchBreakdown;
    getPortfolioAnalysis = matchInvestigationService.getPortfolioAnalysis;
    getFitAnalysis = matchInvestigationService.getFitAnalysis;
    
    generateStartupMatchReport = matchReportsService.generateStartupMatchReport;
    generateInvestorMatchReport = matchReportsService.generateInvestorMatchReport;
    exportMatchesToCSV = matchReportsService.exportMatchesToCSV;
  }
}

// Ensure services are loaded before handling requests
router.use(async (req, res, next) => {
  await loadServices();
  next();
});

// ============================================
// STARTUP MATCH ROUTES
// ============================================

/**
 * GET /api/matches/startup/:startupId
 * Search matches for a startup with optional filters
 * 
 * Query params:
 * - minScore: Minimum match score (default: smart filter - top 25% or 60, whichever is higher)
 * - maxScore: Maximum match score (default: 100)
 * - confidenceLevel: high | medium | low
 * - investorTier: elite | strong | emerging
 * - leadsRounds: true | false
 * - activeInvestor: true | false
 * - sectors: comma-separated list
 * - stage: comma-separated list
 * - geography: comma-separated list
 * - minCheckSize: Minimum check size in USD
 * - maxCheckSize: Maximum check size in USD
 * - portfolioFit: similar | complementary | gap | any
 * - sortBy: score | recent | investor_tier | check_size
 * - sortOrder: asc | desc
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 * - showAll: true to bypass smart filtering (show all matches above threshold)
 */
router.get('/startup/:startupId', async (req, res) => {
  try {
    const { startupId } = req.params;
    const {
      minScore,
      maxScore,
      confidenceLevel,
      investorTier,
      leadsRounds,
      activeInvestor,
      sectors,
      stage,
      geography,
      minCheckSize,
      maxCheckSize,
      portfolioFit,
      sortBy,
      sortOrder,
      limit,
      offset,
      showAll, // Bypass smart filtering
    } = req.query;

    const filters = {
      ...(minScore !== undefined && { minScore: parseInt(minScore) }),
      ...(maxScore !== undefined && { maxScore: parseInt(maxScore) }),
      ...(confidenceLevel && { confidenceLevel }),
      ...(investorTier && { investorTier }),
      ...(leadsRounds !== undefined && { leadsRounds: leadsRounds === 'true' }),
      ...(activeInvestor !== undefined && { activeInvestor: activeInvestor === 'true' }),
      ...(sectors && { sectors: sectors.split(',') }),
      ...(stage && { stage: stage.split(',') }),
      ...(geography && { geography: geography.split(',') }),
      ...(minCheckSize !== undefined && { minCheckSize: parseInt(minCheckSize) }),
      ...(maxCheckSize !== undefined && { maxCheckSize: parseInt(maxCheckSize) }),
      ...(portfolioFit && { portfolioFit }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
      ...(limit !== undefined && { limit: parseInt(limit) }),
      ...(offset !== undefined && { offset: parseInt(offset) }),
      // If showAll is true, bypass smart filtering
      ...(showAll === 'true' && { showAll: true }),
    };

    const result = await searchStartupMatches(startupId, filters);
    
    res.json({
      success: true,
      data: result,
      message: result.limit_applied 
        ? 'Showing top 25% of matches or matches above 60 (whichever is higher). Use showAll=true to see all matches.'
        : 'Matches retrieved successfully',
    });
  } catch (error) {
    console.error('Error searching startup matches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search matches',
    });
  }
});

/**
 * GET /api/matches/startup/:startupId/stats
 * Get match statistics for a startup
 */
router.get('/startup/:startupId/stats', async (req, res) => {
  try {
    const { startupId } = req.params;
    const stats = await getStartupMatchStats(startupId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting startup match stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get match statistics',
    });
  }
});

/**
 * GET /api/matches/startup/:startupId/top
 * Get top matches for a startup (simplified)
 */
router.get('/startup/:startupId/top', async (req, res) => {
  try {
    const { startupId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const matches = await getTopStartupMatches(startupId, limit);
    
    res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error('Error getting top startup matches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get top matches',
    });
  }
});

// ============================================
// INVESTOR MATCH ROUTES
// ============================================

/**
 * GET /api/matches/investor/:investorId
 * Search matches for an investor with optional filters
 */
router.get('/investor/:investorId', async (req, res) => {
  try {
    const { investorId } = req.params;
    const {
      minScore,
      maxScore,
      confidenceLevel,
      minGODScore,
      maxGODScore,
      godScoreRange,
      sectors,
      stage,
      geography,
      hasRevenue,
      minMRR,
      minARR,
      minGrowthRate,
      minCustomers,
      minTeamSize,
      fundingStage,
      raiseAmountMin,
      raiseAmountMax,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = req.query;

    const filters = {
      ...(minScore !== undefined && { minScore: parseInt(minScore) }),
      ...(maxScore !== undefined && { maxScore: parseInt(maxScore) }),
      ...(confidenceLevel && { confidenceLevel }),
      ...(minGODScore !== undefined && { minGODScore: parseInt(minGODScore) }),
      ...(maxGODScore !== undefined && { maxGODScore: parseInt(maxGODScore) }),
      ...(godScoreRange && { godScoreRange }),
      ...(sectors && { sectors: sectors.split(',') }),
      ...(stage && { stage: stage.split(',').map(s => parseInt(s)) }),
      ...(geography && { geography: geography.split(',') }),
      ...(hasRevenue !== undefined && { hasRevenue: hasRevenue === 'true' }),
      ...(minMRR !== undefined && { minMRR: parseInt(minMRR) }),
      ...(minARR !== undefined && { minARR: parseInt(minARR) }),
      ...(minGrowthRate !== undefined && { minGrowthRate: parseInt(minGrowthRate) }),
      ...(minCustomers !== undefined && { minCustomers: parseInt(minCustomers) }),
      ...(minTeamSize !== undefined && { minTeamSize: parseInt(minTeamSize) }),
      ...(fundingStage && { fundingStage: fundingStage.split(',') }),
      ...(raiseAmountMin !== undefined && raiseAmountMax !== undefined && {
        raiseAmount: {
          min: parseInt(raiseAmountMin),
          max: parseInt(raiseAmountMax),
        },
      }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
      ...(limit !== undefined && { limit: parseInt(limit) }),
      ...(offset !== undefined && { offset: parseInt(offset) }),
    };

    const result = await searchInvestorMatches(investorId, filters);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error searching investor matches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search matches',
    });
  }
});

/**
 * GET /api/matches/investor/:investorId/stats
 * Get match statistics for an investor
 */
router.get('/investor/:investorId/stats', async (req, res) => {
  try {
    const { investorId } = req.params;
    const stats = await getInvestorMatchStats(investorId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting investor match stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get match statistics',
    });
  }
});

/**
 * GET /api/matches/investor/:investorId/top
 * Get top matches for an investor (simplified)
 */
router.get('/investor/:investorId/top', async (req, res) => {
  try {
    const { investorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const matches = await getTopInvestorMatches(investorId, limit);
    
    res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    console.error('Error getting top investor matches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get top matches',
    });
  }
});

// ============================================
// INSIGHTS ROUTES
// ============================================

/**
 * GET /api/matches/startup/:startupId/insights
 * Get AI-powered insights for a startup's matches
 */
router.get('/startup/:startupId/insights', async (req, res) => {
  try {
    const { startupId } = req.params;
    const insights = await getStartupMatchInsights(startupId);
    
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error getting startup insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get insights',
    });
  }
});

/**
 * GET /api/matches/investor/:investorId/insights
 * Get AI-powered insights for an investor's matches
 */
router.get('/investor/:investorId/insights', async (req, res) => {
  try {
    const { investorId } = req.params;
    const insights = await getInvestorMatchInsights(investorId);
    
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error getting investor insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get insights',
    });
  }
});

/**
 * GET /api/matches/:entityType/:entityId/trends
 * Get match trends over time
 */
router.get('/:entityType/:entityId/trends', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    if (entityType !== 'startup' && entityType !== 'investor') {
      return res.status(400).json({
        success: false,
        error: 'entityType must be "startup" or "investor"',
      });
    }
    
    const trends = await getMatchTrends(entityId, entityType, days);
    
    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    console.error('Error getting trends:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trends',
    });
  }
});

// ============================================
// INVESTIGATION ROUTES
// ============================================

/**
 * GET /api/matches/:matchId/breakdown
 * Get detailed breakdown of a match score
 */
router.get('/:matchId/breakdown', async (req, res) => {
  try {
    const { matchId } = req.params;
    const breakdown = await getMatchBreakdown(matchId);
    
    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    console.error('Error getting match breakdown:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get match breakdown',
    });
  }
});

/**
 * GET /api/matches/:matchId/fit
 * Get comprehensive fit analysis for a match
 */
router.get('/:matchId/fit', async (req, res) => {
  try {
    const { matchId } = req.params;
    const fit = await getFitAnalysis(matchId);
    
    res.json({
      success: true,
      data: fit,
    });
  } catch (error) {
    console.error('Error getting fit analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get fit analysis',
    });
  }
});

/**
 * GET /api/matches/portfolio/:investorId/:startupId
 * Get portfolio analysis for an investor-startup pair
 */
router.get('/portfolio/:investorId/:startupId', async (req, res) => {
  try {
    const { investorId, startupId } = req.params;
    const analysis = await getPortfolioAnalysis(investorId, startupId);
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error getting portfolio analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get portfolio analysis',
    });
  }
});

// ============================================
// REPORTS ROUTES
// ============================================

/**
 * GET /api/matches/startup/:startupId/report
 * Generate comprehensive match report for a startup
 */
router.get('/startup/:startupId/report', async (req, res) => {
  try {
    const { startupId } = req.params;
    const {
      includeAllMatches,
      minScore,
      format,
    } = req.query;
    
    const report = await generateStartupMatchReport(startupId, {
      includeAllMatches: includeAllMatches === 'true',
      minScore: minScore ? parseInt(minScore) : undefined,
      format: format || 'json',
    });
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating startup report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report',
    });
  }
});

/**
 * GET /api/matches/investor/:investorId/report
 * Generate comprehensive match report for an investor
 */
router.get('/investor/:investorId/report', async (req, res) => {
  try {
    const { investorId } = req.params;
    const {
      includeAllMatches,
      minScore,
      format,
    } = req.query;
    
    const report = await generateInvestorMatchReport(investorId, {
      includeAllMatches: includeAllMatches === 'true',
      minScore: minScore ? parseInt(minScore) : undefined,
      format: format || 'json',
    });
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating investor report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report',
    });
  }
});

/**
 * GET /api/matches/:entityType/:entityId/export
 * Export matches to CSV
 */
router.get('/:entityType/:entityId/export', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (entityType !== 'startup' && entityType !== 'investor') {
      return res.status(400).json({
        success: false,
        error: 'entityType must be "startup" or "investor"',
      });
    }
    
    const csv = await exportMatchesToCSV(entityId, entityType);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="matches-${entityType}-${entityId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting matches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export matches',
    });
  }
});

module.exports = router;

