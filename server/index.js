// --- FILE: server/index.js ---
// Load environment variables first (from project root, not server directory)
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
console.log('[Server Startup] Loading .env from:', envPath);
console.log('[Server Startup] .env file exists:', fs.existsSync(envPath));

// Try to load dotenv - Node.js should find it in parent node_modules
let dotenv;
try {
  dotenv = require('dotenv');
} catch (dotenvError) {
  // If not found, try from root node_modules explicitly
  try {
    dotenv = require(path.join(__dirname, '..', 'node_modules', 'dotenv'));
  } catch (rootError) {
    console.error('[Server Startup] ❌ Could not load dotenv module:', rootError.message);
    console.error('[Server Startup] Please install dotenv: cd .. && npm install dotenv');
  }
}

// Load the .env file
let envResult;
if (dotenv) {
  envResult = dotenv.config({ path: envPath });
} else {
  console.error('[Server Startup] ❌ Cannot load .env - dotenv module not available');
}

if (envResult.error) {
  console.warn('[Server Startup] ⚠️  Error loading .env:', envResult.error.message);
} else {
  console.log('[Server Startup] ✅ .env loaded successfully');
  const loadedVars = Object.keys(envResult.parsed || {});
  console.log('[Server Startup] Loaded', loadedVars.length, 'environment variables');
  const supabaseVars = loadedVars.filter(k => k.includes('SUPABASE'));
  if (supabaseVars.length > 0) {
    console.log('[Server Startup] Supabase variables found:', supabaseVars.join(', '));
  } else {
    console.warn('[Server Startup] ⚠️  No Supabase variables found in .env file');
  }
}

const express = require('express');
const multer = require('multer');
const cors = require('cors');
// fs and path are already declared above

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS with explicit configuration
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// File storage for uploaded documents
const upload = multer({ dest: 'uploads/' });

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper function to get Supabase client with validation
function getSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js');
  
  // Check for all possible environment variable names (VITE_ first since that's the real one)
  const supabaseUrl = process.env.VITE_SUPABASE_URL ||
                      process.env.SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL ||
                      process.env.REACT_APP_SUPABASE_URL;
  
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 
                      process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                      process.env.VITE_SUPABASE_ANON_KEY ||
                      process.env.SUPABASE_ANON_KEY ||
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Debug logging - show all env vars that start with SUPABASE
  console.log('[getSupabaseClient] Environment check:');
  const supabaseEnvVars = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
  console.log('  Found Supabase env vars:', supabaseEnvVars.length > 0 ? supabaseEnvVars.join(', ') : 'NONE');
  console.log('  Resolved URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NONE');
  console.log('  Resolved Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NONE');
  
  if (!supabaseUrl) {
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error('SUPABASE_URL or VITE_SUPABASE_URL environment variable is required. Check .env file in project root.');
  }
  
  if (!supabaseKey) {
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error('SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY environment variable is required. Check .env file in project root.');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '0.1.0'
  });
});

// ============================================================
// Helper: Extract plan from request (JWT verified or dev header)
// PRODUCTION: Only trust verified JWT via Supabase auth.getUser()
// DEV/STAGING: Allow x-user-plan header for testing
// ============================================================
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME;

async function getPlanFromRequest(req) {
  const validPlans = ['free', 'pro', 'elite'];
  
  // Try JWT first (Authorization: Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const supabase = getSupabaseClient();
      
      // SECURE: Use Supabase auth.getUser() to verify token signature
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        // Read plan from verified user metadata
        const plan = user.user_metadata?.plan || user.app_metadata?.plan;
        if (plan && validPlans.includes(plan)) {
          return plan;
        }
      }
      // Token invalid or no plan set - fall through
    } catch (e) {
      console.error('[getPlanFromRequest] JWT verification error:', e.message);
      // Continue to fallbacks
    }
  }
  
  // DEV ONLY: Allow x-user-plan header for testing (NEVER in production)
  if (!IS_PRODUCTION) {
    const headerPlan = req.headers['x-user-plan'];
    if (headerPlan && validPlans.includes(headerPlan)) {
      console.log('[getPlanFromRequest] DEV MODE: Using x-user-plan header:', headerPlan);
      return headerPlan;
    }
  }
  
  // Default: free (unverified users get free tier)
  return 'free';
}

