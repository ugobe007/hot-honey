import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  Rocket, 
  Briefcase, 
  ChevronDown,
  X,
  Loader2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const FREE_SEARCH_LIMIT = 2;
const SEARCH_COUNT_KEY = 'hotmatch_search_count';

interface SearchResult {
  id: string;
  type: 'startup' | 'investor';
  name: string;
  tagline?: string;
  firm?: string;
  score?: number;
}

interface InlineSearchBarProps {
  onSelectStartup?: (startupId: string) => void;
  onSelectInvestor?: (investorId: string) => void;
}

export default function InlineSearchBar({ onSelectStartup, onSelectInvestor }: InlineSearchBarProps) {
  const [mode, setMode] = useState<'startup' | 'investor'>('startup');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load search count from localStorage on mount
  useEffect(() => {
    const savedCount = localStorage.getItem(SEARCH_COUNT_KEY);
    if (savedCount) {
      setSearchCount(parseInt(savedCount, 10));
    }
  }, []);

  // Check if limit reached
  const isLimitReached = searchCount >= FREE_SEARCH_LIMIT;
  const remainingSearches = Math.max(0, FREE_SEARCH_LIMIT - searchCount);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowModeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      if (mode === 'startup') {
        const { data } = await supabase
          .from('startup_uploads')
          .select('id, name, tagline, total_god_score')
          .or(`name.ilike.%${searchQuery}%,tagline.ilike.%${searchQuery}%`)
          .eq('status', 'approved')
          .order('total_god_score', { ascending: false, nullsFirst: false })
          .limit(6);

        setResults((data || []).map(s => ({
          id: s.id,
          type: 'startup' as const,
          name: s.name,
          tagline: s.tagline,
          score: s.total_god_score,
        })));
      } else {
        const { data } = await supabase
          .from('investors')
          .select('id, name, firm')
          .or(`name.ilike.%${searchQuery}%,firm.ilike.%${searchQuery}%`)
          .limit(6);

        setResults((data || []).map(i => ({
          id: i.id,
          type: 'investor' as const,
          name: i.name,
          firm: i.firm,
        })));
      }
      setShowDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [mode]);

  // Debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    // Check search limit
    if (isLimitReached) {
      setShowLimitModal(true);
      setShowDropdown(false);
      return;
    }
    
    // Increment search count
    const newCount = searchCount + 1;
    setSearchCount(newCount);
    localStorage.setItem(SEARCH_COUNT_KEY, newCount.toString());
    
    setShowDropdown(false);
    setQuery('');
    setResults([]);
    
    if (result.type === 'startup' && onSelectStartup) {
      onSelectStartup(result.id);
    } else if (result.type === 'investor' && onSelectInvestor) {
      onSelectInvestor(result.id);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30">
        
        {/* Mode Selector */}
        <div className="relative">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className={`flex items-center gap-2 px-4 py-3 border-r border-white/10 hover:bg-white/5 transition-colors ${
              mode === 'startup' ? 'text-cyan-400' : 'text-purple-400'
            }`}
          >
            {mode === 'startup' ? <Rocket className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
            <span className="text-sm font-medium hidden sm:block">
              {mode === 'startup' ? 'Startup' : 'Investor'}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          
          {showModeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => { setMode('startup'); setShowModeMenu(false); setQuery(''); setResults([]); }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-white/5 ${
                  mode === 'startup' ? 'text-cyan-400 bg-cyan-600/10' : 'text-gray-300'
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span className="text-sm">Find Investors for Startup</span>
              </button>
              <button
                onClick={() => { setMode('investor'); setShowModeMenu(false); setQuery(''); setResults([]); }}
                className={`flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-white/5 ${
                  mode === 'investor' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-sm">Find Startups for Investor</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="flex-1 flex items-center">
          <Search className={`ml-3 w-4 h-4 ${isSearching ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
            placeholder={mode === 'startup' 
              ? 'Search startup name to find matching investors...' 
              : 'Search investor or firm to find matching startups...'
            }
            className="flex-1 px-3 py-3 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); }}
              className="p-2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Button */}
        <button 
          onClick={() => performSearch(query)}
          className={`px-4 py-2 mr-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'startup'
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          Search
        </button>
      </div>

      {/* Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <span className="text-xs text-gray-500 px-2">
              {results.length} {mode}s found — click to view matches
            </span>
          </div>
          {results.map((result, idx) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-all flex items-center gap-3 ${
                idx !== results.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                result.type === 'startup' ? 'bg-cyan-600/20' : 'bg-purple-500/20'
              }`}>
                {result.type === 'startup' 
                  ? <Rocket className="w-4 h-4 text-cyan-400" />
                  : <Briefcase className="w-4 h-4 text-purple-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium truncate">{result.name}</span>
                  {result.score && (
                    <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded">
                      GOD: {result.score}
                    </span>
                  )}
                </div>
                {result.firm && <p className="text-purple-400 text-sm">{result.firm}</p>}
                {result.tagline && <p className="text-gray-500 text-sm truncate">{result.tagline}</p>}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </button>
          ))}
          
          {/* Search count indicator in dropdown */}
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {remainingSearches > 0 
                ? `${remainingSearches} free search${remainingSearches === 1 ? '' : 'es'} remaining`
                : 'Free limit reached'
              }
            </span>
            {remainingSearches === 0 && (
              <a href="/get-matched" className="text-xs text-cyan-400 hover:text-cyan-300">
                Sign up for unlimited →
              </a>
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {showDropdown && query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl p-6 text-center z-50">
          <p className="text-gray-400">No {mode}s found for "{query}"</p>
        </div>
      )}

      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLimitModal(false)}
        >
          <div 
            className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Free Search Limit Reached</h3>
              <p className="text-gray-400 mb-6">
                You've used your {FREE_SEARCH_LIMIT} free searches. Sign up for a free account to unlock unlimited searches!
              </p>
              <div className="space-y-3">
                <a 
                  href="/get-matched"
                  className="block w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:from-cyan-600 hover:to-blue-600 transition-all"
                >
                  🚀 Sign Up Free
                </a>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-2 rounded-xl bg-slate-800 text-gray-400 font-medium hover:bg-slate-700 transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
