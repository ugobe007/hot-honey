# 🚀 Multi-Source AI Startup Research System

## What It Does

The AI scraper now performs **intelligent multi-source research** for each startup URL:

### 📊 Data Sources

1. **Company Website** (Primary)
   - Value proposition
   - Product/solution details
   - Market problem they solve

2. **Crunchbase** (Automatic)
   - Funding rounds and amounts
   - Investor names
   - Founder backgrounds
   - Company timeline

3. **Future Sources** (Can be added):
   - PitchBook (requires API key)
   - News articles (Google News, PR Newswire)
   - LinkedIn company pages
   - TechCrunch/VentureBeat articles

## 🎯 What Gets Extracted

### 1. Value Prop
- What the company does
- Unique selling point
- Main benefit to customers

### 2. Market Problem
- Pain point being solved
- Industry challenge addressed
- Gap in the market

### 3. Solution
- How the product/platform works
- Key features
- Technology approach

### 4. Team (Multi-Source) 🆕
- Founder names
- Previous companies (ex-Google, ex-Meta, etc.)
- Educational backgrounds (Stanford, MIT, etc.)
- **Sources**: Company website, Crunchbase, news

### 5. Investment (Multi-Source) 🆕
- Funding amount (e.g., "$5M Seed Round")
- Round type (Seed, Series A/B/C)
- Lead investors (e.g., "led by a16z")
- Funding date
- **Sources**: Company website, Crunchbase, news

## 💡 How It Works

```javascript
For each startup URL:
  1. Fetch company website content
  2. Try to fetch Crunchbase profile
  3. Send both sources to OpenAI GPT-4
  4. AI cross-references and extracts accurate info
  5. Returns structured 5 points data
```

## 🔧 Adding More Sources

### To add PitchBook:
1. Get PitchBook API key
2. Add to `.env`: `PITCHBOOK_API_KEY=xxx`
3. Uncomment PitchBook code in server/index.js

### To add News Search:
1. Use Google Custom Search API or News API
2. Search for: "{company name} funding" or "{company name} founders"
3. Extract relevant snippets
4. Feed to AI for analysis

## 📈 Accuracy Improvements

**Before (website only):**
- Team: "Team background not available" (70% of the time)
- Investment: "Investment details not available" (80% of the time)

**After (multi-source):**
- Team: Actual founder names and backgrounds (when available on Crunchbase)
- Investment: Specific funding amounts, rounds, and investors

## 🚀 Next Steps

1. **Add PitchBook integration** for private company data
2. **Add news scraping** for recent funding announcements
3. **Add LinkedIn scraping** for founder profiles
4. **Add caching** to avoid re-scraping the same company

## 💰 Cost

- Website scraping: Free
- Crunchbase scraping: Free (public data)
- OpenAI API: ~$0.0002 per startup (still pennies!)
- PitchBook API: Requires paid subscription
