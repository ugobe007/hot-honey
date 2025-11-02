import { supabase } from './supabase';

/**
 * Data structure matching Hot Money Honey's existing startup format
 * This is what OpenAI extracts and what gets stored in Supabase
 */
export interface ScrapedStartupData {
  // Basic info
  name: string;
  website: string;
  
  // 5-point format (matches your existing fivePoints array structure)
  pitch: string;              // Tagline/one-liner (e.g., "Tesla for home solar")
  fivePoints: string[];       // Array of 5 points:
                              // [0] Value proposition/tagline
                              // [1] Market size
                              // [2] Unique value/differentiator  
                              // [3] Team background
                              // [4] Funding/raise amount
  
  // Additional metadata
  industry?: string;
  stage?: string;             // e.g., "Seed", "Series A"
  funding?: string;           // e.g., "$2M Seed"
  logo?: string;
  deck?: string;              // Pitch deck URL
  
  // Scraping metadata
  scraped_by?: string;        // Source URL where data was found
  entityType?: 'startup' | 'vc_firm' | 'accelerator';
}

/**
 * Service for uploading OpenAI-scraped startup data to Supabase
 * Integrates with your existing BulkImport workflow
 */
export class OpenAIDataService {
  /**
   * Upload startup data scraped by OpenAI to Supabase
   * Matches the format from your BulkImport page
   */
  static async uploadScrapedStartup(data: ScrapedStartupData) {
    try {
      // Convert 5-point array to individual columns for Supabase
      const [valueProp, market, unique, team, investment] = data.fivePoints;
      
      const { data: startup, error } = await supabase
        .from('startups')
        .insert([{
          // Generate ID as string (matching your existing format)
          id: `startup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name,
          website: data.website,
          
          // Map 5 points to their respective columns
          tagline: data.pitch,
          pitch: data.pitch,
          
          // Store in both formats for compatibility
          five_points: data.fivePoints,  // Array format (for frontend)
          value_proposition: valueProp,  // Point 1
          problem: market,                // Point 2 (market/problem)
          solution: unique,               // Point 3 (solution/unique value)
          team: team,                     // Point 4
          investment: investment,         // Point 5
          
          // Metadata
          logo: data.logo,
          pitch_deck_url: data.deck,
          scraped_by: data.scraped_by || data.website,
          scraped_at: new Date().toISOString(),
          
          // Workflow status
          status: 'pending',              // Awaiting admin review
          validated: false,
          
          // Additional fields
          stage: data.stage || 'Seed',
          funding: data.funding,
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Startup uploaded to Supabase:', startup.name);
      
      // Also add to localStorage for immediate use (matches your existing workflow)
      this.addToLocalStorage(startup);
      
      return { success: true, startup };
      
    } catch (error: any) {
      console.error('❌ Failed to upload startup:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add startup to localStorage (matches BulkImport behavior)
   * This allows immediate voting without page reload
   */
  private static addToLocalStorage(startup: any) {
    try {
      const uploadedStartups = localStorage.getItem('uploadedStartups');
      const existing = uploadedStartups ? JSON.parse(uploadedStartups) : [];
      
      const newStartup = {
        id: Date.now(),
        name: startup.name,
        tagline: startup.pitch,
        pitch: startup.pitch,
        stage: startup.stage === 'Pre-Seed' ? 1 : startup.stage === 'Seed' ? 1 : 2,
        website: startup.website,
        industries: [startup.industry || 'Technology'],
        fivePoints: startup.five_points,
        raise: startup.funding,
        funding: startup.funding,
        yesVotes: 0,
        noVotes: 0,
        hotness: 0,
        vcBacked: startup.scraped_by,
        entityType: startup.entityType || 'startup'
      };
      
      localStorage.setItem('uploadedStartups', JSON.stringify([...existing, newStartup]));
      console.log('✅ Added to localStorage for immediate voting');
    } catch (error) {
      console.error('⚠️ Could not add to localStorage:', error);
    }
  }

  /**
   * Bulk upload multiple startups from OpenAI scraping
   * Used by BulkImport page after enrichment
   */
  static async uploadBulkStartups(startups: ScrapedStartupData[]) {
    const results = await Promise.all(
      startups.map(startup => this.uploadScrapedStartup(startup))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Bulk upload complete: ${successful} successful, ${failed} failed`);
    
    return {
      total: startups.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get pending startups awaiting review
   * For admin review queue
   */
  static async getPendingStartups() {
    try {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, startups: data };
      
    } catch (error: any) {
      console.error('❌ Failed to fetch pending startups:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve and publish startup to live site
   * Combines approve + publish for simpler workflow
   */
  static async approveAndPublish(startupId: string, reviewedBy: string) {
    try {
      const { data, error } = await supabase
        .from('startups')
        .update({
          status: 'published',
          validated: true,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        })
        .eq('id', startupId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Startup approved and published:', data.name);
      return { success: true, startup: data };
      
    } catch (error: any) {
      console.error('❌ Failed to approve startup:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a scraped startup
   */
  static async rejectStartup(startupId: string, reviewedBy: string) {
    try {
      const { data, error } = await supabase
        .from('startups')
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', startupId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('❌ Startup rejected:', data.name);
      return { success: true, startup: data };
      
    } catch (error: any) {
      console.error('❌ Failed to reject startup:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update startup data (for admin edits)
   */
  static async updateStartup(startupId: string, updates: Partial<ScrapedStartupData>) {
    try {
      // Convert fivePoints array to individual columns if provided
      const supabaseUpdates: any = { ...updates };
      if (updates.fivePoints) {
        const [valueProp, market, unique, team, investment] = updates.fivePoints;
        supabaseUpdates.value_proposition = valueProp;
        supabaseUpdates.problem = market;
        supabaseUpdates.solution = unique;
        supabaseUpdates.team = team;
        supabaseUpdates.investment = investment;
        supabaseUpdates.five_points = updates.fivePoints;
      }
      
      const { data, error } = await supabase
        .from('startups')
        .update(supabaseUpdates)
        .eq('id', startupId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✏️ Startup updated:', data.name);
      return { success: true, startup: data };
      
    } catch (error: any) {
      console.error('❌ Failed to update startup:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get published startups for display on site
   */
  static async getPublishedStartups() {
    try {
      const { data, error } = await supabase
        .from('startups')
        .select('*')
        .eq('status', 'published')
        .eq('validated', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return { success: true, startups: data };
      
    } catch (error: any) {
      console.error('❌ Failed to fetch published startups:', error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Example usage matching your BulkImport workflow:
 * 
 * // After OpenAI enriches a company (from BulkImport page)
 * const enrichedData = {
 *   name: "TechStartup Inc",
 *   website: "https://techstartup.com",
 *   pitch: "Stripe for cryptocurrency payments",
 *   fivePoints: [
 *     "Stripe for cryptocurrency payments",     // 1. Value prop
 *     "$1T+ crypto market",                      // 2. Market size
 *     "One-click crypto checkout",               // 3. Unique value
 *     "Ex-Stripe, Coinbase engineers",           // 4. Team
 *     "Raising $3M Seed"                         // 5. Investment
 *   ],
 *   industry: "FinTech",
 *   stage: "Seed",
 *   funding: "$3M Seed",
 *   scraped_by: "https://ycombinator.com/companies",
 * };
 * 
 * await OpenAIDataService.uploadScrapedStartup(enrichedData);
 */
