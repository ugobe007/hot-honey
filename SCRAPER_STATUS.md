# Hot Match Scraper System Status
Last Updated: December 27, 2025

## Summary
- Active RSS Sources: 59
- Total Startups: 2,255
- Total Investors: 3,183
- Matches: ~500,000

## Core Scrapers (Working)
- discover-startups-from-rss.js - Main startup discovery from RSS feeds
- run-rss-scraper.js - Wrapper for funding scraper
- scrapers/funding-scraper.js - Backup funding news scraper
- calculate-investor-scores-v2.js - Calculate investor GOD scores
- update-scores-from-news.js - Update scores from news
- generate-matches.js - Generate startup-investor matches
- auto-import-pipeline.js - Auto-import discovered startups

## Support Files
- lib/scraper-db.js - Database abstraction layer for scrapers
- test-scrapers.js - Diagnostic test suite
- automation-engine.js - Job scheduler and automation

## Database Constraints
source_type: manual, url, rss, api, scraper, auto
status: pending, approved, rejected, discovered, review

All scrapers should use lib/scraper-db.js which handles these automatically.

## Best RSS Sources (High match rate)
- AlleyWatch (alleywatch.com/feed/) - 40%
- FinSMEs (finsmes.com/feed) - 20%
- EU Startups (eu-startups.com/feed/) - 15%
- GeekWire (geekwire.com/feed/) - 10%

## Automation Timeouts
- RSS Scraping: 5 min
- Startup Discovery: 10 min
- Investor Scoring: 10 min (updated from 2 min)
- News Score Update: 5 min (updated from 2 min)
- Match Generation: 5 min

## Troubleshooting
1. Scraper finds 0 new = normal, feeds already scraped
2. Timeout errors = check automation-engine.js timeouts
3. Insert errors = use lib/scraper-db.js for all inserts

## Commands
node discover-startups-from-rss.js - Run startup discovery
node test-scrapers.js - Run diagnostics
tail -100 logs/automation.log - Check automation logs
