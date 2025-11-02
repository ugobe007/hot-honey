import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types - aligned with OpenAI 5-point format
export interface Startup {
  id: string;
  name: string;
  website: string;
  
  // 5-point data structure (OpenAI format)
  value_proposition: string;  // Point 1: What value does this provide?
  problem: string;             // Point 2: What problem are they solving?
  solution: string;            // Point 3: How do they solve it?
  team: string;                // Point 4: Team background and former employers
  investment: string;          // Point 5: Funding raised or needed
  
  // Metadata
  logo?: string;
  pitch_deck_url?: string;
  
  // OpenAI scraping metadata
  scraped_by?: string;         // Source URL
  scraped_at?: string;
  
  // Review workflow
  status: 'pending' | 'approved' | 'rejected' | 'published';
  reviewed_by?: string;
  reviewed_at?: string;
  published_at?: string;
  validated: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// User vote tracking
export interface UserVote {
  id: string;
  user_id: string;
  startup_id: string;
  vote_type: 'yes' | 'no';
  created_at: string;
}