# API Endpoint Setup for Scripts Control Panel

The Scripts Control Panel requires a backend API endpoint to execute scripts. Since this is a Vite/React app, you have several options:

## Option 1: Vite Proxy (Development)

Add a proxy in `vite.config.ts` to forward API requests to a Node.js backend:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

## Option 2: Express.js Backend Server

Create a simple Express server (`server.js` or `api/server.js`):

```javascript
const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const cors = require('cors');

const app = express();
const execAsync = promisify(exec);
const PORT = process.env.PORT || 3001;

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

app.post('/api/admin/run-script', async (req, res) => {
  try {
    const { script } = req.body;

    // Security check: only allow whitelisted scripts
    if (!ALLOWED_SCRIPTS.includes(script)) {
      return res.status(403).json({
        success: false,
        error: 'Script not allowed',
      });
    }

    // Determine runner based on extension
    const isTypeScript = script.endsWith('.ts') || script.endsWith('.mjs');
    const runner = isTypeScript ? 'npx tsx' : 'node';
    const scriptPath = `scripts/${script}`;

    console.log(`[Admin] Running script: ${scriptPath}`);

    // Run the script with timeout
    const { stdout, stderr } = await execAsync(
      `${runner} ${scriptPath}`,
      { 
        timeout: 300000, // 5 minute timeout
        cwd: process.cwd(),
        env: { ...process.env },
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
    if (error.killed) {
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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
```

Then run: `node server.js` or add to `package.json`:
```json
{
  "scripts": {
    "api": "node server.js",
    "dev": "vite & npm run api"
  }
}
```

## Option 3: Supabase Edge Functions

Create a Supabase Edge Function at `supabase/functions/run-script/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { exec } from 'https://deno.land/x/exec@v1.1.0/mod.ts';

const ALLOWED_SCRIPTS = [
  'scraper-manager.js',
  // ... same list as above
];

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  const { script } = await req.json();

  if (!ALLOWED_SCRIPTS.includes(script)) {
    return new Response(JSON.stringify({ error: 'Script not allowed' }), {
      status: 403,
    });
  }

  try {
    const isTS = script.endsWith('.ts') || script.endsWith('.mjs');
    const runner = isTS ? 'npx tsx' : 'node';
    const scriptPath = `scripts/${script}`;

    const { output } = await exec(`${runner} ${scriptPath}`, {
      timeout: 300000,
    });

    return new Response(JSON.stringify({
      success: true,
      output: output.slice(-5000),
      script,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

Deploy: `supabase functions deploy run-script`

## Option 4: Manual Execution (Current Fallback)

The component currently falls back to showing the command and copying it to clipboard when the API is unavailable. This is safe but requires manual execution.

## Security Notes

⚠️ **IMPORTANT**: 
- Always whitelist allowed scripts
- Never allow arbitrary script execution
- Use authentication/authorization for the API endpoint
- Consider rate limiting
- Log all script executions
- Use environment variables for sensitive operations

## Recommended Setup

For production, use **Option 2 (Express.js)** with:
- Authentication middleware
- Rate limiting
- Request logging
- Error handling
- Process isolation (consider using Docker containers)


