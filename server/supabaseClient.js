const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Supabase Client for Server
 * 
 * Add to server/.env:
 * SUPABASE_URL=your-project-url
 * SUPABASE_SERVICE_KEY=your-service-role-key (NOT anon key!)
 */

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Save scraped startup to Supabase
 */
async function saveStartupToSupabase(startupData) {
  try {
    const { data, error } = await supabase
      .from('startups')
      .insert([{
        id: startupData.id,
        name: startupData.name,
        tagline: startupData.tagline,
        pitch: startupData.pitch,
        five_points: startupData.fivePoints, // Maps to PostgreSQL array
        secret_fact: startupData.secretFact,
        logo: startupData.logo,
        website: startupData.website,
        validated: false,
        scraped_at: startupData.scrapedAt || new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      return { success: false, error };
    }

    console.log('✅ Saved to Supabase:', data[0].name);
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('❌ Exception saving to Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if startup already exists
 */
async function startupExists(website) {
  const { data, error } = await supabase
    .from('startups')
    .select('id')
    .eq('website', website)
    .single();

  return !!data;
}

module.exports = {
  supabase,
  saveStartupToSupabase,
  startupExists
};
