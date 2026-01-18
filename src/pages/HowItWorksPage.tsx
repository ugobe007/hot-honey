/**
 * HowItWorksPage - Explains the mechanics of matching
 * 
 * This is NOT the brand story (/why). This is the technical "how does it work" page
 * that explains GOD scoring, signals, and the matching engine.
 * 
 * Route: /how-it-works
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Zap, 
  Target, 
  Brain, 
  TrendingUp,
  Shield,
  CheckCircle,
  Activity,
  BarChart3,
  Globe
} from 'lucide-react';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <LogoDropdownMenu />
      
      {/* Hero */}
      <div className="border-b border-white/10 pt-14">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-xs text-cyan-400 uppercase tracking-[0.25em] mb-4 font-mono">
            THE MECHANICS
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How <span className="text-cyan-400">Pythh</span> works
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Enter a URL. Get matched investors. No pitch deck, no intros, no gatekeepers.
          </p>
        </div>
      </div>

      {/* 4-Step Process */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-center mb-16">
          From URL to investor matches in <span className="text-cyan-400">4 steps</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Globe className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Step 1</div>
                <h3 className="text-lg font-semibold">URL Scan</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Paste any company URL. Our system extracts your company's positioning, 
              market, team signals, and traction indicators automatically.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Step 2</div>
                <h3 className="text-lg font-semibold">GOD Scoring</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Your startup is scored on Growth (traction), Opportunity (market), and 
              Differentiation (moat). This creates a numeric signal investors understand.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Step 3</div>
                <h3 className="text-lg font-semibold">Investor Matching</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              We compare your profile against 2,000+ investors' thesis, check size, 
              stage preferences, sector focus, and portfolio signals.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Step 4</div>
                <h3 className="text-lg font-semibold">Signal Map</h3>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Get a ranked list of investors with match scores, thesis fit reasons, 
              and outreach guidance. Scores update as market conditions change.
            </p>
          </div>
        </div>
      </div>

      {/* GOD Score Deep Dive */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">
              The <span className="text-amber-400">GOD Score</span> explained
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Not a vanity metric. A signal language investors already speak.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="text-3xl font-bold text-amber-400 mb-2">G</div>
              <h3 className="text-lg font-semibold mb-2">Growth</h3>
              <p className="text-sm text-gray-400">
                Traction signals: user growth, revenue trajectory, engagement metrics. 
                Are you moving?
              </p>
            </div>

            <div className="p-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
              <div className="text-3xl font-bold text-cyan-400 mb-2">O</div>
              <h3 className="text-lg font-semibold mb-2">Opportunity</h3>
              <p className="text-sm text-gray-400">
                Market signals: TAM, timing, competitive landscape. 
                Is the market big enough and ready?
              </p>
            </div>

            <div className="p-6 rounded-xl border border-violet-500/20 bg-violet-500/5">
              <div className="text-3xl font-bold text-violet-400 mb-2">D</div>
              <h3 className="text-lg font-semibold mb-2">Differentiation</h3>
              <p className="text-sm text-gray-400">
                Moat signals: team, technology, network effects. 
                Why will you win?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Match Score */}
      <div className="border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">
              What <span className="text-emerald-400">match scores</span> mean
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="text-2xl font-bold text-emerald-400 w-16">85+</div>
              <div>
                <div className="font-semibold">Exceptional fit</div>
                <div className="text-sm text-gray-400">Top 5% match. Strong thesis alignment across multiple dimensions.</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
              <div className="text-2xl font-bold text-cyan-400 w-16">70-84</div>
              <div>
                <div className="font-semibold">Strong fit</div>
                <div className="text-sm text-gray-400">Good alignment on key criteria. Worth prioritizing outreach.</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="text-2xl font-bold text-yellow-400 w-16">50-69</div>
              <div>
                <div className="font-semibold">Moderate fit</div>
                <div className="text-sm text-gray-400">Partial overlap. May require a specific angle to resonate.</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-500/20 bg-gray-500/5">
              <div className="text-2xl font-bold text-gray-400 w-16">&lt;50</div>
              <div>
                <div className="font-semibold">Low fit</div>
                <div className="text-sm text-gray-400">Thesis mismatch. Better opportunities exist elsewhere.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to see your matches?</h2>
          <p className="text-gray-400 mb-8">
            Enter your company URL and get investor matches in under 30 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold rounded-xl transition-all"
            >
              Try it now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/value"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-white font-semibold rounded-xl transition-all"
            >
              See what you get
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
