# Advanced ML Features - Implementation Summary

## 🎯 Overview

Four advanced ML features have been implemented to enhance the Hot Honey matching engine:

1. **Automated Enrichment Pipeline** - Background service that enriches sparse records
2. **Embedding Fine-Tuner** - Generates domain-specific training data
3. **Match Feedback Service** - Learns from user interactions
4. **Portfolio Fit Scoring** - Analyzes investor portfolios for fit signals

---

## 📦 New Services

### 1. Auto-Enrichment Pipeline
**File:** [services/auto-enrichment-pipeline.js](services/auto-enrichment-pipeline.js)

Runs as a PM2 background process to automatically enrich records with sparse data.

**Features:**
- Detects sparse investors (< 3 sectors, no thesis, no firm)
- Detects sparse startups (< 100 char description, no traction data)
- Enriches using dynamic parser (Anthropic Claude)
- Generates embeddings for enriched records
- Daily limit: 500 enrichments (configurable)
- 5-minute batch interval

**Start:**
```bash
pm2 start ecosystem.config.js --only enrichment-pipeline
```

**Environment Variables:**
```
ENRICHMENT_DAILY_LIMIT=500
ENRICHMENT_BATCH_SIZE=10
ENRICHMENT_INTERVAL_MS=300000
```

---

### 2. Match Feedback Service
**File:** [services/match-feedback-service.js](services/match-feedback-service.js)

Tracks user interactions and learns preferences over time.

**Feedback Types & Weights:**
| Action | Weight | Description |
|--------|--------|-------------|
| viewed | 0.1 | User viewed match |
| expanded | 0.2 | User expanded details |
| saved | 0.5 | User bookmarked |
| contacted | 0.8 | User initiated contact |
| meeting_scheduled | 0.9 | Meeting booked |
| invested | 1.0 | Investment made |
| passed | -0.3 | User rejected |
| reported | -0.5 | User flagged |

**Features:**
- Sector affinity learning
- Stage affinity learning
- Time decay (90-day half-life)
- Score adjustment (±15 points max)
- Training data generation for fine-tuning

**Usage:**
```javascript
const { MatchFeedbackService } = require('./services/match-feedback-service');
const feedback = new MatchFeedbackService();

// Record feedback
await feedback.recordFeedback(investorId, startupId, 'saved');

// Get adjusted score
const adjusted = await feedback.getAdjustedMatchScore(investorId, startupId, baseScore);
```

---

### 3. Embedding Fine-Tuner
**File:** [services/embedding-fine-tuner.js](services/embedding-fine-tuner.js)

Generates domain-specific training data for embedding model fine-tuning.

**Features:**
- Creates positive pairs from high-engagement feedback
- Creates hard negatives from passed/reported matches
- Exports to multiple formats (JSONL, Sentence Transformers, HuggingFace)
- Evaluates current embedding separation

**Usage:**
```bash
# Export training data
node services/embedding-fine-tuner.js --export jsonl
node services/embedding-fine-tuner.js --export sentence-transformers

# Evaluate current embeddings
node services/embedding-fine-tuner.js --evaluate

# Show fine-tuning instructions
node services/embedding-fine-tuner.js --instructions
```

---

### 4. Portfolio Fit Service
**File:** [services/portfolio-fit-service.js](services/portfolio-fit-service.js)

Analyzes investor portfolios to predict fit beyond stated preferences.

**Scoring Components:**
| Component | Weight | Description |
|-----------|--------|-------------|
| Sector Fit | 25% | Direct + adjacent sector matching |
| Stage Fit | 20% | Historical stage distribution |
| Pattern Fit | 20% | Team, revenue, size patterns |
| Thesis Fit | 20% | AI-analyzed thesis alignment |
| Exit Pattern | 15% | What predicts their winners |

**Features:**
- Adjacent sector analysis (AI → ML, SaaS → Enterprise)
- Historical investment stage distribution
- Portfolio company pattern analysis
- AI thesis alignment scoring
- Exit pattern correlation

**Usage:**
```javascript
const { PortfolioFitService } = require('./services/portfolio-fit-service');
const portfolio = new PortfolioFitService();

// Calculate fit
const fit = await portfolio.calculatePortfolioFit(startupId, investorId);
console.log(fit.score, fit.reasoning);
```

