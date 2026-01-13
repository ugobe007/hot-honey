# PYTHIA Comprehensive Health Check

## Overview

The comprehensive health check (`pythia-health-check.js`) performs a complete system audit of the Pythia scoring system, checking all components, data quality, and system health.

## Usage

```bash
# Run health check for last 7 days (default)
npm run pythia:health

# Or specify number of days
node scripts/pythia/pythia-health-check.js 7
node scripts/pythia/pythia-health-check.js 30
```

## What It Checks

### 1. 🔌 Database Health
- **Connection**: Tests Supabase connectivity
- **Schema**: Validates table structure (pythia_speech_snippets, pythia_scores)
- **Status**: ✅ OK / ❌ FAILED

### 2. 📊 System Statistics
- Total snippets in database
- Total scores computed
- Unique entities with snippets
- Unique entities with scores
- Coverage percentage (entities with scores vs snippets)
- **Warnings**: No snippets, low coverage

### 3. 🕐 Data Freshness
- Newest snippet timestamp
- Newest score timestamp
- Daily activity breakdown (last N days)
- **Warnings**: No activity in 48+ hours (snippets) or 72+ hours (scores)

### 4. 📥 Collection Scripts
- Verifies all collection scripts exist:
  - `collect-from-blogs.js`
  - `collect-from-forums.js`
  - `collect-from-company-domains.js`
  - `collect-from-rss.js`
  - `collect-from-github.js`
  - `collect-from-social.js`
  - `collect-snippets.js`
- Checks utility files in `utils/`:
  - `tier-classifier.js`
  - `feature-extractor.js`
  - `startup-name-sanitizer.js`
  - `domain-classifier.js`
- **Status**: ✅ OK / ⚠️ ISSUES

### 5. 🔮 Scoring Engine
- Tests scoring function with sample data
- Validates score output format (0-100)
- Checks confidence calculation
- Verifies breakdown components (constraint, mechanism, reality)
- **Status**: ✅ OK / ❌ ERROR

### 6. 🔍 Data Quality
- **Missing Fields**: Checks for empty text, missing entity_id, invalid tier, missing source_type
- **Duplicates**: Detects duplicate snippets (by text_hash)
- **Tier Distribution**: Analyzes Tier 1/2/3 percentages
  - ⚠️ Warning if Tier 3 > 80% (mostly PR content)
  - ⚠️ Warning if Tier 1 < 10% (need more earned content)
- **Feature Markers**: Counts constraint, mechanism, and reality contact markers
- **Status**: ✅ OK / ⚠️ ISSUES

### 7. 📡 Source Distribution
- Lists top sources by snippet count
- Checks source diversity
- **Warnings**: Low diversity (< 3 source types with > 10 snippets)

### 8. ⚙️ Configuration
- Validates environment variables:
  - `VITE_SUPABASE_URL` or `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- Checks for `.env` file
- **Status**: ✅ OK / ❌ ISSUES

## Output Format

The health check provides:
1. **Detailed checks** for each component
2. **Summary statistics** with counts and percentages
3. **Error list** (critical issues)
4. **Warning list** (non-critical issues)
5. **Overall status**: ✅ HEALTHY / ⚠️ DEGRADED / ❌ UNHEALTHY

## Exit Codes

- `0`: Healthy or degraded (warnings only)
- `1`: Unhealthy (errors detected)

## Integration

The health check can be:
- Run manually for debugging
- Scheduled as a cron job
- Integrated into CI/CD pipelines
- Used for monitoring dashboards

## Example Output

```
🔮 PYTHIA COMPREHENSIVE HEALTH CHECK
============================================================
Timestamp: 2025-01-XX...
Period: Last 7 days

🔌 DATABASE HEALTH
────────────────────────────────────────────────────────────
   ✅ Connection: OK
   ✅ Tables: OK (pythia_speech_snippets, pythia_scores)

📊 SYSTEM STATISTICS
────────────────────────────────────────────────────────────
   📝 Total Snippets: 1,234
   🎯 Total Scores: 456
   🏢 Entities with Snippets: 123
   ✅ Entities with Scores: 98
   📈 Coverage: 79.7%

[... more checks ...]

📋 HEALTH CHECK SUMMARY
============================================================
✅ Passed: 6
⚠️  Warnings: 2
❌ Errors: 0

⚠️  WARNINGS:
   - No snippets collected in last 48 hours
   - Low Tier 1 percentage (8.5%) - need more earned content

✅ OVERALL STATUS: DEGRADED
```

## Troubleshooting

### "Supabase credentials not found"
- Ensure `.env` file exists in project root
- Set `VITE_SUPABASE_URL` or `SUPABASE_URL`
- Set `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

### "Database connection failed"
- Check Supabase project status
- Verify credentials are correct
- Check network connectivity

### "No snippets found"
- Run collection scripts: `npm run pythia:collect:forums`
- Check collection script logs for errors
- Verify startup data exists in `startup_uploads` table

### "Scoring engine check failed"
- Check `scoring-engine.js` and `feature-extractor.js` for syntax errors
- Verify all dependencies are installed: `npm install`

## Related Scripts

- `score-entities.js` - Score entities using collected snippets
- `sync-pythia-scores.js` - Sync scores to startup_uploads table
- `analyze-pythia-scores.js` - Analyze score distributions
- Collection scripts in `scripts/pythia/`
