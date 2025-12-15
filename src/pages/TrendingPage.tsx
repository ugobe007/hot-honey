import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Search, Zap, Brain, Building2, Users, 
  ChevronRight, Star, Target, Rocket, Shield, Lock,
  Sparkles, ArrowRight, Filter, BarChart3, Globe,
  Cpu, Banknote, FlaskConical, Satellite, Factory,
  Heart, ShoppingBag, GraduationCap, Leaf, Car,
  ChevronDown, ChevronUp, Trophy, Flame
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

// Category definitions with icons and keywords for matching
const CATEGORIES = [
  { id: 'ai', name: 'AI & Machine Learning', icon: Cpu, color: 'from-purple-500 to-indigo-500', keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'generative', 'llm', 'nlp', 'computer vision', 'neural', 'gpt', 'content', 'image', 'video', 'translation', 'search', 'simulation'] },
  { id: 'cybersecurity', name: 'Cybersecurity', icon: Shield, color: 'from-red-500 to-rose-500', keywords: ['cybersecurity', 'security', 'cyber', 'infosec', 'threat', 'privacy', 'encryption', 'identity'] },
  { id: 'fintech', name: 'FinTech & Payments', icon: Banknote, color: 'from-emerald-500 to-teal-500', keywords: ['fintech', 'financial', 'payments', 'banking', 'insurance', 'insurtech', 'crypto', 'blockchain', 'defi', 'lending', 'wealth', 'trading', 'credit'] },
  { id: 'healthtech', name: 'HealthTech & Digital Health', icon: Heart, color: 'from-pink-500 to-rose-500', keywords: ['health', 'healthcare', 'medical', 'medtech', 'digital health', 'telehealth', 'wellness', 'clinical', 'patient', 'diagnostic'] },
  { id: 'climate', name: 'Climate & Clean Energy', icon: Leaf, color: 'from-green-500 to-emerald-500', keywords: ['climate', 'cleantech', 'sustainability', 'renewable', 'energy', 'solar', 'green', 'carbon', 'ev', 'electric', 'environmental', 'recycling'] },
  { id: 'saas', name: 'SaaS & Developer Tools', icon: Building2, color: 'from-blue-500 to-cyan-500', keywords: ['saas', 'enterprise', 'b2b', 'software', 'cloud', 'productivity', 'workflow', 'crm', 'erp', 'platform', 'developer', 'devops', 'database', 'backend', 'infrastructure', 'collaboration'] },
  { id: 'ecommerce', name: 'E-Commerce & Consumer', icon: ShoppingBag, color: 'from-orange-500 to-amber-500', keywords: ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'dtc', 'consumer', 'shopping', 'commerce', 'brand', 'fashion', 'food', 'delivery', 'quick'] },
  { id: 'edtech', name: 'EdTech & Learning', icon: GraduationCap, color: 'from-amber-500 to-yellow-500', keywords: ['edtech', 'education', 'learning', 'training', 'school', 'university', 'course', 'tutoring', 'skill'] },
  { id: 'mobility', name: 'Mobility & Logistics', icon: Car, color: 'from-cyan-500 to-blue-500', keywords: ['mobility', 'transportation', 'automotive', 'logistics', 'delivery', 'supply chain', 'fleet', 'shipping', 'freight', 'marine'] },
  { id: 'biotech', name: 'BioTech & Life Sciences', icon: FlaskConical, color: 'from-violet-500 to-purple-500', keywords: ['biotech', 'biotechnology', 'life sciences', 'pharma', 'drug', 'genomics', 'therapeutics'] },
  { id: 'hardware', name: 'Hardware & Deep Tech', icon: Factory, color: 'from-slate-500 to-zinc-500', keywords: ['hardware', 'robotics', 'iot', 'devices', 'manufacturing', 'sensors', 'drones', '3d printing', 'semiconductor', 'optical', 'aerospace', 'space', 'industrial'] },
];

interface Startup {
  id: string;
  name: string;
  tagline?: string;
  industry?: string;
  industries?: string[];
  stage?: number;
  geography?: string;
  website?: string;
  pitch?: string;
  funding?: string;
  five_points?: string[];
  hotScore?: number; // calculated client-side
}

