/**
 * SAVED MATCHES SERVICE
 * =====================
 * Manages saved/favorite matches with localStorage and Supabase sync
 */

import { supabase } from './supabase';

export interface SavedMatch {
  id: string;
  startupId: string;
  investorId: string;
  startupName: string;
  investorName: string;
  matchScore: number;
  savedAt: string;
  notes?: string;
  status?: 'saved' | 'contacted' | 'meeting_scheduled' | 'passed';
}

const STORAGE_KEY = 'hotmatch_saved_matches';

// Get all saved matches from localStorage
export function getSavedMatches(): SavedMatch[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Check if a specific match is saved
export function isMatchSaved(startupId: string, investorId: string): boolean {
  const saved = getSavedMatches();
  return saved.some(m => m.startupId === startupId && m.investorId === investorId);
}

// Save a match
export function saveMatch(match: Omit<SavedMatch, 'id' | 'savedAt'>): SavedMatch {
  const saved = getSavedMatches();
  
  // Check if already saved
  const existing = saved.find(m => m.startupId === match.startupId && m.investorId === match.investorId);
  if (existing) return existing;
  
  const newMatch: SavedMatch = {
    ...match,
    id: `${match.startupId}-${match.investorId}`,
    savedAt: new Date().toISOString(),
    status: 'saved'
  };
  
  saved.push(newMatch);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  
  // Sync to Supabase if user is logged in
  syncToSupabase(newMatch);
  
  return newMatch;
}

// Unsave/remove a match
export function unsaveMatch(startupId: string, investorId: string): void {
  const saved = getSavedMatches();
  const filtered = saved.filter(m => !(m.startupId === startupId && m.investorId === investorId));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  
  // Remove from Supabase
  removeFromSupabase(startupId, investorId);
}

// Update match status
export function updateMatchStatus(startupId: string, investorId: string, status: SavedMatch['status']): void {
  const saved = getSavedMatches();
  const match = saved.find(m => m.startupId === startupId && m.investorId === investorId);
  if (match) {
    match.status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
}

// Add notes to a match
export function addMatchNotes(startupId: string, investorId: string, notes: string): void {
  const saved = getSavedMatches();
  const match = saved.find(m => m.startupId === startupId && m.investorId === investorId);
  if (match) {
    match.notes = notes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
}

// Get matches by status
export function getMatchesByStatus(status: SavedMatch['status']): SavedMatch[] {
  return getSavedMatches().filter(m => m.status === status);
}

// Get saved match count
export function getSavedMatchCount(): number {
  return getSavedMatches().length;
}

// Sync to Supabase (for logged-in users)
async function syncToSupabase(match: SavedMatch): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('saved_matches').upsert({
      user_id: user.id,
      startup_id: match.startupId,
      investor_id: match.investorId,
      match_score: match.matchScore,
      status: match.status,
      notes: match.notes,
      saved_at: match.savedAt
    }, {
      onConflict: 'user_id,startup_id,investor_id'
    });
  } catch (err) {
    console.warn('Failed to sync saved match to Supabase:', err);
  }
}

// Remove from Supabase
async function removeFromSupabase(startupId: string, investorId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('saved_matches')
      .delete()
      .eq('user_id', user.id)
      .eq('startup_id', startupId)
      .eq('investor_id', investorId);
  } catch (err) {
    console.warn('Failed to remove saved match from Supabase:', err);
  }
}

// Load saved matches from Supabase (on login)
export async function loadFromSupabase(): Promise<SavedMatch[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getSavedMatches();
    
    const { data, error } = await supabase
      .from('saved_matches')
      .select(`
        startup_id,
        investor_id,
        match_score,
        status,
        notes,
        saved_at,
        startup_uploads(name),
        investors(name)
      `)
      .eq('user_id', user.id);
    
    if (error || !data) return getSavedMatches();
    
    const matches: SavedMatch[] = data.map((d: any) => ({
      id: `${d.startup_id}-${d.investor_id}`,
      startupId: d.startup_id,
      investorId: d.investor_id,
      startupName: d.startup_uploads?.name || 'Unknown',
      investorName: d.investors?.name || 'Unknown',
      matchScore: d.match_score,
      savedAt: d.saved_at,
      status: d.status,
      notes: d.notes
    }));
    
    // Merge with local storage
    const local = getSavedMatches();
    const merged = [...matches];
    
    for (const localMatch of local) {
      if (!merged.some(m => m.startupId === localMatch.startupId && m.investorId === localMatch.investorId)) {
        merged.push(localMatch);
        syncToSupabase(localMatch);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Failed to load saved matches from Supabase:', err);
    return getSavedMatches();
  }
}
