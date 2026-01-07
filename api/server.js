/**
 * Hot Match Admin API Server
 * 
 * Provides API endpoints for the Scripts Control Panel
 * 
 * Usage:
 *   npm install express cors
 *   node api/server.js
 * 
 * Or add to package.json:
 *   "scripts": {
 *     "api": "node api/server.js"
 *   }
 */

require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const cors = require('cors');
const path = require('path');

const app = express();
const execAsync = promisify(exec);
const PORT = process.env.API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Whitelist of allowed scripts (security!)
const ALLOWED_SCRIPTS = [
  'scraper-manager.js',
  'incremental-match-updater.js',
  'safeguard-match-count.ts',
  'ingest-signals.ts',
  'notifications.ts',
  'enrich-investor-stats.ts',
  'enrich-startups-inference.js',
  'normalize-sectors.ts',
  'database-cleanup.js',
  'investor-cleanup.js',
  'fix-rss-sources.ts',
  'daily-report.ts',
  'daily-health-email.js',
  'investor-lookup.js',
  'recalculate-scores.ts',
  'force-recalculate-scores.ts',
  'apply-enrichment.js',
  'export-investors-missing-data.js',
  'add-vc-firms-from-list.js',
  'process-vc-firms-table.js',
  'startup-press-enrichment.mjs',
];

// POST endpoint to run scripts
app.post('/api/admin/run-script', async (req, res) => {
  try {
    const { script } = req.body;

    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script name is required',
      });
    }

    // Security check: only allow whitelisted scripts
    if (!ALLOWED_SCRIPTS.includes(script)) {
      console.warn(`[Admin] Blocked unauthorized script: ${script}`);
      return res.status(403).json({
        success: false,
        error: `Script "${script}" is not allowed. Only whitelisted scripts can be executed.`,
      });
    }

    // Determine runner based on extension
    const isTypeScript = script.endsWith('.ts');
    const isESModule = script.endsWith('.mjs');
    let runner;
    if (isTypeScript) {
      runner = 'npx tsx';
    } else if (isESModule) {
      runner = 'node --experimental-modules';
    } else {
      runner = 'node';
    }
    const scriptPath = path.join(process.cwd(), 'scripts', script);

    console.log(`[Admin] Running script: ${scriptPath}`);

    // Run the script with timeout
    const { stdout, stderr } = await execAsync(
      `${runner} ${scriptPath}`,
      { 
        timeout: 300000, // 5 minute timeout
        cwd: process.cwd(),
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    const output = stdout + (stderr ? `\nStderr: ${stderr}` : '');
    
    console.log(`[Admin] Script completed: ${script}`);

    return res.json({
      success: true,
      output: output.slice(-5000), // Last 5000 chars
      script,
    });

  } catch (error) {
    console.error(`[Admin] Script error:`, error);

    // Check if it's a timeout
    if (error.killed || error.signal === 'SIGTERM') {
      return res.status(500).json({
        success: false,
        error: 'Script timed out (5 minute limit)',
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to run script',
      stderr: error.stderr?.slice(-2000),
    });
  }
});

// GET endpoint to list available scripts
app.get('/api/admin/run-script', (req, res) => {
  return res.json({
    scripts: ALLOWED_SCRIPTS,
    count: ALLOWED_SCRIPTS.length,
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Hot Match Admin API running on http://localhost:${PORT}`);
  console.log(`📋 ${ALLOWED_SCRIPTS.length} scripts whitelisted`);
  console.log(`⚠️  Security: Only whitelisted scripts can be executed`);
});

