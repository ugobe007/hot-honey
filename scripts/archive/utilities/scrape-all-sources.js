#!/usr/bin/env node

/**
 * UNIVERSAL SOURCE SCRAPER
 * Scrapes ALL sources (RSS feeds AND web pages) using raw PostgreSQL
 * Bypasses PostgREST schema cache issues completely
 */

const { Client } = require('pg');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// Direct PostgreSQL connection - bypasses all cache issues
const POSTGRES_URL = process.env.POSTGRES_URL;

const parser = new Parser({
  customFields: {
    item: [['content:encoded', 'content'], ['description', 'description']]
  },
  timeout: 10000
});

/**
 * Try RSS first, then fallback to web scraping
 */
async function fetchArticles(source) {
  // Try RSS parsing first
  try {
    const feed = await parser.parseURL(source.url);
    if (feed.items && feed.items.length > 0) {
      console.log(`   ✅ RSS feed: ${feed.items.length} items`);
      return { type: 'rss', items: feed.items };
    }
  } catch (rssError) {
    console.log(`   ⚠️  Not RSS, trying web scraping...`);
  }

  // Fallback to web scraping
  try {
    const response = await axios.get(source.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Strategy 1: article tags
    $('article').each((i, elem) => {
      if (i >= 15) return false;
      const $a = $(elem);
      const title = $a.find('h1, h2, h3, .title').first().text().trim();
      const link = $a.find('a').first().attr('href');
      const content = $a.find('p, .excerpt, .summary').first().text().trim();
      if (title && link && title.length > 5) {
        articles.push({
          title,
          link: link.startsWith('http') ? link : new URL(link, source.url).href,
          content: content || title,
          pubDate: new Date().toISOString()
        });
      }
    });

    // Strategy 2: headlines with links
    if (articles.length === 0) {
      $('h2 a, h3 a, .headline a, .post-title a').each((i, elem) => {
        if (i >= 15) return false;
        const $link = $(elem);
        const title = $link.text().trim();
        const href = $link.attr('href');
        if (title && href && title.length > 10) {
          articles.push({
            title,
            link: href.startsWith('http') ? href : new URL(href, source.url).href,
            content: title,
            pubDate: new Date().toISOString()
          });
        }
      });
    }

    // Strategy 3: list items with company/startup info
    if (articles.length === 0) {
      $('.company, .startup, .portfolio-item, .card, .list-item').each((i, elem) => {
        if (i >= 20) return false;
        const $elem = $(elem);
        const title = $elem.find('h2, h3, h4, .name, .title').first().text().trim() || $elem.find('a').first().text().trim();
        const link = $elem.find('a').first().attr('href');
        const desc = $elem.find('p, .description').first().text().trim();
        if (title && title.length > 3) {
          articles.push({
            title,
            link: link ? (link.startsWith('http') ? link : new URL(link, source.url).href) : source.url,
            content: desc || title,
            pubDate: new Date().toISOString()
          });
        }
      });
    }

    // Strategy 4: any divs with links and text
    if (articles.length === 0) {
      $('div').each((i, elem) => {
        if (articles.length >= 15) return false;
        const $elem = $(elem);
        const text = $elem.clone().children().remove().end().text().trim();
        const link = $elem.find('a').first().attr('href');
        if (text && text.length > 20 && text.length < 200 && link) {
          articles.push({
            title: text.substring(0, 150),
            link: link.startsWith('http') ? link : new URL(link, source.url).href,
            content: text,
            pubDate: new Date().toISOString()
          });
        }
      });
    }

    if (articles.length > 0) {
      console.log(`   ✅ Web scraped: ${articles.length} items`);
      return { type: 'web', items: articles };
    }

    console.log(`   ⚠️  No content found`);
    return { type: 'none', items: [] };

  } catch (webError) {
    console.log(`   ❌ Failed: ${webError.message}`);
    return { type: 'error', items: [], error: webError.message };
  }
}

async function main() {
  console.log('🚀 UNIVERSAL SOURCE SCRAPER');
  console.log('═'.repeat(60));
  console.log('📅 ' + new Date().toISOString());
  console.log('🔌 Using direct PostgreSQL (bypassing PostgREST cache)\n');

  const client = new Client({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all active sources
    const { rows: sources } = await client.query(
      `SELECT * FROM rss_sources WHERE active = true ORDER BY name`
    );
    
    console.log(`📰 Found ${sources.length} active sources\n`);

    let totalSaved = 0;
    let successfulSources = 0;

    for (const source of sources) {
      console.log(`\n📡 ${source.name}`);
      console.log(`   ${source.url}`);

      try {
        const result = await fetchArticles(source);

        if (result.items && result.items.length > 0) {
          // Filter to last 14 days
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 14);

          const recentItems = result.items.filter(item => {
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
            return pubDate >= cutoff;
          }).slice(0, 15);

          console.log(`   📅 ${recentItems.length} recent items`);

          let saved = 0;
          for (const item of recentItems) {
            const url = item.link || item.url || source.url;
            
            // Check if exists
            const { rows: existing } = await client.query(
              `SELECT id FROM rss_articles WHERE url = $1`, [url]
            );

            if (existing.length === 0) {
              try {
                await client.query(
                  `INSERT INTO rss_articles (title, url, content, summary, source, source_id, published_at, scraped_at, ai_analyzed)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), false)`,
                  [
                    (item.title || 'Untitled').substring(0, 500),
                    url,
                    item.content || item.description || '',
                    (item.content || item.description || item.title || '').substring(0, 1000),
                    source.name,
                    source.id,
                    item.pubDate || new Date().toISOString()
                  ]
                );
                saved++;
                totalSaved++;
              } catch (insertErr) {
                // Likely duplicate URL
              }
            }
          }

          console.log(`   💾 Saved ${saved} new articles`);

          // Update source timestamp
          await client.query(
            `UPDATE rss_sources SET last_scraped = NOW(), updated_at = NOW() WHERE id = $1`,
            [source.id]
          );

          successfulSources++;
        }

        // Respectful delay
        await new Promise(r => setTimeout(r, 1500));

      } catch (sourceError) {
        console.log(`   ❌ Error: ${sourceError.message}`);
        await client.query(
          `UPDATE rss_sources SET updated_at = NOW() WHERE id = $1`,
          [source.id]
        );
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 SCRAPING COMPLETE');
    console.log('═'.repeat(60));
    console.log(`✅ Successful: ${successfulSources}/${sources.length} sources`);
    console.log(`📄 Total new articles: ${totalSaved}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await client.end();
  }
}

main();