interface Investor {
  id: string;
  name: string;
  type?: string;
  sectors?: string[];
  stage?: string[];
  check_size?: string;
  geography?: string;
  portfolio_size?: number;
  notable_investments?: string[];
}

// Calculate a hot score based on available data
function calculateHotScore(startup: Startup): number {
  let score = 50; // base score
  
  // Has funding info
  if (startup.funding && startup.funding !== 'Unknown') {
    const fundingMatch = startup.funding.match(/\$?([\d.]+)\s*(million|m|k|thousand)?/i);
    if (fundingMatch) {
      const amount = parseFloat(fundingMatch[1]);
      const unit = fundingMatch[2]?.toLowerCase();
      if (unit === 'million' || unit === 'm') {
        score += Math.min(amount * 2, 30); // max 30 points from funding
      } else if (amount > 100) {
        score += 15;
      }
    }
  }
  
  // Has 5 points (well-documented)
  if (startup.five_points && startup.five_points.length >= 3) {
    score += 10;
  }
  
  // Has tagline
  if (startup.tagline && startup.tagline.length > 20) {
    score += 5;
  }
  
  // Has website
  if (startup.website) {
    score += 5;
  }
  
  return Math.min(Math.round(score), 99);
}

// Categorize a startup based on its industry/tagline/pitch
function categorizeStartup(startup: Startup): string[] {
  const text = `${startup.industry || ''} ${startup.tagline || ''} ${startup.pitch || ''} ${startup.name || ''} ${startup.industries?.join(' ') || ''}`.toLowerCase();
  const matchedCategories: string[] = [];
  
  for (const cat of CATEGORIES) {
    for (const keyword of cat.keywords) {
      if (text.includes(keyword)) {
        matchedCategories.push(cat.id);
        break;
      }
    }
  }
  
  return matchedCategories.length > 0 ? matchedCategories : ['other'];
}

