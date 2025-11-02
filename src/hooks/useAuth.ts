import { useState, useEffect } from 'react';

/**
 * Simple auth hook that manages a user session ID
 * Uses localStorage to persist the session across page reloads
 * This allows anonymous users to vote and track their votes
 */
export function useAuth() {
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get or create a session user ID
    let sessionId = localStorage.getItem('sessionUserId');
    
    if (!sessionId) {
      // Generate a unique session ID for anonymous users
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionUserId', sessionId);
    }
    
    setUserId(sessionId);
    setIsLoading(false);
  }, []);

  const clearSession = () => {
    localStorage.removeItem('sessionUserId');
    const newSessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionUserId', newSessionId);
    setUserId(newSessionId);
  };

  return {
    userId,
    isLoading,
    isAuthenticated: !!userId,
    clearSession,
  };
}
