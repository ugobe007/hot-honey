/**
 * src/components/admin/AgentDashboard.tsx
 * 
 * Main dashboard for monitoring AI Agent and Watchdog activity
 * Connected to GOD Scoring, Matching Engine, and ML systems
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getSystemStatus,
  getAgentLogs,
  getDailyReports,
  type SystemStatus as SystemStatusType,
  type ServiceStatus as ServiceStatusType,
  type AgentLog,
  type DailyReport
} from '../../services/systemStatus';
import {
  Brain,
  Activity,
  AlertTriangle,
  TrendingUp,
  Zap,
  RefreshCw,
  Shield,
  Bell,
  Users,
  Briefcase,
  Circle,
  PlayCircle,
  PauseCircle,
  Target,
  BarChart3,
  FileText,
  ArrowLeft,
  Home,
  Settings
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AgentReport {
  id: string;
  timestamp: string;
  patterns_detected: any[];
  decisions: any[];
  actions_applied: string[];
  escalations: string[];
}

interface WatchdogReport {
  id: string;
  timestamp: string;
  overall_status: 'healthy' | 'warning' | 'critical';
  checks: {
    name: string;
    status: string;
    message: string;
    details?: any;
  }[];
  fixes: string[];
}

interface LocalServiceStatus {
  name: string;
  status: 'online' | 'stopped' | 'error';
  lastRun?: string;
  nextRun?: string;
  message?: string;
}

// Helper to map service status
function mapStatus(status: 'running' | 'stopped' | 'error' | 'unknown'): 'online' | 'stopped' | 'error' {
  if (status === 'running') return 'online';
  if (status === 'stopped' || status === 'unknown') return 'stopped';
  return 'error';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  const [agentReports, setAgentReports] = useState<AgentReport[]>([]);
  const [watchdogReports, setWatchdogReports] = useState<WatchdogReport[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'agent' | 'watchdog' | 'history' | 'reports'>('overview');

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      // Load real system status from our new service
      const status = await getSystemStatus();
      setSystemStatus(status);

      // Load agent logs
      const agentLogs = await getAgentLogs(50);
      
      // Load daily reports
      const reports = await getDailyReports(7);
      setDailyReports(reports);

      // Load from ai_logs table for detailed reports
      const [agentRes, watchdogRes] = await Promise.all([
        (supabase.from as any)('ai_logs')
          .select('*')
          .eq('type', 'agent_report')
          .order('created_at', { ascending: false })
          .limit(50),
        (supabase.from as any)('ai_logs')
          .select('*')
          .eq('type', 'watchdog')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      // Transform ai_logs to expected format
      const agentData = ((agentRes.data || []) as any[]).map((log: any) => ({
        id: log.id,
        timestamp: log.created_at || new Date().toISOString(),
        patterns_detected: log.input?.patterns || [],
        decisions: log.output?.decisions || [],
        actions_applied: log.output?.actions_applied || [],
        escalations: log.output?.escalations || []
      }));

      const watchdogData = ((watchdogRes.data || []) as any[]).map((log: any) => ({
        id: log.id,
        timestamp: log.created_at || new Date().toISOString(),
        overall_status: log.output?.status || 'healthy',
        checks: log.output?.checks ? Object.entries(log.output.checks).map(([name, value]: [string, any]) => ({
          name,
          status: typeof value === 'object' ? (value.active !== false ? 'healthy' : 'warning') : 'healthy',
          message: typeof value === 'object' ? JSON.stringify(value) : String(value)
        })) : [],
        fixes: log.output?.actions_taken || []
      }));

      setAgentReports(agentData);
      setWatchdogReports(watchdogData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }

    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Calculate stats
  const latestWatchdog = watchdogReports[0];
  const latestAgent = agentReports[0];
  
  const totalFixes = agentReports.reduce((sum, r) => sum + (r.actions_applied?.length || 0), 0);
  const totalEscalations = agentReports.reduce((sum, r) => sum + (r.escalations?.length || 0), 0);
  const totalPatterns = agentReports.reduce((sum, r) => sum + (r.patterns_detected?.length || 0), 0);
  const totalDecisions = agentReports.reduce((sum, r) => sum + (r.decisions?.length || 0), 0);

  const healthyChecks = watchdogReports.filter(r => r.overall_status === 'healthy').length;
  const warningChecks = watchdogReports.filter(r => r.overall_status === 'warning').length;
  const criticalChecks = watchdogReports.filter(r => r.overall_status === 'critical').length;

  // Use real system status
  const overallHealth = systemStatus?.overall || 'unknown';
  const metrics = systemStatus?.metrics;

  // Map real service statuses from systemStatus
  const services: LocalServiceStatus[] = systemStatus ? [
    { 
      name: 'AI Agent', 
      status: mapStatus(systemStatus.services.aiAgent.status), 
      lastRun: systemStatus.services.aiAgent.lastRun || undefined, 
      nextRun: 'Every 15 min',
      message: systemStatus.services.aiAgent.message
    },
    { 
      name: 'Watchdog', 
      status: mapStatus(systemStatus.services.watchdog.status), 
      lastRun: systemStatus.services.watchdog.lastRun || undefined, 
      nextRun: 'Every 5 min',
      message: systemStatus.services.watchdog.message
    },
    { 
      name: 'GOD Scoring', 
      status: mapStatus(systemStatus.services.godScoring.status), 
      lastRun: systemStatus.services.godScoring.lastRun || undefined,
      message: systemStatus.services.godScoring.message
    },
    { 
      name: 'Matching Engine', 
      status: mapStatus(systemStatus.services.matchingEngine.status), 
      lastRun: systemStatus.services.matchingEngine.lastRun || undefined,
      message: systemStatus.services.matchingEngine.message
    },
    { 
      name: 'RSS Scraper', 
      status: mapStatus(systemStatus.services.scraper.status), 
      lastRun: systemStatus.services.scraper.lastRun || undefined, 
      nextRun: 'Continuous',
      message: systemStatus.services.scraper.message
    },
    { 
      name: 'Investor Enrichment', 
      status: mapStatus(systemStatus.services.investorEnrichment.status), 
      lastRun: systemStatus.services.investorEnrichment.lastRun || undefined, 
      nextRun: 'Every hour',
      message: systemStatus.services.investorEnrichment.message
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-2 text-sm">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-gray-600">|</span>
          <Link 
            to="/" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/admin/control" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Control Center</span>
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/admin/analytics" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/admin/edit-startups" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>Startups</span>
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/admin/discovered-investors" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Investors</span>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="bg-gray-900/80 border-b border-white/10 px-6 py-4 sticky top-[49px] z-40 backdrop-blur-xl mt-[49px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hot Match Command Center</h1>
              <p className="text-sm text-gray-400">AI Agent & System Monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {autoRefresh ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>

            {/* Last refresh */}
            <div className="text-sm text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </div>

            {/* Manual refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {(['overview', 'agent', 'watchdog', 'reports', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTab === tab
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6">
        {/* System Status Banner */}
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between ${
          overallHealth === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
          overallHealth === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
          overallHealth === 'critical' ? 'bg-red-500/10 border-red-500/30' :
          'bg-gray-500/10 border-gray-500/30'
        }`}>
          <div className="flex items-center gap-4">
            <Shield className={`w-10 h-10 ${
              overallHealth === 'healthy' ? 'text-green-500' :
              overallHealth === 'warning' ? 'text-yellow-500' :
              overallHealth === 'critical' ? 'text-red-500' :
              'text-gray-500'
            }`} />
            <div>
              <h2 className="text-lg font-bold">
                System Status: {overallHealth.toUpperCase()}
              </h2>
              <p className="text-sm text-gray-400">
                Last update: {systemStatus?.lastUpdated ? new Date(systemStatus.lastUpdated).toLocaleString() : 'Loading...'}
              </p>
              {systemStatus?.issues && systemStatus.issues.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-yellow-400">{systemStatus.issues.length} issue(s) need attention</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{metrics?.avgGODScore || 0}</div>
              <div className="text-xs text-gray-500">Avg GOD Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{metrics?.newStartupsToday || 0}</div>
              <div className="text-xs text-gray-500">New Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{metrics?.newMatchesToday || 0}</div>
              <div className="text-xs text-gray-500">Matches Today</div>
            </div>
          </div>
        </div>

        {selectedTab === 'overview' && (
          <>
            {/* Stats Grid - All Clickable to Source */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <StatCard icon={Briefcase} label="Total Startups" value={metrics?.totalStartups || 0} color="from-purple-500 to-indigo-500" link="/admin/edit-startups" />
              <StatCard icon={Users} label="Total Investors" value={metrics?.totalInvestors || 0} color="from-cyan-500 to-blue-500" link="/investors" />
              <StatCard icon={TrendingUp} label="Total Matches" value={metrics?.totalMatches?.toLocaleString() || '0'} color="from-green-500 to-emerald-500" link="/matching" />
              <StatCard icon={Target} label="Avg GOD Score" value={metrics?.avgGODScore || 0} color="from-orange-500 to-amber-500" link="/admin/god-scores" />
              <StatCard icon={Zap} label="Auto-Fixes" value={totalFixes} color="from-pink-500 to-rose-500" />
              <StatCard icon={AlertTriangle} label="Escalations" value={totalEscalations} color="from-red-500 to-orange-500" />
            </div>

            {/* Today's Activity - All Clickable to Source */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <a href="/admin/edit-startups" className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30 hover:border-green-500/50 hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">New Startups Today</span>
                  <Briefcase className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-green-400">{metrics?.newStartupsToday || 0}</div>
              </a>
              <a href="/investors" className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-4 border border-blue-500/30 hover:border-blue-500/50 hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">New Investors Today</span>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-blue-400">{metrics?.newInvestorsToday || 0}</div>
              </a>
              <a href="/matching" className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30 hover:border-purple-500/50 hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">New Matches Today</span>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-purple-400">{metrics?.newMatchesToday || 0}</div>
              </a>
            </div>

            {/* Services Status */}
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Service Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {services.map(service => (
                <ServiceCard key={service.name} service={service} />
              ))}
            </div>
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latest Health Checks */}
              <div className="bg-gray-900/80 rounded-2xl border border-cyan-500/30 p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Latest Health Checks
                </h3>
                <div className="space-y-2">
                  {latestWatchdog?.checks?.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <Circle className={`w-3 h-3 ${
                          check.status === 'healthy' ? 'text-green-500 fill-green-500' :
                          check.status === 'warning' ? 'text-yellow-500 fill-yellow-500' :
                          'text-red-500 fill-red-500'
                        }`} />
                        <span className="text-sm">{check.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 max-w-[200px] truncate">{check.message}</span>
                    </div>
                  )) || <p className="text-gray-500 text-center py-4">No health checks yet</p>}
                </div>
              </div>

              {/* Recent AI Actions */}
              <div className="bg-gray-900/80 rounded-2xl border border-purple-500/30 p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Recent AI Actions
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {agentReports.slice(0, 5).flatMap(report =>
                    (report.actions_applied || []).map((action, idx) => (
                      <div key={`${report.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10">
                        <Zap className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm flex-1">{action}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(report.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                  {totalFixes === 0 && <p className="text-gray-500 text-center py-4">No auto-fixes applied yet</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {selectedTab === 'agent' && (
          <AgentTab reports={agentReports} />
        )}

        {selectedTab === 'watchdog' && (
          <WatchdogTab reports={watchdogReports} />
        )}

        {selectedTab === 'reports' && (
          <ReportsTab reports={dailyReports} issues={systemStatus?.issues || []} />
        )}

        {selectedTab === 'history' && (
          <HistoryTab agentReports={agentReports} watchdogReports={watchdogReports} />
        )}
      </main>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatCard: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-gray-900/80 rounded-xl p-4 border border-white/10">
    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

