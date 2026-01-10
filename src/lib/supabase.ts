import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Track if credentials are missing (for error display)
export const hasValidSupabaseCredentials = !!(supabaseUrl && supabaseAnonKey);

if (!hasValidSupabaseCredentials) {
  console.error('⚠️ Missing Supabase environment variables. Please check your .env file.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  console.error('💡 Add these to your .env file in the project root:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   VITE_SUPABASE_ANON_KEY=your-anon-key-here');
}

// Only create client if we have valid credentials
// Use placeholder to prevent crashes, but operations will fail gracefully
export const supabase = hasValidSupabaseCredentials
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co', 
      supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

/**
 * @deprecated Use `Startup` from '@/types' or '@/lib/database.types' instead
 * This interface has been removed. Use the SSOT types from database.types.ts
 * 
 * For OpenAI 5-point format data, use adaptStartupForComponent() from '@/utils/startupAdapters'
 * which extracts value_proposition, problem, solution, team, investment from extracted_data
 */

// User vote tracking
export interface UserVote {
  id: string;
  user_id: string;
  startup_id: string;
  vote_type: 'yes' | 'no';
  created_at: string;
}