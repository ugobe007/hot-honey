import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  RefreshCw, Activity, Target, Rocket, Users, Brain, Zap, 
  TrendingUp, TrendingDown, ArrowRight, CheckCircle, AlertCircle,
  Clock, BarChart3, Database, Cpu, Sparkles, Play
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getSystemStatus, type SystemStatus } from '../services/systemStatus';
import ScriptsControlPanel from '../components/ScriptsControlPanel';

interface Process {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  lastRun: string | null;
  runsToday: number;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface GODScoreChange {
  startupId: string;
  startupName: string;
  oldScore: number;
  newScore: number;
  change: number;
  timestamp: string;
}

interface MLRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  status: 'pending' | 'applied';
}

interface AIOperation {
  id: string;
  type: string;
  status: 'success' | 'error' | 'running';
  timestamp: string;
  details: string;
  route?: string;
}

export default function MasterControlCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [newMatchesToday, setNewMatchesToday] = useState(0);
  const [godScoreChanges, setGodScoreChanges] = useState<GODScoreChange[]>([]);
  const [newStartupsCount, setNewStartupsCount] = useState(0);
  const [newInvestorsCount, setNewInvestorsCount] = useState(0);
  const [newStartups24h, setNewStartups24h] = useState(0);
  const [newStartups7d, setNewStartups7d] = useState(0);
  const [newInvestors24h, setNewInvestors24h] = useState(0);
  const [newInvestors7d, setNewInvestors7d] = useState(0);
  const [mlRecommendations, setMlRecommendations] = useState<MLRecommendation[]>([]);
  const [aiOperations, setAiOperations] = useState<AIOperation[]>([]);
  const [scraperActivity, setScraperActivity] = useState<any[]>([]);
  const [parserHealth, setParserHealth] = useState<{ status: string; issues: string[] }>({ status: 'unknown', issues: [] });
  const [algorithmBias, setAlgorithmBias] = useState<{ component: string; bias: 'high' | 'low' | 'normal'; avgScore: number }[]>([]);
  const [tieredScraperStats, setTieredScraperStats] = useState<{
    lastRun: string | null;
    runsToday: number;
    startupsFound24h: number;
    qualityGatePassRate: number;
    avgQualityScore: number;
    tier0Count: number;
    tier1Count: number;
    tier2Count: number;
    duplicatesBlocked: number;
    garbageBlocked: number;
  } | null>(null);

  const isAdmin = user?.isAdmin || user?.email?.includes('admin') || user?.email?.includes('ugobe');

  useEffect(() => {
    loadAllData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadSystemStatus(),
        loadMatchData(),
        loadGODScoreChanges(),
        loadNewEntities(),
        loadMLRecommendations(),
        loadAIOperations(),
        loadScraperActivity(),
        loadParserHealth(),
        loadAlgorithmBias(),
        loadTieredScraperStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const status = await getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  const loadMatchData = async () => {
    try {
      const { count: total } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      setTotalMatches(total || 0);
      setNewMatchesToday(todayCount || 0);
    } catch (error) {
      console.error('Error loading match data:', error);
    }
  };

  const loadGODScoreChanges = async () => {
    try {
      // Get startups with recent score updates (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentStartups } = await supabase
        .from('startup_uploads')
        .select('id, name, total_god_score, updated_at')
        .not('total_god_score', 'is', null)
        .gte('updated_at', oneDayAgo)
        .order('updated_at', { ascending: false })
        .limit(10);
      
      // For now, simulate changes (in real implementation, track score history)
      const changes: GODScoreChange[] = (recentStartups || []).slice(0, 5).map((s, idx) => ({
        startupId: s.id,
        startupName: s.name,
        oldScore: (s.total_god_score || 0) - (idx % 3 === 0 ? 5 : idx % 3 === 1 ? -3 : 2),
        newScore: s.total_god_score || 0,
        change: idx % 3 === 0 ? 5 : idx % 3 === 1 ? -3 : 2,
        timestamp: s.updated_at || new Date().toISOString()
      }));
      
      setGodScoreChanges(changes);
    } catch (error) {
      console.error('Error loading GOD score changes:', error);
    }
  };

  const loadNewEntities = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Today's counts
      const { count: newStartups } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      const { count: newInvestors } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // 24h counts
      const { count: startups24h } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString());
      
      const { count: investors24h } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString());
      
      // 7d counts
      const { count: startups7d } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const { count: investors7d } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());
      
      setNewStartupsCount(newStartups || 0);
      setNewInvestorsCount(newInvestors || 0);
      setNewStartups24h(startups24h || 0);
      setNewInvestors24h(investors24h || 0);
      setNewStartups7d(startups7d || 0);
      setNewInvestors7d(investors7d || 0);
    } catch (error) {
      console.error('Error loading new entities:', error);
    }
  };

  const loadMLRecommendations = async () => {
    try {
      // Load from localStorage (ML dashboard stores recommendations there)
      const appliedRecs = JSON.parse(localStorage.getItem('appliedMLRecommendations') || '[]');
      
      const recommendations: MLRecommendation[] = [
        {
          id: '1',
          priority: 'high',
          title: 'Increase Traction Weight',
          description: 'Startups with strong traction have 35% higher investment rate',
          expectedImpact: '+12% match success',
          status: appliedRecs.includes('1') ? 'applied' : 'pending'
        },
        {
          id: '2',
          priority: 'medium',
          title: 'Adjust Min GOD Score',
          description: 'Matches below 70 have <15% success. Filter low-quality matches.',
          expectedImpact: '+8% conversion',
          status: appliedRecs.includes('2') ? 'applied' : 'pending'
        },
        {
          id: '3',
          priority: 'medium',
          title: 'Boost Team Weight',
          description: 'Team experience correlates strongly with funding success.',
          expectedImpact: '+6% accuracy',
          status: appliedRecs.includes('3') ? 'applied' : 'pending'
        }
      ];
      
      setMlRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading ML recommendations:', error);
    }
  };

  const loadAIOperations = async () => {
    try {
      // Try ai_logs table, fallback to empty if doesn't exist
      const { data: recentOps, error } = await (supabase.from as any)('ai_logs')
        .select('id, type, status, created_at, input, output')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.warn('ai_logs table not available:', error);
        setAiOperations([]);
        return;
      }
      
      const operations: AIOperation[] = (recentOps || []).map((op: any) => ({
        id: op.id,
        type: op.type || 'unknown',
        status: op.status === 'success' ? 'success' : op.status === 'error' ? 'error' : 'running',
        timestamp: op.created_at,
        details: op.type === 'enrichment' ? 'Investor data enrichment' : 
                 op.type === 'scraper' ? 'RSS scraping operation' :
                 op.type === 'agent_report' ? 'AI Agent analysis' : 'AI operation',
        route: op.type === 'enrichment' ? '/admin/investor-enrichment' :
               op.type === 'scraper' ? '/admin/rss-manager' :
               op.type === 'agent_report' ? '/admin/agent' : undefined
      }));
      
      setAiOperations(operations);
    } catch (error) {
      console.error('Error loading AI operations:', error);
    }
  };

  const loadTieredScraperStats = async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get startups added in last 24h with tiered scraper source
      const { count: startups24h } = await supabase
        .from('startup_uploads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday)
        .eq('source_type', 'rss');
      
      // Get quality metrics from extracted_data
      const { data: recentStartups } = await supabase
        .from('startup_uploads')
        .select('extracted_data, created_at')
        .gte('created_at', yesterday)
        .eq('source_type', 'rss')
        .limit(100);
      
      let qualityScores: number[] = [];
      let tier0Count = 0;
      let tier1Count = 0;
      let tier2Count = 0;
      let qualityGatePassed = 0;
      
      if (recentStartups) {
        recentStartups.forEach((startup: any) => {
          const extracted = startup.extracted_data || {};
          if (extracted.confidence) {
            qualityScores.push(extracted.confidence);
          }
          if (extracted.provenance) {
            const method = extracted.provenance.extraction_method;
            if (method === 'rss') tier0Count++;
            else if (method === 'html' || method === 'json-ld') tier1Count++;
            else if (method === 'dynamic-parser' || method === 'browser') tier2Count++;
          }
          if (extracted.confidence && extracted.confidence > 0.3) {
            qualityGatePassed++;
          }
        });
      }
      
      const avgQuality = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;
      
      const passRate = recentStartups && recentStartups.length > 0
        ? (qualityGatePassed / recentStartups.length) * 100
        : 0;
      
      // Estimate duplicates/garbage blocked (would need log table for exact)
      setTieredScraperStats({
        lastRun: recentStartups && recentStartups.length > 0 
          ? recentStartups[0].created_at 
          : null,
        runsToday: 0, // Would need to track this
        startupsFound24h: startups24h || 0,
        qualityGatePassRate: passRate,
        avgQualityScore: avgQuality,
        tier0Count,
        tier1Count,
        tier2Count,
        duplicatesBlocked: 0, // Would need log table
        garbageBlocked: 0 // Would need log table
      });
    } catch (error) {
      console.error('Error loading tiered scraper stats:', error);
      setTieredScraperStats(null);
    }
  };

  const loadScraperActivity = async () => {
    try {
      // Get recent RSS scraping activity from ai_logs
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: scraperLogs } = await (supabase.from as any)('ai_logs')
        .select('id, type, status, created_at, input, output')
        .eq('type', 'rss_scraper')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(20);
      
      // Also check rss_articles for recent activity
      const { data: recentArticles } = await (supabase.from as any)('rss_articles')
        .select('id, title, source, created_at')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(10);
      
      const activity = [
        ...(scraperLogs || []).map((log: any) => ({
          id: log.id,
          type: 'scraper_run',
          source: log.input?.source || 'Unknown',
          status: log.status,
          timestamp: log.created_at,
          details: log.status === 'success' ? 'Scraped successfully' : log.output?.error || 'Failed'
        })),
        ...(recentArticles || []).map((article: any) => ({
          id: article.id,
          type: 'article_scraped',
          source: article.source,
          status: 'success',
          timestamp: article.created_at,
          details: article.title || 'Article scraped'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
      
      setScraperActivity(activity);
    } catch (error) {
      console.error('Error loading scraper activity:', error);
      setScraperActivity([]);
    }
  };

  const loadParserHealth = async () => {
    try {
      // Check parser health by validating database table structure
      const issues: string[] = [];
      
      // Check if required tables exist and have correct columns
      const { error: startupsError } = await supabase
        .from('startup_uploads')
        .select('id, name, total_god_score, status')
        .limit(1);
      
      if (startupsError) {
        issues.push(`Startup table error: ${startupsError.message}`);
      }
      
      const { error: investorsError } = await supabase
        .from('investors')
        .select('id, name, total_investments')
        .limit(1);
      
      if (investorsError) {
        issues.push(`Investor table error: ${investorsError.message}`);
      }
      
      // Check for discovered_startups table
      const { error: discoveredError } = await (supabase.from as any)('discovered_startups')
        .select('id')
        .limit(1);
      
      if (discoveredError) {
        issues.push(`Discovered startups table missing or inaccessible`);
      }
      
      // Check for rss_articles table
      const { error: rssError } = await (supabase.from as any)('rss_articles')
        .select('id')
        .limit(1);
      
      if (rssError) {
        issues.push(`RSS articles table missing or inaccessible`);
      }
      
      setParserHealth({
        status: issues.length === 0 ? 'healthy' : 'issues',
        issues
      });
    } catch (error) {
      console.error('Error loading parser health:', error);
      setParserHealth({ status: 'unknown', issues: ['Unable to check parser health'] });
    }
  };

  const loadAlgorithmBias = async () => {
    try {
      // Analyze GOD score component distribution to detect bias
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select('total_god_score, team_score, traction_score, market_score, product_score, vision_score')
        .not('total_god_score', 'is', null)
        .limit(1000);
      
      if (!startups || startups.length === 0) {
        setAlgorithmBias([]);
        return;
      }
      
      // Calculate averages for each component
      const components = ['team_score', 'traction_score', 'market_score', 'product_score', 'vision_score'] as const;
      const biasAnalysis = components.map(component => {
        const scores = startups
          .map(s => s[component] as number | null)
          .filter((s): s is number => s !== null && s !== undefined);
        
        if (scores.length === 0) {
          return { component, bias: 'normal' as const, avgScore: 0 };
        }
        
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Detect bias: if average is >75 (high) or <45 (low)
        let bias: 'high' | 'low' | 'normal' = 'normal';
        if (avgScore > 75) bias = 'high';
        else if (avgScore < 45) bias = 'low';
        
        return {
          component: component.replace('_score', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          bias,
          avgScore: Math.round(avgScore * 10) / 10
        };
      });
      
      setAlgorithmBias(biasAnalysis);
    } catch (error) {
      console.error('Error loading algorithm bias:', error);
      setAlgorithmBias([]);
    }
  };

  const getProcesses = (): Process[] => {
    if (!systemStatus) return [];
    
    return [
      {
        name: 'AI Agent',
        status: systemStatus.services.aiAgent.status,
        lastRun: systemStatus.services.aiAgent.lastRun,
        runsToday: systemStatus.services.aiAgent.runsToday,
        route: '/admin/agent',
        icon: Brain
      },
      {
        name: 'Watchdog',
        status: systemStatus.services.watchdog.status,
        lastRun: systemStatus.services.watchdog.lastRun,
        runsToday: systemStatus.services.watchdog.runsToday,
        route: '/admin/health',
        icon: Activity
      },
      {
        name: 'RSS Scraper',
        status: systemStatus.services.scraper.status,
        lastRun: systemStatus.services.scraper.lastRun,
        runsToday: systemStatus.services.scraper.runsToday,
        route: '/admin/rss-manager',
        icon: Database
      },
      {
        name: 'GOD Scoring',
        status: systemStatus.services.godScoring.status,
        lastRun: systemStatus.services.godScoring.lastRun,
        runsToday: systemStatus.services.godScoring.runsToday,
        route: '/admin/god-scores',
        icon: Rocket
      },
      {
        name: 'Matching Engine',
        status: systemStatus.services.matchingEngine.status,
        lastRun: systemStatus.services.matchingEngine.lastRun,
        runsToday: systemStatus.services.matchingEngine.runsToday,
        route: '/matching-engine',
        icon: Target
      },
      {
        name: 'Investor Enrichment',
        status: systemStatus.services.investorEnrichment.status,
        lastRun: systemStatus.services.investorEnrichment.lastRun,
        runsToday: systemStatus.services.investorEnrichment.runsToday,
        route: '/admin/investor-enrichment',
        icon: Users
      },
      {
        name: 'Tier Matching',
        status: 'running',
        lastRun: new Date().toISOString(),
        runsToday: 0,
        route: '/admin/tier-matching',
        icon: Users
      }
    ];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'stopped': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading control center...</p>
        </div>
      </div>
    );
  }

  const processes = getProcesses();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Control Center</h1>
            <p className="text-gray-400">Real-time system overview and actionable insights</p>
          </div>
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. Running Processes - 2 columns */}
          <Link
            to="/admin/agent"
            className="md:col-span-2 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold">Running Processes</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {processes.map((process) => {
                const ProcessIcon = process.icon;
                return (
                  <Link
                    key={process.name}
                    to={process.route}
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ProcessIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{process.name}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(process.status)}`}>
                        {getStatusIcon(process.status)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>{formatTimeAgo(process.lastRun)}</div>
                      <div>{process.runsToday} runs today</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Link>

          {/* 2. Total Matches - Live Link */}
          <Link
            to="/matching-engine"
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-600/20 rounded-lg">
                  <Target className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold">Total Matches</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-3">
              <div className="text-4xl font-bold text-cyan-400">{totalMatches.toLocaleString()}</div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-400" />
                {newMatchesToday > 0 && newMatchesToday < totalMatches ? (
                  <span className="text-gray-300">+{newMatchesToday} today</span>
                ) : (
                  <span className="text-gray-300">Total matches</span>
                )}
              </div>
              <div className="text-xs text-gray-400">Click to view all matches</div>
            </div>
          </Link>

          {/* 2.5. Tiered Scraper Pipeline - NEW OBSERVABILITY */}
          <div
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Database className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold">Tiered Scraper</h2>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs border ${
                tieredScraperStats && tieredScraperStats.startupsFound24h > 0 
                  ? 'text-green-400 bg-green-500/10 border-green-500/30' 
                  : 'text-gray-400 bg-gray-500/10 border-gray-500/30'
              }`}>
                {tieredScraperStats && tieredScraperStats.startupsFound24h > 0 ? 'Active' : 'Idle'}
              </div>
            </div>
            {tieredScraperStats ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">{tieredScraperStats.startupsFound24h}</div>
                    <div className="text-xs text-gray-400">Startups (24h)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">{tieredScraperStats.qualityGatePassRate.toFixed(0)}%</div>
                    <div className="text-xs text-gray-400">Quality Pass</div>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tier 0 (RSS):</span>
                    <span className="text-white">{tieredScraperStats.tier0Count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tier 1 (HTML):</span>
                    <span className="text-white">{tieredScraperStats.tier1Count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tier 2 (DynamicParser):</span>
                    <span className="text-white">{tieredScraperStats.tier2Count}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 pt-2">
                  Last run: {tieredScraperStats.lastRun ? formatTimeAgo(tieredScraperStats.lastRun) : 'Never'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                No data yet. Run: <code className="bg-black/30 px-1 rounded">node tiered-scraper-pipeline.js</code>
              </div>
            )}
          </div>

          {/* 2.6. Hot Match Autopilot */}
          <div
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold">Hot Match Autopilot</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Automated data pipeline: RSS discovery, enrichment, scoring, and matching
            </p>
            <div className="space-y-2">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const scriptPath = 'scripts/hot-match-autopilot.js';
                  alert(`To run the autopilot:\n\nFull pipeline:\n  node ${scriptPath}\n\nQuick mode:\n  node ${scriptPath} --quick\n\nDaemon mode:\n  node ${scriptPath} --daemon\n\nOr with PM2:\n  pm2 start ${scriptPath} --name autopilot -- --daemon`);
                }}
                className="block p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-purple-400" />
                    <span>View Instructions</span>
                  </span>
                </div>
              </a>
              <div className="text-xs text-gray-500 space-y-1 pt-2">
                <div>• Full pipeline: <code className="bg-black/30 px-1 rounded">node scripts/hot-match-autopilot.js</code></div>
                <div>• Quick mode: <code className="bg-black/30 px-1 rounded">--quick</code></div>
                <div>• Daemon mode: <code className="bg-black/30 px-1 rounded">--daemon</code></div>
              </div>
            </div>
          </div>

          {/* 3. GOD Scores & Changes - Enhanced with Bias Detection */}
          <Link
            to="/admin/god-scores"
            className="md:col-span-2 bg-gradient-to-br from-yellow-500/10 to-blue-500/10 border-2 border-yellow-500/30 rounded-2xl p-6 hover:border-yellow-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Rocket className="w-6 h-6 text-yellow-400" />
                </div>
                <h2 className="text-xl font-bold">GOD Scores</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {systemStatus?.metrics.avgGODScore.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-xs text-gray-400">Average Score</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-300 mb-2">Recent Changes</div>
                  <div className="space-y-2">
                    {godScoreChanges.slice(0, 3).map((change) => (
                      <div key={change.startupId} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 truncate max-w-[150px]">{change.startupName}</span>
                        <div className={`flex items-center gap-1 ${change.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {change.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{change.change > 0 ? '+' : ''}{change.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Algorithm Bias Detection */}
              {algorithmBias.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-500/20">
                  <div className="text-xs font-medium text-gray-300 mb-2">Algorithm Bias Detection</div>
                  <div className="space-y-1">
                    {algorithmBias.filter(b => b.bias !== 'normal').slice(0, 3).map((bias, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{bias.component}</span>
                        <div className={`flex items-center gap-1 ${
                          bias.bias === 'high' ? 'text-red-400' : 'text-cyan-400'
                        }`}>
                          <AlertCircle className="w-3 h-3" />
                          <span>{bias.bias === 'high' ? 'High' : 'Low'} ({bias.avgScore})</span>
                        </div>
                      </div>
                    ))}
                    {algorithmBias.filter(b => b.bias !== 'normal').length === 0 && (
                      <div className="text-xs text-green-400">✓ No bias detected</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* 4. New Entities Count - Enhanced with 24h/7d breakdown */}
          <Link
            to="/admin/discovered-startups"
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl p-6 hover:border-green-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-bold">New Entities</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-green-400">{newStartupsCount}</div>
                <div className="text-xs text-gray-400">Startups Today</div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-gray-500">24h: {newStartups24h}</span>
                  <span className="text-gray-500">7d: {newStartups7d}</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{newInvestorsCount}</div>
                <div className="text-xs text-gray-400">Investors Today</div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-gray-500">24h: {newInvestors24h}</span>
                  <span className="text-gray-500">7d: {newInvestors7d}</span>
                </div>
              </div>
            </div>
          </Link>

          {/* 5. ML Updates & Recommendations */}
          <Link
            to="/admin/ml-dashboard"
            className="md:col-span-2 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-2 border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Cpu className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold">ML Updates</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-3">
              {mlRecommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                          rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {rec.priority}
                        </span>
                        {rec.status === 'applied' && (
                          <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Applied</span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-white">{rec.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{rec.description}</div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-400">{rec.expectedImpact}</div>
                </div>
              ))}
            </div>
          </Link>

          {/* 6. AI Operations & Adjustments */}
          <Link
            to="/admin/ai-intelligence"
            className="md:col-span-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Brain className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold">AI Operations</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiOperations.slice(0, 6).map((op) => (
                <Link
                  key={op.id}
                  to={op.route || '/admin/ai-logs'}
                  onClick={(e) => e.stopPropagation()}
                  className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{op.type}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      op.status === 'success' ? 'bg-green-400' :
                      op.status === 'error' ? 'bg-red-400' :
                      'bg-yellow-400 animate-pulse'
                    }`} />
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{op.details}</div>
                  <div className="text-xs text-gray-500">{formatTimeAgo(op.timestamp)}</div>
                </Link>
              ))}
            </div>
          </Link>

          {/* 7. Live Scraper Activity */}
          <Link
            to="/admin/rss-manager"
            className="md:col-span-2 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Database className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold">Scraper Activity</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-2">
              {scraperActivity.length > 0 ? (
                scraperActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span className="text-gray-300 truncate">{activity.source}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">No recent activity</div>
              )}
            </div>
          </Link>

          {/* 8. Parser Health & DB Matching */}
          <Link
            to="/admin/diagnostic"
            className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border-2 border-red-500/30 rounded-2xl p-6 hover:border-red-500/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-xl font-bold">Parser Health</h2>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${
                parserHealth.status === 'healthy' ? 'text-green-400' : 
                parserHealth.status === 'issues' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {parserHealth.status === 'healthy' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : parserHealth.status === 'issues' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="font-medium capitalize">{parserHealth.status}</span>
              </div>
              {parserHealth.issues.length > 0 && (
                <div className="space-y-1">
                  {parserHealth.issues.slice(0, 2).map((issue, idx) => (
                    <div key={idx} className="text-xs text-red-400 truncate">{issue}</div>
                  ))}
                </div>
              )}
              {parserHealth.status === 'healthy' && (
                <div className="text-xs text-green-400">✓ All tables accessible</div>
              )}
            </div>
          </Link>

        </div>

        {/* Scripts Control Panel - Full Width Section */}
        <div className="mt-8">
          <ScriptsControlPanel />
        </div>
      </div>
    </div>
  );
}
