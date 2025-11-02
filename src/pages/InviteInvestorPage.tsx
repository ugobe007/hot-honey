import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import { createInvestor } from '../lib/investorService';

export default function InviteInvestorPage() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'vc_firm' as 'vc_firm' | 'accelerator' | 'angel_network' | 'corporate_vc',
    tagline: '',
    website: '',
    linkedin: '',
    checkSize: '',
    geography: 'Global',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await createInvestor({
        name: formData.name,
        type: formData.type,
        tagline: formData.tagline,
        website: formData.website,
        linkedin: formData.linkedin,
        check_size: formData.checkSize,
        geography: formData.geography,
        stage: [],
        sectors: [],
        portfolio_count: 0,
        exits: 0,
        unicorns: 0,
        notable_investments: [],
        hot_honey_investments: 0,
        hot_honey_startups: [],
      });

      if (error) {
        alert('❌ Error adding investor: ' + error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/investors';
        }, 2000);
      }
    } catch (error) {
      alert('❌ Error adding investor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 text-center border-2 border-green-400/50">
          <div className="text-8xl mb-6">✅</div>
          <h1 className="text-5xl font-bold text-white mb-4">Investor Added!</h1>
          <p className="text-2xl text-purple-200 mb-8">Redirecting to investor directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 sm:p-8">
      {/* Navigation */}
      <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 w-full px-2 sm:px-0 sm:w-auto">
        <div className="flex gap-1 sm:gap-2 items-center justify-center flex-wrap">
          <Link to="/" className="text-4xl sm:text-6xl hover:scale-110 transition-transform">🍯</Link>
          <Link to="/" className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">🏠 Home</Link>
          <Link to="/investors" className="px-3 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">💼 Investors</Link>
          <Link to="/invite-investor" className="px-4 sm:px-6 py-1.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-full shadow-xl scale-105 sm:scale-110 text-xs sm:text-base whitespace-nowrap">➕ Invite Investor</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto pt-24 sm:pt-28">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="text-6xl sm:text-8xl mb-4">🤝</div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2 sm:mb-4">
            Invite an Investor
          </h1>
          <p className="text-lg sm:text-2xl text-purple-200">
            Help grow the Hot Honey investor network
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 sm:p-8 border-2 border-purple-400/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-white font-bold mb-2">
                Investor/Firm Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Sequoia Capital"
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-white font-bold mb-2">
                Investor Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              >
                <option value="vc_firm" className="bg-purple-900">💼 VC Firm</option>
                <option value="accelerator" className="bg-purple-900">🚀 Accelerator</option>
                <option value="angel_network" className="bg-purple-900">👼 Angel Network</option>
                <option value="corporate_vc" className="bg-purple-900">🏢 Corporate VC</option>
              </select>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-white font-bold mb-2">
                Tagline
              </label>
              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="e.g., Helping the daring build legendary companies"
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-white font-bold mb-2">
                Website *
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                required
                placeholder="https://example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-white font-bold mb-2">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Check Size */}
            <div>
              <label className="block text-white font-bold mb-2">
                Typical Check Size
              </label>
              <input
                type="text"
                name="checkSize"
                value={formData.checkSize}
                onChange={handleChange}
                placeholder="e.g., $1M - $10M"
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Geography */}
            <div>
              <label className="block text-white font-bold mb-2">
                Geography
              </label>
              <input
                type="text"
                name="geography"
                value={formData.geography}
                onChange={handleChange}
                placeholder="e.g., Global, US, Europe"
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-purple-300 border-2 border-purple-400/50 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-xl rounded-xl shadow-xl hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Adding Investor...' : '✨ Add Investor to Network'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-500/20 border-2 border-blue-400/50 rounded-xl">
            <p className="text-blue-200 text-sm">
              💡 <strong>Note:</strong> Basic information is required. Our team will add detailed portfolio information and stats.
            </p>
          </div>
        </div>
      </div>
      
      {/* Admin Navigation */}
      <AdminNav currentPage="invite" />
    </div>
  );
}