const ServiceCard: React.FC<{ service: LocalServiceStatus }> = ({ service }) => (
  <div className="bg-gray-900/80 rounded-xl p-4 border border-white/10">
    <div className="flex items-center justify-between mb-2">
      <span className="font-medium">{service.name}</span>
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        service.status === 'online' ? 'bg-green-500/20 text-green-400' :
        service.status === 'stopped' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-red-500/20 text-red-400'
      }`}>
        <Circle className={`w-2 h-2 ${
          service.status === 'online' ? 'fill-green-400' :
          service.status === 'stopped' ? 'fill-yellow-400' :
          'fill-red-400'
        }`} />
        {service.status}
      </span>
    </div>
    <div className="text-xs text-gray-500">
      {service.message && <div className="mb-1 text-gray-400">{service.message}</div>}
      {service.lastRun && <div>Last: {new Date(service.lastRun).toLocaleTimeString()}</div>}
      {service.nextRun && <div>Schedule: {service.nextRun}</div>}
    </div>
  </div>
);

// Agent Tab Component
const AgentTab: React.FC<{ reports: AgentReport[] }> = ({ reports }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Decisions */}
      <div className="bg-gray-900/80 rounded-2xl border border-purple-500/30 p-6">
        <h3 className="text-lg font-semibold mb-4">AI Decisions</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {reports.flatMap(report =>
            (report.decisions || []).map((decision: any, idx: number) => (
              <div key={`${report.id}-${idx}`} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    decision.action === 'fix' ? 'bg-green-500/20 text-green-400' :
                    decision.action === 'escalate' ? 'bg-red-500/20 text-red-400' :
                    decision.action === 'monitor' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {decision.action?.toUpperCase()}
                  </span>
                  {decision.confidence && (
                    <span className="text-xs text-gray-500">
                      {Math.round(decision.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300">{decision.reasoning}</p>
                {decision.fixCommand && (
                  <code className="text-xs text-purple-400 mt-2 block bg-purple-500/10 p-1 rounded">
                    {decision.fixCommand}
                  </code>
                )}
              </div>
            ))
          )}
          {reports.length === 0 && (
            <p className="text-gray-500 text-center py-8">No agent decisions yet</p>
          )}
        </div>
      </div>

      {/* Patterns Detected */}
      <div className="bg-gray-900/80 rounded-2xl border border-orange-500/30 p-6">
        <h3 className="text-lg font-semibold mb-4">Detected Patterns</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {reports.flatMap(report =>
            (report.patterns_detected || []).map((pattern: any, idx: number) => (
              <div key={`${report.id}-pattern-${idx}`} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-orange-400">{pattern.issue}</span>
                  <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                    {pattern.occurrences}x
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  First seen: {new Date(pattern.firstSeen).toLocaleString()}
                </div>
              </div>
            ))
          )}
          {reports.every(r => !r.patterns_detected?.length) && (
            <p className="text-gray-500 text-center py-8">No patterns detected</p>
          )}
        </div>
      </div>
    </div>

    {/* Escalations */}
    {reports.some(r => r.escalations?.length > 0) && (
      <div className="bg-gray-900/80 rounded-2xl border border-red-500/30 p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Escalations
        </h3>
        <div className="space-y-2">
          {reports.flatMap(report =>
            (report.escalations || []).map((escalation, idx) => (
              <div key={`${report.id}-esc-${idx}`} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10">
                <Bell className="w-4 h-4 text-red-400" />
                <span className="flex-1">{escalation}</span>
                <span className="text-xs text-gray-500">
                  {new Date(report.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    )}
  </div>
);

// Watchdog Tab Component
const WatchdogTab: React.FC<{ reports: WatchdogReport[] }> = ({ reports }) => (
  <div className="space-y-6">
    {/* Health Check History */}
    <div className="bg-gray-900/80 rounded-2xl border border-cyan-500/30 p-6">
      <h3 className="text-lg font-semibold mb-4">Health Check History</h3>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {reports.map(report => (
          <div key={report.id} className={`p-4 rounded-lg border ${
            report.overall_status === 'healthy' ? 'bg-green-500/5 border-green-500/30' :
            report.overall_status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/30' :
            'bg-red-500/5 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                report.overall_status === 'healthy' ? 'bg-green-500/20 text-green-400' :
                report.overall_status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {report.overall_status?.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(report.timestamp).toLocaleString()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {report.checks?.map((check, idx) => (
                <div key={idx} className={`px-2 py-1 rounded text-xs ${
                  check.status === 'healthy' ? 'bg-green-500/10 text-green-400' :
                  check.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {check.name}
                </div>
              ))}
            </div>

            {report.fixes && report.fixes.length > 0 && (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {report.fixes.length} fixes applied
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Reports Tab Component - Daily Reports
const ReportsTab: React.FC<{ reports: DailyReport[]; issues: string[] }> = ({ reports, issues }) => (
  <div className="space-y-6">
    {/* Current Issues */}
    {issues.length > 0 && (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" />
          Issues Needing Attention
        </h3>
        <div className="space-y-2">
          {issues.map((issue, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-200">{issue}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Daily Reports */}
    <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-cyan-400" />
        Daily Reports (Last 7 Days)
      </h3>
      
      {reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No daily reports yet.</p>
          <p className="text-xs mt-2">Reports are generated daily at 9 AM.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-lg">
                  {new Date(report.created_at).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </h4>
                <span className="text-xs text-gray-500">
                  {new Date(report.created_at).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 rounded-lg bg-purple-500/10">
                  <div className="text-2xl font-bold text-purple-400">{report.stats?.totalStartups || 0}</div>
                  <div className="text-xs text-gray-500">Startups</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-500/10">
                  <div className="text-2xl font-bold text-blue-400">{report.stats?.totalInvestors || 0}</div>
                  <div className="text-xs text-gray-500">Investors</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-400">{report.stats?.totalMatches || 0}</div>
                  <div className="text-xs text-gray-500">Matches</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-500/10">
                  <div className="text-2xl font-bold text-orange-400">{report.stats?.avgGODScore || 0}</div>
                  <div className="text-xs text-gray-500">Avg GOD Score</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">+{report.stats?.newStartupsToday || 0} startups</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">+{report.stats?.newInvestorsToday || 0} investors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400">+{report.stats?.newMatchesToday || 0} matches</span>
                </div>
              </div>

              {report.stats?.issues && report.stats.issues.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-xs text-yellow-400 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    {report.stats.issues.length} issue(s) found
                  </div>
                  <div className="text-xs text-gray-500">
                    {report.stats.issues.slice(0, 3).join(' • ')}
                    {report.stats.issues.length > 3 && ` +${report.stats.issues.length - 3} more`}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// History Tab Component
const HistoryTab: React.FC<{ agentReports: AgentReport[]; watchdogReports: WatchdogReport[] }> = ({ agentReports, watchdogReports }) => {
  // Combine and sort all events
  const allEvents = [
    ...agentReports.map(r => ({ type: 'agent' as const, timestamp: r.timestamp, data: r })),
    ...watchdogReports.map(r => ({ type: 'watchdog' as const, timestamp: r.timestamp, data: r }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-gray-900/80 rounded-2xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold mb-4">Event Timeline</h3>
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {allEvents.map((event, idx) => (
          <div key={idx} className="flex items-start gap-4 p-3 rounded-lg bg-white/5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              event.type === 'agent' ? 'bg-purple-500/20' : 'bg-cyan-500/20'
            }`}>
              {event.type === 'agent' ? (
                <Brain className="w-5 h-5 text-purple-400" />
              ) : (
                <Activity className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">
                  {event.type === 'agent' ? 'AI Agent Run' : 'Watchdog Check'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
              {event.type === 'agent' ? (
                <div className="text-sm text-gray-400">
                  {(event.data as AgentReport).decisions?.length || 0} decisions,{' '}
                  {(event.data as AgentReport).actions_applied?.length || 0} fixes
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Status: {(event.data as WatchdogReport).overall_status},{' '}
                  {(event.data as WatchdogReport).checks?.length || 0} checks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentDashboard;
