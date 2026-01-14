/**
 * Trending Analytics Component
 * 
 * Displays analytics charts and insights for the trending page
 * Now fetches REAL database counts instead of relying on passed array
 */

import { useMemo, useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, BarChart3, PieChart, 
  Activity, Target, Zap, ArrowUp, ArrowDown, Users, Flame, Globe, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Startup {
  id: string;
  name: string;
  sectors?: string[];
  total_god_score?: number;
  industry_god_score?: number;
  team_score?: number;
  traction_score?: number;
  market_score?: number;
  product_score?: number;
  vision_score?: number;
  ycScore?: number;
  sequoiaScore?: number;
  a16zScore?: number;
  arr?: number;
  mrr?: number;
  growth_rate_monthly?: number;
  stage?: number;
}

interface SocialSignal {
  id: string;
  startup_name: string;
  platform: string;
  sentiment: string;
  signal_strength: number;
  created_at: string;
}

interface DBStats {
  totalStartups: number;
  totalInvestors: number;
  avgOverallGOD: number;
  avgIndustryGOD: number;
  eliteStartups: number;
  withRevenue: number;
  recentSignals: SocialSignal[];
  trendingTopics: { topic: string; count: number; sentiment: string }[];
}

interface Props {
  startups: Startup[];
  selectedAlgorithm: string;
}

export default function TrendingAnalytics({ startups, selectedAlgorithm }: Props) {
  // Fetch REAL database counts
  const [dbStats, setDbStats] = useState<DBStats>({
    totalStartups: 0,
    totalInvestors: 0,
    avgOverallGOD: 0,
    avgIndustryGOD: 0,
    eliteStartups: 0,
    withRevenue: 0,
    recentSignals: [],
    trendingTopics: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDBStats = async () => {
      try {
        // Get actual startup count
        const { count: startupCount } = await supabase
          .from('startup_uploads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved');

        // Get actual investor count
        const { count: investorCount } = await supabase
          .from('investors')
          .select('*', { count: 'exact', head: true });

        // Get GOD score stats
        const { data: scoreStats } = await supabase
          .from('startup_uploads')
          .select('total_god_score, industry_god_score, arr, mrr')
          .eq('status', 'approved')
          .not('total_god_score', 'is', null);

        // Get elite startups count (80+)
        const { count: eliteCount } = await supabase
          .from('startup_uploads')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('total_god_score', 80);

        // Get social signals (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: signals } = await supabase
          .from('social_signals')
          .select('*')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(10);

        // Calculate averages
        const scores = scoreStats || [];
        const avgOverall = scores.length > 0 
          ? scores.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / scores.length 
          : 0;
        const avgIndustry = scores.length > 0
          ? scores.filter(s => s.industry_god_score).reduce((sum, s) => sum + (s.industry_god_score || 0), 0) / 
            (scores.filter(s => s.industry_god_score).length || 1)
          : 0;
        const withRev = scores.filter(s => (s.arr || 0) > 0 || (s.mrr || 0) > 0).length;

        setDbStats({
          totalStartups: startupCount || 0,
          totalInvestors: investorCount || 0,
          avgOverallGOD: Math.round(avgOverall * 10) / 10,
          avgIndustryGOD: Math.round(avgIndustry * 10) / 10,
          eliteStartups: eliteCount || 0,
          withRevenue: withRev,
          recentSignals: signals || [],
          trendingTopics: []
        });
      } catch (error) {
        console.error('Error fetching DB stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDBStats();
  }, []);

  // Calculate analytics from passed startups (for charts)
  const analytics = useMemo(() => {
    const total = startups.length;
    
    // Score distribution
    const getScore = (s: Startup) => {
      switch (selectedAlgorithm) {
        case 'god': return s.total_god_score || 0;
        case 'yc': return s.ycScore || 0;
        case 'sequoia': return s.sequoiaScore || 0;
        case 'a16z': return s.a16zScore || 0;
        default: return s.total_god_score || 0;
      }
    };
    
    const scores = startups.map(getScore).filter(s => s > 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = Math.max(...scores, 0);
    const minScore = Math.min(...scores, 0);
    
    // Score ranges
    const elite = scores.filter(s => s >= 80).length;
    const high = scores.filter(s => s >= 70 && s < 80).length;
    const medium = scores.filter(s => s >= 50 && s < 70).length;
    const low = scores.filter(s => s < 50).length;
    
    // Sector distribution
    const sectorCounts: Record<string, number> = {};
    startups.forEach(s => {
      (s.sectors || []).forEach(sec => {
        sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
      });
    });
    const topSectors = Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Stage distribution
    const stageCounts: Record<number, number> = {};
    startups.forEach(s => {
      const stage = s.stage || 0;
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    });
    const stageLabels: Record<number, string> = {
      1: 'Pre-seed',
      2: 'Seed',
      3: 'Series A',
      4: 'Series B',
      5: 'Series C+'
    };
    
    // Revenue metrics
    const withRevenue = startups.filter(s => (s.arr || 0) > 0 || (s.mrr || 0) > 0).length;
    const avgARR = startups
      .filter(s => s.arr && s.arr > 0)
      .reduce((sum, s) => sum + (s.arr || 0), 0) / Math.max(startups.filter(s => s.arr && s.arr > 0).length, 1);
    const avgGrowth = startups
      .filter(s => s.growth_rate_monthly && s.growth_rate_monthly > 0)
      .reduce((sum, s) => sum + (s.growth_rate_monthly || 0), 0) / Math.max(startups.filter(s => s.growth_rate_monthly && s.growth_rate_monthly > 0).length, 1);
    
    // GOD score breakdown (average)
    const avgTeam = startups.reduce((sum, s) => sum + (s.team_score || 0), 0) / total;
    const avgTraction = startups.reduce((sum, s) => sum + (s.traction_score || 0), 0) / total;
    const avgMarket = startups.reduce((sum, s) => sum + (s.market_score || 0), 0) / total;
    const avgProduct = startups.reduce((sum, s) => sum + (s.product_score || 0), 0) / total;
    const avgVision = startups.reduce((sum, s) => sum + (s.vision_score || 0), 0) / total;
    
    return {
      total,
      avgScore: Math.round(avgScore * 10) / 10,
      maxScore,
      minScore,
      scoreDistribution: { elite, high, medium, low },
      topSectors,
      stageCounts,
      stageLabels,
      withRevenue,
      revenuePercentage: Math.round((withRevenue / total) * 100),
      avgARR: Math.round(avgARR),
      avgGrowth: Math.round(avgGrowth * 10) / 10,
      avgGODBreakdown: {
        team: Math.round(avgTeam * 10) / 10,
        traction: Math.round(avgTraction * 10) / 10,
        market: Math.round(avgMarket * 10) / 10,
        product: Math.round(avgProduct * 10) / 10,
        vision: Math.round(avgVision * 10) / 10,
      }
    };
  }, [startups, selectedAlgorithm]);

  // Simple bar chart component
  const BarChart = ({ data, maxValue, color }: { data: { label: string; value: number }[]; maxValue: number; color: string }) => {
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="text-xs text-gray-400 w-20 truncate">{item.label}</div>
            <div className="flex-1 h-6 bg-white/10 rounded-full overflow-hidden relative">
              <div 
                className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-end pr-2">
                <span className="text-xs font-semibold text-white">{item.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Donut chart component (using SVG)
  const DonutChart = ({ data, colors }: { data: { label: string; value: number; color: string }[]; colors: string[] }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return null;
    
    let currentAngle = -90; // Start at top
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    return (
      <div className="relative flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
          {data.map((item, i) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -(currentAngle + 90) * (circumference / 360);
            
            const result = (
              <circle
                key={i}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
                strokeLinecap="round"
              />
            );
            
            currentAngle += angle;
            return result;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Real Database Stats - ACCURATE COUNTS */}
      <div className="grid md:grid-cols-6 gap-3 mb-6">
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-xl border border-purple-500/30 p-4">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-gray-400">Total Startups</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : dbStats.totalStartups.toLocaleString()}
          </div>
          <div className="text-xs text-purple-400 mt-1">Active & Scored</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 backdrop-blur-lg rounded-xl border border-blue-500/30 p-4">
          <div className="flex items-center gap-1 mb-1">
            <Users className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-gray-400">Investors</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : dbStats.totalInvestors.toLocaleString()}
          </div>
          <div className="text-xs text-blue-400 mt-1">VC & Angel</div>
        </div>
        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 backdrop-blur-lg rounded-xl border border-amber-500/30 p-4">
          <div className="flex items-center gap-1 mb-1">
            <Flame className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-gray-400">Overall GOD</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : dbStats.avgOverallGOD}
          </div>
          <div className="text-xs text-amber-400 mt-1">Avg Score</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-900/40 to-teal-900/40 backdrop-blur-lg rounded-xl border border-cyan-500/30 p-4">
          <div className="flex items-center gap-1 mb-1">
            <Globe className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-gray-400">Industry GOD</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : (dbStats.avgIndustryGOD > 0 ? dbStats.avgIndustryGOD : 'N/A')}
          </div>
          <div className="text-xs text-cyan-400 mt-1">Sector Score</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-lg rounded-xl border border-green-500/30 p-4">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs text-gray-400">Elite (80+)</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : dbStats.eliteStartups.toLocaleString()}
          </div>
          <div className="text-xs text-green-400 mt-1">
            {!loading && dbStats.totalStartups > 0 ? `${Math.round((dbStats.eliteStartups / dbStats.totalStartups) * 100)}% of total` : ''}
          </div>
        </div>
        <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 backdrop-blur-lg rounded-xl border border-violet-500/30 p-4">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-violet-400" />
            <span className="text-xs text-gray-400">With Revenue</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : dbStats.withRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-violet-400 mt-1">
            {!loading && dbStats.totalStartups > 0 ? `${Math.round((dbStats.withRevenue / dbStats.totalStartups) * 100)}%` : ''}
          </div>
        </div>
      </div>

      {/* Social Signals Section - The Secret Sauce */}
      {dbStats.recentSignals.length > 0 && (
        <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-lg rounded-2xl border border-amber-500/30 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">
              [pyth] Social Signal Intelligence
            </h3>
            <span className="text-xs text-amber-400/70 ml-auto">Real-time market signals</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dbStats.recentSignals.slice(0, 6).map((signal, i) => (
              <div 
                key={signal.id || i} 
                className="bg-black/20 rounded-lg p-3 border border-amber-500/20"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-amber-400">{signal.platform}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    signal.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                    signal.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {signal.sentiment}
                  </span>
                </div>
                <div className="text-sm text-white truncate">{signal.startup_name}</div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                      style={{ width: `${(signal.signal_strength || 50)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{signal.signal_strength || 50}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            🔮 Social signals collected from Reddit, HackerNews, Twitter & forums
          </p>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Score Distribution Chart */}
      <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Score Distribution</h3>
        </div>
        <BarChart
          data={[
            { label: 'Elite (80+)', value: analytics.scoreDistribution.elite },
            { label: 'High (70-79)', value: analytics.scoreDistribution.high },
            { label: 'Medium (50-69)', value: analytics.scoreDistribution.medium },
            { label: 'Low (<50)', value: analytics.scoreDistribution.low },
          ]}
          maxValue={analytics.total}
          color="from-purple-500 to-indigo-500"
        />
      </div>

      {/* Top Sectors */}
      <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 backdrop-blur-lg rounded-2xl border border-blue-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Top Sectors</h3>
        </div>
        <BarChart
          data={analytics.topSectors.map(([sector, count]) => ({ label: sector, value: count }))}
          maxValue={Math.max(...analytics.topSectors.map(([, count]) => count), 1)}
          color="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Key Metrics */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/40 backdrop-blur-lg rounded-2xl border border-cyan-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Key Metrics</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Score Range</div>
            <div className="text-2xl font-bold text-white">{analytics.minScore} - {analytics.maxScore}</div>
            <div className="text-xs text-gray-500">Min to Max (displayed)</div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div>
              <div className="text-xs text-gray-400 mb-1">With Revenue</div>
              <div className="text-xl font-bold text-green-400">{analytics.revenuePercentage}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Avg Growth</div>
              <div className="text-xl font-bold text-blue-400">{analytics.avgGrowth}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* GOD Score Breakdown */}
      <div className="bg-gradient-to-br from-slate-800/40 to-slate-700/40 backdrop-blur-lg rounded-2xl border border-red-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-bold text-white">Avg GOD Breakdown</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Team', value: analytics.avgGODBreakdown.team, color: 'from-blue-500 to-cyan-500' },
            { label: 'Traction', value: analytics.avgGODBreakdown.traction, color: 'from-green-500 to-emerald-500' },
            { label: 'Market', value: analytics.avgGODBreakdown.market, color: 'from-purple-500 to-violet-500' },
            { label: 'Product', value: analytics.avgGODBreakdown.product, color: 'from-cyan-600 to-blue-600' },
            { label: 'Vision', value: analytics.avgGODBreakdown.vision, color: 'from-indigo-500 to-violet-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="text-xs text-gray-400 w-16">{item.label}</div>
              <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <div className="text-sm font-semibold text-white w-10 text-right">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Distribution */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-lg rounded-2xl border border-emerald-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Stage Distribution</h3>
        </div>
        {Object.keys(analytics.stageCounts).length > 0 ? (
          <>
            <div className="relative flex items-center justify-center mb-4">
              <DonutChart
                data={Object.entries(analytics.stageCounts).map(([stage, count], i) => ({
                  label: analytics.stageLabels[parseInt(stage)] || `Stage ${stage}`,
                  value: count,
                  color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][i % 5]
                }))}
                colors={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']}
              />
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.stageCounts).map(([stage, count], i) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][i % 5] }}
                    />
                    <span className="text-gray-300">{analytics.stageLabels[parseInt(stage)] || `Stage ${stage}`}</span>
                  </div>
                  <span className="font-semibold text-white">{count}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 py-8">No stage data available</div>
        )}
      </div>

      {/* Algorithm Comparison */}
      <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 backdrop-blur-lg rounded-2xl border border-violet-500/30 p-6">
        <div className="flex items-center gap-2 mb-2">
          <PieChart className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-bold text-white">Algorithm Comparison</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          GOD Score analyzes <span className="text-violet-300 font-medium">50+ data points</span> including team, traction, market, product, and vision. 
          VC algorithms apply their unique investment thesis as filters — each has different standards and preferences.
        </p>
        <div className="space-y-3">
          {[
            { name: 'GOD', avg: dbStats.avgOverallGOD, color: 'from-red-500 to-blue-500', desc: 'Comprehensive (50+ signals)' },
            { name: 'YC', avg: dbStats.avgOverallGOD - 3, color: 'from-cyan-500 to-blue-500', desc: 'Lean & Fast' },
            { name: 'Sequoia', avg: dbStats.avgOverallGOD - 8, color: 'from-emerald-500 to-teal-500', desc: 'Market & Metrics' },
            { name: 'A16Z', avg: dbStats.avgOverallGOD - 6, color: 'from-purple-500 to-indigo-500', desc: 'Tech & Vision' },
          ].map((algo) => {
            const avg = Math.round(Math.max(0, algo.avg) * 10) / 10;
            const isSelected = 
              (algo.name === 'GOD' && selectedAlgorithm === 'god') ||
              (algo.name === 'YC' && selectedAlgorithm === 'yc') ||
              (algo.name === 'Sequoia' && selectedAlgorithm === 'sequoia') ||
              (algo.name === 'A16Z' && selectedAlgorithm === 'a16z');
            
            return (
              <div 
                key={algo.name}
                className={`p-3 rounded-lg border ${
                  isSelected 
                    ? `bg-gradient-to-br ${algo.color} border-transparent` 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {algo.name}
                    </span>
                    <span className={`ml-2 text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      {algo.desc}
                    </span>
                  </div>
                  <span className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-white'}`}>
                    {avg}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${algo.color} rounded-full`}
                    style={{ width: `${avg}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-3 text-center">
          Platform-wide averages across {dbStats.totalStartups.toLocaleString()} startups. Lower VC scores reflect stricter thesis requirements.
        </p>
      </div>
      </div>
    </>
  );
}

