/**
 * Trending Analytics Component
 * 
 * Displays analytics charts and insights for the trending page
 */

import { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, BarChart3, PieChart, 
  Activity, Target, Zap, ArrowUp, ArrowDown
} from 'lucide-react';

interface Startup {
  id: string;
  name: string;
  sectors?: string[];
  total_god_score?: number;
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

interface Props {
  startups: Startup[];
  selectedAlgorithm: string;
}

export default function TrendingAnalytics({ startups, selectedAlgorithm }: Props) {
  // Calculate analytics
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
      {/* Summary Insights */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-xl border border-purple-500/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Total Startups</div>
          <div className="text-2xl font-bold text-white">{analytics.total}</div>
          <div className="text-xs text-gray-500 mt-1">Analyzed</div>
        </div>
        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 backdrop-blur-lg rounded-xl border border-orange-500/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Avg Score</div>
          <div className="text-2xl font-bold text-white">{analytics.avgScore}</div>
          <div className="text-xs text-gray-500 mt-1">Range: {analytics.minScore}-{analytics.maxScore}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-lg rounded-xl border border-green-500/30 p-4">
          <div className="text-xs text-gray-400 mb-1">Elite Startups</div>
          <div className="text-2xl font-bold text-white">{analytics.scoreDistribution.elite}</div>
          <div className="text-xs text-gray-500 mt-1">{Math.round((analytics.scoreDistribution.elite / analytics.total) * 100)}% of total</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 backdrop-blur-lg rounded-xl border border-blue-500/30 p-4">
          <div className="text-xs text-gray-400 mb-1">With Revenue</div>
          <div className="text-2xl font-bold text-white">{analytics.revenuePercentage}%</div>
          <div className="text-xs text-gray-500 mt-1">{analytics.withRevenue} startups</div>
        </div>
      </div>

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
      <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 backdrop-blur-lg rounded-2xl border border-orange-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Key Metrics</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Average Score</div>
            <div className="text-3xl font-bold text-white">{analytics.avgScore}</div>
            <div className="text-xs text-gray-500">Range: {analytics.minScore} - {analytics.maxScore}</div>
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
      <div className="bg-gradient-to-br from-red-900/40 to-amber-900/40 backdrop-blur-lg rounded-2xl border border-red-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-bold text-white">Avg GOD Breakdown</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Team', value: analytics.avgGODBreakdown.team, color: 'from-blue-500 to-cyan-500' },
            { label: 'Traction', value: analytics.avgGODBreakdown.traction, color: 'from-green-500 to-emerald-500' },
            { label: 'Market', value: analytics.avgGODBreakdown.market, color: 'from-purple-500 to-violet-500' },
            { label: 'Product', value: analytics.avgGODBreakdown.product, color: 'from-orange-500 to-red-500' },
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
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-bold text-white">Algorithm Comparison</h3>
        </div>
        <div className="space-y-3">
          {[
            { name: 'GOD', avg: startups.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / startups.length, color: 'from-red-500 to-amber-500' },
            { name: 'YC', avg: startups.reduce((sum, s) => sum + (s.ycScore || 0), 0) / startups.length, color: 'from-orange-500 to-amber-500' },
            { name: 'Sequoia', avg: startups.reduce((sum, s) => sum + (s.sequoiaScore || 0), 0) / startups.length, color: 'from-emerald-500 to-teal-500' },
            { name: 'A16Z', avg: startups.reduce((sum, s) => sum + (s.a16zScore || 0), 0) / startups.length, color: 'from-purple-500 to-indigo-500' },
          ].map((algo) => {
            const avg = Math.round(algo.avg * 10) / 10;
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
                  <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {algo.name}
                  </span>
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
      </div>
      </div>
    </>
  );
}

