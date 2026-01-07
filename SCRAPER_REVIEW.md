# 🎣 Startup Scraper Review & Guide

*Last Updated: Today*

## 🎯 Main Startup Scrapers

### 1. **Speedrun + YC Scraper** ⭐ RECOMMENDED
**File:** `speedrun-yc-scraper.mjs`  
**Purpose:** Scrapes early-stage startups from a16z Speedrun accelerator and Y Combinator batches

**Usage:**
```bash
# Test first
node speedrun-yc-scraper.mjs test

# Scrape Speedrun only
node speedrun-yc-scraper.mjs speedrun

# Scrape YC batches (W24, S24, W23, S23)
node speedrun-yc-scraper.mjs yc

# Scrape everything
node speedrun-yc-scraper.mjs all
```

**Features:**
- ✅ Uses Playwright + Claude API (reliable)
- ✅ Auto-scrolls to load all startups
- ✅ Validated inserts (prevents malformed data)
- ✅ Duplicate detection
- ✅ Saves directly to `startup_uploads` table

**Expected Output:** 200+ early-stage startups

---

### 2. **Speedrun Full Scraper**
**File:** `speedrun-full.mjs`  
**Purpose:** Scrapes ALL startups from a16z Speedrun

**Usage:**
```bash
# Preview (no save)
node speedrun-full.mjs

# Save to database
node speedrun-full.mjs --save
```

**Features:**
- ✅ Simpler than speedrun-yc-scraper
- ✅ Uses validated-inserts.js
- ✅ Auto-approves startups

---

### 3. **Simple RSS Scraper** ⚡ FAST
**File:** `simple-rss-scraper.js`  
**Purpose:** Scrapes RSS feeds WITHOUT AI (no API costs)

**Usage:**
```bash
node simple-rss-scraper.js
```

**Features:**
- ✅ No AI/API costs
- ✅ Fast keyword-based extraction
- ✅ Saves to `discovered_startups` table
- ✅ Auto-detects sectors from keywords
- ✅ Extracts company names from headlines

**Sources:** Uses `rss_sources` table (63 active sources)

---

### 4. **Intelligent Scraper** 🧠 AI-POWERED
**File:** `intelligent-scraper.js`  
**Purpose:** Deep AI-powered scraping of any URL

**Usage:**
```bash
# Scrape a specific URL
node intelligent-scraper.js "https://ycombinator.com/companies" startups

# Scrape investor pages
node intelligent-scraper.js "https://a16z.com/portfolio" investors
```

**Features:**
- ✅ Uses OpenAI GPT-4o for extraction
- ✅ Handles complex pages
- ✅ Extracts structured data
- ⚠️ Requires API credits

---

### 5. **Mega Scraper** 🚀 BULK
**File:** `mega-scraper.js`  
**Purpose:** High-volume scraping from multiple sources

**Usage:**
```bash
node mega-scraper.js
```

**Features:**
- ✅ Scrapes multiple sources in one run
- ✅ Handles VC firms, startups, news
- ✅ Parallel processing

---

## 📊 Current Database Status

Let's check what we have:

```bash
# Count startups
node -e "
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
supabase.from('startup_uploads').select('id', {count: 'exact', head: true}).then(r => 
  console.log('Total startups:', r.count)
);
supabase.from('startup_uploads').select('id', {count: 'exact', head: true}).eq('status', 'approved').then(r => 
  console.log('Approved startups:', r.count)
);
supabase.from('discovered_startups').select('id', {count: 'exact', head: true}).then(r => 
  console.log('Discovered (pending):', r.count)
);
"
```

---

## 🎣 Recommended Fishing Strategy

### Quick Win (5 minutes):
```bash
# 1. Run simple RSS scraper (fast, no AI)
node simple-rss-scraper.js

# 2. Check results
node -e "const {createClient} = require('@supabase/supabase-js'); const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); supabase.from('discovered_startups').select('name, source').order('created_at', {ascending: false}).limit(10).then(r => console.log(r.data));"
```

### Deep Dive (30 minutes):
```bash
# 1. Scrape Speedrun (high-quality early-stage)
node speedrun-full.mjs --save

# 2. Scrape YC batches
node speedrun-yc-scraper.mjs yc --save

# 3. Run RSS scraper for news-based discoveries
node simple-rss-scraper.js
```

### Maximum Volume (1 hour):
```bash
# 1. Run mega scraper
node mega-scraper.js

# 2. Run intelligent scraper on YC portfolio
node intelligent-scraper.js "https://ycombinator.com/companies" startups

# 3. Run RSS scraper
node simple-rss-scraper.js
```

---

## 🔍 Next Steps

1. **Check current startup count**
2. **Run a quick scraper** (simple-rss-scraper.js)
3. **Review results**
4. **Run deeper scrapers** if needed

---

## 📝 Notes

- All scrapers use validated inserts (prevents malformed data)
- Duplicates are automatically detected
- Speedrun/YC scrapers save directly to `startup_uploads` (approved)
- RSS scraper saves to `discovered_startups` (needs import)
- Check `lib/validated-inserts.js` for validation logic


