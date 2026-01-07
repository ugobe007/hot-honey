// --- FILE: server/index.js ---
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS
app.use(cors());
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '0.1.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Hot Money Honey API',
    version: '0.1.0',
    endpoints: [
      'GET /api/health',
      'GET /api',
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
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

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

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

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
    
    // Check if tsx is available (for TypeScript support)
    const rootPackageJson = path.join(rootDir, 'package.json');
    let useTsx = false;
    if (fs.existsSync(rootPackageJson)) {
      const pkg = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
      if (pkg.dependencies && (pkg.dependencies['tsx'] || pkg.devDependencies && pkg.devDependencies['tsx'])) {
        useTsx = true;
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
      detached: true,
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
