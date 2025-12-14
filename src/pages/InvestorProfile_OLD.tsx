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
}

export default function InvestorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvestor() {
      if (!id) return;
      const { data } = await supabase
        .from('investors')
        .select('*')
        .eq('id', id)
        .single();
      setInvestor(data);
      setLoading(false);
    }
    fetchInvestor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">Investor not found</div>
        <button onClick={() => navigate('/match')} className="bg-cyan-600 text-white px-4 py-2 rounded">
          Back to Matches
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/match')} className="mb-6 text-cyan-400">
          ← Back to Matches
        </button>

        <div className="bg-slate-800 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">{investor.name}</h1>
          <p className="text-cyan-400 mb-4">{investor.title} @ {investor.firm}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700 p-3 rounded">
              <p className="text-slate-400 text-sm">Check Size</p>
              <p className="text-white">${(investor.check_size_min/1000000).toFixed(0)}M - ${(investor.check_size_max/1000000).toFixed(0)}M</p>
            </div>
            <div className="bg-slate-700 p-3 rounded">
              <p className="text-slate-400 text-sm">Stages</p>
              <p className="text-white">{investor.stage?.join(', ') || 'All'}</p>
            </div>
          </div>

          {investor.bio && (
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-2">About</h3>
              <p className="text-slate-300">{investor.bio}</p>
            </div>
          )}

          <button className="w-full bg-cyan-600 text-white py-3 rounded-lg mt-4">
            Request Introduction
          </button>
        </div>
      </div>
    </div>
  );
}
