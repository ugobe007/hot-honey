/**
 * ValuePage - "What you get" page
 * 
 * Shows Free vs Paid features, use cases.
 * Demo-first, benefits-first - this comes BEFORE pricing.
 * 
 * Route: /value
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Check, 
  X,
  Sparkles,
  Target,
  Zap,
  Shield,
  Users,
  TrendingUp,
  Bell,
  FileText,
  Crown
} from 'lucide-react';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

export default function ValuePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <LogoDropdownMenu />
      
      {/* Hero */}
      <div className="border-b border-white/10 pt-14">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-xs text-violet-400 uppercase tracking-[0.25em] mb-4 font-mono">
            WHAT YOU GET
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            From <span className="text-emerald-400">free scan</span> to full signal map
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everyone gets a free scan. Unlock more when you're ready.
          </p>
        </div>
      </div>

      {/* Free vs Pro Comparison */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* FREE */}
          <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Always free</div>
            <h2 className="text-2xl font-bold mb-6">Free Scan</h2>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Unlimited URL scans</div>
                  <div className="text-sm text-gray-400">Scan any company, anytime</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Top 3 investor matches</div>
                  <div className="text-sm text-gray-400">Full profiles with match reasons</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">GOD Score breakdown</div>
                  <div className="text-sm text-gray-400">Growth, Opportunity, Differentiation</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Match score reasoning</div>
                  <div className="text-sm text-gray-400">"Why this match" for each investor</div>
                </div>
              </li>
              <li className="flex items-start gap-3 opacity-50">
                <X className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-500">Full investor list</div>
                  <div className="text-sm text-gray-500">50+ matches locked</div>
                </div>
              </li>
              <li className="flex items-start gap-3 opacity-50">
                <X className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-500">Saved matches</div>
                  <div className="text-sm text-gray-500">Requires account</div>
                </div>
              </li>
            </ul>

            <Link
              to="/"
              className="block w-full text-center px-6 py-3 border border-white/20 hover:border-white/40 rounded-xl font-semibold transition-all"
            >
              Try free scan
            </Link>
          </div>

          {/* PRO */}
          <div className="p-8 rounded-2xl border border-violet-500/30 bg-violet-500/5 relative">
            <div className="absolute -top-3 left-6 px-3 py-1 bg-violet-500 text-xs font-bold rounded-full">
              MOST POPULAR
            </div>
            <div className="text-xs text-violet-400 uppercase tracking-wide mb-2">Full access</div>
            <h2 className="text-2xl font-bold mb-6">Signal Map</h2>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Everything in Free</div>
                  <div className="text-sm text-gray-400">Plus...</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Full investor list (50+)</div>
                  <div className="text-sm text-gray-400">All matches unlocked with profiles</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Saved matches</div>
                  <div className="text-sm text-gray-400">Track and organize your targets</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Daily signal updates</div>
                  <div className="text-sm text-gray-400">See which investors are warming</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Outreach guidance</div>
                  <div className="text-sm text-gray-400">Personalized approach suggestions</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Share with advisors</div>
                  <div className="text-sm text-gray-400">Exportable signal maps</div>
                </div>
              </li>
            </ul>

            <Link
              to="/signup"
              className="block w-full text-center px-6 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 rounded-xl font-semibold transition-all"
            >
              Create free account
            </Link>
            <p className="text-xs text-gray-500 text-center mt-3">
              Free to start • Upgrade anytime
            </p>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold text-center mb-12">
            Who uses <span className="text-cyan-400">Pythh</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Founders */}
            <div className="p-6 rounded-xl border border-white/10">
              <div className="w-12 h-12 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Founders</h3>
              <p className="text-sm text-gray-400 mb-4">
                Find investors who actually fund companies like yours. Skip the spray-and-pray.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Pre-seed to Series A</li>
                <li>• First-time or repeat founders</li>
                <li>• Looking for thesis fit, not just intros</li>
              </ul>
            </div>

            {/* VCs */}
            <div className="p-6 rounded-xl border border-white/10">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Investors</h3>
              <p className="text-sm text-gray-400 mb-4">
                Discover startups that match your thesis before they're on everyone's radar.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Pre-screened deal flow</li>
                <li>• Signal-based discovery</li>
                <li>• Market timing intelligence</li>
              </ul>
            </div>

            {/* Scouts */}
            <div className="p-6 rounded-xl border border-white/10">
              <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Scouts & Advisors</h3>
              <p className="text-sm text-gray-400 mb-4">
                Help portfolio companies find the right investors faster.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Batch analysis for portfolios</li>
                <li>• Shareable signal maps</li>
                <li>• Due diligence support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to see your matches?</h2>
          <p className="text-gray-400 mb-8">
            Start with a free scan. No account required.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold rounded-xl transition-all"
            >
              Try free scan
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-white font-semibold rounded-xl transition-all"
            >
              See full pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
