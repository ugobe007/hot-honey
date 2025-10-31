import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Configuration
 * 
 * To set up:
 * 1. Go to https://supabase.com/dashboard
 * 2. Create a new project
 * 3. Get your Project URL and anon/public API key from Settings > API
 * 4. Add to your .env file:
 *    VITE_SUPABASE_URL=your-project-url
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database Types
 */
export interface StartupRow {
  id: string;
  name: string;
  tagline: string;
  pitch: string;
  five_points: string[]; // PostgreSQL array
  secret_fact: string;
  logo: string;
  website: string;
  validated: boolean;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Startup API Functions
 */

// Get all startups
export async function getAllStartups() {
  const { data, error } = await supabase
    .from('startups')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching startups:', error);
    return [];
  }
  return data || [];
}

// Get validated startups only
export async function getValidatedStartups() {
  const { data, error } = await supabase
    .from('startups')
    .select('*')
    .eq('validated', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching validated startups:', error);
    return [];
  }
  return data || [];
}

// Add new startup
export async function addStartup(startup: Omit<StartupRow, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('startups')
    .insert([startup])
    .select();
  
  if (error) {
    console.error('Error adding startup:', error);
    throw error;
  }
  return data[0];
}

// Update startup
export async function updateStartup(id: string, updates: Partial<StartupRow>) {
  const { data, error } = await supabase
    .from('startups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Error updating startup:', error);
    throw error;
  }
  return data[0];
}

// Delete startup
export async function deleteStartup(id: string) {
  const { error } = await supabase
    .from('startups')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting startup:', error);
    throw error;
  }
}

// Mark startup as validated
export async function validateStartup(id: string) {
  return updateStartup(id, { validated: true });
}

// Bulk insert startups
export async function bulkInsertStartups(startups: Omit<StartupRow, 'created_at' | 'updated_at'>[]) {
  const { data, error } = await supabase
    .from('startups')
    .insert(startups)
    .select();
  
  if (error) {
    console.error('Error bulk inserting startups:', error);
    throw error;
  }
  return data;
}