---

### 5. Enhanced Matching Service
**File:** [services/enhanced-matching-service.js](services/enhanced-matching-service.js)

Integrates all ML components into a unified scoring system.

**Score Components:**
| Signal | Weight | Source |
|--------|--------|--------|
| Embedding Similarity | 30% | OpenAI embeddings |
| GOD Score | 25% | Startup quality |
| Portfolio Fit | 25% | Portfolio analysis |
| Feedback Adjustment | 20% | Learned preferences |

**Features:**
- Unified enhanced scoring
- Match re-ranking
- Best investor discovery
- Human-readable reasoning
- Confidence scoring

**Usage:**
```bash
# Re-rank matches for an investor
node services/enhanced-matching-service.js --rerank <investorId>

# Find best investors for a startup
node services/enhanced-matching-service.js --find <startupId>
```

---

## 🗄️ Database Changes

New tables created via migration:

### `match_feedback`
Stores user interactions with matches.

```sql
- id: uuid
- user_id: uuid (nullable)
- startup_id: uuid
- investor_id: uuid
- match_id: uuid
- feedback_type: text
- feedback_value: numeric
- source: text
- context: jsonb
- created_at: timestamptz
```

### `investor_learned_preferences`
Stores learned preferences from feedback patterns.

```sql
- id: uuid
- investor_id: uuid (unique)
- sector_affinity: jsonb
- stage_affinity: jsonb
- geography_affinity: jsonb
- total_feedback_count: int
- positive_feedback_count: int
- negative_feedback_count: int
- confidence: numeric
- embedding_1536: vector(1536)
- created_at: timestamptz
- updated_at: timestamptz
```

### Added column to `startup_investor_matches`
```sql
- fit_analysis: jsonb (portfolio fit data, enhanced scoring)
```

---

## 🚀 Quick Start

### 1. Start the enrichment pipeline
```bash
pm2 start ecosystem.config.js --only enrichment-pipeline
pm2 logs enrichment-pipeline
```

### 2. Record user feedback (in your app)
```javascript
import { MatchFeedbackService } from './services/match-feedback-service';
const feedback = new MatchFeedbackService();
await feedback.recordFeedback(investorId, startupId, 'saved');
```

### 3. Generate training data for fine-tuning
```bash
node services/embedding-fine-tuner.js --export sentence-transformers
```

### 4. Re-rank matches with enhanced scoring
```bash
node services/enhanced-matching-service.js --rerank <investorId>
```

---

## 📊 Expected Impact

Based on the ML Engine Impact Report, these features should provide:

| Metric | Expected Improvement |
|--------|---------------------|
| Match precision | +15-20% |
| Semantic relevance | +12% (already observed) |
| Rich data matches | 13x more strong matches |
| False positive rate | -25% with feedback loop |

---

## 🔧 Configuration

### Environment Variables
```env
# Enrichment Pipeline
ENRICHMENT_DAILY_LIMIT=500
ENRICHMENT_BATCH_SIZE=10
ENRICHMENT_INTERVAL_MS=300000

# APIs
VITE_OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key

# Supabase
VITE_SUPABASE_URL=your-url
SUPABASE_SERVICE_KEY=your-key
```

### PM2 Ecosystem
The enrichment pipeline is added to `ecosystem.config.js` and will auto-start with:
```bash
pm2 start ecosystem.config.js
```

---

## 📁 Files Created

| File | Description |
|------|-------------|
| [services/auto-enrichment-pipeline.js](services/auto-enrichment-pipeline.js) | Background enrichment service |
| [services/match-feedback-service.js](services/match-feedback-service.js) | User feedback tracking |
| [services/embedding-fine-tuner.js](services/embedding-fine-tuner.js) | Training data generation |
| [services/portfolio-fit-service.js](services/portfolio-fit-service.js) | Portfolio analysis |
| [services/enhanced-matching-service.js](services/enhanced-matching-service.js) | Unified ML matching |
| [reports/ADVANCED_ML_FEATURES.md](reports/ADVANCED_ML_FEATURES.md) | This documentation |

---

*Generated: December 2024*
