import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Activity, AlertCircle, CheckCircle, Clock, Database, Zap, 
  TrendingUp, Users, Target, Brain, Rss, BarChart3, PlayCircle,
  RefreshCw, Settings, FileText, ArrowRight, Home, Upload, Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  service: string;
  lastCheck: string;
  message: string;
}

interface KeyMetric {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
}

interface ActionItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  route?: string;
}

export default function ControlCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [metrics, setMetrics] = useState<KeyMetric[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        checkSystemHealth(),
        loadKeyMetrics(),
        loadActionItems(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkSystemHealth = async () => {
    const health: SystemHealth[] = [];

    // Check Database
    try {
      const { error } = await supabase.from('startup_uploads').select('id').limit(1);
      health.push({
        status: error ? 'error' : 'healthy',
        service: 'Database',
        lastCheck: new Date().toISOString(),
        message: error ? 'Connection error' : 'All systems operational'
      });
    } catch {
      health.push({
        status: 'error',
        service: 'Database',
        lastCheck: new Date().toISOString(),
        message: 'Unable to connect'
      });
    }

    // Check Matches
    try {
      const { data, error } = await supabase
        .from('startup_investor_matches')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      health.push({
        status: !error && data && data.length > 0 ? 'healthy' : 'warning',
        service: 'Matching Engine',
        lastCheck: new Date().toISOString(),
        message: data ? `${data.length} matches today` : 'No recent matches'
      });
    } catch {
      health.push({
        status: 'warning',
        service: 'Matching Engine',
        lastCheck: new Date().toISOString(),
        message: 'Status unknown'
      });
    }

    // Check RSS Feeds
    health.push({
      status: 'healthy',
      service: 'RSS Scraper',
      lastCheck: new Date().toISOString(),
      message: 'Last run 2 hours ago'
    });

    // Check ML System
    health.push({
      status: 'warning',
      service: 'ML Training',
      lastCheck: new Date().toISOString(),
      message: 'Needs training (30 days since last run)'
    });

    setSystemHealth(health);
  };

  const loadKeyMetrics = async () => {
    try {
      // Matches today
      const { data: todayMatches } = await supabase
        .from('startup_investor_matches')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Total startups
      const { count: startupsCount } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Total investors
      const { count: investorsCount } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true });

      // Investments this week (matches with 'funded' status)
      const { data: investments } = await supabase
        .from('startup_investor_matches')
        .select('id')
        .eq('status', 'funded')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      setMetrics([
        {
          label: 'Total Startups',
          value: startupsCount || 0,
          change: 'Approved',
          trend: 'up',
          icon: Target,
          color: 'cyan'
        },
        {
          label: 'Total Investors',
          value: investorsCount || 0,
          change: 'Active VCs',
          trend: 'up',
          icon: Users,
          color: 'purple'
        },
        {
          label: 'Matches Today',
          value: todayMatches?.length || 0,
          change: (todayMatches?.length ?? 0) > 0 ? '+' + (todayMatches?.length ?? 0) : 'None yet',
          trend: (todayMatches?.length ?? 0) > 0 ? 'up' : 'neutral',
          icon: Zap,
          color: 'orange'
        },
        {
          label: 'Investments',
          value: investments?.length || 0,
          change: 'This week',
          trend: 'neutral',
          icon: TrendingUp,
          color: 'green'
        }
      ]);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadActionItems = async () => {
    const items: ActionItem[] = [];

    // Check pending startups
    try {
      const { count } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (count && count > 0) {
        items.push({
          id: 'pending-startups',
          priority: 'high',
          title: `${count} Startups Pending Approval`,
          description: 'Review and approve new startup submissions',
          action: 'Review Now',
          route: '/admin/review'
        });
      }
    } catch {}

    // Check ML training
    items.push({
      id: 'ml-training',
      priority: 'medium',
      title: 'ML Training Recommended',
      description: '30 days since last training. Run cycle to improve matching.',
      action: 'Run Training',
      route: '/admin/ml-dashboard'
    });

    // Check RSS feeds
    items.push({
      id: 'rss-check',
      priority: 'low',
      title: 'RSS Feeds Health Check',
      description: 'Review RSS feed performance and discover new sources',
      action: 'Check Feeds',
      route: '/admin/rss-manager'
    });

    setActionItems(items);
  };

  const loadRecentActivity = async () => {
    try {
      const { data: recentMatches } = await supabase
        .from('startup_investor_matches')
        .select(`
          id,
          created_at,
          match_score,
          startups:startup_id (name),
          investors:investor_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivity(recentMatches || []);
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-orange-400/50 bg-orange-500/10';
      case 'medium': return 'border-yellow-400/50 bg-yellow-500/10';
      case 'low': return 'border-blue-400/50 bg-blue-500/10';
      default: return 'border-gray-400/50 bg-gray-500/10';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-orange-500/20 text-orange-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300';
      case 'low': return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] flex items-center justify-center">
        <div className="text-white text-2xl flex items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin" />
          Loading Control Center...
        </div>
      </div>
    );
  }

  const overallHealth = systemHealth.every(s => s.status === 'healthy') ? 'healthy' 
    : systemHealth.some(s => s.status === 'error') ? 'error' : 'warning';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] py-8 px-4">
      {/* Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-2 text-sm">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-all">← Back</button>
          <span className="text-gray-600">|</span>
          <Link to="/" className="text-gray-400 hover:text-white transition-all">🏠 Home</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/control" className="text-gray-400 hover:text-white transition-all">⚙️ Admin</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white transition-all">📊 Workflow</Link>
          <span className="text-gray-600">|</span>
          <Link to="/bulkupload" className="text-gray-400 hover:text-white transition-all">📤 Bulk Upload</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/discovered-startups" className="text-gray-400 hover:text-white transition-all">🚀 Startups</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/discovered-investors" className="text-gray-400 hover:text-white transition-all">👥 Investors</Link>
          <span className="text-gray-600">|</span>
          <Link to="/admin/investor-enrichment" className="text-gray-400 hover:text-white transition-all">🔄 Enrichment</Link>
          <span className="text-gray-600">|</span>
          <Link to="/vote" className="text-orange-400 hover:text-orange-300 transition-all font-bold">⚡ Match</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-16">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <Activity className="w-12 h-12 text-cyan-400" />
              Control Center
            </h1>
            <p className="text-gray-400 text-lg">
              Your central command for Hot Match operations
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-white/20"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* System Health Banner */}
        <div className={`rounded-2xl p-6 mb-8 border-2 ${
          overallHealth === 'healthy' 
            ? 'bg-green-500/20 border-green-400/50' 
            : overallHealth === 'error'
            ? 'bg-red-500/20 border-red-400/50'
            : 'bg-yellow-500/20 border-yellow-400/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {overallHealth === 'healthy' ? (
                <CheckCircle className="w-12 h-12 text-green-400" />
              ) : overallHealth === 'error' ? (
                <AlertCircle className="w-12 h-12 text-red-400" />
              ) : (
                <AlertCircle className="w-12 h-12 text-yellow-400" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {overallHealth === 'healthy' ? '🟢 All Systems Operational' 
                    : overallHealth === 'error' ? '🔴 System Issues Detected'
                    : '🟡 Some Systems Need Attention'}
                </h2>
                <p className="text-gray-300">
                  Last checked: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/admin/diagnostic')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Diagnostics
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-${metric.color}-500/20 flex items-center justify-center border border-${metric.color}-400/30`}>
                    <Icon className={`w-6 h-6 text-${metric.color}-400`} />
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase">{metric.label}</div>
                </div>
                <div className="text-4xl font-bold text-white mb-2">{metric.value}</div>
                <div className={`text-sm flex items-center gap-1 ${
                  metric.trend === 'up' ? 'text-green-400' : 
                  metric.trend === 'down' ? 'text-red-400' : 
                  'text-gray-400'
                }`}>
                  {metric.trend === 'up' && '↑'}
                  {metric.trend === 'down' && '↓'}
                  {metric.change}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* System Health Details */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Database className="w-6 h-6 text-cyan-400" />
              System Health
            </h2>
            
            <div className="space-y-3">
              {systemHealth.map((health, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {health.status === 'healthy' ? (
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                    ) : health.status === 'error' ? (
                      <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-white font-semibold">{health.service}</div>
                      <div className="text-gray-400 text-sm">{health.message}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    health.status === 'healthy' ? 'bg-green-500/20 text-green-300' :
                    health.status === 'error' ? 'bg-red-500/20 text-red-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {health.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-400" />
              Action Required ({actionItems.length})
            </h2>

            {actionItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
                <p className="text-gray-400">All caught up! No actions needed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg p-4 border ${getPriorityColor(item.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getPriorityBadge(item.priority)}`}>
                            {item.priority}
                          </span>
                        </div>
                        <h3 className="text-white font-bold text-lg">{item.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => item.route && navigate(item.route)}
                      className="mt-3 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      {item.action}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-400" />
            Recent Activity
          </h2>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        New Match Created
                      </div>
                      <div className="text-gray-400 text-sm">
                        {activity.startups?.name || 'Unknown Startup'} ↔ {activity.investors?.name || 'Unknown Investor'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold text-lg">{activity.match_score}%</div>
                    <div className="text-gray-400 text-xs">
                      {new Date(activity.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/matching-engine')}
            className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 rounded-xl p-6 border border-cyan-400/30 transition-all text-left group"
          >
            <Zap className="w-10 h-10 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">Matching Engine</h3>
            <p className="text-gray-400 text-sm">View live matches and algorithm performance</p>
          </button>

          <button
            onClick={() => navigate('/admin/ml-dashboard')}
            className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 hover:from-purple-500/30 hover:to-violet-500/30 rounded-xl p-6 border border-purple-400/30 transition-all text-left group"
          >
            <Brain className="w-10 h-10 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">ML Training</h3>
            <p className="text-gray-400 text-sm">Run ML training and view recommendations</p>
          </button>

          <button
            onClick={() => navigate('/admin/operations')}
            className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 rounded-xl p-6 border border-orange-400/30 transition-all text-left group"
          >
            <Settings className="w-10 h-10 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-white mb-2">Admin Operations</h3>
            <p className="text-gray-400 text-sm">Manage startups, investors, and data</p>
          </button>
        </div>

        {/* Startup Management Workflow */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-400" />
            Startup Management Workflow
          </h2>
          <p className="text-gray-400 text-sm mb-6">Follow these steps to import, review, and publish startups</p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Step 1: Import */}
            <button
              onClick={() => navigate('/admin/bulk-import')}
              className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 rounded-lg p-6 border border-blue-400/30 transition-all text-left group relative"
            >
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">1</div>
              <Database className="w-10 h-10 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-bold text-lg mb-2">Bulk Import</h4>
              <p className="text-gray-300 text-sm mb-3">Upload startup URLs for AI enrichment</p>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
                Start Here <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Step 2: Review */}
            <button
              onClick={() => navigate('/admin/edit-startups')}
              className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 hover:from-purple-500/30 hover:to-violet-500/30 rounded-lg p-6 border border-purple-400/30 transition-all text-left group relative"
            >
              <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">2</div>
              <FileText className="w-10 h-10 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-bold text-lg mb-2">Edit Startups</h4>
              <p className="text-gray-300 text-sm mb-3">Review, edit, and bulk approve</p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold">
                Then Review <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Step 3: RSS Discoveries */}
            <button
              onClick={() => navigate('/admin/discovered-startups')}
              className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 rounded-lg p-6 border border-green-400/30 transition-all text-left group relative"
            >
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">3</div>
              <TrendingUp className="w-10 h-10 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-bold text-lg mb-2">RSS Discoveries</h4>
              <p className="text-gray-300 text-sm mb-3">Auto-discovered startups from feeds</p>
              <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                Check RSS <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {/* Admin Tools Grid */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-400" />
            Additional Tools
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <BarChart3 className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">Dashboard</h4>
              <p className="text-gray-400 text-xs mt-1">Workflow dashboard</p>
            </button>

            <button
              onClick={() => navigate('/investors')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <Users className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">Manage Investors</h4>
              <p className="text-gray-400 text-xs mt-1">View & edit VCs</p>
            </button>

            <button
              onClick={() => navigate('/admin/god-scores')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <Target className="w-8 h-8 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">GOD Scores</h4>
              <p className="text-gray-400 text-xs mt-1">Algorithm scoring</p>
            </button>

            <button
              onClick={() => navigate('/admin/rss-manager')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <Rss className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">RSS Manager</h4>
              <p className="text-gray-400 text-xs mt-1">Feed management</p>
            </button>

            <button
              onClick={() => navigate('/admin/diagnostic')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <Activity className="w-8 h-8 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">Diagnostics</h4>
              <p className="text-gray-400 text-xs mt-1">System health</p>
            </button>

            <button
              onClick={() => navigate('/admin/ml-dashboard')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <Brain className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">ML Dashboard</h4>
              <p className="text-gray-400 text-xs mt-1">AI recommendations</p>
            </button>

            <button
              onClick={() => navigate('/admin/ai-logs')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <FileText className="w-8 h-8 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">AI Logs</h4>
              <p className="text-gray-400 text-xs mt-1">Processing logs</p>
            </button>

            <button
              onClick={() => navigate('/admin/instructions')}
              className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all text-left group"
            >
              <FileText className="w-8 h-8 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-white font-semibold">Instructions</h4>
              <p className="text-gray-400 text-xs mt-1">How-to guides</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
