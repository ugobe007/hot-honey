# Hot Match Scraper System
Last Updated: December 27, 2025

## Quick Commands
node discover-startups-from-rss.js  # Find new startups
node discover-investors.js          # Find new investors
node admin/monitor-scrapers.js      # Dashboard
node admin/test-scrapers.js         # Diagnostics

## Current Stats
- Startups: 2,239
- Investors: 3,183
- Matches: 843,340
- Active RSS Sources: 59

## Directory Structure
/lib                    # Shared libraries
  scraper-db.js         # Database abstraction
  funding-patterns.js   # Startup pattern matching
  investor-patterns.js  # Investor pattern matching

/admin                  # Admin tools
  monitor-scrapers.js   # Dashboard
  test-scrapers.js      # Diagnostics
  enrich-startups.js    # Enrich startup data
  enrich-investors.js   # Enrich investor data
  cleanup-bad-*.js      # Remove bad data

/scrapers               # Legacy scrapers
  funding-scraper.js    # Backup scraper

## Pattern Match Rates
- Startups: 75% (improved from 42%)
- Investors: Strict validation (Ventures/Capital/Partners only)

## Database Constraints
source_type: manual, url, rss, api, scraper, auto
status: pending, approved, rejected, discovered, review

## Automation Timeouts
- RSS Scraping: 5 min
- Startup Discovery: 10 min
- Investor Scoring: 10 min
- News Score Update: 5 min
