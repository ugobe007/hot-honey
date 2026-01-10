# Database Cleanup Guide

## What the Cleanup Script Does

The `database-cleanup.js` script removes low-quality data to keep your database clean.

### What Gets Removed:

1. **Garbage Startup Names** (2 found)
   - Names like "Test", "Demo"
   - These are clearly test/placeholder entries

2. **Public Companies** (23-24 found)
   - Companies already publicly traded (Samsara, Twitch, Zillow, etc.)
   - Not relevant for startup-investor matching

3. **Late-Stage Companies** (64-66 found)
   - Companies in Series D+ or SPAC stage
   - Examples: Boom Supersonic, Waymo, companies with $X billion valuations
   - These don't need investor matching (too mature)

4. **Test/Placeholder Investors** (1 found)
   - Names like "Test Name Only"

5. **Bad Descriptions** (14 found)
   - Too short (< 10 chars)
   - Placeholder text ("discovered from...", "placeholder")

6. **Incomplete Investor Cards** (170 found)
   - Missing critical data (website, LinkedIn, sectors)
   - **NOTE: These are NOT deleted** - just flagged for enrichment

## Should You Run It?

### ✅ **SAFE to Execute:**
- The cleanup only removes clearly bad data
- **Garbage names** (Test, Demo) - YES, remove these
- **Public companies** - YES, remove (they're publicly traded, not startups)
- **Late-stage companies** - **MAYBE** - depends on your use case
  - If you only match early-stage startups → YES, remove
  - If you match all stages → NO, don't remove

### ⚠️ **Review First:**
- **Late-stage companies**: Check the list before deleting
- Some might be valuable (e.g., companies that recently went public)

### 📊 **What Won't Be Deleted:**
- **Incomplete investor cards** - These are just flagged, not deleted
- Startups with missing data - Not deleted, just marked for enrichment

## Recommendations

### Option 1: Safe Cleanup (Recommended)
```bash
# Only remove garbage and public companies (skip late-stage)
# You'd need to modify the script, or:
# Manually review the late-stage list first
```

### Option 2: Full Cleanup
```bash
# Run full cleanup (removes everything flagged)
npm run db:cleanup:execute
```

### Option 3: Manual Review
1. Run audit: `npm run db:cleanup:audit`
2. Review the lists
3. Manually delete items you don't need
4. Or modify the script to exclude late-stage companies

## Impact Summary

- **Will delete**: ~89 startups (garbage, public companies, late-stage)
- **Will delete**: ~171 investors (test/placeholder entries)
- **Will NOT delete**: Incomplete investor cards (170) - these are just flagged

## After Cleanup

After cleanup, you should:
1. Run enrichment: `npm run enrich`
2. Re-score: `npm run score`
3. Regenerate matches: `npm run match`

This will:
- Enrich the incomplete investor cards
- Recalculate GOD scores
- Generate fresh matches

