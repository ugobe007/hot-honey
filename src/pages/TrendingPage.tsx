import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Search, Zap, Brain, Building2, Users, 
  ChevronRight, Star, Target, Rocket, Shield, Lock,
  Sparkles, ArrowRight, Filter, BarChart3, Globe,
  Cpu, Banknote, FlaskConical, Satellite, Factory,
  Heart, ShoppingBag, GraduationCap, Leaf, Car
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

// Category definitions with icons
const CATEGORIES = [
  { id: 'all', name: 'All Hot', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
  { id: 'ai', name: 'AI & ML', icon: Cpu, color: 'from-purple-500 to-indigo-500' },
  { id: 'fintech', name: 'FinTech', icon: Banknote, color: 'from-emerald-500 to-teal-500' },
  { id: 'healthtech', name: 'HealthTech', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { id: 'climate', name: 'Climate', icon: Leaf, color: 'from-green-500 to-emerald-500' },
  { id: 'robotics', name: 'Robotics', icon: Factory, color: 'from-slate-500 to-zinc-500' },
  { id: 'spacetech', name: 'SpaceTech', icon: Satellite, color: 'from-blue-500 to-cyan-500' },
  { id: 'biotech', name: 'BioTech', icon: FlaskConical, color: 'from-violet-500 to-purple-500' },
  { id: 'edtech', name: 'EdTech', icon: GraduationCap, color: 'from-amber-500 to-yellow-500' },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingBag, color: 'from-orange-500 to-amber-500' },
  { id: 'mobility', name: 'Mobility', icon: Car, color: 'from-cyan-500 to-blue-500' },
];

// Map sectors to category IDs
const sectorToCategoryMap: Record<string, string> = {
  'artificial intelligence': 'ai',
  'ai': 'ai',
  'machine learning': 'ai',
  'ml': 'ai',
  'deep learning': 'ai',
  'generative ai': 'ai',
  'fintech': 'fintech',
  'financial services': 'fintech',
  'payments': 'fintech',
  'banking': 'fintech',
  'insurtech': 'fintech',
  'healthtech': 'healthtech',
  'healthcare': 'healthtech',
  'digital health': 'healthtech',
  'medtech': 'healthtech',
  'biotech': 'biotech',
  'life sciences': 'biotech',
  'climate': 'climate',
  'cleantech': 'climate',
  'sustainability': 'climate',
  'renewable energy': 'climate',
  'robotics': 'robotics',
  'automation': 'robotics',
  'manufacturing': 'robotics',
  'hardware': 'robotics',
  'space': 'spacetech',
  'aerospace': 'spacetech',
  'satellites': 'spacetech',
  'edtech': 'edtech',
  'education': 'edtech',
  'e-commerce': 'ecommerce',
  'ecommerce': 'ecommerce',
  'retail': 'ecommerce',
  'marketplace': 'ecommerce',
  'mobility': 'mobility',
  'transportation': 'mobility',
  'automotive': 'mobility',
  'logistics': 'mobility',
};

interface Startup {
  id: string;
  name: string;
  tagline?: string;
  sector?: string;
  stage?: string;
  location?: string;
  god_score?: number;
  votes?: number;
  website?: string;
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

export default function TrendingPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchMode, setSearchMode] = useState<'startup' | 'investor'>('startup');
  const [searchQuery, setSearchQuery] = useState('');
  const [startups, setStartups] = useState<Startup[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch startups with god_score
      const { data: startupData } = await supabase
        .from('startups')
        .select('id, name, tagline, sector, stage, location, god_score, votes, website')
        .order('god_score', { ascending: false, nullsFirst: false })
        .limit(200);
      
      // Fetch investors
      const { data: investorData } = await supabase
        .from('investors')
        .select('id, name, type, sectors, stage, check_size, geography, portfolio_size, notable_investments')
        .limit(200);
      
      setStartups(startupData || []);
      setInvestors(investorData || []);
      setLoading(false);
    }
    
    fetchData();
  }, []);

  // Get category for a startup based on sector
  const getCategory = (sector?: string): string => {
    if (!sector) return 'all';
    const lowerSector = sector.toLowerCase();
    for (const [key, value] of Object.entries(sectorToCategoryMap)) {
      if (lowerSector.includes(key)) return value;
    }
    return 'all';
  };

  // Filter startups by category
  const filteredStartups = useMemo(() => {
    let filtered = startups;
    
    if (activeCategory !== 'all') {
      filtered = startups.filter(s => getCategory(s.sector) === activeCategory);
    }
    
    if (searchQuery && searchMode === 'startup') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.tagline?.toLowerCase().includes(query) ||
        s.sector?.toLowerCase().includes(query)
      );
    }
    
    return filtered.slice(0, 20);
  }, [startups, activeCategory, searchQuery, searchMode]);

  // Filter investors
  const filteredInvestors = useMemo(() => {
    let filtered = investors;
    
    if (searchQuery && searchMode === 'investor') {
      const query = searchQuery.toLowerCase();
      filtered = investors.filter(i => 
        i.name?.toLowerCase().includes(query) ||
        i.type?.toLowerCase().includes(query) ||
        i.sectors?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    return filtered.slice(0, 20);
  }, [investors, searchQuery, searchMode]);

  // Handle startup click - show teaser then prompt signup
  const handleStartupClick = (startup: Startup) => {
    setSelectedStartup(startup);
    setSelectedInvestor(null);
    setShowSignupPrompt(true);
  };

  // Handle investor click
  const handleInvestorClick = (investor: Investor) => {
    setSelectedInvestor(investor);
    setSelectedStartup(null);
    setShowSignupPrompt(true);
  };

  // Generate mock match preview (teaser)
  const generateMatchTeaser = () => {
    const matchScores = [94, 91, 88, 85, 82, 79, 76, 73, 70, 67];
    return matchScores.slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0f0520] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Navigation Buttons - Top Right */}
      <div className="fixed top-6 right-8 z-50 flex items-center gap-4">
        <Link 
          to="/about" 
          className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-purple-900 font-bold rounded-xl transition-all shadow-lg"
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Live Rankings</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              🔥 Trending Hot
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover the hottest startups and top investors. Find your perfect match with AI-powered insights.
          </p>
        </div>

        {/* Search Mode Toggle & Search Bar */}
        <div className="max-w-4xl mx-auto mb-10">
          {/* Mode Toggle */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setSearchMode('startup')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                searchMode === 'startup'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <Rocket className="w-5 h-5" />
              Find Investors for Startups
            </button>
            <button
              onClick={() => setSearchMode('investor')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                searchMode === 'investor'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <Users className="w-5 h-5" />
              Find Startups for Investors
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchMode === 'startup' 
                ? "Search startups by name, sector, or description..." 
                : "Search investors by name, type, or focus area..."}
              className="w-full pl-12 pr-4 py-4 bg-white/10 border border-purple-500/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
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

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                  activeCategory === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Trending Table */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 overflow-hidden">
              <div className="p-6 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    {searchMode === 'startup' ? (
                      <>
                        <Rocket className="w-6 h-6 text-orange-400" />
                        Top 20 Hot Startups
                      </>
                    ) : (
                      <>
                        <Users className="w-6 h-6 text-purple-400" />
                        Top 20 Investors
                      </>
                    )}
                  </h2>
                  <span className="text-sm text-gray-400">
                    {CATEGORIES.find(c => c.id === activeCategory)?.name}
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading trending data...</p>
                </div>
              ) : searchMode === 'startup' ? (
                <div className="divide-y divide-purple-500/10">
                  {filteredStartups.map((startup, index) => (
                    <div
                      key={startup.id}
                      onClick={() => handleStartupClick(startup)}
                      className="p-4 hover:bg-white/5 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          index < 3 
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white group-hover:text-orange-300 transition-colors truncate">
                              {startup.name}
                            </h3>
                            {index < 3 && <span className="text-orange-400">🔥</span>}
                          </div>
                          <p className="text-sm text-gray-400 truncate">{startup.tagline || startup.sector}</p>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            {startup.god_score || Math.floor(70 + Math.random() * 25)}
                          </div>
                          <div className="text-xs text-gray-500">Hot Score</div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                  
                  {filteredStartups.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <Rocket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No startups found in this category</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-purple-500/10">
                  {filteredInvestors.map((investor, index) => (
                    <div
                      key={investor.id}
                      onClick={() => handleInvestorClick(investor)}
                      className="p-4 hover:bg-white/5 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          index < 3 
                            ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                              {investor.name}
                            </h3>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                              {investor.type || 'VC'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {investor.sectors?.slice(0, 3).join(', ') || 'Multi-sector'}
                          </p>
                        </div>

                        {/* Check Size */}
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-400">
                            {investor.check_size || '$1M-$10M'}
                          </div>
                          <div className="text-xs text-gray-500">Check Size</div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                  
                  {filteredInvestors.length === 0 && (
                    <div className="p-12 text-center text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No investors found matching your search</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Match Preview & CTA */}
          <div className="space-y-6">
            {/* Match Engine Teaser */}
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Spark Engine™</h3>
                  <p className="text-sm text-purple-300">AI-Powered Matching</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Our proprietary algorithm analyzes 50+ data points to find your perfect match with detailed strategy recommendations.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Compatibility scoring</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span>Approach strategy</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>Instant insights</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-400" />
                Platform Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                    700+
                  </div>
                  <div className="text-xs text-gray-400">Startups</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    500+
                  </div>
                  <div className="text-xs text-gray-400">Investors</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    337+
                  </div>
                  <div className="text-xs text-gray-400">Matches</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                    60s
                  </div>
                  <div className="text-xs text-gray-400">Match Time</div>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-lg rounded-3xl border border-orange-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-2">Ready to Find Your Match?</h3>
              <p className="text-gray-300 text-sm mb-4">
                Sign up to unlock full matching capabilities and connect with your ideal partners.
              </p>
              <Link
                to="/get-matched"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                <Zap className="w-5 h-5" />
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Match Preview Modal */}
      {showSignupPrompt && (selectedStartup || selectedInvestor) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a0033] to-[#2d1b4e] rounded-3xl border border-purple-500/30 max-w-lg w-full p-8 relative">
            <button
              onClick={() => {
                setShowSignupPrompt(false);
                setSelectedStartup(null);
                setSelectedInvestor(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            {selectedStartup && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedStartup.name}</h2>
                  <p className="text-gray-400">{selectedStartup.tagline || selectedStartup.sector}</p>
                </div>

                {/* Match Preview */}
                <div className="bg-black/30 rounded-2xl p-4 mb-6">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Top Investor Matches Preview
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
                        <span className="text-sm font-bold text-purple-300">{score}%</span>
                        <Lock className="w-4 h-4 text-gray-500" />
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-2">+ 7 more matches hidden</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-300 text-sm mb-4">
                    Sign up to see your top 10 investor matches with approach strategies
                  </p>
                  <Link
                    to="/get-matched"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Unlock Full Matches
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </>
            )}

            {selectedInvestor && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedInvestor.name}</h2>
                  <p className="text-gray-400">{selectedInvestor.type} • {selectedInvestor.check_size || '$1M-$10M'}</p>
                </div>

                {/* Match Preview */}
                <div className="bg-black/30 rounded-2xl p-4 mb-6">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Top Startup Matches Preview
                  </h3>
                  <div className="space-y-2">
                    {generateMatchTeaser().map((score, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-orange-300">{score}%</span>
                        <Lock className="w-4 h-4 text-gray-500" />
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-2">+ 17 more matches hidden</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-300 text-sm mb-4">
                    Sign up to discover startups perfectly matched to your investment thesis
                  </p>
                  <Link
                    to="/get-matched"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Unlock Full Matches
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