// Plan limits for live-pairings
const PLAN_LIMITS = { free: 1, pro: 3, elite: 10 };

// ============================================================
// GET /api/live-pairings - Live Signal Pairings for landing page
// Returns top startups paired with matching investors
// SERVER-SIDE GATING: Enforces plan limits and field masking
// ============================================================
app.get('/api/live-pairings', async (req, res) => {
  try {
    // Determine plan and enforce limit (await - async JWT verification)
    const plan = await getPlanFromRequest(req);
    const maxLimit = PLAN_LIMITS[plan] || 1;
    const requestedLimit = parseInt(req.query.limit) || maxLimit;
    // Double clamp: enforce plan ceiling AND absolute max of 10
    const limit = Math.min(Math.max(requestedLimit, 1), maxLimit, 10);
    
    const supabase = getSupabaseClient();
    
    // Step 1: Get top startups from v5_sector view
    const { data: startups, error: startupError } = await supabase
      .from('startup_intel_v5_sector')
      .select('id, name, sector_key, investor_signal_sector_0_10, investor_state_sector, sector_momentum_0_10, sector_evidence_0_10, sector_narrative_0_10')
      .not('sector_key', 'is', null)
      .not('investor_signal_sector_0_10', 'is', null)
      .gte('investor_signal_sector_0_10', 5)
      .order('investor_signal_sector_0_10', { ascending: false })
      .limit(50);
    
    if (startupError) {
      console.error('[live-pairings] Startup query error:', startupError);
      return res.status(500).json({ error: 'Failed to fetch startups' });
    }
    
    if (!startups || startups.length === 0) {
      return res.status(200).json([]);
    }
    
    // Step 2: Get investors
    const { data: investors, error: investorError } = await supabase
      .from('investors')
      .select('id, name, sectors, investment_thesis, firm_description_normalized')
      .not('name', 'is', null)
      .limit(200);
    
    if (investorError) {
      console.error('[live-pairings] Investor query error:', investorError);
      return res.status(500).json({ error: 'Failed to fetch investors' });
    }
    
    // Step 3: Create pairings by matching sectors
    const pairings = [];
    const usedStartups = new Set();
    const usedInvestors = new Set();
    
    // Sort startups: 'hot' first, then by signal score
    const sortedStartups = [...startups].sort((a, b) => {
      if (a.investor_state_sector === 'hot' && b.investor_state_sector !== 'hot') return -1;
      if (b.investor_state_sector === 'hot' && a.investor_state_sector !== 'hot') return 1;
      return (b.investor_signal_sector_0_10 || 0) - (a.investor_signal_sector_0_10 || 0);
    });
    
    for (const startup of sortedStartups) {
      if (pairings.length >= limit) break;
      if (usedStartups.has(startup.id)) continue;
      
      const sectorKey = startup.sector_key?.toLowerCase() || '';
      
      // Find matching investor
      const matchingInvestor = investors.find(inv => {
        if (usedInvestors.has(inv.id)) return false;
        
        // Check sectors array
        if (inv.sectors && Array.isArray(inv.sectors)) {
          if (inv.sectors.some(s => s?.toLowerCase()?.includes(sectorKey) || sectorKey.includes(s?.toLowerCase() || ''))) {
            return true;
          }
        }
        // Check investment_thesis
        if (inv.investment_thesis?.toLowerCase()?.includes(sectorKey)) {
          return true;
        }
        // Check firm description
        if (inv.firm_description_normalized?.toLowerCase()?.includes(sectorKey)) {
          return true;
        }
        return false;
      });
      
      if (matchingInvestor) {
        usedStartups.add(startup.id);
        usedInvestors.add(matchingInvestor.id);
        
        // Determine reason based on strongest dimension
        const momentum = startup.sector_momentum_0_10 || 0;
        const evidence = startup.sector_evidence_0_10 || 0;
        const narrative = startup.sector_narrative_0_10 || 0;
        
        let reason = 'Thesis convergence';
        if (momentum >= evidence && momentum >= narrative) {
          reason = 'Capital velocity';
        } else if (evidence >= momentum && evidence >= narrative) {
          reason = 'Stage readiness';
        }
        
        // Confidence = signal / 10, clamped 0-1
        const confidence = Math.min(Math.max((startup.investor_signal_sector_0_10 || 0) / 10, 0), 1);
        
        // Apply field masking based on plan
        // free: mask investor_name, reason, confidence
        // pro: mask reason, confidence
        // elite: show everything
        pairings.push({
          startup_id: startup.id,
          startup_name: startup.name,
          investor_id: plan === 'free' ? null : matchingInvestor.id,
          investor_name: plan === 'free' ? null : matchingInvestor.name,
          reason: plan === 'elite' ? reason : null,
          confidence: plan === 'elite' ? confidence : null,
          sector_key: startup.sector_key,
          created_at: new Date().toISOString()
        });
      }
    }
    
    // Set caching headers based on plan (elite gets fresher data)
    const cacheMaxAge = plan === 'elite' ? 15 : 60;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.set('X-Plan', plan); // Debug header
    res.json(pairings);
    
  } catch (error) {
    console.error('[live-pairings] Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Plan limits for trending/sector endpoint
const TRENDING_LIMITS = { free: 3, pro: 10, elite: 50 };

// ============================================================
// GET /api/trending - Sector/Trending data with tier gating
// Returns startups with sector signals, gated by plan
// ============================================================
app.get('/api/trending', async (req, res) => {
  try {
    // Determine plan and enforce limit
    const plan = await getPlanFromRequest(req);
    const maxLimit = TRENDING_LIMITS[plan] || 3;
    const requestedLimit = parseInt(req.query.limit) || maxLimit;
    const limit = Math.min(Math.max(requestedLimit, 1), maxLimit, 50);
    const sector = req.query.sector || null; // Optional sector filter
    
    const supabase = getSupabaseClient();
    
    // Query startup_intel_v5_sector view with sector filter
    // Available columns: investor_signal_sector_0_10, investor_state_sector, sector_quantile,
    // sector_momentum_0_10, sector_evidence_0_10, sector_narrative_0_10, primary_reason, risk_flag
    let query = supabase
      .from('startup_intel_v5_sector')
      .select('id, name, sector_key, investor_signal_sector_0_10, investor_state_sector, sector_quantile, sector_momentum_0_10, sector_evidence_0_10, sector_narrative_0_10, primary_reason, risk_flag')
      .not('sector_key', 'is', null)
      .not('investor_state_sector', 'is', null);
    
    if (sector) {
      query = query.ilike('sector_key', `%${sector}%`);
    }
    
    const { data: startups, error } = await query
      .order('investor_signal_sector_0_10', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[trending] Query error:', error);
      return res.status(500).json({ error: 'Failed to fetch trending data' });
    }
    
    // Apply field masking based on plan
    // free: name + sector + state only; hide all scores/reasons
    // pro: show investor_signal_sector_0_10 + state; hide sector scores + reasons
    // elite: show everything including sector_quantile, momentum, evidence, narrative, reason, risk
    const maskedStartups = (startups || []).map(s => {
      // Base fields (all tiers)
      const base = {
        id: s.id,
        name: s.name,
        sector_key: s.sector_key,
        investor_state_sector: s.investor_state_sector, // hot/warm/watch/cold
      };
      
      if (plan === 'free') {
        // Free: Only state, no scores
        return base;
      }
      
      if (plan === 'pro') {
        // Pro: Add global signal score
        return {
          ...base,
          investor_signal_sector_0_10: s.investor_signal_sector_0_10,
        };
      }
      
      // Elite: Everything
      return {
        ...base,
        investor_signal_sector_0_10: s.investor_signal_sector_0_10,
        sector_quantile: s.sector_quantile,
        sector_momentum_0_10: s.sector_momentum_0_10,
        sector_evidence_0_10: s.sector_evidence_0_10,
        sector_narrative_0_10: s.sector_narrative_0_10,
        primary_reason: s.primary_reason,
        risk_flag: s.risk_flag,
      };
    });
    
    // Set caching headers based on plan
    const cacheMaxAge = plan === 'elite' ? 30 : 120;
    res.set('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.set('X-Plan', plan);
    res.json({
      plan,
      limit,
      total: maskedStartups.length,
      data: maskedStartups,
    });
    
  } catch (error) {
    console.error('[trending] Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'pyth ai API',
    version: '0.1.0',
    endpoints: [
      'GET /api/health',
      'GET /api',
      'GET /api/live-pairings',
      'GET /api/trending',
      'POST /upload',
      'POST /syndicate',
      'POST /api/syndicates',
      'POST /api/documents',
      'GET /api/matches/startup/:startupId',
      'GET /api/matches/investor/:investorId',
      'GET /api/matches/:matchId/breakdown',
      'GET /api/matches/:entityType/:entityId/insights',
      'GET /api/matches/:entityType/:entityId/report',
      'GET /api/matches/:entityType/:entityId/export',
      'POST /api/ml/training/run',
      'POST /api/rss/refresh',
      'POST /api/rss/discover-startups',
      'POST /api/investors/scrape',
      'POST /api/god-scores/calculate',
      'GET /api/talent/matches/:startupId',
      'POST /api/talent/matches/:startupId/:talentId',
      'GET /api/talent/pool',
      'POST /api/talent/pool',
      'GET /api/market-intelligence/sector-performance',
      'GET /api/market-intelligence/founder-patterns',
      'GET /api/market-intelligence/benchmark/:startupId',
      'GET /api/market-intelligence/key-variables'
    ]
  });
});

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Syndicate route (legacy)
app.post('/syndicate', (req, res) => {
  const { name, email, message } = req.body;
  const record = `${new Date().toISOString()} - ${name}, ${email}: ${message}\n`;
  fs.appendFileSync('syndicates.txt', record);
  res.json({ success: true });
});

// API-style syndicate route
app.post('/api/syndicates', (req, res) => {
  const { name, email, message } = req.body;
  const record = `${new Date().toISOString()} - ${name}, ${email}: ${message}\n`;
  fs.appendFileSync('syndicates.txt', record);
  res.json({ success: true });
});

// API-style document upload route
app.post('/api/documents', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Match API routes
const matchesRouter = require('./routes/matches');
app.use('/api/matches', matchesRouter);

// Talent matching API routes
const talentRouter = require('./routes/talent');
app.use('/api/talent', talentRouter);

// Market intelligence API routes
const marketIntelligenceRouter = require('./routes/marketIntelligence');
app.use('/api/market-intelligence', marketIntelligenceRouter);

// Intelligence API routes (Pythh Brain v1 - read-only)
const intelligenceRouter = require('./routes/intelligence');
app.use('/api', intelligenceRouter);

// Helper function to spawn automation scripts
function spawnAutomationScript(scriptName, description) {
  const { spawn } = require('child_process');
  const path = require('path');
  const rootDir = path.join(__dirname, '..');
  const scriptPath = path.join(rootDir, scriptName);
  
  const process = spawn('node', [scriptPath], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    shell: true
  });
  
  process.stdout.on('data', (data) => {
    console.log(`[${description}] ${data.toString()}`);
  });
  
  process.stderr.on('data', (data) => {
    console.error(`[${description} Error] ${data.toString()}`);
  });
  
  process.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ ${description} completed successfully`);
    } else {
      console.error(`❌ ${description} exited with code ${code}`);
    }
  });
  
  process.unref();
  return process;
}

// RSS refresh endpoint - actually runs the scraper
app.post('/api/rss/refresh', async (req, res) => {
  try {
    console.log('📡 RSS refresh triggered');
    spawnAutomationScript('run-rss-scraper.js', 'RSS Scraper');
    res.json({ 
      success: true, 
      message: 'RSS scraper started. Check server logs for progress.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering RSS refresh:', error);
    res.status(500).json({ error: 'Failed to refresh RSS feeds', message: error.message });
  }
});

// Discover startups from RSS endpoint - actually runs the discovery script
app.post('/api/rss/discover-startups', async (req, res) => {
  try {
    console.log('🚀 Startup discovery triggered');
    spawnAutomationScript('discover-startups-from-rss.js', 'Startup Discovery');
    res.json({ 
      success: true, 
      message: 'Startup discovery started. Check server logs for progress.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering startup discovery:', error);
    res.status(500).json({ error: 'Failed to start startup discovery', message: error.message });
  }
});

// Investor scraper endpoint
app.post('/api/investors/scrape', async (req, res) => {
  try {
    console.log('💼 Investor scraper triggered');
    spawnAutomationScript('investor-mega-scraper.js', 'Investor Scraper');
    res.json({ 
      success: true, 
      message: 'Investor scraper started. Check server logs for progress.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering investor scraper:', error);
    res.status(500).json({ error: 'Failed to start investor scraper', message: error.message });
  }
});

// GOD score calculation endpoint
app.post('/api/god-scores/calculate', async (req, res) => {
  try {
    console.log('⚡ GOD score calculation triggered');
    spawnAutomationScript('calculate-component-scores.js', 'GOD Score Calculation');
    res.json({ 
      success: true, 
      message: 'GOD score calculation started. Check server logs for progress.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering GOD score calculation:', error);
    res.status(500).json({ error: 'Failed to start GOD score calculation', message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// URL SUBMISSION WITH PYTH INFERENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════
app.post('/api/startup/enrich-url', async (req, res) => {
  const startTime = Date.now();
  const supabase = getSupabaseClient();
  
  try {
    const { url, startupId } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    
    console.log(`🔥 Enriching URL with inference engine: ${url}`);
    
    // Log to ai_logs for admin visibility (non-blocking)
    try {
      await supabase.from('ai_logs').insert({
        operation: 'inference_engine',
        model: 'pyth_inference',
        status: 'pending',
        error_message: JSON.stringify({ action: 'enrich_url_start', url, startupId, started_at: new Date().toISOString() })
      });
    } catch (logErr) { /* ignore logging errors */ }
    
    // Import inference extractor
    const { extractInferenceData } = require('../lib/inference-extractor');
    const axios = require('axios');
    
    // Fetch website content
    let websiteContent = '';
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const response = await axios.get(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      
      // Strip HTML tags
      websiteContent = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000);
    } catch (fetchError) {
      console.log(`⚠️  Could not fetch ${url}: ${fetchError.message}`);
    }
    
    // Run inference engine
    const inference = extractInferenceData(websiteContent, url) || {};
    
    // Calculate GOD score from inference
    const SECTOR_WEIGHTS = {
      'AI/ML': 15, 'FinTech': 12, 'HealthTech': 12, 'CleanTech': 10, 'DevTools': 10,
      'SaaS': 8, 'Cybersecurity': 8, 'E-Commerce': 6, 'LegalTech': 6, 'Gaming': 5,
    };
    
    // Determine data tier
    const hasRichData = !!(
      inference.funding_amount ||
      inference.customer_count ||
      inference.has_revenue ||
      (inference.execution_signals?.length >= 3)
    );
    const hasSomeData = !!(
      inference.sectors?.length > 0 ||
      inference.team_signals?.length > 0 ||
      inference.is_launched ||
      inference.has_customers
    );
    const tier = hasRichData ? 'A' : (hasSomeData ? 'B' : 'C');
    
    let godScore = 40; // Default Tier C
    let scores = { vision: 10, market: 10, traction: 8, team: 8, product: 8 };
    
    if (tier === 'A') {
      // Full scoring
      let vision = 0, market = 0, traction = 0, team = 0, product = 0;
      if (inference.problem_keywords?.length > 0) vision += 10;
      if (inference.problem_severity_estimate >= 7) vision += 10;
      vision += 5;
      vision = Math.min(25, vision);
      
      if (inference.sectors?.length > 0) {
        for (const sector of inference.sectors) {
          market = Math.max(market, SECTOR_WEIGHTS[sector] || 5);
        }
        market += 5;
      }
      market = Math.min(25, market);
      
      if (inference.has_revenue) traction += 15;
      if (inference.has_customers) traction += 8;
      if (inference.customer_count && inference.customer_count > 10) traction += 5;
      if (inference.growth_rate) traction += 5;
      if (inference.funding_amount) {
        const amt = parseFloat(String(inference.funding_amount));
        if (amt >= 10000000) traction += 10;
        else if (amt >= 1000000) traction += 5;
      }
      traction = Math.min(25, traction);
      
      if (inference.has_technical_cofounder) team += 10;
      if (inference.credential_signals?.length > 0) {
        team += Math.min(10, inference.credential_signals.length * 3);
      }
      if (inference.grit_signals?.length > 0) {
        team += Math.min(5, inference.grit_signals.length * 2);
      }
      team = Math.min(25, team);
      
      if (inference.is_launched) product += 15;
      if (inference.has_demo) product += 5;
      product = Math.min(20, product);
      
      godScore = Math.min(100, vision + market + traction + team + product + (tier === 'A' && (vision + market + traction + team + product) >= 60 ? 5 : 0));
      scores = { vision, market, traction, team, product };
    } else if (tier === 'B') {
      // Capped at 55
      let base = 40;
      if (inference.sectors?.length > 0) {
        for (const sector of inference.sectors) {
          base = Math.max(base, 40 + (SECTOR_WEIGHTS[sector] || 0) / 2);
        }
      }
      if (inference.is_launched) base += 4;
      if (inference.has_demo) base += 2;
      if (inference.has_customers) base += 3;
      if (inference.has_technical_cofounder) base += 2;
      if (inference.team_signals?.length > 0) base += 2;
      godScore = Math.min(55, Math.round(base));
      scores = {
        vision: 12,
        market: Math.min(20, (SECTOR_WEIGHTS[inference.sectors?.[0]] || 5)),
        traction: inference.is_launched ? 15 : 8,
        team: inference.has_technical_cofounder ? 15 : 8,
        product: (inference.is_launched ? 10 : 5) + (inference.has_demo ? 5 : 0)
      };
    }
    
    // If we have a startupId, update the database
    if (startupId) {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update({
          sectors: inference.sectors || ['Technology'],
          is_launched: inference.is_launched || false,
          has_demo: inference.has_demo || false,
          has_technical_cofounder: inference.has_technical_cofounder || false,
          total_god_score: godScore,
          vision_score: scores.vision,
          market_score: scores.market,
          traction_score: scores.traction,
          team_score: scores.team,
          product_score: scores.product,
          extracted_data: {
            ...inference,
            data_tier: tier,
            inference_method: 'pyth_inference_engine',
            enriched_at: new Date().toISOString(),
          },
        })
        .eq('id', startupId);
      
      if (updateError) {
        console.error('Failed to update startup:', updateError);
      } else {
        console.log(`✅ Updated startup ${startupId} with GOD score ${godScore} (Tier ${tier})`);
      }
    }
    
    // Log success to ai_logs for admin visibility (non-blocking)
    const duration = Date.now() - startTime;
    try {
      await supabase.from('ai_logs').insert({
        operation: 'inference_engine',
        model: 'pyth_inference',
        status: 'success',
        error_message: JSON.stringify({ 
          action: 'enrich_url_complete',
          url, 
          startupId, 
          godScore, 
          tier, 
          signals_found: (inference.team_signals?.length || 0) + (inference.execution_signals?.length || 0),
          duration_ms: duration,
          completed_at: new Date().toISOString() 
        })
      });
    } catch (logErr) { /* ignore */ }
    
    res.json({
      success: true,
      godScore,
      tier,
      scores,
      inference: {
        sectors: inference.sectors,
        is_launched: inference.is_launched,
        has_demo: inference.has_demo,
        has_technical_cofounder: inference.has_technical_cofounder,
        has_revenue: inference.has_revenue,
        has_customers: inference.has_customers,
        funding_amount: inference.funding_amount,
        team_signals: inference.team_signals,
        credential_signals: inference.credential_signals,
        execution_signals: inference.execution_signals,
      }
    });
  } catch (error) {
    console.error('Error enriching URL:', error);
    
    // Log failure to ai_logs (non-blocking)
    try {
      const supabase = getSupabaseClient();
      await supabase.from('ai_logs').insert({
        operation: 'inference_engine',
        model: 'pyth_inference',
        status: 'error',
        error_message: JSON.stringify({ action: 'enrich_url_error', url: req.body?.url, error: error.message, failed_at: new Date().toISOString() })
      });
    } catch (logErr) { /* ignore */ }
    
    res.status(500).json({ error: 'Failed to enrich URL', message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: INFERENCE ENGINE STATUS
// ═══════════════════════════════════════════════════════════════════════════
app.get('/api/admin/inference-status', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    // Get recent enrichment logs
    const { data: logs } = await supabase
      .from('ai_logs')
      .select('*')
      .eq('operation', 'inference_engine')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get stats
    const { count: totalEnriched } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .not('extracted_data->inference_method', 'is', null);
    
    const { count: pendingEnrichment } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('total_god_score', 45)
      .is('extracted_data', null);
    
    const { count: recentErrors } = await supabase
      .from('ai_logs')
      .select('*', { count: 'exact', head: true })
      .eq('operation', 'inference_engine')
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());
    
    // Parse error_message JSON and get average duration from recent successes
    const successLogs = logs?.filter(l => l.status === 'success') || [];
    let avgDuration = null;
    if (successLogs.length > 0) {
      const durations = successLogs.map(l => {
        try { return JSON.parse(l.error_message)?.duration_ms; } catch { return null; }
      }).filter(Boolean);
      if (durations.length > 0) {
        avgDuration = Math.round(durations.reduce((a, d) => a + d, 0) / durations.length);
      }
    }
    
    res.json({
      status: recentErrors > 5 ? 'degraded' : 'healthy',
      stats: {
        total_enriched: totalEnriched || 0,
        pending_enrichment: pendingEnrichment || 0,
        errors_last_24h: recentErrors || 0,
        avg_duration_ms: avgDuration,
      },
      recent_logs: logs?.slice(0, 10).map(l => {
        let parsed = {};
        try { parsed = JSON.parse(l.error_message); } catch {}
        return {
          action: parsed.action,
          status: l.status,
          url: parsed.url,
          godScore: parsed.godScore,
          tier: parsed.tier,
          duration_ms: parsed.duration_ms,
          created_at: l.created_at,
        };
      }) || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inference status', message: error.message });
  }
});

// Generic scraper endpoint - runs any scraper script
app.post('/api/scrapers/run', async (req, res) => {
  try {
    const { scriptName, description } = req.body;
    
    if (!scriptName) {
      return res.status(400).json({ error: 'scriptName is required' });
    }


    console.log(`🔄 Scraper triggered: ${description || scriptName}`);
    spawnAutomationScript(scriptName, description || scriptName);
    
    res.json({ 
      success: true, 
      message: `${description || scriptName} started. Check server logs for progress.`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering scraper:', error);
    res.status(500).json({ error: 'Failed to start scraper', message: error.message });
  }
});

// ML Recommendation apply endpoint
app.post('/api/ml/recommendations/:id/apply', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get Supabase client with error handling
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (clientError) {
      console.error('[API /api/ml/recommendations/:id/apply] Error creating Supabase client:', clientError.message);
      console.error('[API] Available Supabase env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: clientError.message,
        details: 'The server could not connect to Supabase. Please check environment variables in .env file.'
      });
    }

    // Fetch recommendation
    const { data: recommendation, error: fetchError } = await supabase
      .from('ml_recommendations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    if (recommendation.status === 'applied') {
      return res.status(400).json({ error: 'Recommendation already applied' });
    }

    // Update status to applied
    const { error: updateError } = await supabase
      .from('ml_recommendations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
        applied_by: req.body.userId || 'admin'
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // TODO: Actually apply the weight changes to the algorithm
    // This would involve updating environment variables or a config table
    console.log('Applied recommendation:', recommendation);

    res.json({ 
      success: true, 
      message: 'Recommendation applied successfully',
      recommendation 
    });
  } catch (error) {
    console.error('Error applying recommendation:', error);
    res.status(500).json({ error: 'Failed to apply recommendation', message: error.message });
  }
});

// GOD weights save endpoint
app.post('/api/god-weights/save', async (req, res) => {
  try {
    const { weights, userId } = req.body;
    
    if (!weights) {
      return res.status(400).json({ error: 'weights are required' });
    }

    const supabase = getSupabaseClient();

    // Save to algorithm_weight_history
    const { error: historyError } = await supabase
      .from('algorithm_weight_history')
      .insert({
        applied_by: userId || 'admin',
        applied_at: new Date().toISOString(),
        weight_updates: [{
          component: 'all',
          new_weight: weights,
          reason: 'Manual weight adjustment via GOD Settings'
        }]
      });

    if (historyError) {
      console.warn('Failed to save weight history:', historyError);
    }

    // TODO: Actually update the algorithm configuration
    // This could update environment variables or a config table

    res.json({ 
      success: true, 
      message: 'GOD algorithm weights saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving GOD weights:', error);
    res.status(500).json({ error: 'Failed to save weights', message: error.message });
  }
});

// ML Training endpoint
app.post('/api/ml/training/run', async (req, res) => {
  try {
    console.log('🤖 ML Training triggered via API');
    
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    // Get the root directory (one level up from server/)
    const rootDir = path.join(__dirname, '..');
    const trainingScript = path.join(rootDir, 'run-ml-training.js');
    
    // Check if script exists
    if (!fs.existsSync(trainingScript)) {
      console.error(`❌ Training script not found: ${trainingScript}`);
      return res.status(500).json({ 
        error: 'Training script not found',
        message: `Expected file: ${trainingScript}` 
      });
    }
    
    // Check if tsx is available (for TypeScript support)
    const rootPackageJson = path.join(rootDir, 'package.json');
    let useTsx = false;
    if (fs.existsSync(rootPackageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
        if (pkg.dependencies && (pkg.dependencies['tsx'] || (pkg.devDependencies && pkg.devDependencies['tsx']))) {
          useTsx = true;
        }
      } catch (e) {
        console.warn('Could not parse package.json:', e.message);
      }
    }
    
    // Try to use tsx if available, otherwise use node
    // If the script uses ES modules, we might need tsx
    const command = useTsx ? 'npx' : 'node';
    const args = useTsx ? ['tsx', trainingScript] : [trainingScript];
    
    // Spawn the training script as a child process
    const trainingProcess = spawn(command, args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false, // Changed to false for better error handling
      shell: true // Use shell for npx to work
    });
    
    // Log output from the training process
    trainingProcess.stdout.on('data', (data) => {
      console.log(`[ML Training] ${data.toString()}`);
    });
    
    trainingProcess.stderr.on('data', (data) => {
      console.error(`[ML Training Error] ${data.toString()}`);
    });
    
    trainingProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ML Training cycle completed successfully');
      } else {
        console.error(`❌ ML Training cycle exited with code ${code}`);
      }
    });
    
    // Don't wait for the process - let it run in background
    trainingProcess.unref();
    
    // Return immediately - training runs in background
    res.json({ 
      success: true, 
      message: 'ML training cycle started. Check server logs for progress.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting ML training:', error);
    res.status(500).json({ 
      error: 'Failed to start ML training',
      message: error.message 
    });
  }
});

// === PRODUCTION: Serve Frontend Static Files ===
// This serves the built React app from /app/dist in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log('[Server] Serving static files from:', distPath);
  app.use(express.static(distPath));
  
  // SPA fallback - serve index.html for all non-API routes
  // Use regex pattern instead of '*' for Express 5 / path-to-regexp compatibility
  app.get(/^(?!\/api\/)(?!\/uploads\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('[Server] No dist folder found - API-only mode');
  
  // 404 handler for API-only mode
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server with error handling
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  });

  // Handle server errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