export default function TrendingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [startups, setStartups] = useState<Startup[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ai: true,
    fintech: true,
    healthtech: true,
  });
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch startups with actual columns
      const { data: startupData, error: startupError } = await supabase
        .from('startups')
        .select('id, name, tagline, industry, industries, stage, geography, website, pitch, funding, five_points')
        .limit(500);
      
      if (startupError) {
        console.error('Error fetching startups:', startupError);
      }
      
      // Calculate hot scores and add to startups
      const startupsWithScores = (startupData || []).map(s => ({
        ...s,
        hotScore: calculateHotScore(s)
      })).sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
      
      // Fetch investors
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id, name, type, sectors, stage, check_size, geography, portfolio_size, notable_investments')
        .limit(200);
      
      if (investorError) {
        console.error('Error fetching investors:', investorError);
      }
      
      setStartups(startupsWithScores);
      setInvestors(investorData || []);
      setLoading(false);
    }
    
    fetchData();
  }, []);

  // Organize startups by category
  const startupsByCategory = useMemo(() => {
    const categorized: Record<string, Startup[]> = {};
    
    // Initialize all categories
    for (const cat of CATEGORIES) {
      categorized[cat.id] = [];
    }
    categorized['other'] = [];
    
    // Categorize each startup
    for (const startup of startups) {
      const categories = categorizeStartup(startup);
      for (const catId of categories) {
        if (categorized[catId]) {
          categorized[catId].push(startup);
        }
      }
    }
    
    // Sort each category by hotScore and limit to top entries
    for (const catId of Object.keys(categorized)) {
      categorized[catId] = categorized[catId]
        .sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0))
        .slice(0, 20); // Top 20 per category
    }
    
    return categorized;
  }, [startups]);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return startupsByCategory;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, Startup[]> = {};
    
    for (const [catId, catStartups] of Object.entries(startupsByCategory)) {
      filtered[catId] = catStartups.filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.tagline?.toLowerCase().includes(query) ||
        s.industry?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [startupsByCategory, searchQuery]);

  // Toggle section expansion
  const toggleSection = (catId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Handle startup click
  const handleStartupClick = (startup: Startup) => {
    setSelectedStartup(startup);
    setShowSignupPrompt(true);
  };

  // Generate mock match preview
  const generateMatchTeaser = () => {
    return [94, 91, 88];
  };

  // Count totals
  const totalStartups = startups.length;
  const totalInvestors = investors.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0f0520] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Navigation Buttons - Top Right */}
      <div className="fixed top-6 right-8 z-50 flex items-center gap-4">
        <Link 
          to="/about" 
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20"
        >
          About
        </Link>
        <Link 
          to="/get-matched" 
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
        >
          Get Matched
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full mb-4">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Live Rankings • Real-Time Data</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              🔥 Trending by Sector
            </span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Discover {totalStartups}+ startups ranked by Hot Score across {CATEGORIES.length} sectors
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <Rocket className="w-5 h-5 text-orange-400" />
            <span className="text-2xl font-bold text-white">{totalStartups}+</span>
            <span className="text-sm text-gray-400">Startups</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <Building2 className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-bold text-white">{totalInvestors}+</span>
            <span className="text-sm text-gray-400">Investors</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-bold text-white">{CATEGORIES.length}</span>
            <span className="text-sm text-gray-400">Sectors</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search startups across all sectors..."
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading trending startups by sector...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* 🔥 TOP 10 HOTTEST STARTUPS - Leaderboard */}
            <div className="bg-gradient-to-br from-orange-900/30 via-red-900/20 to-purple-900/30 backdrop-blur-lg rounded-2xl border border-orange-500/40 overflow-hidden">
              <div className="p-5 border-b border-orange-500/30">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  Top 10 Hottest Startups
                  <span className="text-sm font-normal text-orange-300 bg-orange-500/20 px-3 py-1 rounded-full">Live Rankings</span>
                </h2>
                <p className="text-gray-400 text-sm mt-1">Highest match scores across all sectors</p>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-orange-500/20">
                        <th className="pb-3 pl-2 w-16">Rank</th>
                        <th className="pb-3">Startup</th>
                        <th className="pb-3">Sector</th>
                        <th className="pb-3 hidden md:table-cell">Stage/Funding</th>
                        <th className="pb-3 hidden lg:table-cell">Location</th>
                        <th className="pb-3 text-right pr-2">Hot Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-500/10">
                      {startups.slice(0, 10).map((startup, index) => {
                        const categories = categorizeStartup(startup);
                        const primaryCategory = CATEGORIES.find(c => c.id === categories[0]) || CATEGORIES[0];
                        const Icon = primaryCategory.icon;
                        return (
                          <tr
                            key={startup.id}
                            onClick={() => handleStartupClick(startup)}
                            className="hover:bg-orange-500/10 cursor-pointer transition-colors group"
                          >
                            <td className="py-4 pl-2">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                index === 0 
                                  ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30' 
                                  : index === 1
                                    ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-black shadow-lg shadow-gray-400/20'
                                    : index === 2
                                      ? 'bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg shadow-orange-500/20'
                                      : 'bg-white/10 text-gray-300 border border-white/20'
                              }`}>
                                {index === 0 ? '👑' : index + 1}
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-bold text-white group-hover:text-orange-300 transition-colors flex items-center gap-2 text-lg">
                                    {startup.name}
                                    {index < 3 && <span className="animate-pulse">🔥</span>}
                                  </div>
                                  <div className="text-sm text-gray-400 truncate max-w-[200px] md:max-w-[300px]">
                                    {startup.tagline || 'Innovative startup'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${primaryCategory.color} flex items-center justify-center`}>
                                  <Icon className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="text-sm text-gray-300">{primaryCategory.name.split(' ')[0]}</span>
                              </div>
                            </td>
                            <td className="py-4 hidden md:table-cell">
                              <span className="px-3 py-1.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {startup.funding || (startup.stage === 1 ? 'Seed' : startup.stage === 2 ? 'Series A' : 'Early')}
                              </span>
                            </td>
                            <td className="py-4 hidden lg:table-cell text-sm text-gray-400">
                              {startup.geography || 'Global'}
                            </td>
                            <td className="py-4 pr-2 text-right">
                              <div className="inline-flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                                      style={{ width: `${startup.hotScore || 0}%` }}
                                    />
                                  </div>
                                </div>
                                <span className={`text-xl font-bold ${
                                  (startup.hotScore || 0) >= 80 
                                    ? 'text-orange-400' 
                                    : (startup.hotScore || 0) >= 60 
                                      ? 'text-yellow-400'
                                      : 'text-gray-400'
                                }`}>
                                  {startup.hotScore}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 🏆 SECTOR LEADERS - Best from each category */}
            <div className="bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-cyan-900/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 overflow-hidden">
              <div className="p-5 border-b border-purple-500/30">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Trophy className="w-7 h-7 text-yellow-400" />
                  Sector Leaders
                  <span className="text-sm font-normal text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full">#1 in Each Category</span>
                </h2>
                <p className="text-gray-400 text-sm mt-1">Top-performing startup from each sector</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CATEGORIES.map((category) => {
                    const topStartup = (startupsByCategory[category.id] || [])[0];
                    if (!topStartup) return null;
                    const Icon = category.icon;
                    
                    return (
                      <div
                        key={category.id}
                        onClick={() => topStartup && handleStartupClick(topStartup)}
                        className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-400">{topStartup.hotScore}</div>
                            <div className="text-xs text-gray-500">Hot Score</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{category.name}</div>
                        <div className="font-bold text-white group-hover:text-orange-300 transition-colors truncate">
                          {topStartup.name}
                        </div>
                        <div className="text-sm text-gray-400 truncate mt-1">
                          {topStartup.tagline || topStartup.industry || 'Leading startup'}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                            {topStartup.funding || 'Early Stage'}
                          </span>
                          <span className="text-xs text-gray-500">{topStartup.geography || 'Global'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 📊 SECTOR BREAKDOWN TABLE */}
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl border border-purple-500/30 overflow-hidden">
              <div className="p-5 border-b border-purple-500/30">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BarChart3 className="w-7 h-7 text-cyan-400" />
                  Sector Overview
                  <span className="text-sm font-normal text-cyan-300 bg-cyan-500/20 px-3 py-1 rounded-full">Quick Stats</span>
                </h2>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-purple-500/20">
                        <th className="pb-3 pl-2">Sector</th>
                        <th className="pb-3 text-center">Startups</th>
                        <th className="pb-3 text-center">Avg Score</th>
                        <th className="pb-3 text-center">Top Score</th>
                        <th className="pb-3 hidden md:table-cell">Top Startup</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/10">
                      {CATEGORIES.map((category) => {
                        const catStartups = startupsByCategory[category.id] || [];
                        if (catStartups.length === 0) return null;
                        const Icon = category.icon;
                        const avgScore = Math.round(catStartups.reduce((sum, s) => sum + (s.hotScore || 0), 0) / catStartups.length);
                        const topScore = catStartups[0]?.hotScore || 0;
                        const topName = catStartups[0]?.name || '--';
                        
                        return (
                          <tr key={category.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 pl-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                                  <Icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-medium text-white">{category.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className="text-lg font-bold text-purple-300">{catStartups.length}</span>
                            </td>
                            <td className="py-3 text-center">
                              <span className={`text-lg font-bold ${avgScore >= 70 ? 'text-green-400' : avgScore >= 55 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                {avgScore}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="text-lg font-bold text-orange-400">{topScore}</span>
                            </td>
                            <td className="py-3 hidden md:table-cell text-sm text-gray-300 truncate max-w-[200px]">
                              {topName}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
              <span className="text-gray-500 text-sm uppercase tracking-wider">Browse by Sector</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            </div>

            {/* Sector Chart Tables */}
            <div className="space-y-6">
            {CATEGORIES.map((category) => {
              const categoryStartups = filteredCategories[category.id] || [];
              const Icon = category.icon;
              const isExpanded = expandedSections[category.id];
              const displayCount = isExpanded ? 10 : 5;
              const displayStartups = categoryStartups.slice(0, displayCount);
              
              if (categoryStartups.length === 0) return null;
              
              return (
                <div 
                  key={category.id}
                  className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl border border-purple-500/30 overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(category.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          {category.name}
                          {categoryStartups.length >= 10 && <Flame className="w-4 h-4 text-orange-400" />}
                        </h2>
                        <p className="text-sm text-gray-400">{categoryStartups.length} hot startups</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 hidden sm:inline">
                        {isExpanded ? 'Show less' : `View top ${Math.min(10, categoryStartups.length)}`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Table */}
                  <div className="px-4 pb-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-purple-500/20">
                            <th className="pb-2 pl-2 w-14">Rank</th>
                            <th className="pb-2">Startup</th>
                            <th className="pb-2 hidden md:table-cell">Stage</th>
                            <th className="pb-2 hidden lg:table-cell">Location</th>
                            <th className="pb-2 text-right pr-2">Hot Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/10">
                          {displayStartups.map((startup, index) => (
                            <tr
                              key={startup.id}
                              onClick={() => handleStartupClick(startup)}
                              className="hover:bg-white/5 cursor-pointer transition-colors group"
                            >
                              <td className="py-3 pl-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  index === 0 
                                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' 
                                    : index === 1
                                      ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black'
                                      : index === 2
                                        ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white'
                                        : 'bg-white/10 text-gray-400'
                                }`}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="py-3">
                                <div>
                                  <div className="font-semibold text-white group-hover:text-orange-300 transition-colors flex items-center gap-2">
                                    {startup.name}
                                    {index < 3 && <span className="text-orange-400 text-sm">🔥</span>}
                                  </div>
                                  <div className="text-sm text-gray-400 truncate max-w-[180px] md:max-w-[280px]">
                                    {startup.tagline || startup.industry || 'Innovative startup'}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 hidden md:table-cell">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  startup.stage === 1
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : startup.stage === 2
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : startup.stage && startup.stage >= 3
                                        ? 'bg-purple-500/20 text-purple-300'
                                        : 'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {startup.stage === 1 ? 'Seed' : startup.stage === 2 ? 'Series A' : startup.stage === 3 ? 'Series B' : startup.funding || 'Early'}
                                </span>
                              </td>
                              <td className="py-3 hidden lg:table-cell text-sm text-gray-400">
                                {startup.geography || 'Global'}
                              </td>
                              <td className="py-3 pr-2 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <div className={`text-lg font-bold ${
                                    (startup.hotScore || 0) >= 80 
                                      ? 'bg-gradient-to-r from-orange-400 to-red-400' 
                                      : (startup.hotScore || 0) >= 60 
                                        ? 'bg-gradient-to-r from-yellow-400 to-orange-400'
                                        : 'bg-gradient-to-r from-gray-400 to-gray-300'
                                  } bg-clip-text text-transparent`}>
                                    {startup.hotScore || '--'}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {categoryStartups.length > 5 && !isExpanded && (
                      <button
                        onClick={() => toggleSection(category.id)}
                        className="mt-3 w-full py-2 text-center text-sm text-purple-300 hover:text-purple-200 transition-colors border-t border-purple-500/20"
                      >
                        View {Math.min(10, categoryStartups.length) - 5} more startups →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 max-w-2xl mx-auto">
            <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Want AI-Powered Investor Matches?</h2>
            <p className="text-gray-300 mb-6">
              Get personalized investor recommendations with our Spark Engine™ - find your perfect match in 60 seconds.
            </p>
            <Link
              to="/get-matched"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              <Zap className="w-5 h-5" />
              Get Matched Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Match Preview Modal */}
      {showSignupPrompt && selectedStartup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a0033] to-[#2d1b4e] rounded-2xl border border-purple-500/30 max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowSignupPrompt(false);
                setSelectedStartup(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-3">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{selectedStartup.name}</h2>
              <p className="text-gray-400 text-sm">{selectedStartup.tagline || selectedStartup.industry}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-bold">{selectedStartup.hotScore || 85}</span>
                <span className="text-orange-300 text-sm">Hot Score</span>
              </div>
            </div>

            {/* Match Preview */}
            <div className="bg-black/30 rounded-xl p-4 mb-5">
              <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Top Investor Matches
              </h3>
              <div className="space-y-2">
                {generateMatchTeaser().map((score, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-purple-300 w-10">{score}%</span>
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">+ 7 more matches hidden</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-300 text-sm mb-4">
                Sign up to see your top investor matches with approach strategies
              </p>
              <Link
                to="/get-matched"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg w-full justify-center"
              >
                <Sparkles className="w-5 h-5" />
                Unlock Matches
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
