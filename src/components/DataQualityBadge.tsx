import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Database, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DataQualityBadgeProps {
  variant?: 'inline' | 'banner' | 'minimal';
  showDetails?: boolean;
}

interface DataHealth {
  status: 'healthy' | 'stale' | 'critical';
  lastDiscovery: Date | null;
  hoursAgo: number;
  startupCount: number;
  matchCount: number;
  avgGodScore: number;
}

/**
 * DataQualityBadge - Shows users the freshness and reliability of data
 * 
 * This builds trust by being transparent about:
 * - When data was last updated
 * - How many startups/investors are in the system
 * - Overall data quality status
 */
export default function DataQualityBadge({ variant = 'inline', showDetails = false }: DataQualityBadgeProps) {
  const [health, setHealth] = useState<DataHealth | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDataHealth();
  }, []);

  async function checkDataHealth() {
    try {
      // Get last discovery time
      const { data: latestStartup } = await supabase
        .from('discovered_startups')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get counts
      const { count: startupCount } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { count: matchCount } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true });

      // Get avg GOD score
      const { data: scoreData } = await supabase
        .from('startup_uploads')
        .select('total_god_score')
        .eq('status', 'approved')
        .not('total_god_score', 'is', null)
        .limit(100);

      const avgGodScore = scoreData && scoreData.length > 0
        ? scoreData.reduce((a, b) => a + (b.total_god_score || 0), 0) / scoreData.length
        : 0;

      const lastDiscovery = latestStartup?.created_at ? new Date(latestStartup.created_at) : null;
      const hoursAgo = lastDiscovery 
        ? (Date.now() - lastDiscovery.getTime()) / (1000 * 60 * 60)
        : 999;

      // Determine status
      let status: 'healthy' | 'stale' | 'critical' = 'healthy';
      if (hoursAgo > 48) status = 'critical';
      else if (hoursAgo > 24) status = 'stale';

      setHealth({
        status,
        lastDiscovery,
        hoursAgo,
        startupCount: startupCount || 0,
        matchCount: matchCount || 0,
        avgGodScore
      });
    } catch (error) {
      console.error('Failed to check data health:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !health) {
    return null; // Don't show anything while loading
  }

  // Minimal variant - just a small indicator
  if (variant === 'minimal') {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          health.status === 'healthy' ? 'bg-green-500/20 text-green-400' :
          health.status === 'stale' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}
        title={`Data updated ${health.hoursAgo < 1 ? 'just now' : `${Math.round(health.hoursAgo)}h ago`}`}
      >
        {health.status === 'healthy' ? (
          <CheckCircle className="w-3 h-3" />
        ) : health.status === 'stale' ? (
          <Clock className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        <span>Live</span>
      </div>
    );
  }

  // Inline variant - shows more detail
  if (variant === 'inline') {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative group"
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          health.status === 'healthy' 
            ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50' 
            : health.status === 'stale'
            ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
            : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
        }`}>
          {health.status === 'healthy' ? (
            <Activity className="w-4 h-4 text-green-400" />
          ) : health.status === 'stale' ? (
            <Clock className="w-4 h-4 text-yellow-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-medium ${
            health.status === 'healthy' ? 'text-green-400' :
            health.status === 'stale' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {health.status === 'healthy' ? 'Data Fresh' : 
             health.status === 'stale' ? 'Updating...' : 
             'Check Status'}
          </span>
          <span className="text-xs text-gray-500">
            {health.hoursAgo < 1 ? 'Just now' : 
             health.hoursAgo < 24 ? `${Math.round(health.hoursAgo)}h ago` :
             `${Math.round(health.hoursAgo / 24)}d ago`}
          </span>
        </div>

        {/* Expanded tooltip */}
        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-xl z-50">
            <div className="text-white font-semibold mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data Health
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Startups</span>
                <span className="text-white font-medium">{health.startupCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Matches</span>
                <span className="text-white font-medium">{health.matchCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Quality</span>
                <span className={`font-medium ${
                  health.avgGodScore >= 60 ? 'text-green-400' :
                  health.avgGodScore >= 45 ? 'text-yellow-400' :
                  'text-orange-400'
                }`}>
                  {health.avgGodScore.toFixed(0)}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Update</span>
                <span className="text-white font-medium">
                  {health.lastDiscovery?.toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className={`mt-3 pt-3 border-t border-gray-700 text-xs ${
              health.status === 'healthy' ? 'text-green-400' :
              health.status === 'stale' ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {health.status === 'healthy' && '✓ System is discovering new startups'}
              {health.status === 'stale' && '⚠ Discovery slowed - system refreshing'}
              {health.status === 'critical' && '⚠ Data may be outdated'}
            </div>
          </div>
        )}
      </button>
    );
  }

  // Banner variant - shows at top of page when there's an issue
  if (variant === 'banner' && health.status !== 'healthy') {
    return (
      <div className={`w-full px-4 py-2 flex items-center justify-center gap-2 text-sm ${
        health.status === 'stale' 
          ? 'bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400'
          : 'bg-red-500/10 border-b border-red-500/30 text-red-400'
      }`}>
        {health.status === 'stale' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Refreshing data... New matches coming soon!</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Data is being updated. Some matches may be temporarily unavailable.</span>
          </>
        )}
      </div>
    );
  }

  return null;
}

// Export a hook for checking data quality programmatically
export function useDataQuality() {
  const [quality, setQuality] = useState<DataHealth | null>(null);

  useEffect(() => {
    async function check() {
      const { data: latestStartup } = await supabase
        .from('discovered_startups')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastDiscovery = latestStartup?.created_at ? new Date(latestStartup.created_at) : null;
      const hoursAgo = lastDiscovery 
        ? (Date.now() - lastDiscovery.getTime()) / (1000 * 60 * 60)
        : 999;

      let status: 'healthy' | 'stale' | 'critical' = 'healthy';
      if (hoursAgo > 48) status = 'critical';
      else if (hoursAgo > 24) status = 'stale';

      setQuality({ status, lastDiscovery, hoursAgo, startupCount: 0, matchCount: 0, avgGodScore: 0 });
    }
    check();
  }, []);

  return quality;
}
