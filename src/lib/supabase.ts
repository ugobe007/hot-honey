import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching your existing schema
export interface Startup {
  id: string;
  name: string;
  value_prop: string;
  problem: string;
  solution: string;
  team: string;
  funding: string;
  stage: string;
  votes_yes: number;
  votes_no: number;
  created_at: string;
  updated_at: string;
  presentation_url?: string;
  video_url?: string;
  pitch_deck_url?: string;
}

// User vote tracking
export interface UserVote {
  id: string;
  user_id: string;
  startup_id: string;
  vote_type: 'yes' | 'no';
  created_at: string;
}