/**
 * MATCH ANALYTICS DASHBOARD
 * =========================
 * Dashboard showing match statistics and insights
 * Color scheme: Light blue to violet
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Building2,
  Target,
  Zap,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Calendar,
  Globe,
  DollarSign,
  Bookmark,
  Mail,
  Share2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSavedMatches, getMatchesByStatus } from '../lib/savedMatchesService';

interface AnalyticsData {
  totalMatches: number;
  avgMatchScore: number;
  topInvestorTypes: { type: string; count: number }[];
  topSectors: { sector: string; count: number }[];
  matchesByScore: { range: string; count: number }[];
  savedMatches: number;
  introRequests: number;
  recentActivity: { date: string; count: number }[];
}

export default function MatchAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get match data
      const { data: matches } = await supabase
        .from('startup_investor_matches')
        .select('match_score, investor_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      // Get investor data for type breakdown
      const { data: investors } = await supabase
        .from('investors')
        .select('id, investor_type, sectors');

      // Get saved matches
      const saved = getSavedMatches();
      
      // Get intro requests
      const { count: introCount } = await supabase
        .from('intro_requests')
        .select('*', { count: 'exact', head: true });

      // Calculate analytics
      const matchList = matches || [];
      const investorMap = new Map(investors?.map(i => [i.id, i]) || []);

      // Average score
      const avgScore = matchList.length > 0
        ? Math.round(matchList.reduce((sum, m) => sum + (m.match_score || 0), 0) / matchList.length)
        : 0;

      // Investor type breakdown
      const typeCount: Record<string, number> = {};
      matchList.forEach(m => {
        const inv = investorMap.get(m.investor_id);
        const type = inv?.investor_type || 'VC';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      const topInvestorTypes = Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Sector breakdown
      const sectorCount: Record<string, number> = {};
      investors?.forEach(inv => {
        inv.sectors?.forEach((s: string) => {
          sectorCount[s] = (sectorCount[s] || 0) + 1;
        });
      });
      const topSectors = Object.entries(sectorCount)
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Score distribution
      const scoreRanges = [
        { range: '0-30', min: 0, max: 30 },
        { range: '31-50', min: 31, max: 50 },
        { range: '51-70', min: 51, max: 70 },
        { range: '71-100', min: 71, max: 100 }
      ];
      const matchesByScore = scoreRanges.map(r => ({
        range: r.range,
        count: matchList.filter(m => m.match_score >= r.min && m.match_score <= r.max).length
      }));

      // Recent activity (last 7 days)
      const recentActivity: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = matchList.filter(m => m.created_at?.startsWith(dateStr)).length;
        recentActivity.push({ date: dateStr, count });
      }

      setAnalytics({
        totalMatches: matchList.length,
        avgMatchScore: avgScore,
        topInvestorTypes,
        topSectors,
        matchesByScore,
        savedMatches: saved.length,
        introRequests: introCount || 0,
        recentActivity
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          Match Analytics
        </h2>
        
        {/* Time Range Selector */}
        <div className="flex bg-slate-800 rounded-lg p-1">
          {(['7d', '30d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Matches"
          value={analytics.totalMatches.toLocaleString()}
          icon={Users}
          color="cyan"
        />
        <MetricCard
          label="Avg Match Score"
          value={`${analytics.avgMatchScore}%`}
          icon={Target}
          color="blue"
        />
        <MetricCard
          label="Saved Matches"
          value={analytics.savedMatches.toString()}
          icon={Bookmark}
          color="violet"
        />
        <MetricCard
          label="Intro Requests"
          value={analytics.introRequests.toString()}
          icon={Mail}
          color="emerald"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-cyan-400" />
            Score Distribution
          </h3>
          <div className="space-y-3">
            {analytics.matchesByScore.map(({ range, count }) => {
              const total = analytics.totalMatches || 1;
              const percentage = Math.round((count / total) * 100);
              const color = range === '71-100' ? 'emerald' : range === '51-70' ? 'cyan' : range === '31-50' ? 'blue' : 'violet';
              
              return (
                <div key={range}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{range}</span>
                    <span className="text-white font-medium">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        color === 'emerald' ? 'bg-emerald-500' :
                        color === 'cyan' ? 'bg-cyan-500' :
                        color === 'blue' ? 'bg-blue-500' :
                        'bg-violet-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Investor Types */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" />
            Top Investor Types
          </h3>
          <div className="space-y-3">
            {analytics.topInvestorTypes.map(({ type, count }, i) => {
              const colors = ['cyan', 'blue', 'violet', 'indigo', 'purple'];
              const color = colors[i % colors.length];
              const maxCount = analytics.topInvestorTypes[0]?.count || 1;
              const percentage = Math.round((count / maxCount) * 100);
              
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    color === 'cyan' ? 'bg-cyan-500/20' :
                    color === 'blue' ? 'bg-blue-500/20' :
                    color === 'violet' ? 'bg-violet-500/20' :
                    color === 'indigo' ? 'bg-indigo-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <span className="text-sm">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{type}</span>
                      <span className="text-slate-400">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          color === 'cyan' ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' :
                          color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                          color === 'violet' ? 'bg-gradient-to-r from-violet-500 to-violet-400' :
                          color === 'indigo' ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' :
                          'bg-gradient-to-r from-purple-500 to-purple-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Sectors */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          Top Sectors
        </h3>
        <div className="flex flex-wrap gap-2">
          {analytics.topSectors.map(({ sector, count }, i) => (
            <div 
              key={sector}
              className="px-4 py-2 bg-slate-700/50 rounded-xl border border-slate-600 flex items-center gap-2"
            >
              <span className="text-white font-medium">{sector}</span>
              <span className="text-xs text-slate-400 bg-slate-600 px-2 py-0.5 rounded-full">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          Recent Activity
        </h3>
        <div className="flex items-end gap-2 h-32">
          {analytics.recentActivity.map(({ date, count }) => {
            const maxCount = Math.max(...analytics.recentActivity.map(a => a.count)) || 1;
            const height = Math.max(10, (count / maxCount) * 100);
            const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-gradient-to-t from-cyan-600 to-blue-500 rounded-t-lg transition-all hover:from-cyan-500 hover:to-blue-400"
                  style={{ height: `${height}%` }}
                  title={`${count} matches on ${date}`}
                />
                <span className="text-xs text-slate-500">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  color,
  trend 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  color: 'cyan' | 'blue' | 'violet' | 'emerald';
  trend?: number;
}) {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    violet: 'from-violet-500/20 to-violet-600/20 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        {trend !== undefined && (
          <div className={`flex items-center text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

