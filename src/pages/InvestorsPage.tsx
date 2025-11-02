import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InvestorCard from '../components/InvestorCard';
import AdminNav from '../components/AdminNav';
import investorData, { InvestorFirm } from '../data/investorData';
import { getAllInvestors, searchInvestors } from '../lib/investorService';

export default function InvestorsPage() {
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
      // Map database format to component format
      const mappedData: InvestorFirm[] = data.map((inv: any) => ({
        id: inv.id, // Keep UUID as string
        name: inv.name,
        type: inv.type,
        tagline: inv.tagline,
        description: inv.description,
        website: inv.website,
        logo: inv.logo,
        linkedin: inv.linkedin,
        twitter: inv.twitter,
        partners: [],
        contactEmail: inv.contact_email,
        aum: inv.aum,
        fundSize: inv.fund_size,
        checkSize: inv.check_size,
        stage: inv.stage || [],
        sectors: inv.sectors || [],
        geography: inv.geography,
        portfolioCount: inv.portfolio_count || 0,
        exits: inv.exits || 0,
        unicorns: inv.unicorns || 0,
        notableInvestments: inv.notable_investments || [],
        hotHoneyInvestments: inv.hot_honey_investments || 0,
        hotHoneyStartups: inv.hot_honey_startups || [],
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
          id: inv.id, // Keep UUID as string
          name: inv.name,
          type: inv.type,
          tagline: inv.tagline,
          description: inv.description,
          website: inv.website,
          logo: inv.logo,
          linkedin: inv.linkedin,
          twitter: inv.twitter,
          partners: [],
          contactEmail: inv.contact_email,
          aum: inv.aum,
          fundSize: inv.fund_size,
          checkSize: inv.check_size,
          stage: inv.stage || [],
          sectors: inv.sectors || [],
          geography: inv.geography,
          portfolioCount: inv.portfolio_count || 0,
          exits: inv.exits || 0,
          unicorns: inv.unicorns || 0,
          notableInvestments: inv.notable_investments || [],
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 sm:p-8">
      {/* Navigation */}
      <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 w-full px-2 sm:px-0 sm:w-auto">
        <div className="flex gap-1 sm:gap-2 items-center justify-center flex-wrap">
          <Link to="/" className="text-4xl sm:text-6xl hover:scale-110 transition-transform">🍯</Link>
          <Link to="/" className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">🏠 Home</Link>
          <Link to="/vote" className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">🗳️ Vote</Link>
          <Link to="/investors" className="px-4 sm:px-6 py-1.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-full shadow-xl scale-105 sm:scale-110 text-xs sm:text-base whitespace-nowrap">💼 Investors</Link>
          <Link to="/portfolio" className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">⭐ Portfolio</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-24 sm:pt-28">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="text-6xl sm:text-8xl mb-4">💼</div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2 sm:mb-4">
            Investor Network
          </h1>
          <p className="text-lg sm:text-2xl text-purple-200">
            Connect with {investors.length}+ VCs, Accelerators & Angel Networks
          </p>
          <div className="mt-4 flex gap-4 justify-center items-center flex-wrap">
            {!useDatabase && (
              <Link 
                to="/admin/setup" 
                className="inline-block px-4 py-2 bg-yellow-500/20 border-2 border-yellow-500 text-yellow-300 rounded-full text-sm hover:bg-yellow-500/30 transition-all"
              >
                ⚠️ Using static data - Click to setup database
              </Link>
            )}
            <Link
              to="/invite-investor"
              className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              ➕ Know an investor? Add them!
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-4 sm:p-6 mb-8 border-2 border-purple-400/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search investors..."
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white border-2 border-purple-400/50 focus:border-yellow-400 outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="bg-purple-900">All Types</option>
                <option value="vc_firm" className="bg-purple-900">💼 VC Firms</option>
                <option value="accelerator" className="bg-purple-900">🚀 Accelerators</option>
                <option value="angel_network" className="bg-purple-900">👼 Angel Networks</option>
                <option value="corporate_vc" className="bg-purple-900">🏢 Corporate VCs</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-purple-200 text-sm mt-4">
            Showing {filteredInvestors.length} investor{filteredInvestors.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">💼</div>
            <div className="text-3xl font-bold text-white">{investors.filter(i => i.type === 'vc_firm').length}</div>
            <div className="text-blue-200 text-sm font-semibold">VC Firms</div>
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">🚀</div>
            <div className="text-3xl font-bold text-white">{investors.filter(i => i.type === 'accelerator').length}</div>
            <div className="text-green-200 text-sm font-semibold">Accelerators</div>
          </div>
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">🦄</div>
            <div className="text-3xl font-bold text-white">{investors.reduce((sum, i) => sum + (i.unicorns || 0), 0)}</div>
            <div className="text-purple-200 text-sm font-semibold">Unicorns Created</div>
          </div>
          <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-3xl font-bold text-white">{investors.reduce((sum, i) => sum + (i.portfolioCount || 0), 0)}+</div>
            <div className="text-orange-200 text-sm font-semibold">Portfolio Cos</div>
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
          <div className="text-center py-20 bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-purple-400/50">
            <div className="text-8xl mb-6">🔍</div>
            <h2 className="text-4xl font-bold text-white mb-4">No investors found</h2>
            <p className="text-xl text-purple-200 mb-8">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
      
      {/* Admin Navigation */}
      <AdminNav />
    </div>
  );
}
