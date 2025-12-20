import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle, Trash2, Check, Play, ExternalLink, Database, Zap, Globe } from 'lucide-react';

interface PendingStartup {
  id: string;
  name: string;
  tagline: string | null;
  sectors: string[] | null;
  total_god_score: number | null;
  created_at: string | null;
}

interface RecentActivity {
  type: 'startup' | 'investor' | 'match' | 'article';
  action: string;
  name: string;
  id: string;
  created_at: string | null;
}

interface DataQuality {
  table: string;
  total: number;
  complete: number;
  missing_key_fields: number;
  last_updated: string;
}

interface StartupDataGaps {
  missing_description: number;
  missing_sectors: number;
  missing_website: number;
  missing_location: number;
  has_all_data: number;
  total: number;
}

interface IncompleteStartup {
  id: string;
  name: string;
  tagline: string;
  has_description: boolean;
  has_sectors: boolean;
  has_website: boolean;
  has_location: boolean;
  total_god_score: number;
}

interface MatchQueueItem {
  id: string;
  startup_name: string;
  startup_id: string;
  investor_name: string;
  investor_id: string;
  match_score: number;
  status: string;
  created_at: string;
}

interface SystemHealth {
  scrapers_running: number;
  last_scrape: string;
  rss_sources_active: number;
  errors_today: number;
  queue_size: number;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingStartups, setPendingStartups] = useState<PendingStartup[]>([]);
  const [matchQueue, setMatchQueue] = useState<MatchQueueItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality[]>([]);
  const [startupGaps, setStartupGaps] = useState<StartupDataGaps | null>(null);
  const [incompleteStartups, setIncompleteStartups] = useState<IncompleteStartup[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadPendingStartups(),
      loadMatchQueue(),
      loadRecentActivity(),
      loadDataQuality(),
      loadStartupGaps(),
      loadIncompleteStartups(),
      loadSystemHealth()
    ]);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadPendingStartups = async () => {
    const { data } = await supabase
      .from('startup_uploads')
      .select('id, name, tagline, sectors, total_god_score, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    setPendingStartups(data || []);
  };

  const loadMatchQueue = async () => {
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score, status, created_at')
      .in('status', ['pending', 'new'])
      .order('match_score', { ascending: false })
      .limit(50);

    if (!matches?.length) {
      setMatchQueue([]);
      return;
    }

    const startupIds = [...new Set(matches.map(m => m.startup_id).filter((id): id is string => id !== null))];
    const investorIds = [...new Set(matches.map(m => m.investor_id).filter((id): id is string => id !== null))];

    const [startupsRes, investorsRes] = await Promise.all([
      startupIds.length ? supabase.from('startup_uploads').select('id, name').in('id', startupIds) : { data: [] },
      investorIds.length ? supabase.from('investors').select('id, name').in('id', investorIds) : { data: [] }
    ]);

    const startupMap = new Map((startupsRes.data || []).map(s => [s.id, s.name]));
    const investorMap = new Map((investorsRes.data || []).map(i => [i.id, i.name]));

    setMatchQueue(matches.map(m => ({
      id: m.id,
      startup_id: m.startup_id || '',
      startup_name: startupMap.get(m.startup_id || '') || 'Unknown',
      investor_id: m.investor_id || '',
      investor_name: investorMap.get(m.investor_id || '') || 'Unknown',
      match_score: m.match_score || 0,
      status: m.status || 'pending',
      created_at: m.created_at || ''
    })));
  };

  const loadRecentActivity = async () => {
    const [startups, investors, matches] = await Promise.all([
      supabase.from('startup_uploads').select('id, name, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('investors').select('id, name, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('startup_investor_matches').select('id, created_at').order('created_at', { ascending: false }).limit(10)
    ]);

    const activity: RecentActivity[] = [
      ...(startups.data || []).map(s => ({ type: 'startup' as const, action: 'Added', name: s.name, id: s.id, created_at: s.created_at })),
      ...(investors.data || []).map(i => ({ type: 'investor' as const, action: 'Added', name: i.name, id: i.id, created_at: i.created_at })),
      ...(matches.data || []).map(m => ({ type: 'match' as const, action: 'Created', name: `Match #${m.id.slice(0, 8)}`, id: m.id, created_at: m.created_at }))
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 30);

    setRecentActivity(activity);
  };

  const loadDataQuality = async () => {
    const [startupsRes, investorsRes, matchesRes, discoveredRes] = await Promise.all([
      supabase.from('startup_uploads').select('id, name, tagline, sectors, website, total_god_score, created_at'),
      supabase.from('investors').select('id, name, firm, sectors, check_size_min, created_at'),
      supabase.from('startup_investor_matches').select('id, match_score, created_at'),
      supabase.from('discovered_startups').select('id, name, article_url, created_at')
    ]);

    const startups = startupsRes.data || [];
    const investors = investorsRes.data || [];
    const matches = matchesRes.data || [];
    const discovered = discoveredRes.data || [];

    setDataQuality([
      {
        table: 'startup_uploads',
        total: startups.length,
        complete: startups.filter(s => s.name && s.tagline && s.sectors?.length && s.website).length,
        missing_key_fields: startups.filter(s => !s.tagline || !s.sectors?.length).length,
        last_updated: startups[0]?.created_at || '-'
      },
      {
        table: 'investors',
        total: investors.length,
        complete: investors.filter(i => i.name && i.firm && i.sectors?.length && i.check_size_min).length,
        missing_key_fields: investors.filter(i => !i.firm || !i.sectors?.length).length,
        last_updated: investors[0]?.created_at || '-'
      },
      {
        table: 'matches',
        total: matches.length,
        complete: matches.filter(m => (m.match_score ?? 0) > 0).length,
        missing_key_fields: matches.filter(m => !m.match_score).length,
        last_updated: matches[0]?.created_at || '-'
      },
      {
        table: 'discovered_startups',
        total: discovered.length,
        complete: discovered.filter(d => d.name && d.article_url).length,
        missing_key_fields: discovered.filter(d => !d.article_url).length,
        last_updated: discovered[0]?.created_at || '-'
      }
    ]);
  };

  const loadStartupGaps = async () => {
    const { data: startups } = await supabase
      .from('startup_uploads')
      .select('id, description, sectors, website, location');

    if (!startups) return;

    const gaps: StartupDataGaps = {
      total: startups.length,
      missing_description: startups.filter(s => !s.description || s.description === '').length,
      missing_sectors: startups.filter(s => !s.sectors || s.sectors.length === 0).length,
      missing_website: startups.filter(s => !s.website || s.website === '').length,
      missing_location: startups.filter(s => !s.location || s.location === '').length,
      has_all_data: startups.filter(s => 
        s.description && s.description !== '' &&
        s.sectors && s.sectors.length > 0 &&
        s.website && s.website !== '' &&
        s.location && s.location !== ''
      ).length
    };

    setStartupGaps(gaps);
  };

  const loadIncompleteStartups = async () => {
    const { data } = await supabase
      .from('startup_uploads')
      .select('id, name, tagline, description, sectors, website, location, total_god_score')
      .order('total_god_score', { ascending: false })
      .limit(500);

    if (!data) return;

    const incomplete = data
      .filter(s => !s.description || !s.sectors?.length || !s.website || !s.location)
      .slice(0, 50)
      .map(s => ({
        id: s.id,
        name: s.name,
        tagline: s.tagline || '',
        has_description: !!(s.description && s.description !== ''),
        has_sectors: !!(s.sectors && s.sectors.length > 0),
        has_website: !!(s.website && s.website !== ''),
        has_location: !!(s.location && s.location !== ''),
        total_god_score: s.total_god_score || 0
      }));

    setIncompleteStartups(incomplete);
  };

  // AI Enrichment - Generate description from tagline AND infer sectors
  const enrichWithAI = async (startup: IncompleteStartup) => {
    if (!startup.tagline) return;
    
    // Sector inference keywords
    const sectorKeywords: Record<string, string[]> = {
      'FinTech': ['fintech', 'finance', 'banking', 'payment', 'crypto', 'defi', 'insurance', 'lending', 'trading', 'wallet', 'neobank', 'regtech', 'money', 'transaction', 'wealth'],
      'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'nlp', 'gpt', 'llm', 'automation', 'cognitive', 'predictive'],
      'SaaS': ['saas', 'cloud', 'platform', 'software', 'api', 'dashboard', 'tool', 'workflow', 'productivity', 'enterprise', 'b2b'],
      'HealthTech': ['health', 'healthcare', 'medical', 'clinical', 'patient', 'doctor', 'hospital', 'pharma', 'biotech', 'wellness', 'mental health', 'telemedicine', 'diagnosis'],
      'EdTech': ['education', 'learning', 'course', 'student', 'school', 'teach', 'training', 'skill', 'tutor', 'academic'],
      'Sustainability': ['climate', 'carbon', 'green', 'sustainable', 'environment', 'renewable', 'clean', 'eco', 'solar', 'energy'],
      'E-commerce': ['ecommerce', 'shop', 'retail', 'marketplace', 'commerce', 'store', 'merchant', 'brand', 'direct-to-consumer', 'd2c'],
      'Cybersecurity': ['security', 'cyber', 'privacy', 'encryption', 'authentication', 'threat', 'fraud', 'identity', 'compliance'],
      'PropTech': ['real estate', 'property', 'housing', 'rental', 'mortgage', 'home', 'construction', 'tenant'],
      'FoodTech': ['food', 'restaurant', 'delivery', 'kitchen', 'meal', 'grocery', 'farming', 'agriculture'],
      'Developer Tools': ['developer', 'dev', 'code', 'infrastructure', 'devops', 'sdk', 'api', 'testing', 'deployment', 'git'],
      'Marketing': ['marketing', 'advertising', 'brand', 'content', 'social media', 'influencer', 'seo', 'analytics', 'campaign'],
      'HR/Talent': ['hr', 'hiring', 'recruiting', 'talent', 'employee', 'workforce', 'payroll', 'benefit', 'career', 'job'],
      'Logistics': ['logistics', 'supply chain', 'shipping', 'delivery', 'warehouse', 'freight', 'fleet', 'tracking'],
      'Consumer': ['consumer', 'app', 'social', 'community', 'creator', 'entertainment', 'gaming', 'lifestyle', 'subscription']
    };

    // Infer sectors from tagline and name
    const textToAnalyze = `${startup.name} ${startup.tagline}`.toLowerCase();
    const inferredSectors: string[] = [];
    
    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      for (const keyword of keywords) {
        if (textToAnalyze.includes(keyword) && !inferredSectors.includes(sector)) {
          inferredSectors.push(sector);
          break;
        }
      }
    }
    
    // Default to SaaS if no sectors found
    if (inferredSectors.length === 0) {
      inferredSectors.push('SaaS');
    }
    
    // Generate description
    const description = `${startup.name} is ${startup.tagline.toLowerCase()}. The company is focused on delivering innovative solutions in this space, helping customers achieve better outcomes through technology-driven approaches.`;
    
    const updateData: any = { description };
    
    // Only update sectors if startup doesn't have any
    if (!startup.has_sectors) {
      updateData.sectors = inferredSectors.slice(0, 3);
    }
    
    const { error } = await supabase
      .from('startup_uploads')
      .update(updateData)
      .eq('id', startup.id);

    if (!error) {
      await loadIncompleteStartups();
      await loadStartupGaps();
    }
  };

  // Bulk AI enrichment - enriches both description AND sectors
  const bulkEnrichAI = async () => {
    setEnriching(true);
    const toEnrich = incompleteStartups.filter(s => (!s.has_description || !s.has_sectors) && s.tagline);
    
    for (const startup of toEnrich.slice(0, 20)) {
      await enrichWithAI(startup);
    }
    
    setEnriching(false);
  };

  const loadSystemHealth = async () => {
    const { data: rssSources } = await supabase.from('rss_sources').select('id, active');
    const activeRss = (rssSources || []).filter(r => r.active).length;

    setSystemHealth({
      scrapers_running: 0,
      last_scrape: new Date().toISOString(),
      rss_sources_active: activeRss,
      errors_today: 0,
      queue_size: pendingStartups.length
    });
  };

  // Bulk Actions
  const approveSelected = async () => {
    if (selectedIds.size === 0) return;
    setProcessing(true);
    const ids = Array.from(selectedIds);
    await supabase.from('startup_uploads').update({ status: 'approved' }).in('id', ids);
    setSelectedIds(new Set());
    await loadPendingStartups();
    setProcessing(false);
  };

  const rejectSelected = async () => {
    if (selectedIds.size === 0) return;
    setProcessing(true);
    const ids = Array.from(selectedIds);
    await supabase.from('startup_uploads').update({ status: 'rejected' }).in('id', ids);
    setSelectedIds(new Set());
    await loadPendingStartups();
    setProcessing(false);
  };

  const approveStartup = async (id: string) => {
    await supabase.from('startup_uploads').update({ status: 'approved' }).eq('id', id);
    await loadPendingStartups();
  };

  const rejectStartup = async (id: string) => {
    await supabase.from('startup_uploads').update({ status: 'rejected' }).eq('id', id);
    await loadPendingStartups();
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === pendingStartups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingStartups.map(s => s.id)));
    }
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const getScoreClass = (score: number) => {
    if (score >= 90) return 'text-amber-400 font-bold';
    if (score >= 80) return 'text-orange-400 font-semibold';
    if (score >= 70) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'startup': return '🚀';
      case 'investor': return '💰';
      case 'match': return '🔥';
      case 'article': return '📰';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading admin data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-auto">
      {/* Compact Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white pl-20">⚙️ Admin Analytics</h1>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link to="/admin" className="text-gray-400 hover:text-white">Control Center</Link>
            <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">Workflow</Link>
            <Link to="/market-trends" className="text-gray-400 hover:text-white">Trends</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300 font-bold">⚡ Match</Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Updated: {new Date().toLocaleTimeString()}</span>
            <button onClick={refresh} disabled={refreshing} className="text-gray-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* System Health Row */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          <HealthCell icon={<CheckCircle className="w-3 h-3" />} label="Active RSS" value={systemHealth?.rss_sources_active || 0} status="good" />
          <HealthCell icon={<Clock className="w-3 h-3" />} label="Pending Review" value={pendingStartups.length} status={pendingStartups.length > 20 ? 'warning' : 'good'} />
          <HealthCell icon={<AlertTriangle className="w-3 h-3" />} label="Match Queue" value={matchQueue.length} status={matchQueue.length > 100 ? 'warning' : 'good'} />
          <HealthCell icon={<CheckCircle className="w-3 h-3" />} label="Data Quality" value={`${Math.round((dataQuality[0]?.complete || 0) / (dataQuality[0]?.total || 1) * 100)}%`} status="good" />
          <HealthCell icon={<XCircle className="w-3 h-3" />} label="Missing Data" value={dataQuality.reduce((sum, d) => sum + d.missing_key_fields, 0)} status={dataQuality.reduce((sum, d) => sum + d.missing_key_fields, 0) > 50 ? 'error' : 'warning'} />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Pending Approval Queue - With Actions */}
          <div className="lg:col-span-2 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">🚀 Pending Approval ({pendingStartups.length})</h2>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-orange-400">{selectedIds.size} selected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <button onClick={approveSelected} disabled={processing} className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={rejectSelected} disabled={processing} className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-xs flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 w-8">
                      <input type="checkbox" checked={selectedIds.size === pendingStartups.length && pendingStartups.length > 0} onChange={selectAll} className="rounded" />
                    </th>
                    <th className="text-left px-2 py-2 text-gray-400">Startup</th>
                    <th className="text-left px-2 py-2 text-gray-400">Tagline</th>
                    <th className="text-left px-2 py-2 text-gray-400">Sectors</th>
                    <th className="text-right px-2 py-2 text-gray-400">GOD</th>
                    <th className="text-right px-2 py-2 text-gray-400">Age</th>
                    <th className="text-center px-2 py-2 text-gray-400 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStartups.map((s) => (
                    <tr key={s.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-2 py-1.5 text-center">
                        <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="rounded" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/startup/${s.id}`} className="text-white hover:text-orange-400 font-medium">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-gray-400 truncate max-w-40">{s.tagline || '-'}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          {(s.sectors || []).slice(0, 2).map(sec => (
                            <span key={sec} className="px-1 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">{sec}</span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-2 py-1.5 text-right font-mono ${getScoreClass(s.total_god_score || 0)}`}>
                        {s.total_god_score || '-'}
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{formatTime(s.created_at || '')}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => approveStartup(s.id)} className="p-1 hover:bg-green-500/20 rounded text-green-400" title="Approve">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={() => rejectStartup(s.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400" title="Reject">
                            <XCircle className="w-3 h-3" />
                          </button>
                          <button onClick={() => navigate(`/startup/${s.id}`)} className="p-1 hover:bg-blue-500/20 rounded text-blue-400" title="View">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingStartups.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No pending startups 🎉</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/80">
              <h2 className="text-sm font-semibold text-white">📋 Recent Activity</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={`${a.type}-${a.id}-${i}`} className="px-3 py-1.5 border-b border-gray-700/30 hover:bg-gray-700/20 flex items-center gap-2 text-xs">
                  <span>{getTypeIcon(a.type)}</span>
                  <span className="text-gray-400">{a.action}</span>
                  <span className="text-white truncate flex-1">{a.name}</span>
                  <span className="text-gray-600">{formatTime(a.created_at || '')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Match Queue */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/80 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">🔥 High-Score Matches Pending</h2>
              <Link to="/matching" className="text-xs text-orange-400 hover:text-orange-300">Manage All →</Link>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-400">Startup</th>
                    <th className="text-left px-2 py-2 text-gray-400">Investor</th>
                    <th className="text-right px-2 py-2 text-gray-400">Score</th>
                    <th className="text-right px-3 py-2 text-gray-400">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {matchQueue.slice(0, 15).map((m) => (
                    <tr key={m.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-3 py-1.5">
                        <Link to={`/startup/${m.startup_id}`} className="text-white hover:text-orange-400">{m.startup_name}</Link>
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/investor/${m.investor_id}`} className="text-gray-300 hover:text-violet-400">{m.investor_name}</Link>
                      </td>
                      <td className={`px-2 py-1.5 text-right font-mono ${getScoreClass(m.match_score)}`}>{m.match_score}%</td>
                      <td className="px-3 py-1.5 text-right text-gray-500">{formatTime(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Quality Table */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/80">
              <h2 className="text-sm font-semibold text-white">📊 Data Quality Report</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-400">Table</th>
                    <th className="text-right px-2 py-2 text-gray-400">Total</th>
                    <th className="text-right px-2 py-2 text-gray-400">Complete</th>
                    <th className="text-right px-2 py-2 text-gray-400">Missing</th>
                    <th className="text-right px-2 py-2 text-gray-400">Quality</th>
                    <th className="text-right px-3 py-2 text-gray-400">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {dataQuality.map((d) => {
                    const quality = d.total > 0 ? Math.round((d.complete / d.total) * 100) : 0;
                    return (
                      <tr key={d.table} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-3 py-1.5 text-white font-mono">{d.table}</td>
                        <td className="px-2 py-1.5 text-right text-gray-300 font-mono">{d.total.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right text-green-400 font-mono">{d.complete.toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right text-red-400 font-mono">{d.missing_key_fields}</td>
                        <td className="px-2 py-1.5 text-right">
                          <span className={`font-mono ${quality >= 80 ? 'text-green-400' : quality >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {quality}%
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{formatTime(d.last_updated)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Startup Data Gaps Panel */}
        {startupGaps && (
          <div className="bg-gray-800/50 rounded-lg border border-orange-500/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700 bg-orange-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-semibold text-white">⚠️ Startup Data Gaps ({startupGaps.total - startupGaps.has_all_data} need enrichment)</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={bulkEnrichAI} 
                  disabled={enriching}
                  className="px-2 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <Zap className="w-3 h-3" /> {enriching ? 'Enriching...' : 'AI Enrich (20)'}
                </button>
              </div>
            </div>
            
            {/* Gap Summary */}
            <div className="grid grid-cols-6 gap-2 p-3 border-b border-gray-700/50 text-xs">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{startupGaps.total}</div>
                <div className="text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{startupGaps.missing_description}</div>
                <div className="text-gray-500">No Description</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{startupGaps.missing_sectors}</div>
                <div className="text-gray-500">No Sectors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{startupGaps.missing_website}</div>
                <div className="text-gray-500">No Website</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{startupGaps.missing_location}</div>
                <div className="text-gray-500">No Location</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{startupGaps.has_all_data}</div>
                <div className="text-gray-500">Complete</div>
              </div>
            </div>

            {/* Incomplete Startups Table */}
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-gray-700/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-400">Startup</th>
                    <th className="text-left px-2 py-2 text-gray-400">Tagline</th>
                    <th className="text-center px-2 py-2 text-gray-400">Desc</th>
                    <th className="text-center px-2 py-2 text-gray-400">Sectors</th>
                    <th className="text-center px-2 py-2 text-gray-400">Web</th>
                    <th className="text-center px-2 py-2 text-gray-400">Loc</th>
                    <th className="text-right px-2 py-2 text-gray-400">GOD</th>
                    <th className="text-center px-3 py-2 text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {incompleteStartups.map((s) => (
                    <tr key={s.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-3 py-1.5">
                        <Link to={`/startup/${s.id}`} className="text-white hover:text-orange-400 font-medium">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-gray-400 truncate max-w-40">{s.tagline || '-'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {s.has_description ? <CheckCircle className="w-3 h-3 text-green-400 inline" /> : <XCircle className="w-3 h-3 text-red-400 inline" />}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {s.has_sectors ? <CheckCircle className="w-3 h-3 text-green-400 inline" /> : <XCircle className="w-3 h-3 text-red-400 inline" />}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {s.has_website ? <CheckCircle className="w-3 h-3 text-green-400 inline" /> : <XCircle className="w-3 h-3 text-yellow-400 inline" />}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {s.has_location ? <CheckCircle className="w-3 h-3 text-green-400 inline" /> : <XCircle className="w-3 h-3 text-yellow-400 inline" />}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-mono ${getScoreClass(s.total_god_score)}`}>
                        {s.total_god_score}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {((!s.has_description || !s.has_sectors) && s.tagline) && (
                          <button 
                            onClick={() => enrichWithAI(s)}
                            className="px-1.5 py-0.5 bg-orange-500/20 hover:bg-orange-500/40 rounded text-orange-400 text-[10px]"
                            title="Generate description + infer sectors from tagline"
                          >
                            <Zap className="w-3 h-3 inline" /> AI
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Actions - Minimal, just links */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-3">
          <div className="flex items-center gap-6 text-xs">
            <span className="text-gray-500 font-semibold">Quick Links:</span>
            <Link to="/admin/bulk-upload" className="text-blue-400 hover:text-blue-300">Bulk Upload</Link>
            <Link to="/admin/discovered-investors" className="text-violet-400 hover:text-violet-300">Manage Investors</Link>
            <Link to="/matching" className="text-orange-400 hover:text-orange-300">Matching Engine</Link>
            <Link to="/admin/rss-manager" className="text-green-400 hover:text-green-300">RSS Sources</Link>
            <Link to="/admin/discovered-startups" className="text-cyan-400 hover:text-cyan-300">Discovered Startups</Link>
            <Link to="/market-trends" className="text-amber-400 hover:text-amber-300">Market Trends</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCell({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: number | string; status: 'good' | 'warning' | 'error' }) {
  const statusClass = {
    good: 'text-green-400 border-green-500/30',
    warning: 'text-yellow-400 border-yellow-500/30',
    error: 'text-red-400 border-red-500/30'
  }[status];

  return (
    <div className={`bg-gray-800/50 rounded px-3 py-2 border ${statusClass}`}>
      <div className="flex items-center gap-2">
        <span className={statusClass.split(' ')[0]}>{icon}</span>
        <div>
          <div className={`font-mono font-bold text-lg ${statusClass.split(' ')[0]}`}>{value}</div>
          <div className="text-gray-500 text-[10px]">{label}</div>
        </div>
      </div>
    </div>
  );
}
