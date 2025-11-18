import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InvestorCard from '../components/InvestorCard';
import AdminNav from '../components/AdminNav';
import HamburgerMenu from '../components/HamburgerMenu';
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-4 sm:p-8">
      {/* Hamburger Menu */}
      <HamburgerMenu />

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

      <div className="max-w-7xl mx-auto pt-24 sm:pt-28">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="text-6xl sm:text-8xl mb-4">💼</div>
          <h1 className="text-4xl sm:text-6xl font-bold text-orange-600 mb-2 sm:mb-4">
            Investor Network
          </h1>
          <p className="text-lg sm:text-2xl text-slate-700">
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
              to="/invite-investor"
              className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full text-sm hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
            >
              ➕ Know an investor? Add them!
            </Link>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-4 sm:p-6 mb-8 border-2 border-orange-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search investors..."
                className="w-full px-4 py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 border-2 border-orange-200 focus:border-orange-400 outline-none"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white text-slate-800 border-2 border-orange-200 focus:border-orange-400 outline-none appearance-none cursor-pointer"
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
          <p className="text-slate-700 text-sm mt-4">
            Showing {filteredInvestors.length} investor{filteredInvestors.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-blue-300">
            <div className="text-4xl mb-2">💼</div>
            <div className="text-3xl font-bold text-blue-700">{investors.filter(i => i.type === 'vc_firm').length}</div>
            <div className="text-slate-700 text-sm font-semibold">VC Firms</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-green-300">
            <div className="text-4xl mb-2">🚀</div>
            <div className="text-3xl font-bold text-green-700">{investors.filter(i => i.type === 'accelerator').length}</div>
            <div className="text-slate-700 text-sm font-semibold">Accelerators</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-purple-300">
            <div className="text-4xl mb-2">🦄</div>
            <div className="text-3xl font-bold text-purple-700">{investors.reduce((sum, i) => sum + (i.unicorns || 0), 0)}</div>
            <div className="text-slate-700 text-sm font-semibold">Unicorns Created</div>
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-orange-300">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-3xl font-bold text-orange-700">{investors.reduce((sum, i) => sum + (i.portfolioCount || 0), 0)}+</div>
            <div className="text-slate-700 text-sm font-semibold">Portfolio Cos</div>
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
          <div className="text-center py-20 bg-white/80 backdrop-blur-lg rounded-3xl border-2 border-orange-200">
            <div className="text-8xl mb-6">🔍</div>
            <h2 className="text-4xl font-bold text-orange-600 mb-4">No investors found</h2>
            <p className="text-xl text-slate-700 mb-8">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
      
      {/* Admin Navigation */}
      <AdminNav />
    </div>
  );
}
