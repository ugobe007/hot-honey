import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity, Database, Brain, Zap, Users, Building2 } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'OK' | 'WARN' | 'ERROR' | 'LOADING';
  value?: string | number;
  issues?: string[];
}

interface SystemStats {
  startups: { total: number; approved: number; pending: number; avgScore: number };
  investors: { total: number; withEmbedding: number };
  matches: { total: number; highQuality: number; avgScore: number };
  scrapers: { discovered24h: number; lastActivity: string };
  godScores: { avgScore: number; distribution: { low: number; medium: number; high: number; elite: number } };
}

export default function SystemHealthDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  console.log('[SystemHealthDashboard] Component rendered, loading:', loading, 'error:', error);

  const loadSystemHealth = async () => {
    console.log('[SystemHealthDashboard] Starting loadSystemHealth');
    setRefreshing(true);
    setError(null);
    
    try {
      // Get startup stats
      const { count: totalStartups } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true });
      
      const { count: approvedStartups } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      const { count: pendingStartups } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { data: avgScoreData } = await supabase
        .from('startup_uploads')
        .select('total_god_score')
        .eq('status', 'approved')
        .not('total_god_score', 'is', null);
      
      const avgGodScore = avgScoreData && avgScoreData.length > 0
        ? avgScoreData.reduce((acc, s) => acc + (s.total_god_score || 0), 0) / avgScoreData.length
        : 0;
      
      // Get investor stats
      const { count: totalInvestors } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true });
      
      const { count: investorsWithEmbedding } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);
      
      // Get match stats
      const { count: totalMatches } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true });
      
      const { count: highQualityMatches } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true })
        .gte('match_score', 70);
      
      const { data: matchAvgData } = await supabase
        .from('startup_investor_matches')
        .select('match_score')
        .limit(1000);
      
      const avgMatchScore = matchAvgData && matchAvgData.length > 0
        ? matchAvgData.reduce((acc, m) => acc + (m.match_score || 0), 0) / matchAvgData.length
        : 0;
      
      // Get recent discoveries
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: discovered24h } = await supabase
        .from('discovered_startups')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);
      
      // Get last activity
      const { data: lastActivity } = await supabase
        .from('startup_uploads')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Get GOD score distribution
      const { data: scoreDistribution } = await supabase
        .from('startup_uploads')
        .select('total_god_score')
        .eq('status', 'approved')
        .not('total_god_score', 'is', null);
      
      const distribution = { low: 0, medium: 0, high: 0, elite: 0 };
      if (scoreDistribution) {
        scoreDistribution.forEach(s => {
          const score = s.total_god_score || 0;
          if (score < 50) distribution.low++;
          else if (score < 70) distribution.medium++;
          else if (score < 85) distribution.high++;
          else distribution.elite++;
        });
      }
      
      // Get recent guardian logs
      const { data: guardianLogs } = await (supabase as any)
        .from('ai_logs')
        .select('*')
        .eq('type', 'guardian')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentLogs(guardianLogs || []);
      
      // Set stats
      setStats({
        startups: {
          total: totalStartups || 0,
          approved: approvedStartups || 0,
          pending: pendingStartups || 0,
          avgScore: avgGodScore
        },
        investors: {
          total: totalInvestors || 0,
          withEmbedding: investorsWithEmbedding || 0
        },
        matches: {
          total: totalMatches || 0,
          highQuality: highQualityMatches || 0,
          avgScore: avgMatchScore
        },
        scrapers: {
          discovered24h: discovered24h || 0,
          lastActivity: lastActivity?.created_at || 'Never'
        },
        godScores: {
          avgScore: avgGodScore,
          distribution
        }
      });
      
      // Generate health checks
      const newChecks: HealthCheck[] = [];
      
      // Check 1: Startup Pipeline
      const startupHealth = (approvedStartups || 0) > 100 ? 'OK' : (approvedStartups || 0) > 50 ? 'WARN' : 'ERROR';
      newChecks.push({
        name: 'Startup Pipeline',
        status: startupHealth,
        value: `${approvedStartups} approved, ${pendingStartups} pending`,
        issues: startupHealth === 'ERROR' ? ['Low startup count'] : []
      });
      
      // Check 2: Match Quality
      const matchQuality = (totalMatches || 0) > 5000 ? 'OK' : (totalMatches || 0) > 1000 ? 'WARN' : 'ERROR';
      newChecks.push({
        name: 'Match Quality',
        status: matchQuality,
        value: `${totalMatches?.toLocaleString()} matches, avg ${avgMatchScore.toFixed(0)}`,
        issues: matchQuality === 'ERROR' ? ['Match count too low'] : []
      });
      
      // Check 3: GOD Score Health
      const scoreHealth = avgGodScore >= 35 && avgGodScore <= 75 ? 'OK' : 'WARN';
      newChecks.push({
        name: 'GOD Score Health',
        status: scoreHealth,
        value: `Avg: ${avgGodScore.toFixed(1)}, Elite: ${distribution.elite}`,
        issues: scoreHealth === 'WARN' ? ['Score distribution may be skewed'] : []
      });
      
      // Check 4: Data Freshness
      const hoursSinceActivity = lastActivity?.created_at 
        ? (Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60)
        : 999;
      const freshnessHealth = hoursSinceActivity < 24 ? 'OK' : hoursSinceActivity < 48 ? 'WARN' : 'ERROR';
      newChecks.push({
        name: 'Data Freshness',
        status: freshnessHealth,
        value: `Last: ${hoursSinceActivity.toFixed(0)}h ago, 24h: ${discovered24h}`,
        issues: freshnessHealth !== 'OK' ? ['Data may be stale'] : []
      });
      
      // Check 5: ML Pipeline
      const mlHealth = (investorsWithEmbedding || 0) / (totalInvestors || 1) > 0.3 ? 'OK' : 'WARN';
      newChecks.push({
        name: 'ML Pipeline',
        status: mlHealth,
        value: `${((investorsWithEmbedding || 0) / (totalInvestors || 1) * 100).toFixed(0)}% embedded`,
        issues: mlHealth === 'WARN' ? ['Low embedding coverage'] : []
      });
      
      setChecks(newChecks);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Failed to load health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'OK': return <CheckCircle className="text-green-500" size={20} />;
      case 'WARN': return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'ERROR': return <XCircle className="text-red-500" size={20} />;
      default: return <Activity className="text-gray-500 animate-pulse" size={20} />;
    }
  };

  const overallStatus = checks.some(c => c.status === 'ERROR') ? 'ERROR' :
                       checks.some(c => c.status === 'WARN') ? 'WARN' : 'OK';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="animate-spin" />
          Loading system health...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-white text-xl mb-2">Failed to load health data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={loadSystemHealth}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🛡️ System Health Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time monitoring of all Hot Match systems
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Updated: {lastUpdated?.toLocaleTimeString()}
          </span>
          <button
            onClick={loadSystemHealth}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`mb-8 p-4 rounded-xl ${
        overallStatus === 'OK' ? 'bg-green-900/30 border border-green-500/30' :
        overallStatus === 'WARN' ? 'bg-yellow-900/30 border border-yellow-500/30' :
        'bg-red-900/30 border border-red-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <StatusIcon status={overallStatus} />
          <span className="text-xl font-semibold">
            System Status: {overallStatus === 'OK' ? 'All Systems Operational' :
                          overallStatus === 'WARN' ? 'Some Issues Detected' :
                          'Critical Issues Require Attention'}
          </span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Building2 size={18} />
            <span>Startups</span>
          </div>
          <div className="text-2xl font-bold">{stats?.startups.approved.toLocaleString()}</div>
          <div className="text-sm text-gray-500">
            {stats?.startups.pending} pending review
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Users size={18} />
            <span>Investors</span>
          </div>
          <div className="text-2xl font-bold">{stats?.investors.total.toLocaleString()}</div>
          <div className="text-sm text-gray-500">
            {((stats?.investors.withEmbedding || 0) / (stats?.investors.total || 1) * 100).toFixed(0)}% with ML
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Zap size={18} />
            <span>Matches</span>
          </div>
          <div className="text-2xl font-bold">{stats?.matches.total.toLocaleString()}</div>
          <div className="text-sm text-gray-500">
            {stats?.matches.highQuality.toLocaleString()} high quality
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Brain size={18} />
            <span>Avg GOD Score</span>
          </div>
          <div className="text-2xl font-bold">{stats?.godScores.avgScore.toFixed(1)}</div>
          <div className="text-sm text-gray-500">
            {stats?.godScores.distribution.elite} elite startups
          </div>
        </div>
      </div>

      {/* Health Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {checks.map((check, i) => (
          <div key={i} className={`bg-gray-800 rounded-xl p-4 border-l-4 ${
            check.status === 'OK' ? 'border-green-500' :
            check.status === 'WARN' ? 'border-yellow-500' :
            'border-red-500'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{check.name}</span>
              <StatusIcon status={check.status} />
            </div>
            <div className="text-gray-400 text-sm">{check.value}</div>
            {check.issues && check.issues.length > 0 && (
              <div className="mt-2 text-xs text-red-400">
                {check.issues.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* GOD Score Distribution */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">GOD Score Distribution</h3>
        <div className="flex items-end gap-2 h-32">
          {[
            { label: 'Low (<50)', value: stats?.godScores.distribution.low || 0, color: 'bg-red-500' },
            { label: 'Medium (50-70)', value: stats?.godScores.distribution.medium || 0, color: 'bg-yellow-500' },
            { label: 'High (70-85)', value: stats?.godScores.distribution.high || 0, color: 'bg-green-500' },
            { label: 'Elite (85+)', value: stats?.godScores.distribution.elite || 0, color: 'bg-purple-500' },
          ].map((bar, i) => {
            const maxVal = Math.max(
              stats?.godScores.distribution.low || 0,
              stats?.godScores.distribution.medium || 0,
              stats?.godScores.distribution.high || 0,
              stats?.godScores.distribution.elite || 0,
              1
            );
            const height = (bar.value / maxVal) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="text-sm text-gray-400 mb-1">{bar.value}</div>
                <div 
                  className={`w-full ${bar.color} rounded-t transition-all duration-500`}
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
                <div className="text-xs text-gray-500 mt-2 text-center">{bar.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Guardian Reports */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent System Guardian Reports</h3>
        {recentLogs.length === 0 ? (
          <p className="text-gray-500">No recent guardian reports</p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={log.output?.overall || 'OK'} />
                  <span className="text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  log.status === 'success' ? 'bg-green-900/50 text-green-400' :
                  log.status === 'warning' ? 'bg-yellow-900/50 text-yellow-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {log.output?.checks?.filter((c: any) => c.status !== 'OK').length || 0} issues
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4">
        <button 
          onClick={() => window.open('/admin/review', '_self')}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
        >
          Review Queue ({stats?.startups.pending})
        </button>
        <button 
          onClick={() => window.open('/admin/god-scores', '_self')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
        >
          GOD Scores
        </button>
        <button 
          onClick={() => window.open('/admin/rss-manager', '_self')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          RSS Sources
        </button>
        <button 
          onClick={() => {
            fetch('/api/run-guardian').catch(() => {});
            alert('Guardian check triggered!');
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
        >
          Run Guardian Check
        </button>
      </div>
    </div>
  );
}
