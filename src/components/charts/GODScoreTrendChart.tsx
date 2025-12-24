import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity } from 'lucide-react';

interface GODScoreDataPoint {
  date: string;
  avgScore: number;
  median: number;
  count: number;
  min: number;
  max: number;
  stdDev: number;
  low: number;
  medium: number;
  high: number;
  elite: number;
  newScores: number;
  updatedScores: number;
}

export default function GODScoreTrendChart() {
  const [data, setData] = useState<GODScoreDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [trendValue, setTrendValue] = useState(0);
  const [currentStats, setCurrentStats] = useState<any>(null);

  useEffect(() => {
    loadGODScoreHistory();
    const interval = setInterval(loadGODScoreHistory, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadGODScoreHistory = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get all startups with scores
      const { data: startups, error } = await supabase
        .from('startup_uploads')
        .select('total_god_score, updated_at, created_at, team_score, traction_score, market_score, product_score, vision_score')
        .eq('status', 'approved')
        .not('total_god_score', 'is', null);

      if (error) throw error;

      // Group by date
      const grouped = startups?.reduce((acc: Record<string, any[]>, startup) => {
        const date = new Date(startup.updated_at).toISOString().split('T')[0];
        if (new Date(startup.updated_at) >= thirtyDaysAgo) {
          if (!acc[date]) acc[date] = [];
          acc[date].push(startup);
        }
        return acc;
      }, {}) || {};

      const chartData: GODScoreDataPoint[] = Object.entries(grouped).map(([date, dayStartups]) => {
        const scores = dayStartups.map((s: any) => s.total_god_score || 0).filter((s: number) => s > 0);
        const sorted = [...scores].sort((a, b) => a - b);
        const median = sorted.length > 0 
          ? sorted[Math.floor(sorted.length / 2)]
          : 0;
        
        const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const variance = scores.length > 0 
          ? scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length 
          : 0;
        const stdDev = Math.sqrt(variance);

        return {
          date,
          avgScore: mean,
          median,
          count: scores.length,
          min: scores.length > 0 ? Math.min(...scores) : 0,
          max: scores.length > 0 ? Math.max(...scores) : 0,
          stdDev,
          low: scores.filter((s: number) => s < 50).length,
          medium: scores.filter((s: number) => s >= 50 && s < 70).length,
          high: scores.filter((s: number) => s >= 70 && s < 85).length,
          elite: scores.filter((s: number) => s >= 85).length,
          newScores: dayStartups.filter((s: any) => {
            const created = new Date(s.created_at);
            const updated = new Date(s.updated_at);
            return Math.abs(created.getTime() - updated.getTime()) < 24 * 60 * 60 * 1000;
          }).length,
          updatedScores: dayStartups.length,
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate trend
      if (chartData.length >= 2) {
        const first = chartData[0].avgScore;
        const last = chartData[chartData.length - 1].avgScore;
        const diff = last - first;
        setTrendValue(diff);
        if (Math.abs(diff) < 1) {
          setTrend('stable');
        } else {
          setTrend(diff > 0 ? 'up' : 'down');
        }
      }

      // Current stats
      if (startups && startups.length > 0) {
        const allScores = startups.map(s => s.total_god_score || 0).filter(s => s > 0);
        const currentMean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const currentMedian = [...allScores].sort((a, b) => a - b)[Math.floor(allScores.length / 2)];
        const currentStdDev = Math.sqrt(
          allScores.reduce((sum, s) => sum + Math.pow(s - currentMean, 2), 0) / allScores.length
        );

        // Component breakdown
        const components = {
          team: startups.filter(s => s.team_score).map(s => s.team_score || 0),
          traction: startups.filter(s => s.traction_score).map(s => s.traction_score || 0),
          market: startups.filter(s => s.market_score).map(s => s.market_score || 0),
          product: startups.filter(s => s.product_score).map(s => s.product_score || 0),
          vision: startups.filter(s => s.vision_score).map(s => s.vision_score || 0),
        };

        setCurrentStats({
          mean: currentMean,
          median: currentMedian,
          stdDev: currentStdDev,
          count: allScores.length,
          components: {
            team: components.team.length > 0 ? components.team.reduce((a, b) => a + b, 0) / components.team.length : 0,
            traction: components.traction.length > 0 ? components.traction.reduce((a, b) => a + b, 0) / components.traction.length : 0,
            market: components.market.length > 0 ? components.market.reduce((a, b) => a + b, 0) / components.market.length : 0,
            product: components.product.length > 0 ? components.product.reduce((a, b) => a + b, 0) / components.product.length : 0,
            vision: components.vision.length > 0 ? components.vision.reduce((a, b) => a + b, 0) / components.vision.length : 0,
          }
        });
      }

      setData(chartData);
    } catch (error) {
      console.error('Error loading GOD score history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading GOD Score Analytics...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-400">No data available</div>
        </div>
      </div>
    );
  }

  const latest = data[data.length - 1];
  const trendIcon = trend === 'up' ? <TrendingUp className="w-5 h-5 text-green-400" /> : 
                    trend === 'down' ? <TrendingDown className="w-5 h-5 text-red-400" /> : 
                    <Minus className="w-5 h-5 text-gray-400" />;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value.toFixed(1)}</span>
            </p>
          ))}
          {payload[0]?.payload && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-xs text-gray-400">Count: {payload[0].payload.count}</p>
              <p className="text-xs text-gray-400">Std Dev: {payload[0].payload.stdDev.toFixed(1)}</p>
              <p className="text-xs text-gray-400">Range: {payload[0].payload.min}-{payload[0].payload.max}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Main Trend Chart */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              GOD Score Analytics Dashboard
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {trendIcon}
                <span className="text-gray-300">
                  Trend: <span className={`font-semibold ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                    {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)} points
                  </span>
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">
                Current: <span className="font-semibold text-purple-400">{latest.avgScore.toFixed(1)}</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">
                Median: <span className="font-semibold text-blue-400">{latest.median.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMedian" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="left"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              label={{ value: 'Count', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF', paddingTop: '20px' }}
              iconType="line"
            />
            
            {/* Reference lines */}
            <ReferenceLine yAxisId="left" y={50} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: "Target Min", position: "right", fill: '#F59E0B' }} />
            <ReferenceLine yAxisId="left" y={70} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Alert Threshold", position: "right", fill: '#EF4444' }} />
            
            {/* Area for average */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="avgScore"
              fill="url(#colorAvg)"
              stroke="#8B5CF6"
              strokeWidth={3}
              name="Average Score"
              dot={{ fill: '#8B5CF6', r: 4, strokeWidth: 2, stroke: '#1F2937' }}
            />
            
            {/* Line for median */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="median"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Median"
              dot={{ fill: '#3B82F6', r: 3 }}
            />
            
            {/* Min/Max range */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="min"
              stroke="#EF4444"
              strokeWidth={1}
              strokeDasharray="2 2"
              name="Min"
              dot={false}
              opacity={0.6}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="max"
              stroke="#10B981"
              strokeWidth={1}
              strokeDasharray="2 2"
              name="Max"
              dot={false}
              opacity={0.6}
            />
            
            {/* Bar for count */}
            <Bar yAxisId="right" dataKey="count" fill="#6366F1" opacity={0.3} name="Startups Scored" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Distribution Cards */}
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 rounded-xl p-4 border border-red-500/30">
          <div className="text-sm text-red-400 mb-1">Low Scores</div>
          <div className="text-3xl font-bold text-red-400">{latest.low}</div>
          <div className="text-xs text-gray-500 mt-1">&lt; 50 points</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="text-sm text-yellow-400 mb-1">Medium Scores</div>
          <div className="text-3xl font-bold text-yellow-400">{latest.medium}</div>
          <div className="text-xs text-gray-500 mt-1">50-69 points</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-xl p-4 border border-green-500/30">
          <div className="text-sm text-green-400 mb-1">High Scores</div>
          <div className="text-3xl font-bold text-green-400">{latest.high}</div>
          <div className="text-xs text-gray-500 mt-1">70-84 points</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-4 border border-purple-500/30">
          <div className="text-sm text-purple-400 mb-1">Elite Scores</div>
          <div className="text-3xl font-bold text-purple-400">{latest.elite}</div>
          <div className="text-xs text-gray-500 mt-1">≥ 85 points</div>
        </div>
      </div>

      {/* Component Breakdown */}
      {currentStats && (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Component Score Breakdown
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(currentStats.components).map(([component, score]: [string, any]) => (
              <div key={component} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="text-xs text-gray-400 mb-1 capitalize">{component}</div>
                <div className="text-2xl font-bold text-blue-400">{score.toFixed(1)}</div>
                <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
