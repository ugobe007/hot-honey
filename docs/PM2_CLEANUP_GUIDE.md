# PM2 & Scripts Cleanup Guide

## Overview

This guide helps you clean up the Hot Match PM2 processes and reorganize scripts into a maintainable structure.

## Current State

- **PM2 Processes:** 19 total (7 running, 12 crashed/stopped)
- **Scripts:** 330+ files scattered across root and scripts/
- **Issues:** Too many processes, crashed services, disorganized scripts

## Target State

- **PM2 Processes:** 5-6 core daemons
- **Scripts:** Organized into `core/`, `cli/`, `cron/`, `archive/`
- **Monitoring:** Single consolidated autopilot script

## Step-by-Step Cleanup

### Step 1: Run the Cleanup Script

```bash
node scripts/cleanup-pm2-and-scripts.js
```

This will:
- ✅ Delete 12 crashed PM2 processes
- ✅ Create new folder structure
- ✅ Archive utilities and deprecated scripts
- ✅ Save PM2 state

### Step 2: Review PM2 Status

```bash
pm2 list
pm2 logs --lines 50
```

You should see only the 5-7 core processes running.

### Step 3: Start the New Autopilot

```bash
pm2 start scripts/core/autopilot.js --name autopilot
pm2 save
```

The autopilot will:
- Monitor all PM2 processes every 5 minutes
- Auto-restart crashed processes
- Generate daily reports at 9 AM
- Check database health

### Step 4: Verify Core Processes

```bash
# Check what PM2 is running
pm2 list

# Check logs
pm2 logs autopilot --lines 20
pm2 logs orchestrator --lines 20
pm2 logs match-processor --lines 20
```

## New PM2 Process Structure

### Core Processes (5-6)

1. **hot-match-server** - Main web server
2. **match-processor** - Match calculations (queue-processor-v16.js)
3. **orchestrator** - Scraping + RSS (unified-scraper-orchestrator.js)
4. **enrichment-pipeline** - Data enrichment (enrichment-orchestrator.js)
5. **autopilot** - Health monitoring + auto-recovery (NEW)

### Starting Processes

```bash
# Start all core processes
pm2 start scripts/core/queue-processor-v16.js --name match-processor
pm2 start scripts/core/unified-scraper-orchestrator.js --name orchestrator -- --daemon
pm2 start scripts/core/enrichment-orchestrator.js --name enrichment-pipeline
pm2 start scripts/core/autopilot.js --name autopilot

# Save PM2 configuration
pm2 save
```

## Script Organization

### `scripts/core/` - PM2 Daemon Scripts
- `queue-processor-v16.js` - Match processing
- `unified-scraper-orchestrator.js` - Scraping orchestration
- `enrichment-orchestrator.js` - Data enrichment
- `autopilot.js` - Health monitoring (NEW)
- `god-score-v5-tiered.js` - GOD scoring
- `simple-rss-scraper.js` - RSS scraping

### `scripts/cli/` - Manual Command-Line Tools
- `cleanup-database.js`
- `export-data.js`
- `import-investors.js`
- `run-enrichment.js`

### `scripts/cron/` - Scheduled Tasks
- `daily-report.js` - Run via crontab
- `weekly-cleanup.js` - Run via crontab

### `scripts/archive/` - Old Scripts
- `utilities/` - 212 utility scripts (archived)
- `deprecated/` - Old versions (archived)
- `one-off/` - Migration scripts (archived)

## Autopilot Features

The new `autopilot.js` consolidates 5 old processes:

### Health Monitoring (Every 5 Minutes)
- ✅ Check PM2 process status
- ✅ Check database connection
- ✅ Get system statistics (startups, investors, matches)
- ✅ Auto-restart crashed processes

### Auto-Recovery
- Restarts crashed processes automatically
- Max 3 restart attempts per process
- Logs all recovery actions

### Daily Reports (9 AM)
- Platform metrics
- PM2 process status
- Data quality metrics

### Self-Healing
- Graceful error handling
- Won't crash on errors
- Exponential backoff on failures

## Monitoring Commands

```bash
# View autopilot logs
pm2 logs autopilot

# View all logs
pm2 logs

# Check process status
pm2 status

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all
```

## Troubleshooting

### If autopilot crashes
```bash
pm2 restart autopilot
pm2 logs autopilot --lines 50
```

### If processes won't start
```bash
# Check script paths
pm2 show <process-name> | grep "script path"

# Check for errors
pm2 logs <process-name> --err --lines 50
```

### If cleanup script fails
```bash
# Manually delete processes
pm2 delete <process-name>

# Manually create folders
mkdir -p scripts/core scripts/cli scripts/cron scripts/archive
```

## Next Steps

1. ✅ Run cleanup script
2. ✅ Start autopilot
3. ✅ Monitor for 24 hours
4. ✅ Review daily reports
5. ✅ Adjust monitoring intervals if needed

## Notes

- The autopilot is designed to be resilient and self-healing
- It won't crash even if individual checks fail
- All errors are logged but don't stop the monitoring loop
- Daily reports run automatically at 9 AM


