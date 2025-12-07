/**
 * Automated News Scraper Service with MCP SQL Storage
 * Runs on schedule and stores data directly via SQL (bypassing PostgREST)
 */

import cron from 'node-cron';
import { newsScraper, NewsScraper } from './newsScraper.js';
import { Pool } from 'pg';

export class AutoScraperMCP {
  private scraper: NewsScraper;
  private cronJob: cron.ScheduledTask | null = null;
  private pool: Pool;
  private isRunning = false;

  constructor() {
    this.scraper = newsScraper;
    
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false, // Set to true if needed
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  /**
   * Start automated scraping on 6-hour schedule
   * Cron: "0 */6 * * *" runs at 00:00, 06:00, 12:00, 18:00 daily
   */
  start() {
    console.log('[AutoScraperMCP] Starting automated news scraper...');
    console.log('[AutoScraperMCP] Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00)');

    // Run immediately on startup
    this.runScrapeAndStore().catch(error => {
      console.error('[AutoScraperMCP] Initial scrape failed:', error.message);
    });

    // Schedule recurring scrapes
    this.cronJob = cron.schedule('0 */6 * * *', async () => {
      if (this.isRunning) {
        console.log('[AutoScraperMCP] Previous scrape still running, skipping...');
        return;
      }

      await this.runScrapeAndStore();
    });

    console.log('[AutoScraperMCP] ✅ Automated scraper started successfully');
  }

  /**
   * Stop automated scraping
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[AutoScraperMCP] Automated scraper stopped');
    }
    this.pool.end();
  }

  /**
   * Run scrape and store results via PostgreSQL
   */
  private async runScrapeAndStore(): Promise<void> {
    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AutoScraperMCP] 🚀 Starting scheduled scrape...');
      console.log(`[AutoScraperMCP] Time: ${new Date().toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Scrape data
      const { fundingSql, newsSql } = await this.scraper.scrapeAndGenerateSQL();

      console.log(`[AutoScraperMCP] Found ${fundingSql.length} funding rounds, ${newsSql.length} news items`);

      // Store funding rounds
      let fundingInserted = 0;
      let fundingErrors = 0;

      for (const sql of fundingSql) {
        try {
          await this.pool.query(sql);
          fundingInserted++;
        } catch (error: any) {
          // Ignore duplicate key errors (ON CONFLICT)
          if (!error.message.includes('duplicate') && !error.message.includes('conflict')) {
            console.error('[AutoScraperMCP] Funding insert error:', error.message);
            fundingErrors++;
          }
        }
      }

      // Store news items
      let newsInserted = 0;
      let newsErrors = 0;

      for (const sql of newsSql) {
        try {
          await this.pool.query(sql);
          newsInserted++;
        } catch (error: any) {
          // Ignore duplicate errors
          if (!error.message.includes('duplicate')) {
            console.error('[AutoScraperMCP] News insert error:', error.message);
            newsErrors++;
          }
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AutoScraperMCP] ✅ Scrape completed successfully');
      console.log(`[AutoScraperMCP] Duration: ${duration}s`);
      console.log(`[AutoScraperMCP] Funding rounds: ${fundingInserted} inserted, ${fundingErrors} errors`);
      console.log(`[AutoScraperMCP] News items: ${newsInserted} inserted, ${newsErrors} errors`);
      console.log(`[AutoScraperMCP] Next run: ${this.getNextRunTime()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Log to database for monitoring
      await this.logScrapeRun({
        fundingFound: fundingSql.length,
        fundingInserted,
        fundingErrors,
        newsFound: newsSql.length,
        newsInserted,
        newsErrors,
        duration: parseFloat(duration),
        timestamp: new Date(),
      });

    } catch (error: any) {
      console.error('[AutoScraperMCP] ❌ Scrape failed:', error.message);
      console.error(error.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get next scheduled run time
   */
  private getNextRunTime(): string {
    const now = new Date();
    const hours = [0, 6, 12, 18];
    const currentHour = now.getHours();

    // Find next run hour
    let nextHour = hours.find(h => h > currentHour);
    if (!nextHour) {
      nextHour = hours[0]; // Next day
    }

    const next = new Date(now);
    next.setHours(nextHour, 0, 0, 0);

    // If next hour is tomorrow
    if (nextHour <= currentHour) {
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString();
  }

  /**
   * Log scrape run for monitoring (optional - creates audit trail)
   */
  private async logScrapeRun(stats: {
    fundingFound: number;
    fundingInserted: number;
    fundingErrors: number;
    newsFound: number;
    newsInserted: number;
    newsErrors: number;
    duration: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      // You can create a scraper_runs table to track this
      // For now, just log to console
      console.log('[AutoScraperMCP] Scrape stats logged');
    } catch (error) {
      // Silently fail - logging shouldn't break scraping
    }
  }

  /**
   * Manual trigger for testing
   */
  async runNow(): Promise<void> {
    console.log('[AutoScraperMCP] Manual trigger requested');
    await this.runScrapeAndStore();
  }

  /**
   * Get scraper status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      nextRun: this.cronJob ? this.getNextRunTime() : 'Not scheduled',
      schedule: '0 */6 * * * (every 6 hours)',
    };
  }
}

// Export singleton instance
let scraperInstance: AutoScraperMCP | null = null;

export function getAutoScraperInstance(): AutoScraperMCP {
  if (!scraperInstance) {
    scraperInstance = new AutoScraperMCP();
  }
  return scraperInstance;
}
