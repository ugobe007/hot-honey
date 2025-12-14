import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, Target, Zap, AlertCircle, CheckCircle, Clock, BarChart3 } from 'lucide-react';

interface MLMetric {
  period_start: string;
  period_end: string;
  total_matches: number;
  successful_matches: number;
  avg_match_score: number;
  avg_god_score: number;
  conversion_rate: number;
  score_distribution: any;
  algorithm_version: string;
}

interface MLRecommendation {
  id: string;
  recommendation_type: string;
  priority: string;
  title: string;
  description: string;
  current_value: any;
  proposed_value: any;
  expected_impact: string;
  status: string;
  created_at: string;
}

interface TrainingPattern {
  pattern_type: string;
  outcome: string;
  outcome_quality: number;
  features: any;
}

export default function MLDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MLMetric[]>([]);
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  const [patterns, setPatterns] = useState<TrainingPattern[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'running' | 'complete'>('idle');

  useEffect(() => {
    loadMLData();
  }, []);

  const loadMLData = async () => {
    setLoading(true);
    try {
      // In production, this would call your ML service API
      // For now, we'll use mock data
      
      // TODO: Replace with actual API calls
      // const response = await fetch('/api/ml/dashboard');
      // const data = await response.json();
      
      setMetrics([
        {
          period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          period_end: new Date().toISOString(),
          total_matches: 156,
          successful_matches: 42,
          avg_match_score: 82.3,
          avg_god_score: 78.5,
          conversion_rate: 0.269,
          score_distribution: {
            '0-50': 12,
            '51-70': 38,
            '71-85': 78,
            '86-100': 28
          },
          algorithm_version: '1.0'
        }
      ]);

      // Check for previously applied recommendations
      const appliedRecs = JSON.parse(localStorage.getItem('appliedMLRecommendations') || '[]');

      setRecommendations([
        {
          id: '1',
          recommendation_type: 'weight_change',
          priority: 'high',
          title: 'Increase Traction Weight',
          description: 'Analysis shows that startups with strong traction metrics (revenue, users) have 35% higher investment rate. Consider increasing traction weight from 3.0 to 3.5.',
          current_value: { traction: 3.0 },
          proposed_value: { traction: 3.5 },
          expected_impact: 'Expected 12% improvement in match success rate',
          status: appliedRecs.includes('1') ? 'applied' : 'pending',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          recommendation_type: 'threshold_adjust',
          priority: 'medium',
          title: 'Adjust Minimum GOD Score Threshold',
          description: 'Matches below 70 GOD score have <15% success rate. Consider filtering matches below this threshold to improve overall quality.',
          current_value: { min_threshold: 0 },
          proposed_value: { min_threshold: 70 },
          expected_impact: 'Reduce low-quality matches by 40%, increase conversion by 8%',
          status: appliedRecs.includes('2') ? 'applied' : 'pending',
          created_at: new Date().toISOString()
        }
      ]);

    } catch (error) {
      console.error('Error loading ML data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTrainingCycle = async () => {
    setTrainingStatus('running');
    
    // Simulate training cycle
    setTimeout(() => {
      setTrainingStatus('complete');
      loadMLData(); // Reload data after training
      
      setTimeout(() => {
        setTrainingStatus('idle');
      }, 3000);
    }, 2000);
  };

  const applyRecommendation = async (recId: string) => {
    const rec = recommendations.find(r => r.id === recId);
    if (!rec) return;

    // Update state immediately to show loading
    setRecommendations(prev => 
      prev.map(r => r.id === recId ? { ...r, status: 'applying' } : r)
    );

    try {
      // Simulate API call with a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store applied recommendations in localStorage to persist across reloads
      const appliedRecs = JSON.parse(localStorage.getItem('appliedMLRecommendations') || '[]');
      if (!appliedRecs.includes(recId)) {
        appliedRecs.push(recId);
        localStorage.setItem('appliedMLRecommendations', JSON.stringify(appliedRecs));
      }

      // Update local state to mark as applied
      setRecommendations(prev => 
        prev.map(r => r.id === recId ? { ...r, status: 'applied' } : r)
      );

      // Show success notification (non-blocking)
      console.log('✅ Recommendation applied:', rec.title);
      
    } catch (error) {
      console.error('Error applying recommendation:', error);
      // Revert on error
      setRecommendations(prev => 
        prev.map(r => r.id === recId ? { ...r, status: 'pending' } : r)
      );
      alert('❌ Error applying recommendation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] flex items-center justify-center">
        <div className="text-white text-2xl">Loading ML Dashboard...</div>
      </div>
    );
  }

  const latestMetric = metrics[0];
  const successRate = latestMetric ? (latestMetric.conversion_rate * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-2"
          >
            ← Back to Admin
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
                <Brain className="w-12 h-12 text-purple-400" />
                ML Training Dashboard
              </h1>
              <p className="text-gray-400 text-lg">
                Continuously improving the GOD Algorithm with real match data
              </p>
            </div>

            {/* Training Control */}
            <button
              onClick={runTrainingCycle}
              disabled={trainingStatus === 'running'}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                trainingStatus === 'running'
                  ? 'bg-yellow-500/20 text-yellow-300 cursor-not-allowed'
                  : trainingStatus === 'complete'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
              }`}
            >
              {trainingStatus === 'running' && (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Training...
                </>
              )}
              {trainingStatus === 'complete' && (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Complete!
                </>
              )}
              {trainingStatus === 'idle' && (
                <>
                  <Zap className="w-5 h-5" />
                  Run Training Cycle
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recommendation System Banner */}
        <div className="bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 border-2 border-orange-400/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-orange-500/30 rounded-full p-3">
              <Zap className="w-8 h-8 text-orange-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-orange-300 mb-2">
                🚀 Automated Weight Optimization Active
              </h3>
              <p className="text-gray-300 text-lg mb-4">
                The ML system continuously analyzes match outcomes and generates recommendations to improve the GOD Algorithm weights. 
                Review and apply recommendations below to enhance matching accuracy.
              </p>
              <div className="flex gap-4 text-sm">
                <div className="bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-gray-400">Pending Recommendations:</span>
                  <span className="text-orange-300 font-bold ml-2">
                    {recommendations.filter(r => r.status === 'pending').length}
                  </span>
                </div>
                <div className="bg-white/10 rounded-lg px-4 py-2">
                  <span className="text-gray-400">Applied This Month:</span>
                  <span className="text-green-300 font-bold ml-2">
                    {recommendations.filter(r => r.status === 'applied').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        {latestMetric && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-6 border border-cyan-400/30">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8 text-cyan-400" />
                <div className="text-sm text-cyan-300 font-medium uppercase">Total Matches</div>
              </div>
              <div className="text-4xl font-bold text-white">{latestMetric.total_matches}</div>
              <div className="text-sm text-gray-400 mt-1">Last 30 days</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-400/30">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div className="text-sm text-green-300 font-medium uppercase">Success Rate</div>
              </div>
              <div className="text-4xl font-bold text-white">{successRate}%</div>
              <div className="text-sm text-gray-400 mt-1">{latestMetric.successful_matches} successful</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-400/30">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-8 h-8 text-purple-400" />
                <div className="text-sm text-purple-300 font-medium uppercase">Avg GOD Score</div>
              </div>
              <div className="text-4xl font-bold text-white">{latestMetric.avg_god_score.toFixed(1)}</div>
              <div className="text-sm text-gray-400 mt-1">Out of 100</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl p-6 border border-orange-400/30">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <div className="text-sm text-orange-300 font-medium uppercase">Avg Match Score</div>
              </div>
              <div className="text-4xl font-bold text-white">{latestMetric.avg_match_score.toFixed(1)}</div>
              <div className="text-sm text-gray-400 mt-1">Quality metric</div>
            </div>
          </div>
        )}

        {/* Score Distribution */}
        {latestMetric && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              GOD Score Distribution
            </h2>
            
            <div className="space-y-4">
              {Object.entries(latestMetric.score_distribution).map(([range, count]) => {
                const total = latestMetric.total_matches;
                const countNum = count as number;
                const percentage = ((countNum / total) * 100).toFixed(1);
                
                return (
                  <div key={range}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">{range}</span>
                      <span className="text-gray-400">{countNum} matches ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ML Recommendations */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            ML-Generated Recommendations
          </h2>

          {recommendations.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No recommendations yet. Run a training cycle to generate insights.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`bg-white/5 rounded-xl p-6 border ${
                    rec.priority === 'high'
                      ? 'border-red-400/50'
                      : rec.priority === 'medium'
                      ? 'border-yellow-400/50'
                      : 'border-gray-400/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            rec.priority === 'high'
                              ? 'bg-red-500/20 text-red-300'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-300">
                          {rec.recommendation_type}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">{rec.title}</h3>
                      <p className="text-gray-400 mb-4 whitespace-pre-line">{rec.description}</p>
                      
                      <div className="bg-white/5 rounded-lg p-4 mb-3">
                        <div className="text-sm font-semibold text-cyan-400 mb-2">Expected Impact:</div>
                        <div className="text-white">{rec.expected_impact}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {rec.status === 'applied' ? (
                      <div className="flex items-center gap-2 px-6 py-2 bg-green-500/20 text-green-300 rounded-lg font-bold border border-green-400/50">
                        <CheckCircle className="w-5 h-5" />
                        Applied Successfully
                      </div>
                    ) : rec.status === 'applying' ? (
                      <div className="flex items-center gap-2 px-6 py-2 bg-yellow-500/20 text-yellow-300 rounded-lg font-bold border border-yellow-400/50">
                        <Clock className="w-5 h-5 animate-spin" />
                        Applying...
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => applyRecommendation(rec.id)}
                          className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-green-500/50"
                        >
                          <Zap className="w-4 h-4" />
                          Apply to GOD Algorithm
                        </button>
                        <button
                          onClick={() => alert(`Recommendation Details:\n\nCurrent: ${JSON.stringify(rec.current_value, null, 2)}\n\nProposed: ${JSON.stringify(rec.proposed_value, null, 2)}`)}
                          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all"
                        >
                          View Details
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How ML Works */}
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-xl p-6 border border-purple-400/30">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            How ML Training Works
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Collect Real Outcomes</h4>
                  <p className="text-gray-400 text-sm">
                    Track which matches led to investments, meetings, or passes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Extract Patterns</h4>
                  <p className="text-gray-400 text-sm">
                    Identify common factors in successful vs. unsuccessful matches
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-400/50 flex items-center justify-center text-pink-300 font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Generate Recommendations</h4>
                  <p className="text-gray-400 text-sm">
                    ML analyzes data and suggests weight adjustments to improve accuracy
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/50 flex items-center justify-center text-orange-300 font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Apply & Test</h4>
                  <p className="text-gray-400 text-sm">
                    Update GOD algorithm weights and measure performance improvement
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center text-green-300 font-bold flex-shrink-0">
                  5
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Continuous Learning</h4>
                  <p className="text-gray-400 text-sm">
                    Algorithm gets smarter with each match, constantly optimizing
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-400/30">
                <p className="text-yellow-300 text-sm font-semibold">
                  💡 The more matches you create and track, the smarter the algorithm becomes!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
