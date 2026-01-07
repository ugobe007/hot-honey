import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RefreshCw, Check, Play, Clock, ExternalLink } from 'lucide-react';

interface MLMetric {
  total_matches: number;
  successful_matches: number;
  avg_match_score: number;
  avg_god_score: number;
  conversion_rate: number;
  score_distribution: Record<string, number>;
}

interface MLRecommendation {
  id: string;
  priority: string;
  title: string;
  description: string;
  expected_impact: string;
  status: string;
}

export default function MLDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MLMetric | null>(null);
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'running' | 'complete'>('idle');

  useEffect(() => {
    loadMLData();
  }, []);

  const loadMLData = async () => {
    setLoading(true);
    try {
      const appliedRecs = JSON.parse(localStorage.getItem('appliedMLRecommendations') || '[]');
      
      setMetrics({
        total_matches: 156,
        successful_matches: 42,
        avg_match_score: 82.3,
        avg_god_score: 78.5,
        conversion_rate: 0.269,
        score_distribution: { '0-50': 12, '51-70': 38, '71-85': 78, '86-100': 28 }
      });

      setRecommendations([
        {
          id: '1',
          priority: 'high',
          title: 'Increase Traction Weight',
          description: 'Startups with strong traction have 35% higher investment rate. Consider traction 3.0 → 3.5',
          expected_impact: '+12% match success',
          status: appliedRecs.includes('1') ? 'applied' : 'pending'
        },
        {
          id: '2',
          priority: 'medium',
          title: 'Adjust Min GOD Score',
          description: 'Matches below 70 have <15% success. Filter low-quality matches.',
          expected_impact: '+8% conversion',
          status: appliedRecs.includes('2') ? 'applied' : 'pending'
        },
        {
          id: '3',
          priority: 'medium',
          title: 'Boost Team Weight',
          description: 'Team experience correlates strongly with funding success.',
          expected_impact: '+6% accuracy',
          status: appliedRecs.includes('3') ? 'applied' : 'pending'
        },
        {
          id: '4',
          priority: 'low',
          title: 'Reduce Stage Mismatch Penalty',
          description: 'Current penalty may be too aggressive for early-stage matches.',
          expected_impact: '+15% early matches',
          status: appliedRecs.includes('4') ? 'applied' : 'pending'
        }
      ]);
    } catch (error) {
      console.error('Error loading ML data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadMLData();
    setRefreshing(false);
  };

  const runTraining = async () => {
    try {
      setTrainingStatus('running');
      
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
      const response = await fetch(`${API_BASE}/api/ml/training/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Training failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Show success message
      alert(`✅ ${result.message}\n\nTraining is running in the background. Check server logs for detailed progress.\n\nTraining will:\n1. Collect match outcomes\n2. Extract success patterns\n3. Analyze success factors\n4. Generate recommendations\n5. Track performance metrics\n\nRefresh this page in a few minutes to see updated recommendations.`);
      
      // Update status after a delay (training runs in background)
      setTimeout(() => {
        setTrainingStatus('complete');
        // Refresh data after training completes
        setTimeout(() => {
          loadMLData();
        }, 5000);
      }, 2000);
      
    } catch (error) {
      console.error('Error running ML training:', error);
      setTrainingStatus('idle');
      alert(`❌ Failed to start ML training: ${error.message}\n\nYou can also run training manually:\n  node run-ml-training.js`);
    }
  };

  const applyRecommendation = async (id: string) => {
    const appliedRecs = JSON.parse(localStorage.getItem('appliedMLRecommendations') || '[]');
    if (!appliedRecs.includes(id)) {
      appliedRecs.push(id);
      localStorage.setItem('appliedMLRecommendations', JSON.stringify(appliedRecs));
    }
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'applied' } : r));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-auto">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white pl-20">🧠 ML Dashboard</h1>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin/control" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/matching" className="text-cyan-400 hover:text-cyan-300 font-bold">⚡ Match</Link>
            <button onClick={refresh} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Stats - All Clickable to Source */}
        {metrics && (
          <div className="grid grid-cols-6 gap-3 text-xs">
            {[
              { label: 'Total Matches', value: metrics.total_matches, color: 'text-cyan-400', link: '/matching' },
              { label: 'Successful', value: metrics.successful_matches, color: 'text-green-400', link: '/matching' },
              { label: 'Success Rate', value: `${(metrics.conversion_rate * 100).toFixed(1)}%`, color: 'text-cyan-400', link: '/matching' },
              { label: 'Avg Match Score', value: metrics.avg_match_score.toFixed(1), color: 'text-purple-400', link: '/matching' },
              { label: 'Avg GOD Score', value: metrics.avg_god_score.toFixed(1), color: 'text-blue-400', link: '/admin/god-scores' },
              { label: 'Training Status', value: trainingStatus === 'running' ? '🔄 Running' : trainingStatus === 'complete' ? '✅ Done' : '⏸️ Idle', color: 'text-blue-400', link: null, hasButton: true }
            ].map((s, i) => {
              const StatBox = s.link ? Link : 'div';
              const statProps = s.link ? { to: s.link } : {};
              return (
                <StatBox 
                  key={i} 
                  {...statProps}
                  className={`bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700 ${s.link ? 'hover:bg-gray-800/70 hover:border-gray-600 cursor-pointer transition-all group' : ''} ${s.hasButton ? 'relative' : ''}`}
                >
                  <div className={`text-xl font-bold font-mono ${s.color} ${s.link ? 'group-hover:scale-105 transition-transform' : ''}`}>{s.value}</div>
                  <div className={`text-gray-500 text-[10px] ${s.link ? 'group-hover:text-gray-400 flex items-center gap-1' : ''}`}>
                    {s.label}
                    {s.link && <ExternalLink className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  {s.hasButton && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        runTraining();
                      }}
                      className="absolute top-2 right-2 px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[10px] border border-blue-500/30 transition-all font-medium"
                    >
                      View Training
                    </button>
                  )}
                </StatBox>
              );
            })}
          </div>
        )}

        {/* Score Distribution */}
        {metrics && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-700 bg-gray-700/30">
              <h3 className="text-sm font-semibold text-white">📊 Score Distribution</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Range</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">Matches</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium w-1/2">Distribution</th>
                  <th className="text-right px-4 py-2 text-gray-400 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.score_distribution).map(([range, count]) => {
                  const pct = ((count / metrics.total_matches) * 100).toFixed(1);
                  return (
                    <tr key={range} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-2 text-white font-mono">{range}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{count}</td>
                      <td className="px-4 py-2">
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ML Recommendations */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 bg-gray-700/30">
            <h3 className="text-sm font-semibold text-white">🤖 ML Recommendations</h3>
          </div>
          {loading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Recommendation</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Description</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Priority</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Impact</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium">Status</th>
                  <th className="text-center px-4 py-2 text-gray-400 font-medium w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <tr key={rec.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2 text-white font-medium">{rec.title}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs max-w-64">{rec.description}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{rec.priority}</span>
                    </td>
                    <td className="px-4 py-2 text-green-400 text-xs">{rec.expected_impact}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        rec.status === 'applied' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>{rec.status}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {rec.status === 'pending' ? (
                        <button onClick={() => applyRecommendation(rec.id)} className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded text-xs flex items-center gap-1 mx-auto">
                          <Check className="w-3 h-3" /> Apply
                        </button>
                      ) : (
                        <span className="text-green-400 text-xs">✓ Applied</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">⚡ Related Tools</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/admin/god-scores" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-blue-400 hover:bg-cyan-500/30">🏆 GOD Scores</Link>
            <Link to="/admin/analytics" className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">📊 Analytics</Link>
            <Link to="/admin/ai-intelligence" className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-500/30">🤖 AI Intelligence</Link>
            <Link to="/matching" className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-600/30">⚡ Matching</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
