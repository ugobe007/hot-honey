# 🔥 INTELLIGENT SCRAPER - Complete Guide

## What It Does

**Automatically scrapes and saves:**
- 💼 **VCs & Angel Groups** → investors table
- 🚀 **Startups** → discovered_startups table  
- 📰 **News & Trends** → Extracted and logged

**Uses OpenAI to intelligently:**
- Detect content type automatically
- Extract structured data
- Skip duplicates
- Handle any webpage format

---

## 🚀 Quick Start

### 1. Single URL Scraping
```bash
# Auto-detect what's on the page
node intelligent-scraper.js https://dealroom.net/blog/top-venture-capital-firms

# Specify target type
node intelligent-scraper.js https://www.bandofangels.com/members investors
node intelligent-scraper.js https://techcrunch.com/startups/ startups
```

### 2. Batch Scraping (Multiple URLs)
```bash
node intelligent-scraper.js --batch \
  https://dealroom.net/blog/top-venture-capital-firms \
  https://www.cbinsights.com/research/best-venture-capital-firms/ \
  https://www.forbes.com/midas-list/
```

### 3. Automated Scraping (All Sources)
```bash
# Scrape everything (takes 30-60 min)
node auto-scrape-all.js all

# Just VCs
node auto-scrape-all.js vcs

# Just Angel Groups
node auto-scrape-all.js angels

# Just Startups
node auto-scrape-all.js startups

# Just News
node auto-scrape-all.js news
```

---

## 📋 Configured Sources

### VC Firms (High Priority)
- ✅ Dealroom Top VCs
- ✅ CB Insights Top 100
- ✅ Forbes Midas List
- ✅ TechCrunch Top VCs
- ✅ Crunchbase VC Rankings

### Angel Groups
- ✅ Band of Angels
- ✅ Tech Coast Angels
- ✅ Keiretsu Forum
- ✅ Golden Seeds

### Accelerators
- ✅ Y Combinator Companies
- ✅ Techstars Portfolio
- ✅ 500 Global Portfolio
- ✅ Plug and Play Portfolio

### Startup Discovery
- ✅ Product Hunt
- ✅ TechCrunch Startups
- ✅ Crunchbase Latest
- ✅ AngelList

### News Sources
- ✅ TechCrunch
- ✅ VentureBeat
- ✅ Crunchbase News
- ✅ The Information

---

## 🎯 How It Works

### Step 1: Fetch Page
```
📄 Fetches webpage with proper headers
✅ Handles JavaScript-heavy sites
🔒 Uses realistic browser User-Agent
```

### Step 2: Extract Content
```
📝 Parses HTML with Cheerio
🧹 Removes scripts, styles, navigation
✂️  Extracts main content only
📏 Limits to 15k chars for OpenAI
```

### Step 3: AI Analysis
```
🧠 Sends content to GPT-4
🎯 Detects: VCs, Startups, News
📊 Extracts structured JSON data
✅ Returns clean, categorized results
```

### Step 4: Save to Database
```
💼 Investors → investors table
🚀 Startups → discovered_startups table
⏭️  Skips duplicates automatically
✅ Reports what was added
```

---

## 📊 Example Output

```
═══════════════════════════════════════════════════════════════════
🔥 INTELLIGENT SCRAPER - Hot Match
═══════════════════════════════════════════════════════════════════

🌐 Scraping: https://dealroom.net/blog/top-venture-capital-firms
🎯 Target: auto

📄 Fetching page...
✅ Page loaded

📝 Extracting content...
✅ Extracted 12458 characters

🧠 Analyzing content with OpenAI...

═══════════════════════════════════════════════════════════════════
📊 EXTRACTION RESULTS
═══════════════════════════════════════════════════════════════════

💼 Investors found: 47
🚀 Startups found: 3
📰 News themes: 2

📌 Key Themes:
   • Venture capital funding trends in 2024
   • Top performing VC firms by returns

💼 Saving 47 investors...

  ✅ Tiger Global Management
  ✅ Accel Partners
  ✅ Lightspeed Venture Partners
  ⏭️  Sequoia Capital - Already exists
  ✅ Insight Partners
  ... (42 more)

🚀 Saving 3 startups...

  ✅ Databricks
  ✅ Stripe
  ✅ Canva

═══════════════════════════════════════════════════════════════════
✨ SCRAPING COMPLETE
═══════════════════════════════════════════════════════════════════

💼 Investors: 44 added, 3 skipped
🚀 Startups: 3 added, 0 skipped
```

