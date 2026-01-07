# Matching System Issues & Fixes

## 🔍 Diagnostic Results

Based on analysis of 1000 startups and 1000 investors:

### Critical Issues

1. **Missing Investor Types (89.9%)**
   - **Problem**: 899/1000 investors have `investor_type: null`
   - **Impact**: All default to VC preferences, losing differentiation
   - **Fix**: Need to enrich investor types or infer from firm names

2. **Sector Name Mismatches**
   - **Problem**: 68 startup-only sectors, 191 investor-only sectors
   - **Examples**: "AI" vs "AI/ML" vs "Artificial Intelligence"
   - **Impact**: Sector matching fails even when conceptually aligned
   - **Fix**: Normalize sector names to a canonical list

3. **Numeric Stages (99.5%)**
   - **Status**: ✅ Already fixed with stage mapping
   - **Impact**: Was causing stage matching to fail

### Moderate Issues

4. **Low GOD Scores (2.3%)**
   - **Problem**: 23 startups have GOD < 30
   - **Impact**: May not reach minimum match threshold
   - **Fix**: ✅ Already implemented - lower minScore for low-scoring startups

5. **Missing Data**
   - Missing sectors: 1% of startups
   - Missing stages: 0.5% of startups
   - Missing investor stages: 0.4% of investors
   - **Impact**: Reduces match quality

## 🛠️ Recommended Fixes

### 1. Investor Type Enrichment

**Priority: HIGH**

Create a script to infer or enrich investor types:

```javascript
// scripts/enrich-investor-types.js
const INVESTOR_TYPE_PATTERNS = {
  'VC': ['capital', 'ventures', 'partners', 'fund'],
  'Super Angel': ['angel', 'individual'],
  'Family Office': ['family', 'office', 'holdings'],
  'SWF': ['sovereign', 'wealth fund'],
  'University': ['university', 'endowment'],
  'Gov': ['government', 'public'],
};

// Infer from firm name, bio, or other fields
```

### 2. Sector Normalization

**Priority: HIGH**

Create a canonical sector mapping:

```javascript
// src/lib/sectorNormalizer.ts
const SECTOR_SYNONYMS = {
  'AI': ['AI/ML', 'Artificial Intelligence', 'Machine Learning', 'ML'],
  'Fintech': ['FinTech', 'Financial Technology', 'Finance'],
  'SaaS': ['Software as a Service', 'Enterprise Software'],
  // ... more mappings
};

export function normalizeSector(sector: string): string {
  // Find canonical name or return original
}
```

### 3. Improve Matching Algorithm

**Priority: MEDIUM**

Current issues:
- Sector matching too lenient (substring matching)
- No partial credit for stage alignment
- Missing investor_type causes all to default to VC

Improvements:
- Use normalized sectors for matching
- Add partial stage matching (e.g., "Seed" matches "Pre-Seed" with lower score)
- Better handling of missing investor_type

### 4. Data Quality Gates

**Priority: MEDIUM**

Add validation before matching:
- Ensure startups have sectors before matching
- Ensure investors have investor_type or infer it
- Flag low-quality matches (low GOD + no sector/stage match)

## 📊 Expected Match Quality Issues

### Low GOD Scores
- **Symptom**: Startups with GOD < 30 get few/no matches
- **Fix**: ✅ Lowered minScore threshold for low-scoring startups
- **Status**: Fixed

### Poor Matching Quality
- **Symptom**: Matches don't make sense (wrong sectors, stages)
- **Causes**:
  1. Sector name mismatches (e.g., "AI" doesn't match "AI/ML")
  2. Missing investor_type (all default to VC)
  3. Numeric stages not mapped (✅ fixed)
- **Fix**: Implement sector normalization and investor type enrichment

### Missing Matches
- **Symptom**: Hot startups like Tenstorrent get 0 matches
- **Causes**:
  1. Low GOD score + high minScore threshold (✅ fixed)
  2. Sector mismatches (e.g., startup has "AI", investor has "AI/ML")
  3. Stage mismatches (numeric vs text) (✅ fixed)
- **Fix**: Sector normalization + better stage matching

## 🎯 Action Items

1. **Immediate** (Next Sprint):
   - ✅ Fix numeric stage mapping (DONE)
   - ✅ Lower minScore for low-scoring startups (DONE)
   - Create sector normalization utility
   - Create investor type enrichment script

2. **Short-term** (This Month):
   - Run investor type enrichment on all investors
   - Normalize all sector names in database
   - Update matching algorithm to use normalized sectors

3. **Long-term** (Next Quarter):
   - Add data quality gates before matching
   - Improve sector matching algorithm (fuzzy matching)
   - Add partial credit for stage alignment
   - Create match quality scoring system

## 📈 Monitoring

Run diagnostics regularly:
```bash
node scripts/diagnose-matching-issues.js
```

Track metrics:
- % of startups with matches
- Average match score
- % of investors with investor_type
- Sector alignment rate
- Stage alignment rate


