/**
 * PRICING PAGE
 * ============
 * Outcome-driven pricing with exact copy from spec
 * 
 * Title: "Clarity is cheaper than guessing."
 * 
 * Tiers:
 * - Free ($0): Test the signal
 * - Founder Pro ($79/mo): Stop wasting intros
 * - Team ($199/mo): Fundraising is a team sport
 * 
 * Investor: Coming soon / invite-only
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Check, 
  Rocket, 
  ArrowRight,
  Briefcase,
} from 'lucide-react';
import { TierName } from '../lib/stripe';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

export default function PricingPage() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'startup' | 'investor'>('startup');

  const handleSelectTier = (tier: TierName) => {
    navigate(`/checkout?tier=${tier}&type=${userType}&billing=monthly`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Subtle Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"></div>
      </div>

      <LogoDropdownMenu />

      <div className="relative z-10 container mx-auto px-6 pt-20 pb-16">
        {/* Header - Page Title from Spec */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Clarity is cheaper than guessing.
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Pricing is based on signal resolution — how much clarity you need, and how fast.
          </p>

          {/* User Type Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-[#111111] rounded-xl border border-gray-800 mt-10">
            <button
              onClick={() => setUserType('startup')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                userType === 'startup'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Rocket className="w-4 h-4 inline mr-2" />
              For Founders
            </button>
            <button
              onClick={() => setUserType('investor')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                userType === 'investor'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              For Investors
            </button>
          </div>
        </div>

        {/* Founder Pricing Tiers - Exact Copy from Spec */}
        {userType === 'startup' ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            
            {/* FREE — $0 */}
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 hover:border-gray-700 transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">Free</h3>
                <p className="text-amber-400 text-sm font-medium">Test the signal.</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-5xl font-black text-white">$0</span>
              </div>
              <div className="space-y-3 mb-8 text-sm">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">Startup URL scan</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">System Readout</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">GOD Score</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">Top 3 investor matches</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400">No account required</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 text-center mb-6 leading-relaxed">
                Enough to know if you're early — not enough to know who to talk to.
              </p>
              <Link to="/" className="block w-full py-3 bg-[#0a0a0a] border border-gray-700 text-white font-semibold rounded-xl text-center hover:border-gray-600 transition-all">
                Try Free
              </Link>
            </div>
            
            {/* FOUNDER PRO — $79/month */}
            <div className="relative bg-[#111111] border-2 border-amber-500/60 shadow-2xl shadow-amber-500/10 scale-105 rounded-2xl p-8">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full">
                Most Founders
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">Founder Pro</h3>
                <p className="text-amber-400 text-sm font-medium">Stop wasting intros.</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-5xl font-black text-white">$79</span>
                <span className="text-gray-500 text-lg">/month</span>
              </div>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Full investor match list</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Thesis alignment reasons</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Investor readiness signals</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Weekly signal updates</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Save & compare signal snapshots</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Outreach guidance per match</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
                Most founders make 30–50 wrong intros per round.<br />
                Pythh helps you avoid them.
              </p>
              <button onClick={() => handleSelectTier('flame')} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20">
                Unlock My Signals
              </button>
            </div>
            
            {/* TEAM — $199/month */}
            <div className="bg-[#111111] border border-violet-500/30 rounded-2xl p-8 hover:border-violet-500/50 transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">Team</h3>
                <p className="text-violet-400 text-sm font-medium">Fundraising is a team sport.</p>
              </div>
              <div className="text-center mb-6">
                <span className="text-5xl font-black text-white">$199</span>
                <span className="text-gray-500 text-lg">/month</span>
              </div>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Everything in Founder Pro, plus:</span>
                </div>
                <div className="flex items-start gap-3 pl-2">
                  <span className="text-violet-400 text-xs">→</span>
                  <span className="text-gray-300">Share signals with cofounders</span>
                </div>
                <div className="flex items-start gap-3 pl-2">
                  <span className="text-violet-400 text-xs">→</span>
                  <span className="text-gray-300">Share signals with advisors</span>
                </div>
                <div className="flex items-start gap-3 pl-2">
                  <span className="text-violet-400 text-xs">→</span>
                  <span className="text-gray-300">Share signals with board</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Commenting on matches</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Read-only advisor links</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200">Signal history timeline</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mb-6">
                Built for founders who don't fundraise alone.
              </p>
              <button onClick={() => handleSelectTier('inferno')} className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all">
                Start Team
              </button>
            </div>
          </div>
        ) : (
          /* Investor pricing - Hidden, invite-only */
          <div className="max-w-2xl mx-auto mb-16 text-center">
            <div className="bg-[#111111] border border-cyan-500/20 rounded-2xl p-10">
              <div className="text-4xl mb-4">🔭</div>
              <h3 className="text-2xl font-bold text-white mb-2">Investor Access</h3>
              <p className="text-gray-400 mb-6">Coming soon. Invite-only.</p>
              <p className="text-sm text-gray-600">
                Different surface, different pricing.<br />
                We're building a separate experience for investors to detect momentum before rounds are obvious.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Page Close - From Spec */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="p-8 bg-gradient-to-r from-amber-500/5 via-[#0a0a0a] to-violet-500/5 border border-gray-800 rounded-2xl">
            <p className="text-xl text-gray-300 leading-relaxed">
              Pythh doesn't help you pitch better.
            </p>
            <p className="text-xl text-white font-semibold mt-2">
              It helps you talk to the right people before you pitch.
            </p>
          </div>
        </div>

        {/* FAQ Section - 3 Questions from Spec */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Can I try before I pay?</h3>
              <p className="text-gray-500 text-sm">
                Yes. The free tier gives you a full system readout and your top 3 matches. No card required.
              </p>
            </div>
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-500 text-sm">
                Yes. No lock-in. Cancel when you want, keep access through your billing period.
              </p>
            </div>
            <div className="bg-[#111111] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">How is this different from a VC database?</h3>
              <p className="text-gray-500 text-sm">
                VC databases tell you who exists. Pythh tells you who's already aligned with your specific signals. It's pattern recognition, not directory lookup.
              </p>
            </div>
          </div>
        </div>

        {/* Why Pythh Link */}
        <div className="text-center mt-12">
          <Link
            to="/why"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
          >
            Why Pythh exists
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
