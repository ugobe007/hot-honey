/**
 * Server-side Supabase Client Configuration
 * 
 * This provides a properly configured Supabase client for server-side use
 * in Node.js scripts, background workers, and API routes.
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables - support both server and Vite prefixed versions
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.warn('⚠️ SUPABASE_URL not found in environment variables');
}

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_KEY not found in environment variables');
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export for CommonJS compatibility
export default supabase;
