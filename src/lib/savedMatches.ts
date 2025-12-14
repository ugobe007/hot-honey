// Local storage utilities for saved matches

export interface SavedMatch {
  id: string;
  startupId: string | number;
  investorId: string;
  startupName: string;
  investorName: string;
  matchScore: number;
  timestamp: number;
  tags: string[];
}

const STORAGE_KEY = 'hot_money_saved_matches';

export const getSavedMatches = (): SavedMatch[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error reading saved matches:', error);
    return [];
  }
};

export const saveMatch = (match: Omit<SavedMatch, 'id' | 'timestamp'>): void => {
  try {
    const saved = getSavedMatches();
    const newMatch: SavedMatch = {
      ...match,
      id: `${match.startupId}_${match.investorId}_${Date.now()}`,
      timestamp: Date.now(),
    };
    
    // Check if already saved (same startup + investor combination)
    const alreadySaved = saved.some(
      (m) => m.startupId === match.startupId && m.investorId === match.investorId
    );
    
    if (!alreadySaved) {
      saved.push(newMatch);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
  } catch (error) {
    console.error('Error saving match:', error);
  }
};

export const unsaveMatch = (startupId: string | number, investorId: string): void => {
  try {
    const saved = getSavedMatches();
    const filtered = saved.filter(
      (m) => !(m.startupId === startupId && m.investorId === investorId)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing saved match:', error);
  }
};

export const isMatchSaved = (startupId: string | number, investorId: string): boolean => {
  try {
    const saved = getSavedMatches();
    return saved.some((m) => m.startupId === startupId && m.investorId === investorId);
  } catch (error) {
    console.error('Error checking saved match:', error);
    return false;
  }
};

export const clearAllSavedMatches = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing saved matches:', error);
  }
};
