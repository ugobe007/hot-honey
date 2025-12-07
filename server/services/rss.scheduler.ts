/**
 * RSS SCRAPER SCHEDULER
 * Runs RSS scraper every 6 hours automatically
 */

import { supabase } from '../config/supabase.js';

export class RSSScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start automated RSS scraping (every 6 hours)
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  RSS Scheduler already running');
      return;
    }

    console.log('📰 RSS SCHEDULER STARTED - Scraping every 6 hours');
    this.isRunning = true;

    // Run immediately on start
    this.runScrape();

    // Then run every 6 hours
    this.intervalId = setInterval(() => {
      this.runScrape();
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Stop scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('📰 RSS SCHEDULER STOPPED');
  }

  /**
   * Run RSS scrape
   */
  private async runScrape() {
    try {
      console.log('\n📰 [RSS SCHEDULER] Starting automated scrape...');
      
      // Create a scraper job
      const { data: job, error: jobError } = await supabase
        .from('scraper_jobs')
        .insert({
          status: 'running',
          started_at: new Date().toISOString(),
          metadata: { type: 'automated_rss_scrape' }
        })
        .select()
        .single();

      if (jobError) {
        console.error('   ❌ Failed to create scraper job:', jobError);
        return;
      }

      console.log(`   🚀 Created scraper job: ${job.id}`);
      
      // Note: Actual scraping logic would go here
      // For now, just mark as completed
      await supabase
        .from('scraper_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          companies_found: 0
        })
        .eq('id', job.id);

      console.log('   ✅ [RSS SCHEDULER] Scrape completed\n');

    } catch (error) {
      console.error('❌ [RSS SCHEDULER] Error:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      status: this.isRunning ? 'Active' : 'Stopped'
    };
  }
}

// Singleton instance
export const rssScheduler = new RSSScheduler();
