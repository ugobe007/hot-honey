# Data Collection Architecture - Implementation Status

Implementing the architecture document EXACTLY as specified.

## ✅ Completed Modules

### Module B: Website Company Profile Extractor
- ✅ JSON-LD (schema.org) parsing
- ✅ OpenGraph meta tags extraction
- ✅ Footer links discovery (about, careers, blog, press)
- ✅ Endpoint discovery (sitemap.xml, rss.xml, /feed, robots.txt)
- ✅ Category inference from nav and page titles (rules-based)

### Dynamic API Discovery
- ✅ Playwright network interception
- ✅ XHR/fetch request/response capture
- ✅ API endpoint identification (GraphQL, Next.js, Algolia, WordPress, Prismic, Contentful, Sanity)
- ✅ Site profile building

### Entity Resolution System
- ✅ EntityKey generation (domain-based priority)
- ✅ Name normalization (strip Inc/LLC, punctuation)
- ✅ Domain exact matching (highest confidence)
- ✅ Token Jaccard similarity for name matching
- ✅ Entity resolution pipeline

## 🚧 In Progress

### Module A: Seed Ingestion
- 🚧 YC directory (needs Playwright/API)
- ✅ Product Hunt feeds (RSS)
- 🚧 GitHub trending (needs Playwright)
- ✅ Funding news (uses existing RSS infrastructure)

## 📋 Remaining Modules

### Module C: Social Enrichers
- LinkedIn (careful - hard to scrape)
- GitHub (REST API)
- Twitter/X (API required)

### Module D: Funding & Deal Graph
- Press releases
- SEC filings
- Investor portfolio pages
- Cross-enrichment

### Module E: Speech Collector (PYTHIA)
- ✅ HN Algolia API (already done)
- 🚧 RSS feeds (founder blogs, Substack)
- 🚧 Podcast transcripts
- 🚧 GitHub issues/discussions
- 🚧 Company blog JSON endpoints

## Database Schema Additions

- ✅ `extraction_metadata` JSONB column migration created
- ✅ `entity_keys` table migration created

## Next Steps

1. Complete Module A (YC, GitHub scraping)
2. Implement Module C (Social Enrichers)
3. Implement Module D (Funding & Deal Graph)
4. Enhance Module E (Speech Collector)
5. Add confidence + provenance tracking to all extractors
