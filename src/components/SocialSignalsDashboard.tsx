import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  Heart, 
  MessageCircle, 
  Users,
  Flame,
  Twitter,
  ExternalLink,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SocialSignal {
  id: number;
  startup_name: string;
  platform: string;
  content: string;
  sentiment: 'praise' | 'concern' | 'interest' | 'help' | 'neutral';
  engagement_score: number;
  source_url: string;
  author: string;
  created_at: string;
}

interface StartupBuzz {
  startup_name: string;
  total_mentions: number;
  praise: number;
  concern: number;
  interest: number;
  help: number;
  neutral: number;
  avg_engagement: number;
  buzz_score: number;
  praise_pct: number;
  concern_pct: number;
}

export default function SocialSignalsDashboard() {
  const [topBuzz, setTopBuzz] = useState<StartupBuzz[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<string | null>(null);
  const [signals, setSignals] = useState<SocialSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'praise' | 'concern' | 'interest' | 'help'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  // Load top buzz startups
  useEffect(() => {
    async function loadTopBuzz() {
      try {
        // If RPC function doesn't exist, calculate manually
        const { data: signalsData, error: signalsError } = await supabase
          .from('social_signals')
          .select('startup_name, sentiment, engagement_score');
        
        if (signalsError) {
          console.error('Error loading signals:', signalsError);
          setLoading(false);
          return;
        }
        
        // Calculate buzz scores manually
        const buzzMap = new Map<string, StartupBuzz>();
        
        signalsData?.forEach(signal => {
          if (!buzzMap.has(signal.startup_name)) {
            buzzMap.set(signal.startup_name, {
              startup_name: signal.startup_name,
              total_mentions: 0,
              praise: 0,
              concern: 0,
              interest: 0,
              help: 0,
              neutral: 0,
              avg_engagement: 0,
              buzz_score: 0,
              praise_pct: 0,
              concern_pct: 0
            });
          }
          
          const buzz = buzzMap.get(signal.startup_name)!;
          buzz.total_mentions++;
          
          if (signal.sentiment === 'praise') buzz.praise++;
          else if (signal.sentiment === 'concern') buzz.concern++;
          else if (signal.sentiment === 'interest') buzz.interest++;
          else if (signal.sentiment === 'help') buzz.help++;
          else buzz.neutral++;
          
          buzz.avg_engagement += signal.engagement_score || 0;
        });
        
        // Calculate final scores
        const buzzList: StartupBuzz[] = Array.from(buzzMap.values()).map(buzz => {
          buzz.avg_engagement = buzz.total_mentions > 0 
            ? Math.round(buzz.avg_engagement / buzz.total_mentions) 
            : 0;
          
          // Calculate buzz score (same formula as scraper)
          let score = 0;
          score += buzz.total_mentions; // Base
          score += buzz.praise * 5;
          score += buzz.help * 3;
          score += buzz.interest * 2;
          score -= buzz.concern * 3;
          score += Math.min(buzz.avg_engagement / 10, 10) * buzz.total_mentions;
          
          buzz.buzz_score = Math.round(score);
          buzz.praise_pct = buzz.total_mentions > 0 
            ? Math.round((buzz.praise / buzz.total_mentions) * 100) 
            : 0;
          buzz.concern_pct = buzz.total_mentions > 0 
            ? Math.round((buzz.concern / buzz.total_mentions) * 100) 
            : 0;
          
          return buzz;
        });
        
        // Sort by buzz score and take top 30
        buzzList.sort((a, b) => b.buzz_score - a.buzz_score);
        setTopBuzz(buzzList.slice(0, 30));
      } catch (error) {
        console.error('Error loading top buzz:', error);
      }
      setLoading(false);
    }
    loadTopBuzz();
  }, []);

  // Load signals for selected startup
  useEffect(() => {
    if (!selectedStartup) {
      setSignals([]);
      return;
    }
    
    async function loadSignals() {
      try {
        let query = supabase
          .from('social_signals')
          .select('*')
          .eq('startup_name', selectedStartup)
          .order('engagement_score', { ascending: false })
          .limit(50);
        
        if (filter !== 'all') {
          query = query.eq('sentiment', filter);
        }
        
        if (platformFilter !== 'all') {
          query = query.eq('platform', platformFilter);
        }
        
        const { data, error } = await query;
        
        if (!error && data) {
          setSignals(data as SocialSignal[]);
        }
      } catch (error) {
        console.error('Error loading signals:', error);
      }
    }
    loadSignals();
  }, [selectedStartup, filter, platformFilter]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'praise': return 'text-green-400 bg-green-500/20';
      case 'concern': return 'text-red-400 bg-red-500/20';
      case 'interest': return 'text-blue-400 bg-blue-500/20';
      case 'help': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'praise': return <Heart className="w-4 h-4" />;
      case 'concern': return <AlertCircle className="w-4 h-4" />;
      case 'interest': return <Search className="w-4 h-4" />;
      case 'help': return <Users className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'reddit': return <MessageCircle className="w-4 h-4" />;
      case 'hackernews': return <TrendingUp className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getBuzzTier = (score: number) => {
    if (score >= 2000) return { label: 'Viral', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    if (score >= 1000) return { label: 'High', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (score >= 500) return { label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (score >= 100) return { label: 'Low', color: 'text-gray-400', bg: 'bg-gray-500/20' };
    return { label: 'Quiet', color: 'text-gray-500', bg: 'bg-gray-600/20' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-400">Loading social signals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-400" />
            Social Signals Intelligence
          </h1>
          <p className="text-gray-400">
            Real-time community buzz and sentiment analysis from Twitter, Reddit, and Hacker News
          </p>
        </div>

        {/* Top Buzz Startups */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            Top Buzz Startups
          </h2>
          
          {topBuzz.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No social signals data yet.</p>
              <p className="text-sm mt-2">Run the social signals scraper to collect data.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topBuzz.map((startup) => {
                const tier = getBuzzTier(startup.buzz_score);
                return (
                  <button
                    key={startup.startup_name}
                    onClick={() => setSelectedStartup(startup.startup_name)}
                    className={`text-left p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedStartup === startup.startup_name
                        ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-700 bg-slate-900/50 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white">{startup.startup_name}</h3>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${tier.color} ${tier.bg}`}>
                        {tier.label}
                      </span>
                    </div>
                    
                    <div className="text-2xl font-bold text-cyan-400 mb-2">
                      {startup.buzz_score}
                    </div>
                    
                    <div className="text-sm text-gray-400 mb-3">
                      {startup.total_mentions} mentions • Avg engagement: {startup.avg_engagement}
                    </div>
                    
                    {/* Sentiment bars */}
                    <div className="space-y-1">
                      {startup.praise > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-green-400" 
                              style={{ width: `${startup.praise_pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-green-400">{startup.praise_pct}%</span>
                        </div>
                      )}
                      
                      {startup.concern > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-red-400" 
                              style={{ width: `${startup.concern_pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-red-400">{startup.concern_pct}%</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Startup Signals */}
        {selectedStartup && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                {selectedStartup} - Social Signals
              </h2>
              
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm border border-slate-600 hover:border-cyan-500/50 transition-colors"
                >
                  <option value="all">All Sentiment</option>
                  <option value="praise">Praise Only</option>
                  <option value="concern">Concerns Only</option>
                  <option value="interest">Interest</option>
                  <option value="help">Help Offered</option>
                </select>
                
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="bg-slate-700 text-white px-3 py-2 rounded-lg text-sm border border-slate-600 hover:border-cyan-500/50 transition-colors"
                >
                  <option value="all">All Platforms</option>
                  <option value="twitter">Twitter</option>
                  <option value="reddit">Reddit</option>
                  <option value="hackernews">Hacker News</option>
                </select>
                
                <button
                  onClick={() => setSelectedStartup(null)}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 hover:border-slate-500 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {/* Signals List */}
            <div className="space-y-4">
              {signals.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  No signals found for these filters
                </div>
              ) : (
                signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(signal.platform)}
                        <span className="text-gray-400 text-sm capitalize">{signal.platform}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500 text-sm">{signal.author || 'anonymous'}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${getSentimentColor(signal.sentiment)}`}>
                          {getSentimentIcon(signal.sentiment)}
                          {signal.sentiment}
                        </span>
                        
                        {signal.engagement_score > 0 && (
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {signal.engagement_score}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-3 line-clamp-3">{signal.content || 'No content available'}</p>
                    
                    {signal.source_url && (
                      <a
                        href={signal.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 text-sm flex items-center gap-1 hover:text-cyan-300 transition-colors"
                      >
                        View original <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

