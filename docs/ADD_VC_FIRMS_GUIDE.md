# Adding VC Firms from List

This guide explains how to add the 337 VC firms from your list and automatically scrape their websites for data.

## Quick Start

1. **Create your input file** - Save the firm list as CSV or JSON:

   **CSV Format** (`data/vc-firms-list.csv`):
   ```csv
   VC Firm Name,Website URL
   Andreessen Horowitz,https://www.a16z.com
   Sequoia Capital,https://www.sequoiacap.com
   ...
   ```

   **JSON Format** (`data/vc-firms-list.json`):
   ```json
   [
     {"name": "Andreessen Horowitz", "url": "https://www.a16z.com"},
     {"name": "Sequoia Capital", "url": "https://www.sequoiacap.com"}
   ]
   ```

2. **Run the script**:
   ```bash
   node scripts/add-vc-firms-from-list.js --file data/vc-firms-list.csv
   # or
   node scripts/add-vc-firms-from-list.js --file data/vc-firms-list.json
   ```

## What the Script Does

For each firm, the script will:

1. **Check if firm exists** - Searches by name or firm field
2. **Scrape website** - Extracts:
   - Firm description (from meta tags, hero section, or first paragraph)
   - Blog URL (finds blog links in navigation or common paths)
   - Sectors (AI/ML, SaaS, Fintech, etc.)
   - Investment stages (Pre-Seed, Seed, Series A, etc.)
3. **Create or update** - Adds new firms or enriches existing ones
4. **Align with database** - All data matches the `investors` table schema:
   - `name` - Firm name
   - `firm` - Firm name (same as name for VC firms)
   - `type` - Set to 'vc_firm'
   - `url` - Website URL
   - `blog_url` - Blog URL (if found)
   - `firm_description_normalized` - Standardized third-person description
   - `investment_firm_description` - Raw scraped description
   - `sectors` - Array of sectors (e.g., ["AI/ML", "SaaS"])
   - `stage` - Array of stages (e.g., ["Seed", "Series A"])
   - `status` - Set to 'approved'

## Database Schema Alignment

The script ensures all data fits the `investors` table format:

- **Text fields**: `name`, `firm`, `bio`, `investment_thesis`, `url`, `blog_url`
- **Array fields**: `sectors` (text[]), `stage` (text[])
- **JSON fields**: `notable_investments` (jsonb)
- **Number fields**: `check_size_min`, `check_size_max`
- **Status**: `status` ('approved', 'pending', etc.)

## Blog Detection

The script automatically finds blog URLs by:
1. Looking for blog links in navigation (`a[href*="blog"]`, etc.)
2. Checking common blog paths (`/blog`, `/articles`, `/news`, `/insights`)
3. Detecting blog mentions in HTML content

## Rate Limiting

The script includes a 1-second delay between requests to be respectful to servers.

## Example Output

```
📋 Processing: Andreessen Horowitz
   URL: https://www.a16z.com
   🔍 Scraping website...
   ✅ Created (ID: abc123...)
   📝 Description: Andreessen Horowitz (a16z) is a venture capital firm...
   📰 Blog: https://a16z.com/posts/
```

## Troubleshooting

- **"File not found"**: Make sure your CSV/JSON file exists in the `data/` directory
- **"Error scraping"**: Some websites may block scrapers - these will be skipped
- **"Already exists"**: Firm is already in database - will update if missing data

## Next Steps

After adding firms, you can:
- Run `node scripts/enrichment/enrich-investor-websites.js` to enrich existing investors
- Use the Master Control Center to view all investors
- Generate matches for startups with these new investors


