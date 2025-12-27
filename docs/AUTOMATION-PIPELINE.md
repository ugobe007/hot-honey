# Hot Honey Automation Pipeline

## Overview
Fully automated, zero AI API costs. All pattern matching and math.

## Every 2 Hours (Cron)

| Time | Service | Purpose |
|------|---------|---------|
| :45 | `inference-enrichment` | Pattern matching extraction |
| :00 | `score-recalc` | Force recalculate GOD scores |

### Inference Enrichment (:45)
- Extracts: launched status, revenue signals, team signals, MRR
- Script: `run-inference-enrichment.js`
- Method: Regex/pattern matching (NO AI)

### Score Recalculation (:00)
- Updates: total_god_score, tier alignment
- Script: `scripts/force-recalculate-scores.ts`
- Method: Pure math calculation

## Continuous (Always Running)

| Service | Purpose |
|---------|---------|
| `hot-match-server` | Web application |
| `automation-engine` | Orchestrates workflows |
| `rss-scraper` | Finds new startups from RSS feeds |
| `scraper` | Web scraping for startup data |

## GOD Score Tiers (Recalibrated Dec 2025)

| Tier | Threshold | Target Investors |
|------|-----------|------------------|
| T1 Elite | 65+ | Sequoia, a16z |
| T2 Strong | 55-64 | First Round, Initialized |
| T3 Emerging | 48-54 | Specialist funds |
| T4 Angels | 44-47 | Angels, scouts |

## PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs inference-enrichment --lines 50
pm2 logs score-recalc --lines 50

# Manual run
node run-inference-enrichment.js
npx tsx scripts/force-recalculate-scores.ts

# Restart all
pm2 restart all

# Save config (persists across reboots)
pm2 save
```

## Files

- `ecosystem.config.js` - PM2 configuration
- `run-inference-enrichment.js` - Pattern matching enrichment
- `scripts/force-recalculate-scores.ts` - GOD score calculator
- `investor-tier-matching.js` - Tier definitions
- `server/services/startupScoringService.ts` - GOD algorithm

## Last Updated
December 27, 2025
