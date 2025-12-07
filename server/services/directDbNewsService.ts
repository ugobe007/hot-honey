import pkg from 'pg';
const { Pool } = pkg;
import axios from 'axios';
import * as cheerio from 'cheerio';
// @ts-ignore
import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Direct PostgreSQL connection - bypasses Supabase REST API
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface FundingRound {
  startupName: string;
  roundType: string;
  amountUsd: number;
  valuationUsd?: number;
  announcedDate: Date;
  leadInvestors: string[];
  participatingInvestors: string[];
  source: string;
  sourceUrl: string;
  newsHeadline: string;
  confidenceScore: number;
}

interface StartupNews {
  startupName: string;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  publishedDate: Date;
  sentimentScore?: number;
  category?: string;
}

export class DirectDbNewsService {
  private techCrunchRSSUrl = 'https://techcrunch.com/tag/funding/feed/';
  private ycHackerNewsUrl = 'https://news.ycombinator.com/';

  async scrapeAll(): Promise<{ fundingRounds: number; newsItems: number }> {
    console.log('[DirectDbNewsService] Starting full scrape with direct DB...');
    
    let fundingCount = 0;
    let newsCount = 0;

    try {
      // Scrape TechCrunch
      const tcResults = await this.scrapeTechCrunch();
      
      // Store funding rounds directly in PostgreSQL
      for (const round of tcResults.fundingRounds) {
        try {
          await pool.query(`
            INSERT INTO funding_rounds (
              startup_name, round_type, amount_usd, valuation_usd,
              announced_date, lead_investors, participating_investors,
              source, source_url, news_headline, confidence_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (startup_name, round_type, announced_date) DO NOTHING
          `, [
            round.startupName,
            round.roundType,
            round.amountUsd,
            round.valuationUsd,
            round.announcedDate,
            round.leadInvestors,
            round.participatingInvestors,
            round.source,
            round.sourceUrl,
            round.newsHeadline,
            round.confidenceScore
          ]);
          fundingCount++;
        } catch (err: any) {
          console.error('[DirectDb] Error storing funding round:', err.message, err.stack);
        }
      }

      // Store news items
      for (const news of tcResults.newsItems) {
        try {
          await pool.query(`
            INSERT INTO startup_news (
              startup_name, headline, summary, source, url,
              published_date, sentiment_score, category
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (url) DO NOTHING
          `, [
            news.startupName,
            news.headline,
            news.summary,
            news.source,
            news.url,
            news.publishedDate,
            news.sentimentScore,
            news.category
          ]);
          newsCount++;
        } catch (err: any) {
          console.error('[DirectDb] Error storing news item:', err.message, err.stack);
        }
      }

      console.log(`[DirectDbNewsService] ✅ Stored ${fundingCount} funding rounds, ${newsCount} news items`);
      return { fundingRounds: fundingCount, newsItems: newsCount };

    } catch (error: any) {
      console.error('[DirectDbNewsService] Scrape error:', error.message);
      return { fundingRounds: 0, newsItems: 0 };
    }
  }

  private async scrapeTechCrunch(): Promise<{
    fundingRounds: FundingRound[];
    newsItems: StartupNews[];
  }> {
    const fundingRounds: FundingRound[] = [];
    const newsItems: StartupNews[] = [];

    try {
      const response = await axios.get(this.techCrunchRSSUrl);
      const $ = cheerio.load(response.data, { xmlMode: true });

      $('item').each((_, item) => {
        const title = $(item).find('title').text();
        const link = $(item).find('link').text();
        const content = $(item).find('description').text() || $(item).find('content\\:encoded').text();
        const pubDate = new Date($(item).find('pubDate').text());

        // Extract funding info
        const fundingAmount = this.extractFundingAmount(title + ' ' + content);
        const roundType = this.extractRoundType(title + ' ' + content);
        const startupName = this.extractStartupName(title);

        if (fundingAmount && startupName) {
          fundingRounds.push({
            startupName,
            roundType: roundType || 'unknown',
            amountUsd: fundingAmount,
            announcedDate: pubDate,
            leadInvestors: [],
            participatingInvestors: [],
            source: 'techcrunch',
            sourceUrl: link,
            newsHeadline: title,
            confidenceScore: 0.9
          });
        }

        // Store as news
        const sentimentResult = sentiment.analyze(content);
        newsItems.push({
          startupName: startupName || 'Unknown',
          headline: title,
          summary: content.substring(0, 500),
          source: 'techcrunch',
          url: link,
          publishedDate: pubDate,
          sentimentScore: Math.max(-1, Math.min(1, sentimentResult.score / 10)),
          category: 'funding'
        });
      });

      console.log(`[TechCrunch] Found ${fundingRounds.length} funding rounds, ${newsItems.length} news items`);
    } catch (error: any) {
      console.error('[TechCrunch] Scrape error:', error.message);
    }

    return { fundingRounds, newsItems };
  }

  private extractFundingAmount(text: string): number | null {
    const patterns = [
      /\$(\d+(?:\.\d+)?)\s*(?:million|M)/i,
      /\$(\d+(?:\.\d+)?)\s*(?:billion|B)/i,
      /raises?\s+\$(\d+(?:\.\d+)?)\s*(?:million|M)/i,
      /secures?\s+\$(\d+(?:\.\d+)?)\s*(?:million|M)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);
        if (text.toLowerCase().includes('billion') || text.toLowerCase().includes(' b')) {
          return Math.round(amount * 1_000_000_000);
        }
        return Math.round(amount * 1_000_000);
      }
    }
    return null;
  }

  private extractRoundType(text: string): string | null {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('series a')) return 'series_a';
    if (lowerText.includes('series b')) return 'series_b';
    if (lowerText.includes('series c')) return 'series_c';
    if (lowerText.includes('seed')) return 'seed';
    if (lowerText.includes('pre-seed')) return 'pre_seed';
    return null;
  }

  private extractStartupName(title: string): string | null {
    // Extract startup name from titles like "Company raises $10M in Series A"
    const patterns = [
      /^([A-Z][a-zA-Z0-9\s&]+?)\s+(?:raises|secures|closes|lands)/,
      /^([A-Z][a-zA-Z0-9\s&]+?)\s+gets/,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }
}
