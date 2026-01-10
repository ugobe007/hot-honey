/**
 * Market Intelligence API Routes
 * 
 * Provides REST API endpoints for market intelligence and analytics
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Fallback credentials (same as talent.js)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in market intelligence router');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/market-intelligence/sector-performance
 * Get sector performance metrics
 */
router.get('/sector-performance', async (req, res) => {
  try {
    const { sector, days = 90 } = req.query;

    // Get startups with GOD scores
    let query = supabase
      .from('startup_uploads')
      .select('sectors, total_god_score, mrr, growth_rate_monthly, revenue_annual, stage')
      .not('total_god_score', 'is', null)
      .eq('status', 'approved');

    if (sector) {
      query = query.contains('sectors', [sector]);
    }

    const { data: startups, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch startups', details: error });
    }

    // Aggregate by sector
    const sectorStats = {};
    (startups || []).forEach(startup => {
      const sectors = startup.sectors || [];
      sectors.forEach(sectorName => {
        if (!sectorStats[sectorName]) {
          sectorStats[sectorName] = {
            sector: sectorName,
            startup_count: 0,
            avg_god_score: 0,
            total_god_score: 0,
            avg_mrr: 0,
            total_mrr: 0,
            mrr_count: 0,
            avg_growth_rate: 0,
            total_growth_rate: 0,
            growth_count: 0
          };
        }
        const stats = sectorStats[sectorName];
        stats.startup_count += 1;
        if (startup.total_god_score) {
          stats.total_god_score += startup.total_god_score;
        }
        if (startup.mrr) {
          stats.total_mrr += startup.mrr;
          stats.mrr_count += 1;
        }
        if (startup.growth_rate_monthly) {
          stats.total_growth_rate += startup.growth_rate_monthly;
          stats.growth_count += 1;
        }
      });
    });

    // Calculate averages
    const results = Object.values(sectorStats).map(stats => ({
      ...stats,
      avg_god_score: stats.startup_count > 0 ? stats.total_god_score / stats.startup_count : 0,
      avg_mrr: stats.mrr_count > 0 ? stats.total_mrr / stats.mrr_count : 0,
      avg_growth_rate: stats.growth_count > 0 ? stats.total_growth_rate / stats.growth_count : 0
    })).sort((a, b) => b.avg_god_score - a.avg_god_score);

    res.json({ sectors: results, total: results.length });
  } catch (error) {
    console.error('Error fetching sector performance:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/market-intelligence/founder-patterns
 * Get founder attribute patterns
 */
router.get('/founder-patterns', async (req, res) => {
  try {
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('extracted_data, total_god_score, sectors')
      .not('total_god_score', 'is', null)
      .eq('status', 'approved');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch startups', details: error });
    }

    // Analyze founder patterns
    const courageDistribution = { low: 0, moderate: 0, high: 0, exceptional: 0, unknown: 0 };
    const intelligenceDistribution = { low: 0, moderate: 0, high: 0, exceptional: 0, unknown: 0 };
    const courageScores = [];
    const intelligenceScores = [];

    (startups || []).forEach(startup => {
      const extracted = startup.extracted_data || {};
      const courage = extracted.founder_courage || 'unknown';
      const intelligence = extracted.founder_intelligence || 'unknown';

      courageDistribution[courage] = (courageDistribution[courage] || 0) + 1;
      intelligenceDistribution[intelligence] = (intelligenceDistribution[intelligence] || 0) + 1;

      if (startup.total_god_score) {
        if (courage !== 'unknown') {
          courageScores.push({ courage, score: startup.total_god_score });
        }
        if (intelligence !== 'unknown') {
          intelligenceScores.push({ intelligence, score: startup.total_god_score });
        }
      }
    });

    // Calculate average scores by attribute
    const courageAverages = {};
    const intelligenceAverages = {};

    Object.keys(courageDistribution).forEach(courage => {
      const scores = courageScores.filter(s => s.courage === courage).map(s => s.score);
      if (scores.length > 0) {
        courageAverages[courage] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    Object.keys(intelligenceDistribution).forEach(intelligence => {
      const scores = intelligenceScores.filter(s => s.intelligence === intelligence).map(s => s.score);
      if (scores.length > 0) {
        intelligenceAverages[intelligence] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });

    res.json({
      courage_distribution: courageDistribution,
      intelligence_distribution: intelligenceDistribution,
      courage_averages: courageAverages,
      intelligence_averages: intelligenceAverages,
      total_startups: startups?.length || 0
    });
  } catch (error) {
    console.error('Error fetching founder patterns:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/market-intelligence/benchmark/:startupId
 * Benchmark a startup against peers
 */
router.get('/benchmark/:startupId', async (req, res) => {
  try {
    const { startupId } = req.params;

    // Get startup data
    const { data: startup, error: startupError } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('id', startupId)
      .single();

    if (startupError || !startup) {
      return res.status(404).json({ error: 'Startup not found' });
    }

    // Get peer startups (same sector and stage)
    const sectors = startup.sectors || [];
    const stage = startup.stage;

    let peerQuery = supabase
      .from('startup_uploads')
      .select('total_god_score, mrr, growth_rate_monthly, revenue_annual, team_size')
      .not('total_god_score', 'is', null)
      .eq('status', 'approved')
      .neq('id', startupId);

    if (sectors.length > 0) {
      peerQuery = peerQuery.overlaps('sectors', sectors);
    }
    if (stage) {
      peerQuery = peerQuery.eq('stage', stage);
    }

    const { data: peers, error: peerError } = await peerQuery;

    if (peerError) {
      return res.status(500).json({ error: 'Failed to fetch peers', details: peerError });
    }

    // Calculate benchmarks
    const peerScores = (peers || []).map(p => p.total_god_score).filter(s => s);
    const peerMRRs = (peers || []).map(p => p.mrr).filter(m => m);
    const peerGrowthRates = (peers || []).map(p => p.growth_rate_monthly).filter(g => g);

    const benchmark = {
      your_startup: {
        name: startup.name,
        god_score: startup.total_god_score || 0,
        mrr: startup.mrr || 0,
        growth_rate: startup.growth_rate_monthly || 0
      },
      peer_averages: {
        avg_god_score: peerScores.length > 0 ? peerScores.reduce((a, b) => a + b, 0) / peerScores.length : 0,
        avg_mrr: peerMRRs.length > 0 ? peerMRRs.reduce((a, b) => a + b, 0) / peerMRRs.length : 0,
        avg_growth_rate: peerGrowthRates.length > 0 ? peerGrowthRates.reduce((a, b) => a + b, 0) / peerGrowthRates.length : 0
      },
      peer_medians: {
        median_god_score: peerScores.length > 0 ? peerScores.sort((a, b) => a - b)[Math.floor(peerScores.length / 2)] : 0,
        median_mrr: peerMRRs.length > 0 ? peerMRRs.sort((a, b) => a - b)[Math.floor(peerMRRs.length / 2)] : 0,
        median_growth_rate: peerGrowthRates.length > 0 ? peerGrowthRates.sort((a, b) => a - b)[Math.floor(peerGrowthRates.length / 2)] : 0
      },
      percentile: {
        god_score: peerScores.length > 0 ? (peerScores.filter(s => s < (startup.total_god_score || 0)).length / peerScores.length) * 100 : 50
      },
      peer_count: peers?.length || 0
    };

    res.json(benchmark);
  } catch (error) {
    console.error('Error benchmarking startup:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

/**
 * GET /api/market-intelligence/key-variables
 * Get tracked key variables
 */
router.get('/key-variables', async (req, res) => {
  try {
    const { variableName, category, days = 30 } = req.query;

    let query = supabase
      .from('key_variables_tracking')
      .select('*')
      .gte('measurement_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('measurement_date', { ascending: false });

    if (variableName) {
      query = query.eq('variable_name', variableName);
    }
    if (category) {
      query = query.eq('variable_category', category);
    }

    const { data: variables, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch variables', details: error });
    }

    res.json({ variables: variables || [], total: variables?.length || 0 });
  } catch (error) {
    console.error('Error fetching key variables:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;





