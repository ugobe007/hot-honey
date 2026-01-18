/**
 * SuggestedWatchlist - Shows top trending startups for user's preferred sector
 * 
 * Displays if user has preferred_sector set from onboarding.
 * Shows top 5 startups by GOD score in that sector.
 */

import { useState, useEffect } from 'react';
import { Eye, TrendingUp, Flame } from 'lucide-react';
import { getOnboardingState, SECTOR_OPTIONS } from '../lib/onboarding';
import { logEvent } from '../analytics';
import { supabase } from '../lib/supabase';

interface SuggestedStartup {
  id: string;
  name: string;
  total_god_score: number;
  sectors: string[];
  logo_url?: string;
}

interface SuggestedWatchlistProps {
  onWatch: (startupId: string) => void;
  watchedIds: Set<string>;
}

export default function SuggestedWatchlist({ onWatch, watchedIds }: SuggestedWatchlistProps) {
  const [startups, setStartups] = useState<SuggestedStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorLabel, setSectorLabel] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const state = getOnboardingState();
    
    if (!state.preferred_sector) {
      setVisible(false);
      setLoading(false);
      return;
    }

    const sector = SECTOR_OPTIONS.find(s => s.id === state.preferred_sector);
    setSectorLabel(sector?.label || state.preferred_sector);
    setVisible(true);

    loadSuggestedStartups(state.preferred_sector);
  }, []);

  const loadSuggestedStartups = async (sectorId: string) => {
    try {
      // Map sector ID to possible sector values in database
      const sectorMappings: Record<string, string[]> = {
        'ai-ml': ['AI', 'AI/ML', 'Machine Learning', 'Artificial Intelligence'],
        'saas': ['SaaS', 'Software', 'B2B SaaS'],
        'fintech': ['FinTech', 'Fintech', 'Finance', 'Financial Services'],
        'devtools': ['DevTools', 'Developer Tools', 'Infrastructure'],
        'healthtech': ['HealthTech', 'Healthcare', 'Health Tech', 'Digital Health'],
        'climate': ['Climate', 'CleanTech', 'Sustainability', 'GreenTech'],
        'consumer': ['Consumer', 'B2C', 'E-commerce', 'Retail'],
        'enterprise': ['Enterprise', 'B2B', 'Enterprise Software'],
        'crypto': ['Crypto', 'Web3', 'Blockchain', 'DeFi'],
        'biotech': ['Biotech', 'Life Sciences', 'Pharma']
      };

      const sectorTerms = sectorMappings[sectorId] || [sectorId];
      
      // Query startups that match any of the sector terms
      const { data, error } = await supabase
        .from('startup_uploads')
        .select('id, name, total_god_score, sectors, logo_url')
        .eq('status', 'approved')
        .order('total_god_score', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter to those matching our sector
      const filtered = (data || []).filter(s => {
        const sectors = Array.isArray(s.sectors) ? s.sectors : [s.sectors];
        return sectors.some(sec => 
          sectorTerms.some(term => 
            sec?.toLowerCase().includes(term.toLowerCase())
          )
        );
      }).slice(0, 5);

      setStartups(filtered);
      
      if (filtered.length > 0) {
        logEvent('suggested_watchlist_shown', { 
          sector: sectorId, 
          count: filtered.length 
        });
      }
    } catch (err) {
      console.error('[SuggestedWatchlist] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWatch = (startup: SuggestedStartup) => {
    logEvent('suggested_watchlist_clicked', { 
      startup_id: startup.id,
      startup_name: startup.name
    });
    onWatch(startup.id);
  };

  if (!visible || loading || startups.length === 0) return null;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold text-white">
          Trending in {sectorLabel}
        </h3>
        <span className="text-xs text-gray-500 ml-auto">Based on your interests</span>
      </div>
      
      <div className="space-y-2">
        {startups.map((startup, idx) => (
          <div 
            key={startup.id}
            className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-5">{idx + 1}.</span>
              {startup.logo_url ? (
                <img 
                  src={startup.logo_url} 
                  alt="" 
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {startup.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h4 className="font-medium text-white text-sm">{startup.name}</h4>
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-400 text-xs font-medium">
                    {startup.total_god_score}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleWatch(startup)}
              disabled={watchedIds.has(startup.id)}
              data-watch-button
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
                watchedIds.has(startup.id)
                  ? 'bg-gray-700 text-gray-500 cursor-default'
                  : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {watchedIds.has(startup.id) ? 'Watching' : 'Watch'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
