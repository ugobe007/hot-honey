import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

// Only create client if we have valid credentials
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder-key'); // Fallback to prevent crash

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