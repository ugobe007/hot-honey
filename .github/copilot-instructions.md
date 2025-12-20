# Hot Honey - AI Coding Agent Instructions

## Project Overview
Hot Honey is a startup-investor matchmaking platform built with React/TypeScript frontend and Node.js backend scripts. The core value proposition is AI-powered matching using the proprietary **GOD Algorithm** (scoring startups 0-100).

## Architecture

### Frontend (Vite + React 19)
- Entry: [src/App.tsx](src/App.tsx) - React Router routes
- State: [src/store.ts](src/store.ts) - Zustand store with Supabase data loading
- Key component: [src/components/MatchingEngine.tsx](src/components/MatchingEngine.tsx) - Core matching UI

### Backend Services
- **Supabase**: Primary database (PostgreSQL) - see [src/lib/supabase.ts](src/lib/supabase.ts)
- **Express server**: [server/index.js](server/index.js) (port 3002) - File uploads, RSS endpoints
- **PM2 processes**: [ecosystem.config.js](ecosystem.config.js) - Background workers (scrapers, score recalculation)

### Data Flow
```
RSS Sources → continuous-scraper.js → discovered_startups table
                                           ↓
                            Admin Review → startup_uploads (status: approved)
                                           ↓
                           GOD Score Calculation → total_god_score field
                                           ↓
                            matchingService.ts → Investor matching
```

## Critical Patterns

### GOD Score System
Startups are scored 0-100 using `total_god_score` field with component scores:
- `team_score`, `traction_score`, `market_score`, `product_score`, `vision_score`
- Scores are pre-calculated and stored in `startup_uploads` table
- **Never calculate GOD scores client-side** - always read from database
- Score calculation: [server/services/startupScoringService.ts](server/services/startupScoringService.ts)

### Supabase Queries
```typescript
// Standard pattern for fetching startups with GOD scores
const { data } = await supabase
  .from('startup_uploads')
  .select('id, name, total_god_score, team_score, ...')
  .eq('status', 'approved')
  .order('total_god_score', { ascending: false });
```

### Type Definitions
- Main types: [src/types.ts](src/types.ts) - `Startup`, `StoreState` interfaces
- Database types: [src/lib/database.types.ts](src/lib/database.types.ts) - Supabase generated types

### Investor Matching
- Service: [src/services/matchingService.ts](src/services/matchingService.ts)
- Uses normalized data functions `normalizeStartupData()` and `normalizeInvestorData()`
- Match score combines: GOD score (60%) + semantic similarity (40%) when embeddings available

## Developer Commands
```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Production build
npm run scrape       # Run RSS scraper once
npm run scrape:check # Health check on scraper
pm2 start ecosystem.config.js  # Start all background processes
pm2 logs             # View all process logs
npx tsx scripts/recalculate-scores.ts  # Recalculate GOD scores (SINGLE SOURCE OF TRUTH)
node system-guardian.js  # Run health check
node match-regenerator.js  # Regenerate all matches
# NOTE: calibrate-god-scores.js was REMOVED - use recalculate-scores.ts instead
```

## 🛡️ System Guardian (IMPORTANT)
The System Guardian monitors all critical system components. **Read [SYSTEM_GUARDIAN.md](../SYSTEM_GUARDIAN.md) for full documentation.**

### Quick Health Check
```bash
node system-guardian.js
```

### What Guardian Monitors
| Check | Description |
|-------|-------------|
| Scraper Health | PM2 process status, error rates |
| GOD Scores | Distribution balance, bias detection |
| Database Integrity | Required columns, FK relationships |
| Match Quality | Count, score distribution |
| ML Pipeline | Embedding coverage |
| Data Freshness | Last update times |

### Key Thresholds (in system-guardian.js)
- GOD Score avg should be 45-75 (currently calibrated to ~60)
- Match count must be > 5,000 (auto-regenerates if < 1,000)
- Data staleness: 48h for startups, 72h for investors

### Auto-Healing
Guardian automatically:
- Triggers `match-regenerator.js` if matches < 1,000
- Restarts stuck scraper processes
- Logs all health checks to `ai_logs` table

## Database Tables (Supabase)
| Table | Purpose |
|-------|---------|
| `startup_uploads` | Main startups with GOD scores, status workflow |
| `investors` | VC/Angel profiles with investment criteria |
| `startup_investor_matches` | **Primary match table** - startup-investor pairs with scores |
| `discovered_startups` | Scraped but not yet reviewed |
| `rss_sources` | News feed sources for scraping |
| `ai_logs` | System logs including Guardian health checks |
| `score_history` | Tracks GOD score changes over time |

> ⚠️ **CLEANED UP (Dec 19, 2025):** Old tables removed: `startups` (replaced by `startup_uploads`), `investor_matches` (replaced by `startup_investor_matches`), `users`, `votes`, `syndicates`, `watchdog_reports`, etc. Database trigger now prevents GOD scores below 40.

## Conventions
- **UUID IDs**: All Supabase records use UUIDs, not numeric IDs
- **Status workflow**: Startups flow through `pending` → `approved` → `published`
- **5-Point Format**: Startups have `value_proposition`, `problem`, `solution`, `team`, `investment` fields
- **Error handling**: Log to console, fallback to local data if Supabase fails (see [src/store.ts](src/store.ts))

## Common Gotchas
1. **Local fallback data** uses numeric IDs (0, 1, 2) which break detail pages expecting UUIDs
2. **`extracted_data`** is a JSONB field containing scraped/parsed startup info - check both direct fields and this object
3. **Investor fields**: Database uses `sectors` and `stage` (not `stages`) as column names
4. **Environment variables**: Frontend uses `VITE_` prefix, server uses direct `process.env`
