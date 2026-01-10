import { supabase } from './supabase';

/**
 * Data structure matching pyth ai's existing startup format
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
      console.log('📦 Raw data received:', JSON.stringify(data, null, 2));
      
      // Upload to startup_uploads table - matching actual schema
      // Only include essential fields to avoid type mismatches
      const insertData: any = {
        name: data.name,
        status: 'pending',
        submitted_email: 'bulk@import.com',
        source_type: 'manual', // Required field
      };
      
      // Only add optional fields if they're properly formatted
      if (data.industry) {
        insertData.sectors = [data.industry];
      }
      
      console.log('📝 Final insert data (EXACT):', JSON.stringify(insertData, null, 2));
      console.log('🔍 Keys being inserted:', Object.keys(insertData));
      
      // Force the insert by explicitly specifying only the columns we're setting
      const { data: startups, error } = await supabase
        .from('startup_uploads')
        .insert(insertData)
        .select('id, name, status, sectors, created_at');

      if (error) {
        console.error('❌ Supabase error for', data.name, ':', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      const startup = Array.isArray(startups) ? startups[0] : startups;
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
   * Optimized for large batches (500+)
   */
  static async uploadBulkStartups(
    startups: ScrapedStartupData[], 
    onProgress?: (current: number, total: number) => void
  ) {
    console.log('🚀 Starting bulk upload of', startups.length, 'startups');
    
    const BATCH_SIZE = 50; // Process 50 at a time
    const results = [];
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < startups.length; i += BATCH_SIZE) {
      const batch = startups.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(startups.length / BATCH_SIZE);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} startups)`);
      
      const batchResults = await Promise.all(
        batch.map(startup => this.uploadScrapedStartup(startup))
      );
      
      results.push(...batchResults);
      successful += batchResults.filter(r => r.success).length;
      failed += batchResults.filter(r => !r.success).length;
      errors.push(...batchResults.filter(r => !r.success).map(r => r.error || 'Unknown error'));
      
      // Report progress
      if (onProgress) {
        onProgress(i + batch.length, startups.length);
      }
      
      console.log(`✅ Batch ${batchNum} complete: ${batchResults.filter(r => r.success).length}/${batch.length} successful`);
      
      // Small delay between batches to avoid overwhelming Supabase
      if (i + BATCH_SIZE < startups.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`📊 Bulk upload complete: ${successful}/${startups.length} successful, ${failed} failed`);
    if (errors.length > 0) {
      console.error('❌ Upload errors:', errors.slice(0, 5)); // Show first 5 errors
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
      
      // SSOT: Use startup_uploads table (not 'startups')
      const { data, error } = await supabase
        .from('startup_uploads')
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
      // SSOT: Use startup_uploads table (not 'startups')
      const { data, error } = await supabase
        .from('startup_uploads')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

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
