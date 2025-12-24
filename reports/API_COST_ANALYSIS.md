# 🔥 API Cost Analysis - Why You're Spending $25/Day

## The Problem: Claude Sonnet 4 is EXPENSIVE

Your dynamic parser is using **Claude Sonnet 4** (`claude-sonnet-4-20250514`) which costs:
- **Input:** $3.00 per million tokens
- **Output:** $15.00 per million tokens

### What's Happening Right Now:

| Process | Model | Runs | Est. Tokens/Run | Daily Cost |
|---------|-------|------|-----------------|------------|
| **Intelligent Scraper** | Claude Sonnet 4 | 166 today | ~8,000 | **$20.00** |
| **RSS Discovery** | Claude Sonnet 4 | ~50/day | ~4,000 | **$3.00** |
| **AI Agent** | Claude Sonnet 4 | 96x (every 15 min) | ~2,000 | **$1.50** |
| **Other scrapers** | Claude Sonnet 4 | ~20 | ~5,000 | **$1.00** |
| **TOTAL** | | | | **~$25.50** |

---

## ✅ Immediate Fixes (Save 95%+)

### Fix 1: Switch to Claude Haiku 3.5 (Recommended)
**Cost:** $0.25/M input, $1.25/M output = **97% cheaper**

```javascript
// In lib/dynamic-parser.js, line 43:
this.model = options.model || (this.provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gpt-4o-mini');

// In intelligent-scraper.js, line 202:
model: 'claude-3-5-haiku-latest'

// In discover-startups-from-rss.js, line 178:
model: 'claude-3-5-haiku-latest'

// In scripts/ai-agent.ts, line 40:
MODEL: 'claude-3-5-haiku-latest'
```

**New daily cost:** ~$0.75/day

### Fix 2: Switch to OpenAI GPT-4o-mini (Even Cheaper)
**Cost:** $0.15/M input, $0.60/M output = **98% cheaper**

Already used in many places. Just update the dynamic parser:
```javascript
// In lib/dynamic-parser.js constructor:
this.provider = 'openai';  // Force OpenAI
this.model = 'gpt-4o-mini';
```

**New daily cost:** ~$0.50/day

---

## 📊 Cost Comparison Table

| Model | Input/1M | Output/1M | Your Daily Cost | Monthly |
|-------|----------|-----------|-----------------|---------|
| **Claude Sonnet 4** (current) | $3.00 | $15.00 | **$25.00** | **$750** |
| Claude 3.5 Haiku | $0.25 | $1.25 | **$0.75** | **$22.50** |
| GPT-4o-mini | $0.15 | $0.60 | **$0.50** | **$15** |
| GPT-4o | $2.50 | $10.00 | $20.00 | $600 |

---

## 🎯 Recommended Budget After Fix

| Scenario | Daily Budget | Monthly |
|----------|--------------|---------|
| **Conservative** (GPT-4o-mini everywhere) | $1-2 | $30-60 |
| **Balanced** (Haiku for parsing) | $2-3 | $60-90 |
| **Quality** (Sonnet for scoring only) | $3-5 | $90-150 |

---

## Files to Update

1. **[lib/dynamic-parser.js](lib/dynamic-parser.js)** - Main parser (Line 43)
2. **[intelligent-scraper.js](intelligent-scraper.js)** - Deep scraper (Line 202)
3. **[discover-startups-from-rss.js](discover-startups-from-rss.js)** - RSS (Line 178)
4. **[scripts/ai-agent.ts](scripts/ai-agent.ts)** - AI Agent (Line 40)
5. **[server/services/startupDiscoveryService.ts](server/services/startupDiscoveryService.ts)** - Discovery (Line 216)

---

## Quick Fix Command

Run this to see all files using Sonnet:
```bash
grep -r "claude-sonnet" --include="*.js" --include="*.ts" .
```

---

## Why This Happened

The report says "~$0.0006 per parse" but that's based on Claude Haiku rates. Your code is using Claude Sonnet 4 which is **50x more expensive** for output tokens.

### Per-Parse Cost Comparison:
| Model | Input (4K tokens) | Output (2K tokens) | **Total** |
|-------|-------------------|---------------------|-----------|
| Claude Haiku | $0.001 | $0.0025 | **$0.0035** |
| Claude Sonnet 4 | $0.012 | $0.030 | **$0.042** |

With 600 parses/day (your current rate): Sonnet = $25.20, Haiku = $2.10

---

*Generated: December 22, 2025*