---

## 🔧 Advanced Usage

### Add New Sources

Edit `scraping-sources.json`:
```json
{
  "vc_firms": [
    {
      "name": "Your Source Name",
      "url": "https://example.com/vcs",
      "frequency": "monthly",
      "priority": "high"
    }
  ]
}
```

### Custom Scraping Script
```javascript
const scraper = require('./intelligent-scraper');

// Scrape and get results
const result = await scraper.scrape('https://example.com');

if (result.success) {
  console.log(`Added ${result.investors.added} investors`);
  console.log(`Added ${result.startups.added} startups`);
}
```

### Schedule with Cron

Add to PM2:
```bash
pm2 start auto-scrape-all.js --name "auto-scraper" --cron "0 2 * * *"
```

This runs daily at 2 AM.

---

## 💡 Pro Tips

### 1. Start Small
```bash
# Test on one source first
node intelligent-scraper.js https://dealroom.net/blog/top-venture-capital-firms

# Then batch scrape
node auto-scrape-all.js vcs
```

### 2. High-Value Sources First
- Focus on "high" priority sources
- These give best ROI for time spent
- Usually 50-100 entities per source

### 3. Rate Limiting
- Script waits 3-5 seconds between requests
- Prevents getting blocked
- Be respectful to source sites

### 4. Review Results
```bash
# Check investors added
node -e "const {createClient} = require('@supabase/supabase-js'); 
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  supabase.from('investors').select('name').order('created_at', {ascending: false}).limit(20)
    .then(r => console.log(r.data));"

# Check startups discovered
node test-rss-discovery.js
```

### 5. Enrich After Scraping
```bash
# Add more details with OpenAI
node enrich-investor-data.ts
```

---

## 🚨 Troubleshooting

### "Could not parse OpenAI response"
- OpenAI returned non-JSON
- Try again (rare occurrence)
- Check API key is valid

### "HTTP 403 Forbidden"
- Site blocking scrapers
- Try different User-Agent
- May need browser automation (Puppeteer)

### "No investors/startups found"
- Page format not recognized
- Content too short/generic
- Try targeting specific content type

### Timeout Errors
- Site too slow
- Increase timeout in code
- Or skip that source

---

## 📈 Expected Results

### After Full Auto-Scrape:
- **200-500 VCs** added to database
- **100-300 Startups** discovered
- **50-100 Angel Groups** identified
- **Dozens of accelerators** mapped

### Time Required:
- Single URL: ~30 seconds
- Batch (5 URLs): ~3 minutes
- Full auto-scrape: ~30-60 minutes

### Database Growth:
- Before: 46 investors, 51 startups
- After: 300+ investors, 200+ startups

---

## 🎯 Recommended Workflow

### Week 1: Foundation
```bash
# Day 1: Top VCs
node auto-scrape-all.js vcs

# Day 2: Angel Groups  
node auto-scrape-all.js angels

# Day 3: Accelerators
node intelligent-scraper.js https://www.ycombinator.com/companies

# Day 4: Enrich
node enrich-investor-data.ts
```

### Ongoing: Maintenance
```bash
# Weekly: New startups
node auto-scrape-all.js startups

# Daily: News (via RSS)
# Already running via PM2!

# Monthly: Refresh VCs
node auto-scrape-all.js vcs
```

---

## 🔥 Ready to Scale!

Your scraping system can now:
- ✅ Automatically find VCs from any list
- ✅ Discover angel groups
- ✅ Track accelerator portfolios
- ✅ Find trending startups
- ✅ Monitor news and trends
- ✅ Skip duplicates intelligently
- ✅ Run unattended (batch mode)

**Start with:** `node auto-scrape-all.js vcs`
