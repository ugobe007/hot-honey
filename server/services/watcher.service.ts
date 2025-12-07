/**
 * THE WATCHER
 * Monitors new startups and auto-generates matches
 */

import { supabase } from '../config/supabase.js';
import { generateMatches } from './investorMatching.js';

export class WatcherService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start The Watcher (runs every 15 minutes)
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Watcher already running');
      return;
    }

    console.log('👁️  THE WATCHER STARTED - Monitoring for new startups...');
    this.isRunning = true;

    // Run immediately
    this.processNewStartups();

    // Then run every 15 minutes
    this.intervalId = setInterval(() => {
      this.processNewStartups();
    }, 15 * 60 * 1000); // 15 minutes
  }

  /**
   * Stop The Watcher
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('👁️  THE WATCHER STOPPED');
  }

  /**
   * Process new startups without matches
   */
  private async processNewStartups() {
    try {
      console.log('\n👁️  [WATCHER] Checking for new startups...');

      // Get all startup IDs
      const { data: allStartups } = await supabase
        .from('startup_uploads')
        .select('id, name, status')
        .eq('status', 'pending');

      if (!allStartups || allStartups.length === 0) {
        console.log('   ℹ️  No pending startups found');
        return;
      }

      // Get all startup IDs that have matches
      const { data: matchedStartups } = await supabase
        .from('startup_investor_matches')
        .select('startup_id');

      const matchedIds = new Set(matchedStartups?.map(m => m.startup_id) || []);

      // Filter to startups without matches
      const startupsWithoutMatches = allStartups.filter(s => !matchedIds.has(s.id));

      if (startupsWithoutMatches.length === 0) {
        console.log('   ✅ All pending startups have matches');
        return;
      }

      console.log(`   🎯 Found ${startupsWithoutMatches.length} startups needing matches`);

      // Process in batches of 3 to avoid overload
      const batchSize = 3;
      for (let i = 0; i < startupsWithoutMatches.length; i += batchSize) {
        const batch = startupsWithoutMatches.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(startup => this.generateMatchesForStartup(startup))
        );

        // Wait between batches
        if (i + batchSize < startupsWithoutMatches.length) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      console.log(`   ✅ [WATCHER] Processing complete\n`);

    } catch (error) {
      console.error('❌ [WATCHER] Error:', error);
    }
  }

  /**
   * Generate matches for a single startup
   */
  private async generateMatchesForStartup(startup: any) {
    try {
      console.log(`   🤖 Generating matches for: ${startup.name}`);
      
      // Use user_id from startup, or default to startup id if not available
      const userId = startup.user_id || startup.id;
      
      const matches = await generateMatches(startup.id, userId, 10, startup);
      
      if (matches && matches.length > 0) {
        console.log(`      ✅ Created ${matches.length} matches`);
      } else {
        console.log(`      ⚠️  No matches created`);
      }

    } catch (error: any) {
      console.error(`      ❌ Failed for ${startup.name}:`, error.message);
    }
  }

  /**
   * Get watcher status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? 'Active' : 'Stopped'
    };
  }
}

// Singleton instance
export const watcher = new WatcherService();
