import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Investor {
  id: string;
  name: string;
  firm: string;
  title: string;
  bio: string;
  email: string;
  photo_url: string;
  stage: string[];
  sectors: string[];
  check_size_min: number;
  check_size_max: number;
  investment_thesis: string;
  linkedin_url: string;
  type: string;
  portfolio_size: number;
}

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  summary: string;
  published_date: string;
  source: string;
  sentiment?: string;
}

export default function InvestorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsArticle[]>([]);

  useEffect(() => {
    async function fetchInvestor() {
      if (!id) return;
      const { data } = await supabase
        .from('investors')
        .select('*')
        .eq('id', id)
        .single();
      setInvestor(data);
      
      // Fetch mock news for investor
      if (data) {
        setNews([
          {
            id: '1',
            title: `${data.firm} Announces $${Math.floor(Math.random() * 500 + 100)}M New Fund`,
            url: '#',
            summary: 'The firm closes oversubscribed fund to back next generation of startups.',
            published_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            source: 'TechCrunch',
            sentiment: 'positive'
          },
          {
            id: '2',
            title: `${data.name} Shares Investment Insights at Conference`,
            url: '#',
            summary: 'Key takeaways on market trends and emerging opportunities in the sector.',
            published_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            source: 'VentureBeat',
            sentiment: 'positive'
          },
          {
            id: '3',
            title: `${data.firm} Portfolio Company Achieves Major Milestone`,
            url: '#',
            summary: 'Recent investment reaches unicorn status, validating thesis.',
            published_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            source: 'The Information',
            sentiment: 'positive'
          }
        ]);
      }
      
      setLoading(false);
    }
    fetchInvestor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0729] via-[#1a0f3a] to-[#2d1558] flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-xl">Investor not found</div>
        <button 
          onClick={() => navigate('/match')} 
          className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all"
        >
          ← Back to Matches
        </button>
      </div>
    );
  }

  // Format check size for display
  const formatCheckSize = () => {
    if (investor.check_size_min && investor.check_size_max) {
      return `$${(investor.check_size_min / 1000000).toFixed(1)}M - $${(investor.check_size_max / 1000000).toFixed(1)}M`;
    }
    return 'Undisclosed';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0033] via-[#2d1b4e] to-[#1a0033] p-6 scrollbar-hide overflow-y-auto">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate('/match')}
          className="group mb-6 px-6 py-3 rounded-xl bg-white/5 hover:bg-emerald-500/20 transition-all flex items-center gap-2 text-gray-300 hover:text-emerald-300"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Matches</span>
        </button>

        {/* Main Profile Card */}
        <div className="bg-gradient-to-br from-[#1a0033]/95 via-[#2d1b4e]/90 to-[#3d1f5e]/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-emerald-600/20 mb-6">
          {/* Header Section with Photo */}
          <div className="flex items-start gap-6 mb-8 pb-6 border-b border-emerald-400/30">
            {/* Avatar/Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-1 shadow-lg shadow-cyan-500/50">
                {investor.photo_url ? (
                  <img 
                    src={investor.photo_url} 
                    alt={investor.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">
                      {investor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              {/* Status indicator */}
              <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-green-500 px-3 py-1 rounded-full border-2 border-green-300 shadow-lg">
                <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-white">Active</span>
              </div>
            </div>

            {/* Name and Title */}
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-3">{investor.name}</h1>
              <p className="text-2xl text-emerald-300 font-bold mb-3 flex items-center gap-2">
                <span className="text-3xl">💼</span>
                {investor.title} @ {investor.firm}
              </p>
              
              {/* Quick Links */}
              <div className="flex gap-3 mt-4">
                {investor.linkedin_url && (
                  <a 
                    href={investor.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-semibold border border-emerald-400/50 transition-all hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </a>
                )}
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-200 font-semibold transition-all">
                  <span>📧</span>
                  Contact
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {/* Check Size */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-sm rounded-xl p-5 border border-emerald-400/30 shadow-lg shadow-emerald-500/10 hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">💰</span>
                <p className="text-emerald-300 text-sm font-bold uppercase tracking-wide">Check Size</p>
              </div>
              <p className="text-white text-2xl font-extrabold">{formatCheckSize()}</p>
            </div>

            {/* Total Investments */}
            <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-sm rounded-xl p-5 border border-purple-400/30 shadow-lg shadow-purple-500/10 hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📊</span>
                <p className="text-purple-300 text-sm font-bold uppercase tracking-wide">Portfolio</p>
              </div>
              <p className="text-white text-2xl font-extrabold">{investor.portfolio_size || 'N/A'} companies</p>
            </div>

            {/* Investment Type */}
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-5 border border-cyan-400/30 shadow-lg shadow-cyan-500/10 hover:scale-105 transition-transform">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🎯</span>
                <p className="text-cyan-300 text-sm font-bold uppercase tracking-wide">Type</p>
              </div>
              <p className="text-white text-2xl font-extrabold">{investor.type || 'VC'}</p>
            </div>
          </div>

          {/* Stages Section */}
          {investor.stage && investor.stage.length > 0 && (
            <div className="mb-8 bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm rounded-xl p-6 border border-emerald-400/30 shadow-lg shadow-emerald-500/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🎯</span>
                <h3 className="text-2xl font-bold text-emerald-300">Investment Stages</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {investor.stage.map((stg: string, i: number) => (
                  <span 
                    key={i}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-white font-semibold border border-emerald-400/40 text-lg hover:scale-110 transition-transform"
                  >
                    {stg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sectors Section */}
          {investor.sectors && investor.sectors.length > 0 && (
            <div className="mb-8 bg-gradient-to-br from-purple-500/10 to-violet-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-400/30 shadow-lg shadow-purple-500/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🚀</span>
                <h3 className="text-2xl font-bold text-purple-300">Focus Sectors</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {investor.sectors.map((sector: string, i: number) => (
                  <span 
                    key={i}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500/30 to-violet-500/30 text-white font-semibold border border-purple-400/40 text-lg hover:scale-110 transition-transform"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio Section */}
          {investor.bio && (
            <div className="mb-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 shadow-lg shadow-cyan-500/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📝</span>
                <h3 className="text-2xl font-bold text-cyan-300">About</h3>
              </div>
              <p className="text-white text-lg leading-relaxed">{investor.bio}</p>
            </div>
          )}

          {/* Investment Thesis */}
          {investor.investment_thesis && (
            <div className="mb-8 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-400/30 shadow-lg shadow-purple-500/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💡</span>
                <h3 className="text-2xl font-bold text-purple-300">Investment Thesis</h3>
              </div>
              <p className="text-white text-lg leading-relaxed italic">"{investor.investment_thesis}"</p>
            </div>
          )}

          {/* Recent News */}
          {news.length > 0 && (
            <div className="mt-8">
              <h3 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6 flex items-center gap-3">
                <span className="text-4xl">📰</span>
                Recent Activity
              </h3>
              <div className="space-y-4">
                {news.map((article) => {
                  const daysAgo = Math.floor((Date.now() - new Date(article.published_date).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-5 border border-emerald-400/20 hover:border-emerald-400/50 transition-all hover:bg-white/15"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl">
                            📰
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="text-white font-bold text-lg group-hover:text-emerald-300 transition-colors line-clamp-2">
                              {article.title}
                            </h4>
                            <span className="flex-shrink-0 text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                              {daysAgo}d ago
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{article.summary}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-emerald-400 font-medium">{article.source}</span>
                            {article.sentiment === 'positive' && (
                              <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">📈 Positive</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA - Subtle Version */}
          <div className="mt-8">
            <a
              href={`mailto:${investor.email}`}
              className="group block w-full px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-400/30 hover:border-emerald-400/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-emerald-300 font-semibold text-lg group-hover:text-emerald-200 transition-colors">Connect with {investor.name.split(' ')[0]}</div>
                  <div className="text-gray-400 text-sm">Reach out via email</div>
                </div>
                <svg className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
