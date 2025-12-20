import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InvestorCard from '../components/InvestorCard';
import LogoDropdownMenu from '../components/LogoDropdownMenu';
import investorData, { InvestorFirm } from '../data/investorData';
import { getAllInvestors, searchInvestors } from '../lib/investorService';

export default function InvestorsPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [investors, setInvestors] = useState<InvestorFirm[]>(investorData);
  const [loading, setLoading] = useState(true);
  const [useDatabase, setUseDatabase] = useState(false);

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    setLoading(true);
    const { data, error } = await getAllInvestors();
    
    if (!error && data && data.length > 0) {
      // Data is already mapped by investorService, just need to format checkSize
      const mappedData: InvestorFirm[] = data.map((inv: any) => ({
        id: inv.id,
        name: inv.name,
        type: inv.type,
        tagline: inv.tagline,
        description: inv.description,
        website: inv.website,
        logo: inv.logo,
        linkedin: inv.linkedin,
        twitter: inv.twitter,
        partners: inv.partners || [],
        contactEmail: inv.contactEmail,
        aum: inv.aum,
        fundSize: inv.fundSize,
        activeFundSize: inv.activeFundSize,
        // Format check size from min/max
        checkSize: inv.checkSizeMin && inv.checkSizeMax 
          ? `$${(inv.checkSizeMin/1000000).toFixed(1)}M-$${(inv.checkSizeMax/1000000).toFixed(1)}M` 
          : inv.fundSize || inv.aum || null,
        checkSizeMin: inv.checkSizeMin,
        checkSizeMax: inv.checkSizeMax,
        stage: inv.stage || [],
        sectors: inv.sectors || [],
        geography: inv.geography || [],
        portfolioCount: inv.portfolioCount || 0,
        exits: inv.exits || 0,
        unicorns: inv.unicorns || 0,
        notableInvestments: inv.notableInvestments || [],
        totalInvestments: inv.totalInvestments,
        investmentPace: inv.investmentPace,
        lastInvestmentDate: inv.lastInvestmentDate,
        focusAreas: inv.focusAreas || [],
        investmentThesis: inv.investmentThesis,
        boardSeats: inv.boardSeats,
        leadsRounds: inv.leadsRounds,
        followsRounds: inv.followsRounds,
        dryPowder: inv.dryPowder,
        hotHoneyInvestments: inv.hotHoneyInvestments || 0,
        hotHoneyStartups: inv.hotHoneyStartups || [],
      }));
      setInvestors(mappedData);
      setUseDatabase(true);
    } else {
      // Fallback to static data
      setInvestors(investorData);
      setUseDatabase(false);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (useDatabase) {
      setLoading(true);
      const { data, error } = await searchInvestors(searchQuery, filterType);
      if (!error && data) {
        const mappedData: InvestorFirm[] = data.map((inv: any) => ({
          id: inv.id,
          name: inv.name,
          type: inv.type,
          tagline: inv.tagline,
          description: inv.description || inv.bio,
          website: inv.website,
          logo: inv.logo,
          linkedin: inv.linkedin_url,
          twitter: inv.twitter_url,
          partners: inv.partners || [],
          contactEmail: inv.contact_email || inv.email,
          aum: inv.aum,
          fundSize: inv.fund_size,
          activeFundSize: inv.active_fund_size,
          checkSize: inv.check_size || (inv.check_size_min && inv.check_size_max ? `$${(inv.check_size_min/1000).toFixed(0)}K-$${(inv.check_size_max/1000000).toFixed(1)}M` : null),
          checkSizeMin: inv.check_size_min,
          checkSizeMax: inv.check_size_max,
          stage: inv.stage || [],
          sectors: inv.sectors || [],
          geography: inv.geography || inv.geography_focus || [],
          portfolioCount: inv.portfolio_count || inv.portfolio_companies?.length || 0,
          exits: inv.exits || inv.successful_exits || 0,
          unicorns: inv.unicorns || 0,
          notableInvestments: inv.notable_investments || [],
          totalInvestments: inv.total_investments,
          investmentPace: inv.investment_pace_per_year,
          lastInvestmentDate: inv.last_investment_date,
          focusAreas: inv.focus_areas || [],
          investmentThesis: inv.investment_thesis,
          boardSeats: inv.board_seats,
          leadsRounds: inv.leads_rounds,
          followsRounds: inv.follows_rounds,
          dryPowder: inv.dry_powder_estimate,
          hotHoneyInvestments: inv.hot_honey_investments || 0,
          hotHoneyStartups: inv.hot_honey_startups || [],
        }));
        setInvestors(mappedData);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useDatabase) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, filterType]);

  const filteredInvestors = useDatabase ? investors : investors.filter((investor) => {
    const matchesType = filterType === 'all' || investor.type === filterType;
    const matchesSearch = investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investor.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#160020] via-[#240032] to-[#330044] pb-20 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#9400cd]/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Home Button */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all cursor-pointer"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>🏠</span>
          <span>Home</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto pt-24 sm:pt-28 relative z-10">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-400 mb-4"></div>
              <div className="text-white text-2xl font-bold">Loading Investors...</div>
            </div>
          </div>
        )}

        {/* Main Content - Only show if not loading */}
        {!loading && (
          <>
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="text-6xl sm:text-8xl mb-4">💼</div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-2 sm:mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Investor Network
            </span>
          </h1>
          <p className="text-lg sm:text-2xl text-purple-200">
            Connect with {investors.length}+ VCs, Accelerators & Angel Networks
          </p>
          <div className="mt-4 flex gap-4 justify-center items-center flex-wrap">
            {!useDatabase && (
              <Link 
                to="/admin/setup" 
                className="inline-block px-4 py-2 bg-yellow-100 border-2 border-yellow-500 text-yellow-700 rounded-full text-sm hover:bg-yellow-200 transition-all"
              >
                ⚠️ Using static data - Click to setup database
              </Link>
            )}
            <Link
              to="/bulkupload"
              className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-full text-sm hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg"
            >
              📤 Bulk Upload VCs
            </Link>
            <Link
              to="/admin/discovered-investors"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-full text-sm hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg"
            >
              📋 Manage Investors
            </Link>
            <Link
              to="/invite-investor"
              className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              ➕ Know an investor? Add them!
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-4 sm:p-6 mb-8 border-2 border-purple-500/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search investors..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-purple-400 outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border-2 border-purple-400/50 focus:border-purple-400 outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="bg-white">All Types</option>
                <option value="vc_firm" className="bg-white">💼 VC Firms</option>
                <option value="accelerator" className="bg-white">🚀 Accelerators</option>
                <option value="angel_network" className="bg-white">👼 Angel Networks</option>
                <option value="corporate_vc" className="bg-white">🏢 Corporate VCs</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-purple-200 text-sm mt-4">
            Showing {filteredInvestors.length} investor{filteredInvestors.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats Overview - Hot Money Orange Theme */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-amber-400/50 hover:scale-105 transition-transform">
            <div className="text-4xl mb-2">💼</div>
            <div className="text-3xl font-bold text-amber-300">{investors.filter(i => i.type === 'vc_firm').length}</div>
            <div className="text-amber-100 text-sm font-semibold">VC Firms</div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-green-400/50 hover:scale-105 transition-transform">
            <div className="text-4xl mb-2">🚀</div>
            <div className="text-3xl font-bold text-green-300">{investors.filter(i => i.type === 'accelerator').length}</div>
            <div className="text-green-100 text-sm font-semibold">Accelerators</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-purple-400/50 hover:scale-105 transition-transform">
            <div className="text-4xl mb-2">🦄</div>
            <div className="text-3xl font-bold text-purple-300">{investors.reduce((sum, i) => sum + (i.unicorns || 0), 0)}</div>
            <div className="text-purple-100 text-sm font-semibold">Unicorns Created</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-amber-600/20 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-orange-400/50 hover:scale-105 transition-transform">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-3xl font-bold text-orange-300">{investors.reduce((sum, i) => sum + (i.portfolioCount || 0), 0)}+</div>
            <div className="text-orange-100 text-sm font-semibold">Portfolio Cos</div>
          </div>
        </div>

        {/* Investor Grid */}
        {filteredInvestors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredInvestors.map((investor) => (
              <InvestorCard
                key={investor.id}
                investor={investor}
                onContact={(id) => {
                  alert(`Contacting investor #${id}. Feature coming soon! 📧`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 backdrop-blur-lg rounded-3xl border-2 border-purple-500/30">
            <div className="text-8xl mb-6">🔍</div>
            <h2 className="text-4xl font-bold text-purple-300 mb-4">No investors found</h2>
            <p className="text-xl text-purple-200 mb-8">Try adjusting your search or filters</p>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
