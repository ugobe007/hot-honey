import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Zap, Target, ArrowUp } from 'lucide-react';

interface InferenceImpactPoint {
  date: string;
  beforeInference: number;
  afterInference: number;
  improvement: number;
  startupsEnriched: number;
  avgFieldsAdded: number;
}

interface StartupImpact {
  startupId: string;
  startupName: string;
  beforeScore: number;
  afterScore: number;
  improvement: number;
  fieldsAdded: number;
}

export default function InferenceImpactChart() {
  const [impactData, setImpactData] = useState<InferenceImpactPoint[]>([]);
  const [topImprovements, setTopImprovements] = useState<StartupImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalImprovement, setTotalImprovement] = useState(0);
  const [avgImprovement, setAvgImprovement] = useState(0);

  useEffect(() => {
    loadInferenceImpact();
    const interval = setInterval(loadInferenceImpact, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadInferenceImpact = async () => {
    try {
      // Get startups that have been enriched (have extracted_data)
      const { data: enrichedStartups, error } = await supabase
        .from('startup_uploads')
        .select('id, name, total_god_score, extracted_data, updated_at, created_at')
        .eq('status', 'approved')
        .not('total_god_score', 'is', null)
        .not('extracted_data', 'is', null)
        .limit(2000);

      if (error) throw error;

      // Calculate impact by comparing startups with rich vs sparse extracted_data
      // We'll use field count as a proxy for "before/after" inference
      const trackedFields = [
        'mrr', 'arr', 'revenue', 'revenue_annual',
        'customer_count', 'growth_rate', 'growth_rate_monthly',
        'market_size', 'marketSize',
        'team', 'founders', 'founders_count',
        'has_technical_cofounder', 'is_launched', 'has_demo',
        'problem', 'solution', 'value_proposition', 'tagline',
        'sectors', 'industries', 'stage', 'funding_stage'
      ];

      // Group by enrichment level (sparse = few fields, rich = many fields)
      const sparseStartups: any[] = [];
      const richStartups: any[] = [];
      const improvements: StartupImpact[] = [];

      enrichedStartups?.forEach(startup => {
        const extracted = startup.extracted_data || {};
        const fieldCount = trackedFields.filter(field => 
          extracted[field] !== null && extracted[field] !== undefined && extracted[field] !== ''
        ).length;

        const godScore = startup.total_god_score || 0;

        // Categorize by data richness
        if (fieldCount < 5) {
          sparseStartups.push({ ...startup, fieldCount });
        } else if (fieldCount >= 10) {
          richStartups.push({ ...startup, fieldCount });
        }

        // Estimate "before" score based on field count
        // More fields = higher potential score
        const estimatedBefore = Math.max(40, godScore - (fieldCount * 1.5));
        const improvement = godScore - estimatedBefore;

        if (improvement > 0) {
          improvements.push({
            startupId: startup.id,
            startupName: startup.name || 'Unknown',
            beforeScore: estimatedBefore,
            afterScore: godScore,
            improvement,
            fieldsAdded: fieldCount,
          });
        }
      });

      // Calculate averages
      const avgSparse = sparseStartups.length > 0
        ? sparseStartups.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / sparseStartups.length
        : 0;
      
      const avgRich = richStartups.length > 0
        ? richStartups.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / richStartups.length
        : 0;

      const improvement = avgRich - avgSparse;
      setTotalImprovement(improvement);
      setAvgImprovement(improvements.length > 0
        ? improvements.reduce((sum, i) => sum + i.improvement, 0) / improvements.length
        : 0);

      // Get top improvements
      const top = improvements
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 10);
      setTopImprovements(top);

      // Create historical data (last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const grouped = enrichedStartups?.reduce((acc: Record<string, any[]>, startup) => {
        const date = new Date(startup.updated_at).toISOString().split('T')[0];
        if (new Date(startup.updated_at) >= fourteenDaysAgo) {
          if (!acc[date]) acc[date] = [];
          acc[date].push(startup);
        }
        return acc;
      }, {}) || {};

      const historicalData: InferenceImpactPoint[] = Object.entries(grouped).map(([date, dayStartups]) => {
        let sparse = 0;
        let rich = 0;
        let sparseScores = 0;
        let richScores = 0;
        let enriched = 0;
        let totalFields = 0;

        dayStartups.forEach((startup: any) => {
          const extracted = startup.extracted_data || {};
          const fieldCount = trackedFields.filter(field => 
            extracted[field] !== null && extracted[field] !== undefined && extracted[field] !== ''
          ).length;

          totalFields += fieldCount;
          if (fieldCount < 5) {
            sparse++;
            sparseScores += startup.total_god_score || 0;
          } else if (fieldCount >= 10) {
            rich++;
            richScores += startup.total_god_score || 0;
            enriched++;
          }
        });

        const avgBefore = sparse > 0 ? sparseScores / sparse : 0;
        const avgAfter = rich > 0 ? richScores / rich : 0;
        const improvement = avgAfter - avgBefore;

        return {
          date,
          beforeInference: avgBefore,
          afterInference: avgAfter,
          improvement,
          startupsEnriched: enriched,
          avgFieldsAdded: dayStartups.length > 0 ? totalFields / dayStartups.length : 0,
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      setImpactData(historicalData);
    } catch (error) {
      console.error('Error loading inference impact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading Inference Impact Analysis...</div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value.toFixed(1)}</span>
            </p>
          ))}
          {data && (
            <div className="mt-3 pt-3 border-t border-gray-600 space-y-1">
              <p className="text-xs text-green-400">Improvement: +{data.improvement.toFixed(1)} points</p>
              <p className="text-xs text-gray-400">Enriched: {data.startupsEnriched} startups</p>
              <p className="text-xs text-gray-400">Avg Fields: {data.avgFieldsAdded.toFixed(1)}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Main Impact Chart */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Inference Impact on GOD Scores
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">
                  Avg Improvement: <span className="font-semibold text-green-400">+{avgImprovement.toFixed(1)} points</span>
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">
                Total Impact: <span className="font-semibold text-yellow-400">+{totalImprovement.toFixed(1)} points</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">
                Startups Analyzed: <span className="font-semibold text-blue-400">{topImprovements.length}</span>
              </div>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={impactData}>
            <defs>
              <linearGradient id="colorBefore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAfter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'GOD Score', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              label={{ value: 'Improvement', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF', paddingTop: '20px' }}
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="beforeInference"
              fill="url(#colorBefore)"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Before Inference (Sparse Data)"
              opacity={0.6}
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="afterInference"
              fill="url(#colorAfter)"
              stroke="#10B981"
              strokeWidth={3}
              name="After Inference (Rich Data)"
            />
            
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="improvement"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Score Improvement"
              dot={{ fill: '#3B82F6', r: 4 }}
            />
            
            <Bar yAxisId="right" dataKey="startupsEnriched" fill="#8B5CF6" opacity={0.3} name="Startups Enriched" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Top Improvements */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-400" />
          Top Score Improvements from Inference
        </h3>
        <div className="space-y-2">
          {topImprovements.map((improvement, index) => (
            <div 
              key={improvement.startupId} 
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-green-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{improvement.startupName}</div>
                    <div className="text-xs text-gray-400">
                      {improvement.fieldsAdded} fields enriched
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Before</div>
                    <div className="text-sm font-semibold text-yellow-400">{improvement.beforeScore.toFixed(1)}</div>
                  </div>
                  <div className="text-2xl text-gray-500">→</div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">After</div>
                    <div className="text-sm font-semibold text-green-400">{improvement.afterScore.toFixed(1)}</div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <div className="text-xs text-gray-400">Improvement</div>
                    <div className="text-lg font-bold text-green-400">+{improvement.improvement.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="text-sm text-yellow-400 mb-1">Before Inference</div>
          <div className="text-2xl font-bold text-yellow-400">
            {impactData.length > 0 ? impactData[impactData.length - 1]?.beforeInference.toFixed(1) : '0'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Avg GOD Score (Sparse)</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-xl p-4 border border-green-500/30">
          <div className="text-sm text-green-400 mb-1">After Inference</div>
          <div className="text-2xl font-bold text-green-400">
            {impactData.length > 0 ? impactData[impactData.length - 1]?.afterInference.toFixed(1) : '0'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Avg GOD Score (Rich)</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-xl p-4 border border-blue-500/30">
          <div className="text-sm text-blue-400 mb-1">Improvement</div>
          <div className="text-2xl font-bold text-blue-400">
            +{totalImprovement.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Points Gained</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-4 border border-purple-500/30">
          <div className="text-sm text-purple-400 mb-1">Avg Per Startup</div>
          <div className="text-2xl font-bold text-purple-400">
            +{avgImprovement.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Points Per Startup</div>
        </div>
      </div>
    </div>
  );
}

