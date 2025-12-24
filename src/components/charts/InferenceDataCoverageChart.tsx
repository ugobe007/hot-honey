import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Database, CheckCircle, AlertCircle, TrendingUp, Zap } from 'lucide-react';

interface DataCoveragePoint {
  date: string;
  coverage: number;
  fieldsPopulated: number;
  totalFields: number;
  withInference: number;
  withoutInference: number;
  avgGODScore: number;
  avgGODScoreWithInference: number;
  avgGODScoreWithoutInference: number;
  improvement: number;
}

interface FieldBreakdown {
  field: string;
  coverage: number;
  withInference: number;
  withoutInference: number;
  impact: number; // Impact on GOD score
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function InferenceDataCoverageChart() {
  const [coverageData, setCoverageData] = useState<DataCoveragePoint[]>([]);
  const [fieldBreakdown, setFieldBreakdown] = useState<FieldBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCoverage, setCurrentCoverage] = useState(0);
  const [coverageTrend, setCoverageTrend] = useState(0);
  const [godScoreImpact, setGodScoreImpact] = useState(0);

  useEffect(() => {
    loadInferenceData();
    const interval = setInterval(loadInferenceData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadInferenceData = async () => {
    try {
      const { data: startups, error } = await supabase
        .from('startup_uploads')
        .select('id, extracted_data, updated_at, total_god_score, team_score, traction_score, market_score, product_score, vision_score')
        .eq('status', 'approved')
        .limit(2000);

      if (error) throw error;

      const trackedFields = [
        'mrr', 'arr', 'revenue', 'revenue_annual',
        'customer_count', 'growth_rate', 'growth_rate_monthly',
        'market_size', 'marketSize',
        'team', 'founders', 'founders_count',
        'has_technical_cofounder', 'is_launched', 'has_demo',
        'problem', 'solution', 'value_proposition', 'tagline',
        'sectors', 'industries', 'stage', 'funding_stage'
      ];

      let totalFields = 0;
      let populatedFields = 0;
      let withInference = 0;
      let withoutInference = 0;
      let totalGODWithInference = 0;
      let totalGODWithoutInference = 0;
      let countWithInference = 0;
      let countWithoutInference = 0;

      const fieldStats: Record<string, { with: number; without: number; godWith: number[]; godWithout: number[] }> = {};

      startups?.forEach(startup => {
        const extracted = startup.extracted_data || {};
        let hasInferenceData = false;
        let startupFields = 0;
        let startupPopulated = 0;

        trackedFields.forEach(field => {
          totalFields++;
          startupFields++;
          
          const hasField = extracted[field] !== null && extracted[field] !== undefined && extracted[field] !== '';
          if (hasField) {
            populatedFields++;
            startupPopulated++;
            hasInferenceData = true;
          }

          if (!fieldStats[field]) {
            fieldStats[field] = { with: 0, without: 0, godWith: [], godWithout: [] };
          }
          if (hasField) {
            fieldStats[field].with++;
            if (startup.total_god_score) {
              fieldStats[field].godWith.push(startup.total_god_score);
            }
          } else {
            fieldStats[field].without++;
            if (startup.total_god_score) {
              fieldStats[field].godWithout.push(startup.total_god_score);
            }
          }
        });

        if (hasInferenceData) {
          withInference++;
          if (startup.total_god_score) {
            totalGODWithInference += startup.total_god_score;
            countWithInference++;
          }
        } else {
          withoutInference++;
          if (startup.total_god_score) {
            totalGODWithoutInference += startup.total_god_score;
            countWithoutInference++;
          }
        }
      });

      const coverage = totalFields > 0 ? (populatedFields / totalFields) * 100 : 0;
      setCurrentCoverage(coverage);

      const avgGODWith = countWithInference > 0 ? totalGODWithInference / countWithInference : 0;
      const avgGODWithout = countWithoutInference > 0 ? totalGODWithoutInference / countWithoutInference : 0;
      const impact = avgGODWith - avgGODWithout;
      setGodScoreImpact(impact);

      // Create field breakdown with impact
      const breakdown: FieldBreakdown[] = Object.entries(fieldStats).map(([field, stats]) => {
        const avgWith = stats.godWith.length > 0 
          ? stats.godWith.reduce((a, b) => a + b, 0) / stats.godWith.length 
          : 0;
        const avgWithout = stats.godWithout.length > 0 
          ? stats.godWithout.reduce((a, b) => a + b, 0) / stats.godWithout.length 
          : 0;
        
        return {
          field,
          coverage: (stats.with / (stats.with + stats.without)) * 100,
          withInference: stats.with,
          withoutInference: stats.without,
          impact: avgWith - avgWithout,
        };
      }).sort((a, b) => b.impact - a.impact);

      setFieldBreakdown(breakdown);

      // Historical data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const grouped = startups?.reduce((acc: Record<string, any[]>, startup) => {
        const date = new Date(startup.updated_at).toISOString().split('T')[0];
        if (new Date(startup.updated_at) >= sevenDaysAgo) {
          if (!acc[date]) acc[date] = [];
          acc[date].push(startup);
        }
        return acc;
      }, {}) || {};

      const historicalData: DataCoveragePoint[] = Object.entries(grouped).map(([date, dayStartups]) => {
        let dayTotal = 0;
        let dayPopulated = 0;
        let dayWithInference = 0;
        let dayWithoutInference = 0;
        let dayGODWith = 0;
        let dayGODWithout = 0;
        let dayCountWith = 0;
        let dayCountWithout = 0;

        dayStartups.forEach((startup: any) => {
          const extracted = startup.extracted_data || {};
          let hasInference = false;

          trackedFields.forEach(field => {
            dayTotal++;
            const hasField = extracted[field] !== null && extracted[field] !== undefined && extracted[field] !== '';
            if (hasField) {
              dayPopulated++;
              hasInference = true;
            }
          });

          if (hasInference) {
            dayWithInference++;
            if (startup.total_god_score) {
              dayGODWith += startup.total_god_score;
              dayCountWith++;
            }
          } else {
            dayWithoutInference++;
            if (startup.total_god_score) {
              dayGODWithout += startup.total_god_score;
              dayCountWithout++;
            }
          }
        });

        const avgGOD = (dayGODWith + dayGODWithout) / (dayCountWith + dayCountWithout || 1);
        const avgGODWith = dayCountWith > 0 ? dayGODWith / dayCountWith : 0;
        const avgGODWithout = dayCountWithout > 0 ? dayGODWithout / dayCountWithout : 0;

        return {
          date,
          coverage: dayTotal > 0 ? (dayPopulated / dayTotal) * 100 : 0,
          fieldsPopulated: dayPopulated,
          totalFields: dayTotal,
          withInference: dayWithInference,
          withoutInference: dayWithoutInference,
          avgGODScore: avgGOD,
          avgGODScoreWithInference: avgGODWith,
          avgGODScoreWithoutInference: avgGODWithout,
          improvement: avgGODWith - avgGODWithout,
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate trend
      if (historicalData.length >= 2) {
        const first = historicalData[0].coverage;
        const last = historicalData[historicalData.length - 1].coverage;
        setCoverageTrend(last - first);
      }

      setCoverageData(historicalData);
    } catch (error) {
      console.error('Error loading inference data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading Inference Analytics...</div>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'With Inference', value: coverageData[coverageData.length - 1]?.withInference || 0, fill: '#10B981' },
    { name: 'Missing Data', value: coverageData[coverageData.length - 1]?.withoutInference || 0, fill: '#F59E0B' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl">
          <p className="font-semibold text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%</span>
            </p>
          ))}
          {data && (
            <div className="mt-3 pt-3 border-t border-gray-600 space-y-1">
              <p className="text-xs text-gray-400">Fields: {data.fieldsPopulated}/{data.totalFields}</p>
              <p className="text-xs text-green-400">With Inference: {data.withInference} startups</p>
              <p className="text-xs text-yellow-400">Missing: {data.withoutInference} startups</p>
              <p className="text-xs text-blue-400">GOD Impact: +{data.improvement.toFixed(1)} points</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Main Coverage Chart */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <Database className="w-6 h-6 text-cyan-400" />
              Inference Data Coverage & Impact
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300">
                  Coverage: <span className="font-semibold text-cyan-400">{currentCoverage.toFixed(1)}%</span>
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${coverageTrend > 0 ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-gray-300">
                  Trend: <span className={`font-semibold ${coverageTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {coverageTrend > 0 ? '+' : ''}{coverageTrend.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">
                GOD Impact: <span className={`font-semibold ${godScoreImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {godScoreImpact > 0 ? '+' : ''}{godScoreImpact.toFixed(1)} points
                </span>
              </div>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={coverageData}>
            <defs>
              <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorGOD" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
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
              label={{ value: 'Coverage %', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              domain={[0, 100]}
              label={{ value: 'GOD Score', angle: 90, position: 'insideRight', fill: '#9CA3AF' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF', paddingTop: '20px' }}
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="coverage"
              fill="url(#colorCoverage)"
              stroke="#06B6D4"
              strokeWidth={3}
              name="Data Coverage %"
              dot={{ fill: '#06B6D4', r: 4 }}
            />
            
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgGODScoreWithInference"
              stroke="#10B981"
              strokeWidth={2}
              name="GOD Score (With Inference)"
              dot={{ fill: '#10B981', r: 3 }}
            />
            
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgGODScoreWithoutInference"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="GOD Score (Without Inference)"
              dot={{ fill: '#F59E0B', r: 3 }}
            />
            
            <Bar yAxisId="left" dataKey="withInference" fill="#10B981" opacity={0.2} name="Startups w/ Inference" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 rounded-xl p-4 border border-cyan-500/30">
          <div className="text-sm text-cyan-400 mb-1 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            With Inference
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {coverageData[coverageData.length - 1]?.withInference || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Avg GOD: {coverageData[coverageData.length - 1]?.avgGODScoreWithInference.toFixed(1) || 0}
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="text-sm text-yellow-400 mb-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Missing Data
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            {coverageData[coverageData.length - 1]?.withoutInference || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Avg GOD: {coverageData[coverageData.length - 1]?.avgGODScoreWithoutInference.toFixed(1) || 0}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-xl p-4 border border-green-500/30">
          <div className="text-sm text-green-400 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Impact
          </div>
          <div className="text-3xl font-bold text-green-400">
            +{godScoreImpact.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">GOD Score Improvement</div>
        </div>
      </div>

      {/* Field Breakdown with Impact */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Field Coverage & GOD Score Impact</h3>
        <ResponsiveContainer width="100%" height={500}>
          <ComposedChart data={fieldBreakdown.slice(0, 12)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
            <YAxis 
              dataKey="field" 
              type="category" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              width={120}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'impact') return [`+${value.toFixed(1)} pts`, 'GOD Impact'];
                return [`${value.toFixed(1)}%`, 'Coverage'];
              }}
            />
            <Legend />
            <Bar dataKey="coverage" fill="#3B82F6" name="Coverage %" radius={[0, 4, 4, 0]}>
              {fieldBreakdown.slice(0, 12).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Line 
              type="monotone" 
              dataKey="impact" 
              stroke="#10B981" 
              strokeWidth={2}
              name="GOD Impact (points)"
              dot={{ fill: '#10B981', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Startup Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Top Impact Fields</h3>
          <div className="space-y-3">
            {fieldBreakdown.slice(0, 5).map((field, index) => (
              <div key={field.field} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-gray-300 capitalize">{field.field.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{field.coverage.toFixed(0)}%</span>
                  <span className={`text-sm font-semibold ${field.impact > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {field.impact > 0 ? '+' : ''}{field.impact.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
