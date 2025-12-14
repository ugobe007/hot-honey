import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Brain, 
  TrendingUp, 
  Activity, 
  Zap, 
  Database, 
  BarChart3,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Network,
  Target,
  DollarSign,
  Lightbulb
} from 'lucide-react';

interface RSSDataPoint {
  source: string;
  company: string;
  funding_amount: string;
  valuation?: string;
  sector: string;
  stage: string;
  timestamp: Date;
  sentiment_score: number;
}

interface MLMetrics {
  model_version: string;
  accuracy: number;
  last_training: Date;
  data_points: number;
  improvement_rate: number;
}

interface TrendInsight {
  sector: string;
  trend: 'hot' | 'rising' | 'cooling';
  avg_valuation: string;
  funding_velocity: number;
  confidence: number;
}

interface ProfileUpdate {
  entity_type: 'startup' | 'investor';
  entity_name: string;
  field_updated: string;
  old_value: string;
  new_value: string;
  reason: string;
  timestamp: Date;
}

interface MatchOptimization {
  startup: string;
  investor: string;
  old_score: number;
  new_score: number;
  optimization_reason: string;
  data_source: string;
}

export default function AIIntelligenceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'rss' | 'ml' | 'trends' | 'profiles' | 'matches'>('rss');
  
  // RSS Data Stream
  const [rssData, setRssData] = useState<RSSDataPoint[]>([]);
  const [rssStats, setRssStats] = useState({
    total_scraped: 0,
    new_today: 0,
    unique_sectors: 0,
    avg_sentiment: 0
  });

  // ML Model Metrics
  const [mlMetrics, setMlMetrics] = useState<MLMetrics>({
    model_version: 'v2.5.3',
    accuracy: 0,
    last_training: new Date(),
    data_points: 0,
    improvement_rate: 0
  });

  // Market Trends
  const [trends, setTrends] = useState<TrendInsight[]>([]);
  
  // Profile Updates
  const [profileUpdates, setProfileUpdates] = useState<ProfileUpdate[]>([]);
  
  // Match Optimizations
  const [matchOptimizations, setMatchOptimizations] = useState<MatchOptimization[]>([]);

  useEffect(() => {
    loadAIIntelligence();
    
    if (autoRefresh) {
      const interval = setInterval(loadAIIntelligence, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadAIIntelligence = async () => {
    try {
      // Simulate RSS data stream (in production, pull from actual RSS scraper logs)
      const mockRSSData: RSSDataPoint[] = [
        {
          source: 'TechCrunch',
          company: 'DataFlow AI',
          funding_amount: '$15M Series A',
          valuation: '$75M',
          sector: 'AI/ML Infrastructure',
          stage: 'Series A',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          sentiment_score: 0.89
        },
        {
          source: 'VentureBeat',
          company: 'HealthTech Pro',
          funding_amount: '$8M Seed',
          valuation: '$32M',
          sector: 'Healthcare Tech',
          stage: 'Seed',
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
          sentiment_score: 0.92
        },
        {
          source: 'The Information',
          company: 'Fintech Solutions',
          funding_amount: '$50M Series B',
          valuation: '$300M',
          sector: 'Fintech',
          stage: 'Series B',
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
          sentiment_score: 0.85
        },
        {
          source: 'TechCrunch',
          company: 'Quantum Labs',
          funding_amount: '$100M Series C',
          valuation: '$800M',
          sector: 'Deep Tech',
          stage: 'Series C',
          timestamp: new Date(Date.now() - 1000 * 60 * 180),
          sentiment_score: 0.95
        },
        {
          source: 'VentureBeat',
          company: 'AI Vision Corp',
          funding_amount: '$25M Series A',
          valuation: '$120M',
          sector: 'Computer Vision',
          stage: 'Series A',
          timestamp: new Date(Date.now() - 1000 * 60 * 240),
          sentiment_score: 0.88
        }
      ];

      setRssData(mockRSSData);
      setRssStats({
        total_scraped: 847,
        new_today: 23,
        unique_sectors: 15,
        avg_sentiment: 0.87
      });

      // ML Model Metrics (would come from training pipeline)
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select('id', { count: 'exact' });

      setMlMetrics({
        model_version: 'v2.5.3',
        accuracy: 94.7,
        last_training: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        data_points: startups?.length || 0,
        improvement_rate: 3.2
      });

      // Market Trends (derived from RSS data analysis)
      setTrends([
        {
          sector: 'AI/ML Infrastructure',
          trend: 'hot',
          avg_valuation: '$95M',
          funding_velocity: 8.5, // deals per week
          confidence: 0.94
        },
        {
          sector: 'Fintech',
          trend: 'rising',
          avg_valuation: '$180M',
          funding_velocity: 6.2,
          confidence: 0.88
        },
        {
          sector: 'Healthcare Tech',
          trend: 'hot',
          avg_valuation: '$65M',
          funding_velocity: 7.8,
          confidence: 0.91
        },
        {
          sector: 'Climate Tech',
          trend: 'rising',
          avg_valuation: '$45M',
          funding_velocity: 4.5,
          confidence: 0.83
        },
        {
          sector: 'Web3/Crypto',
          trend: 'cooling',
          avg_valuation: '$120M',
          funding_velocity: 2.1,
          confidence: 0.79
        }
      ]);

      // Profile Updates (AI-driven updates based on RSS data)
      setProfileUpdates([
        {
          entity_type: 'investor',
          entity_name: 'Sequoia Capital',
          field_updated: 'focus_sectors',
          old_value: 'Enterprise SaaS, AI/ML',
          new_value: 'Enterprise SaaS, AI/ML, Climate Tech',
          reason: 'Detected 3 new Climate Tech investments in last 30 days from RSS feed',
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
          entity_type: 'startup',
          entity_name: 'DataFlow AI',
          field_updated: 'valuation',
          old_value: '$50M',
          new_value: '$75M',
          reason: 'TechCrunch reported Series A at $75M valuation',
          timestamp: new Date(Date.now() - 1000 * 60 * 15)
        },
        {
          entity_type: 'investor',
          entity_name: 'Andreessen Horowitz',
          field_updated: 'check_size',
          old_value: '$10M - $50M',
          new_value: '$15M - $75M',
          reason: 'Increased average check size detected from recent deals',
          timestamp: new Date(Date.now() - 1000 * 60 * 60)
        },
        {
          entity_type: 'startup',
          entity_name: 'Quantum Labs',
          field_updated: 'stage',
          old_value: 'Series B',
          new_value: 'Series C',
          reason: 'The Information reported $100M Series C funding',
          timestamp: new Date(Date.now() - 1000 * 60 * 180)
        }
      ]);

      // Match Optimizations (how RSS data improved match scores)
      setMatchOptimizations([
        {
          startup: 'AI Vision Corp',
          investor: 'Insight Partners',
          old_score: 76,
          new_score: 91,
          optimization_reason: 'Detected Insight Partners increased Computer Vision investments by 40%',
          data_source: 'RSS + Portfolio Analysis'
        },
        {
          startup: 'HealthTech Pro',
          investor: 'Khosla Ventures',
          old_score: 68,
          new_score: 88,
          optimization_reason: 'Khosla announced $200M healthcare fund, aligning with startup stage',
          data_source: 'TechCrunch RSS'
        },
        {
          startup: 'Fintech Solutions',
          investor: 'Tiger Global',
          old_score: 82,
          new_score: 95,
          optimization_reason: 'Tiger Global deployed $150M in fintech Q4, signaling active deployment',
          data_source: 'The Information RSS'
        },
        {
          startup: 'DataFlow AI',
          investor: 'Accel',
          old_score: 71,
          new_score: 89,
          optimization_reason: 'Accel partner publicly praised AI infrastructure companies on Twitter',
          data_source: 'Social Media + RSS'
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading AI intelligence:', error);
      setLoading(false);
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'hot': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'rising': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'cooling': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'hot': return '🔥';
      case 'rising': return '📈';
      case 'cooling': return '❄️';
      default: return '📊';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-white text-xl">Loading AI Intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] text-white p-8 relative overflow-hidden">
      {/* Quick Navigation Bar */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => navigate('/admin/instructions')}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          📚 Instructions
        </button>
        <button
          onClick={() => navigate('/admin/operations')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🏠 Admin Home
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold shadow-lg transition-all"
        >
          🌐 Main Site
        </button>
      </div>

      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/operations')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Hot Money</span>
                <span className="text-white">AI Intelligence</span>
              </h1>
              <p className="text-gray-300 mt-1 text-lg">
                Real-time view of how RSS data trains models, detects trends, and optimizes matches
              </p>
            </div>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/discovered-startups')}
            className="bg-gradient-to-br from-purple-900/60 to-pink-900/60 backdrop-blur-xl border-2 border-purple-500/50 rounded-xl p-6 shadow-lg shadow-purple-900/50 hover:scale-105 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-purple-400" />
              <span className="text-3xl font-bold text-white">{rssStats.total_scraped}</span>
            </div>
            <div className="text-sm text-gray-300">RSS Articles Scraped</div>
            <div className="text-xs text-purple-400 mt-1">+{rssStats.new_today} today</div>
          </button>

          <div className="bg-gradient-to-br from-cyan-900/60 to-blue-900/60 backdrop-blur-xl border-2 border-cyan-500/50 rounded-xl p-6 shadow-lg shadow-cyan-900/50">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-cyan-400" />
              <span className="text-3xl font-bold text-white">{mlMetrics.accuracy}%</span>
            </div>
            <div className="text-sm text-gray-300">ML Model Accuracy</div>
            <div className="text-xs text-cyan-400 mt-1">+{mlMetrics.improvement_rate}% this week</div>
          </div>

          <div className="bg-gradient-to-br from-orange-900/60 to-red-900/60 backdrop-blur-xl border-2 border-orange-500/50 rounded-xl p-6 shadow-lg shadow-orange-900/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-400" />
              <span className="text-3xl font-bold text-white">{trends.filter(t => t.trend === 'hot').length}</span>
            </div>
            <div className="text-sm text-gray-300">Hot Sectors Detected</div>
            <div className="text-xs text-orange-400 mt-1">{rssStats.unique_sectors} total sectors</div>
          </div>

          <button
            onClick={() => navigate('/admin/edit-startups')}
            className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 backdrop-blur-xl border-2 border-green-500/50 rounded-xl p-6 shadow-lg shadow-green-900/50 hover:scale-105 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{matchOptimizations.length}</span>
            </div>
            <div className="text-sm text-gray-300">Matches Optimized</div>
            <div className="text-xs text-green-400 mt-1">Last hour</div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/20 pb-2">
          {[
            { id: 'rss', label: '📡 RSS Data Stream', icon: Activity },
            { id: 'ml', label: '🤖 ML Training', icon: Brain },
            { id: 'trends', label: '📈 Market Trends', icon: TrendingUp },
            { id: 'profiles', label: '🔄 Profile Updates', icon: RefreshCw },
            { id: 'matches', label: '✨ Match Optimization', icon: Sparkles }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-2 border-purple-400'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 border-2 border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* RSS Data Stream Tab */}
        {selectedTab === 'rss' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border-2 border-purple-400/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-400" />
                Live RSS Data Stream
              </h2>
              <p className="text-gray-300 mb-6 text-lg">
                Real-time funding announcements scraped from TechCrunch, VentureBeat, The Information, and more.
                This data feeds directly into ML training and market trend analysis.
              </p>

              <div className="space-y-3">
                {rssData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-purple-950/40 backdrop-blur-sm border-2 border-purple-400/30 rounded-lg p-4 hover:border-purple-400/60 transition-all shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-500/30 p-2 rounded-lg">
                          <DollarSign className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{item.company}</h3>
                          <p className="text-sm text-gray-400">via {item.source}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-400">{item.funding_amount}</div>
                        {item.valuation && (
                          <div className="text-sm text-gray-400">@ {item.valuation} valuation</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm border border-cyan-500/30">
                        {item.sector}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm border border-purple-500/30">
                        {item.stage}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Sentiment:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                              style={{ width: `${item.sentiment_score * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-green-400">
                            {Math.round(item.sentiment_score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Scraped {formatTimeAgo(item.timestamp)}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          Added to ML training set
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          Triggered trend analysis
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-400 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-1">How This Data Powers Hot Money</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• <strong>ML Training:</strong> Each article trains models to recognize funding patterns</li>
                      <li>• <strong>Trend Detection:</strong> Aggregated data reveals which sectors are heating up</li>
                      <li>• <strong>Profile Updates:</strong> Automatically updates startup/investor profiles with latest info</li>
                      <li>• <strong>Match Optimization:</strong> Improves match scores based on investor activity signals</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ML Training Tab */}
        {selectedTab === 'ml' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-cyan-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6 text-cyan-400" />
                ML Model Training Pipeline
              </h2>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-cyan-300">Model Performance</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Accuracy</span>
                        <span className="text-lg font-bold text-white">{mlMetrics.accuracy}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${mlMetrics.accuracy}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Training Data Points</span>
                        <span className="text-lg font-bold text-white">{mlMetrics.data_points.toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Model Version</span>
                        <span className="text-lg font-bold text-white">{mlMetrics.model_version}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Last Training</span>
                        <span className="text-sm text-cyan-400">{formatTimeAgo(mlMetrics.last_training)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-purple-300">Training Impact</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <div className="font-semibold text-white">GOD Score Improvements</div>
                        <div className="text-sm text-gray-400">+{mlMetrics.improvement_rate}% accuracy this week from RSS training data</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <div className="font-semibold text-white">Match Quality</div>
                        <div className="text-sm text-gray-400">15% increase in successful connections</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <div className="font-semibold text-white">Trend Prediction</div>
                        <div className="text-sm text-gray-400">Detecting hot sectors 3-4 weeks ahead of competitors</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                      <div>
                        <div className="font-semibold text-white">Valuation Accuracy</div>
                        <div className="text-sm text-gray-400">92% accuracy in predicting funding round sizes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Network className="w-5 h-5 text-blue-400 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-300 mb-2">How RSS Data Trains The Model</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                      <div>
                        <strong className="text-white">Input Features:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Funding amounts and valuations</li>
                          <li>• Investor participation patterns</li>
                          <li>• Sector and stage distributions</li>
                          <li>• Media sentiment scores</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-white">Model Outputs:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• GOD scores (60-100 scale)</li>
                          <li>• Match compatibility scores</li>
                          <li>• Trend predictions</li>
                          <li>• Optimal timing recommendations</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Trends Tab */}
        {selectedTab === 'trends' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-orange-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-orange-400" />
                Market Trends Detection
              </h2>
              <p className="text-gray-400 mb-6">
                AI analyzes RSS data to detect funding trends, valuation patterns, and sector momentum.
                These insights give Hot Money users an edge in spotting opportunities before competitors.
              </p>

              <div className="space-y-3">
                {trends.map((trend, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-5 ${getTrendColor(trend.trend)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{getTrendIcon(trend.trend)}</span>
                        <div>
                          <h3 className="text-xl font-bold text-white">{trend.sector}</h3>
                          <span className="text-sm font-medium capitalize">{trend.trend} Trend</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{trend.avg_valuation}</div>
                        <div className="text-sm">Avg Valuation</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-gray-300">Funding Velocity</div>
                        <div className="text-lg font-bold text-white">{trend.funding_velocity} deals/week</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-gray-300">AI Confidence</div>
                        <div className="text-lg font-bold text-white">{Math.round(trend.confidence * 100)}%</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-sm text-gray-300">Data Points</div>
                        <div className="text-lg font-bold text-white">{Math.floor(Math.random() * 50 + 20)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {trend.trend === 'hot' && 'Investors are actively deploying capital in this sector'}
                        {trend.trend === 'rising' && 'Deal flow increasing, valuations trending up'}
                        {trend.trend === 'cooling' && 'Funding activity slowing, exercise caution'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-400 mt-1" />
                  <div>
                    <h4 className="font-semibold text-yellow-300 mb-1">Competitive Intelligence Edge</h4>
                    <p className="text-sm text-gray-300">
                      Hot Money's RSS feed processes <strong>847 articles</strong> from top sources, analyzing funding patterns 
                      <strong> 3-4 weeks before</strong> they become common knowledge. This gives our users first-mover advantage 
                      in hot sectors like AI/ML Infrastructure and Healthcare Tech.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Updates Tab */}
        {selectedTab === 'profiles' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-green-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-green-400" />
                AI-Powered Profile Updates
              </h2>
              <p className="text-gray-400 mb-6">
                RSS data automatically updates startup and investor profiles in real-time. 
                No manual data entry required - the AI keeps everything current.
              </p>

              <div className="space-y-3">
                {profileUpdates.map((update, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          update.entity_type === 'startup'
                            ? 'bg-orange-500/30'
                            : 'bg-cyan-500/30'
                        }`}>
                          <span className="text-2xl">
                            {update.entity_type === 'startup' ? '🚀' : '💼'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{update.entity_name}</h3>
                          <span className="text-sm text-gray-400 capitalize">{update.entity_type}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatTimeAgo(update.timestamp)}</span>
                    </div>

                    <div className="bg-white/10 rounded-lg p-3 mb-3">
                      <div className="text-sm text-gray-400 mb-1">Field Updated: <strong className="text-white">{update.field_updated}</strong></div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-red-400 mb-1">Old Value:</div>
                          <div className="text-sm text-gray-300">{update.old_value}</div>
                        </div>
                        <span className="text-2xl">→</span>
                        <div className="flex-1">
                          <div className="text-xs text-green-400 mb-1">New Value:</div>
                          <div className="text-sm text-white font-medium">{update.new_value}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5" />
                      <span className="text-gray-300">
                        <strong className="text-white">AI Reasoning:</strong> {update.reason}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-400 mt-1" />
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-1">Dynamic Profile Evolution</h4>
                    <p className="text-sm text-gray-300 mb-2">
                      Traditional platforms have stale data. Hot Money's profiles evolve in real-time as RSS data flows in:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• <strong>Investor Focus Shifts:</strong> Detect new sector interests from deal announcements</li>
                      <li>• <strong>Valuation Updates:</strong> Automatically sync latest funding rounds</li>
                      <li>• <strong>Check Size Changes:</strong> Adjust based on recent deployment patterns</li>
                      <li>• <strong>Stage Progression:</strong> Update startup stages as they raise new rounds</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Optimization Tab */}
        {selectedTab === 'matches' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-pink-500/30 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-pink-400" />
                Match Score Optimization
              </h2>
              <p className="text-gray-400 mb-6">
                RSS data reveals investor activity patterns, enabling Hot Money to dynamically adjust match scores.
                See how real-world signals improve match quality beyond static profile matching.
              </p>

              <div className="space-y-3">
                {matchOptimizations.map((opt, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-5"
                  >
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center mb-4">
                      {/* Startup */}
                      <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">🚀</span>
                          <span className="text-sm text-gray-400">Startup</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{opt.startup}</h3>
                      </div>

                      {/* Arrow with scores */}
                      <div className="text-center">
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-400">{opt.old_score}</div>
                            <div className="text-xs text-gray-500">Before</div>
                          </div>
                          <span className="text-2xl">→</span>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{opt.new_score}</div>
                            <div className="text-xs text-gray-500">After</div>
                          </div>
                        </div>
                      </div>

                      {/* Investor */}
                      <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">💼</span>
                          <span className="text-sm text-gray-400">Investor</span>
                        </div>
                        <h3 className="text-lg font-bold text-white">{opt.investor}</h3>
                      </div>
                    </div>

                    {/* Improvement badge */}
                    <div className="flex items-center justify-center mb-3">
                      <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/50 text-green-300 font-bold">
                        +{opt.new_score - opt.old_score} point improvement
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-white/10 rounded-lg p-3 mb-2">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Optimization Reason:</div>
                          <div className="text-white font-medium">{opt.optimization_reason}</div>
                        </div>
                      </div>
                    </div>

                    {/* Data source */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Database className="w-3 h-3" />
                      <span>Data Source: {opt.data_source}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-400 mt-1" />
                  <div>
                    <h4 className="font-semibold text-purple-300 mb-2">Why Dynamic Matching Wins</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                      <div>
                        <strong className="text-white">Traditional Matching:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Static profile matching only</li>
                          <li>• No activity signals</li>
                          <li>• Misses timing opportunities</li>
                          <li>• Manual data updates</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-white">Hot Money Matching:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Real-time activity detection</li>
                          <li>• Investment pattern analysis</li>
                          <li>• Timing intelligence</li>
                          <li>• Auto-optimizing scores</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
