# Investor Extraction Pipeline Guide

## Overview

This guide explains the two-layer investor extraction system that prevents creating entities from sentence fragments, article titles, and other non-investor text.

## Architecture

### Layer A: Investor Mentions (cheap, noisy, many)
- **Table**: `investor_mentions_raw`
- **Purpose**: Store all potential investor mentions extracted from articles, RSS feeds, etc.
- **Characteristics**: 
  - Cheap to create
  - Noisy (many false positives)
  - Many records
  - No validation required

### Layer B: Investor Entities (clean, sparse, trusted)
- **Table**: `investors`
- **Purpose**: Store validated investor entities
- **Characteristics**:
  - Clean (validated)
  - Sparse (only real investors)
  - Trusted (passed promotion gate)
  - Requires validation

## Workflow

```
1. Extract Mentions (Layer A)
   ↓
   Text/Article → extractInvestorMentions() → investor_mentions_raw
   
2. Promote to Entities (Layer B)
   ↓
   investor_mentions_raw → validateInvestorEntity() → investors (if valid)
```

## Usage

### 1. Extract Mentions from Text

```bash
node scripts/investor-extraction-pipeline.js \
  --extract-from-text "Startup raised $10M from a16z and Sequoia Capital" \
  --source-url "https://techcrunch.com/article"
```

This will:
- Extract mentions: "a16z", "Sequoia Capital"
- Save to `investor_mentions_raw` table
- Assign confidence scores
- Store context snippets

### 2. Promote Mentions to Entities

```bash
node scripts/investor-extraction-pipeline.js --promote-mentions --limit 100
```

This will:
- Fetch unpromoted mentions
- Validate each using the promotion gate
- Create investor entities for valid mentions
- Link mentions to entities

### 3. Validate Individual Investors

```bash
node scripts/investor-data-quality-gate.js \
  --validate "John Doe" \
  --firm "ABC Capital" \
  --context "backed startup in seed round"
```

## Promotion Gate Criteria

An investor mention is promoted to an entity if it passes **at least 2 of 4** criteria:

1. **Canonical Name**
   - Person: First Last pattern
   - Firm: Known suffix or known firm name
   - Known firms (a16z, 500 Startups, etc.) get automatic pass

2. **Context Verb**
   - Contains funding verbs: backed, led, invested, participated, round, seed, series

3. **Source Alignment**
   - Appears on portfolio page, funding article, or startup site

4. **Cross-Reference**
   - Same name appears ≥2 times across sources
   - Or firm has valid suffix

## Failure Modes Prevented

### 1. Sentence Fragments
**Examples**: "and capital", "cost of capital"

**Prevention**: Reject if no proper name AND no firm suffix

### 2. Article Metadata
**Examples**: "article Guillermo Rauch", "day ago PAI"

**Prevention**: Strip article prefixes before validation

### 3. Role-Based Hallucinations
**Examples**: "as Managing (A16z)", "Senior Finance"

**Prevention**: Reject if contains job titles without funding context

### 4. Firm-Name Echoes
**Examples**: "founded Greylock (Greylock)"

**Prevention**: Require funding verb nearby

## Known Firm Names

The system recognizes these legitimate firms (auto-validated):
- a16z, Andreessen Horowitz
- 500 Startups, 500 Global
- Y Combinator, YC
- Sequoia Capital
- Accel, Accel Partners
- Greylock Partners
- Benchmark Capital
- First Round Capital
- Lightspeed Venture Partners
- And 50+ more...

## Database Schema

### investor_mentions_raw

```sql
CREATE TABLE investor_mentions_raw (
  id UUID PRIMARY KEY,
  mention_text TEXT NOT NULL,
  name TEXT,
  firm TEXT,
  confidence NUMERIC,
  extraction_method TEXT,
  source_url TEXT,
  context_snippet TEXT,
  promoted_to_entity_id UUID REFERENCES investors(id),
  validation_reason TEXT,
  validation_confidence NUMERIC,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Integration with Existing Scrapers

To integrate with your existing RSS scrapers:

```javascript
const { extractInvestorMentions, saveMentions } = require('./scripts/investor-extraction-pipeline');

// In your RSS scraper
async function processArticle(article) {
  const text = article.title + ' ' + article.description;
  const mentions = await extractInvestorMentions(text, article.url);
  await saveMentions(mentions);
  
  // Don't create investor entities directly!
  // Let the promotion pipeline handle that
}
```

## Best Practices

1. **Always extract to mentions first** - Never create investor entities directly from scrapers
2. **Run promotion periodically** - Use cron job to promote eligible mentions
3. **Review low-confidence mentions** - Manually review mentions with confidence < 0.5
4. **Monitor promotion rate** - Track how many mentions become entities
5. **Update known firm list** - Add new well-known firms to reduce false positives

## Next Steps

1. Run migration to create `investor_mentions_raw` table
2. Update existing scrapers to use mention extraction
3. Set up cron job to promote mentions daily
4. Review and refine known firm names list
5. Monitor and tune promotion gate criteria


