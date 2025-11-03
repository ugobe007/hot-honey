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
      console.log('📤 Uploading startup:', data.name);
      
      // Upload to startup_uploads table - matching exact schema from MigrateStartupData.tsx
      const insertData = {
        name: data.name,
        website: data.website || '',
        description: data.pitch || '',
        tagline: data.pitch || '',
        pitch: data.pitch || '',
        raise_amount: data.funding || '',
        raise_type: data.stage || '',
        stage: 1, // Default to 1 (Seed stage)
        source_type: 'manual', // Must be 'manual' - check constraint only allows specific values
        status: 'pending', // Pending for admin review
        extracted_data: {
          fivePoints: data.fivePoints || [],
          industry: data.industry || 'Technology',
          stage: data.stage || 'Seed',
          funding: data.funding || 'N/A',
          pitch: data.pitch || '',
          marketSize: data.fivePoints?.[2] || '',
          unique: data.fivePoints?.[1] || '',
        },
        submitted_by: null,
        submitted_email: 'bulk@import.com',
      };
      
      console.log('📝 Insert data:', insertData);
      
      const { data: startup, error } = await supabase
        .from('startup_uploads')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error for', data.name, ':', error);
        throw error;
      }

      console.log('✅ Startup uploaded to Supabase:', startup?.name);
      
      return { success: true, startup };
      
    } catch (error: any) {
      console.error('❌ Failed to upload startup:', data.name, error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Bulk upload multiple startups from OpenAI scraping
   * Used by BulkImport page after enrichment
   */
  static async uploadBulkStartups(startups: ScrapedStartupData[]) {
    console.log('🚀 Starting bulk upload of', startups.length, 'startups');
    
    const results = await Promise.all(
      startups.map(startup => this.uploadScrapedStartup(startup))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error);

    console.log(`📊 Bulk upload complete: ${successful} successful, ${failed} failed`);
    if (errors.length > 0) {
      console.error('❌ Upload errors:', errors);
    }
    
    return {
      total: startups.length,
      successful,
      failed,
      results,
      errors,
    };
  }

  /**
   * Get pending startups awaiting review
   * For admin review queue
   */
  static async getPendingStartups() {
    try {
      const { data, error } = await supabase
        .from('startup_uploads')
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
  static async approveAndPublish(startupId: string, reviewedBy: string = 'admin') {
    try {
      const { data, error } = await supabase
        .from('startup_uploads')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', startupId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Startup approved:', data.company_name);
      return { success: true, startup: data };
      
    } catch (error: any) {
      console.error('❌ Failed to approve startup:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject a scraped startup
   */
  static async rejectStartup(startupId: string, reviewedBy: string = 'admin') {
    try {
      const { data, error } = await supabase
        .from('startup_uploads')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', startupId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('❌ Startup rejected:', data.company_name);
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
