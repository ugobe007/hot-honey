# Hot Match Script Consolidation Guide

## Overview

This document maps the 50+ scripts in the Hot Match codebase to their consolidated replacements.

**Goal:** Reduce to 7 core scripts while keeping old versions archived for reference.

---

## Core Scripts (The Keepers)

These are the **only scripts you need to run** for the full pipeline:

| Script | Purpose | Replaces |
|--------|---------|----------|
| `enrichment-orchestrator.js` | Unified enrichment pipeline with tiered gating | 15+ enrichment scripts |
| `hot-match-autopilot.js` | Master automation (discovery → score → match) | Manual pipeline |
| `god-score-v5-tiered.js` | GOD scoring with tiered approach | v1, v2, v3, v4 |
| `queue-processor-v16.js` | Match generation | v1-v15 |
| `simple-rss-scraper.js` | RSS feed discovery | continuous-scraper, mega-scraper |
| `investor-inference-engine.js` | Investor data enrichment (no API) | enrich-investor-*.js |
| `startup-inference-engine.js` | Startup data enrichment (no API) | enrich-startups-*.js |

---

## Consolidation Map

### GOD Scoring
```
KEEP:   god-score-v5-tiered.js
ARCHIVE:
  - god-score-v1.js
  - god-score-v2.js  
  - god-score-v2-engine.js
  - god-score-v3.js
  - god-score-v4.js
  - god-score-v4-complete.js
```

### Queue Processing
```
KEEP:   queue-processor-v16.js
ARCHIVE:
  - queue-processor-v1.js through v15.js
  - queue-processor-new.js
  - queue-processor-fixed.js
```

### Enrichment Scripts
```
KEEP:   enrichment-orchestrator.js (unified pipeline)
        investor-inference-engine.js (no API costs)
        startup-inference-engine.js (no API costs)
        
ARCHIVE (handled by orchestrator):
  - enrich-startups-ai.js
  - enrich-investor-data.ts
  - enrich-taglines-pitches.js
  - enrich-locations.js
  - enrich-founder-ages.js
  - enrich-founder-ages-v2.js
  - enrich-yc-style-metrics.js
  - enrich-with-dynamicmatch.js
  - enrich-investor-websites.js
```

### Scrapers
```
KEEP:   simple-rss-scraper.js (lightweight, reliable)
        
ARCHIVE (more complex, not needed):
  - continuous-scraper.js
  - enhanced-startup-discovery.js
  - intelligent-scraper.js
  - multimodal-scraper.js
  - mega-scraper.js
  - investor-mega-scraper.js
  - stagehand-enrichment.js (keep for future Playwright use)
```

### Matching
```
KEEP:   queue-processor-v16.js (handles all matching)
        
ARCHIVE:
  - generate-matches.js
  - calculate-match-scores.js
  - run-inference-pipeline.js
```

---

## NPM Scripts Reference

Add these to your `package.json` for easy access:

```json
{
  "scripts": {
    "pipeline": "node scripts/core/hot-match-autopilot.js",
    "pipeline:daemon": "node scripts/core/hot-match-autopilot.js --daemon",
    "enrich": "node scripts/core/enrichment-orchestrator.js",
    "enrich:stats": "node scripts/core/enrichment-orchestrator.js --stats",
    "score": "node scripts/core/god-score-v5-tiered.js",
    "match": "node scripts/core/queue-processor-v16.js",
    "scrape": "node scripts/core/simple-rss-scraper.js",
    "discover": "npm run scrape",
    "cleanup:audit": "node cleanup-codebase.js --audit",
    "cleanup:plan": "node cleanup-codebase.js --plan",
    "cleanup:execute": "node cleanup-codebase.js --execute",
    "cleanup:undo": "node cleanup-codebase.js --undo"
  }
}
```

---

## Folder Structure (After Cleanup)

```
hot-honey/
├── src/                          # React frontend (unchanged)
│   ├── components/
│   ├── pages/
│   └── lib/
│
├── scripts/
│   ├── core/                     # 🟢 Active scripts (run these)
│   │   ├── enrichment-orchestrator.js
│   │   ├── hot-match-autopilot.js
│   │   ├── god-score-v5-tiered.js
│   │   ├── queue-processor-v16.js
│   │   ├── simple-rss-scraper.js
│   │   ├── investor-inference-engine.js
│   │   └── startup-inference-engine.js
│   │
│   ├── enrichment/               # 🔵 Specialized enrichment (use via orchestrator)
│   │   ├── enrich-startups-ai.js
│   │   ├── enrich-investor-websites.js
│   │   └── ...
│   │
│   ├── scrapers/                 # 🟣 Alternative scrapers (for special cases)
│   │   ├── stagehand-enrichment.js
│   │   ├── intelligent-scraper.js
│   │   └── ...
│   │
│   ├── utilities/                # ⚪ One-off tools
│   │   ├── card-data-doctor.js
│   │   ├── check-db-status.js
│   │   └── ...
│   │
│   └── deprecated/               # 🔴 Old versions (archived, don't run)
│       ├── god-score-v1.js
│       ├── god-score-v2.js
│       ├── queue-processor-v1.js
│       └── ...
│
├── lib/                          # Shared libraries
│   ├── dynamicmatch/
│   ├── dynamicmatch-v2/
│   └── supabase.js
│
├── docs/                         # Documentation
│   └── CONSOLIDATION.md
│
├── cleanup-codebase.js           # Cleanup script
├── cleanup-manifest.json         # Tracks file moves (auto-generated)
├── package.json
└── .env
```

---

## Daily Operations

### Run the Full Pipeline
```bash
# One-time run
npm run pipeline

# Or as daemon (runs every 30 min)
npm run pipeline:daemon
```

### Check Enrichment Status
```bash
npm run enrich:stats
```

### Manual Scoring
```bash
npm run score
```

### Manual Match Generation
```bash
npm run match
```

---

## Troubleshooting

### "Script not found"
After cleanup, scripts are in `scripts/core/`. Update your paths:
```bash
# Old
node god-score-v5-tiered.js

# New
node scripts/core/god-score-v5-tiered.js
# Or use npm script
npm run score
```

### "Need old version for reference"
All old versions are in `scripts/deprecated/`. Nothing was deleted.

### "Undo the cleanup"
```bash
node cleanup-codebase.js --undo
```

---

## Migration Checklist

- [x] Run `node cleanup-codebase.js --audit` to see current state
- [x] Run `node cleanup-codebase.js --plan` to preview changes
- [x] Run `node cleanup-codebase.js --execute` to reorganize
- [x] Update `package.json` with new npm scripts
- [ ] Update any cron jobs or PM2 configs with new paths
- [ ] Test: `npm run pipeline` (should work)
- [ ] Verify: `npm run enrich:stats` (should show stats)

---

## Questions?

If something breaks after cleanup:
1. Run `node cleanup-codebase.js --undo` to restore
2. Check `cleanup-manifest.json` to see what was moved
3. Old scripts are in `scripts/deprecated/` - nothing was deleted


