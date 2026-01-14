import { Link } from 'react-router-dom';
import { Zap, Target, Users, Brain, Shield, Star, TrendingUp, Heart, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import FlameIcon from '../components/FlameIcon';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0f0520] text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Global Navigation */}
      <LogoDropdownMenu />

      <div className="relative z-10 container mx-auto px-8 pt-32 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">Oracle of Truth</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">[pyth]</span> <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-400 bg-clip-text text-transparent">ai</span>
          </h1>
          <p className="text-2xl text-gray-300 max-w-3xl mx-auto mb-4 italic">
            Not prophecy. Probability perfected.
          </p>
        </div>

        {/* Origin Story */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-3xl p-10 md:p-12 border border-slate-700/50 shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
              The Origin Story
            </h2>
            
            <div className="space-y-6 text-lg text-gray-300 leading-relaxed">
              <p>
                <span className="text-white font-semibold">Venture capital runs on gut feeling disguised as pattern matching.</span>
              </p>
              
              <p>
                VCs say they recognize great founders. They point to their wins. But for every success story, 
                there are <span className="text-red-400 font-semibold">ten brilliant founders they rejected</span>—founders who went on to raise elsewhere, scale, and exit.
              </p>
              
              <p>
                The pattern isn't in the pitch deck. It's not in the warm intro. <span className="text-cyan-400 font-semibold">It's in the data.</span>
              </p>
              
              <div className="my-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-l-4 border-cyan-500 rounded-r-xl">
                <p className="text-xl font-semibold text-white mb-4">Success has signatures.</p>
                <div className="grid md:grid-cols-2 gap-3 text-base">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span>Team velocity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span>Market timing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span>Traction acceleration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span>Competitive positioning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span>Founder psychology</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span>Investor thesis fit</span>
                  </div>
                </div>
                <p className="mt-4 text-lg font-semibold text-cyan-300">
                  Twenty different dimensions—each one revealing part of the truth.
                </p>
              </div>
              
              <p>
                <span className="text-cyan-400 font-bold">[pyth] ai</span> processes all twenty at once.
              </p>
              
              <p>
                <span className="text-white font-semibold">Not predictions.</span> Pattern recognition at scale. Twenty algorithms trained daily on thousands of real outcomes. 
                Each match makes the system smarter. Each rejection refines the model.
              </p>
              
              <div className="my-8 p-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl">
                <p className="text-xl font-semibold text-white mb-2">
                  Where VCs see 100 pitches and pick 3 based on feeling,
                </p>
                <p className="text-xl font-semibold text-cyan-400">
                  [pyth] ai sees 100 startups and reveals which 3 have the mathematical signatures of success.
                </p>
              </div>
              
              <div className="text-center mt-10 pt-8 border-t border-slate-700">
                <p className="text-3xl font-bold text-white mb-2">
                  [pyth] ai: <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">oracle of truth.</span>
                </p>
                <p className="text-2xl text-gray-400 italic">
                  Not prophecy. Probability perfected.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">How [pyth] ai Works</h2>
            <p className="text-xl text-gray-400">AI-powered matching in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-violet-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-[#1a0033] to-[#2d1b4e] rounded-3xl p-8 border border-purple-500/30 h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Create Your Profile</h3>
                <p className="text-gray-400 leading-relaxed">
                  Startups share their pitch using our 5-point format. Investors define their thesis, 
                  check size, and sector preferences. Our AI learns what makes you unique.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-[#1a0033] to-[#2d1b4e] rounded-3xl p-8 border border-cyan-500/30 h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">AI Finds Your Match</h3>
                <p className="text-gray-400 leading-relaxed">
                  Our GOD Algorithm (Gather, Optimize, Deliver) analyzes hundreds of data points 
                  to calculate compatibility scores and find your perfect matches instantly.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-[#1a0033] to-[#2d1b4e] rounded-3xl p-8 border border-emerald-500/30 h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Connect & Close</h3>
                <p className="text-gray-400 leading-relaxed">
                  Review AI-generated explanations for each match. Swipe to show interest. 
                  When both sides match, unlock direct communication and start your partnership.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The GOD Algorithm */}
        <div className="mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-lg rounded-3xl p-10 border border-indigo-500/30 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">The GOD Algorithm</h2>
                  <p className="text-indigo-300">Gather • Optimize • Deliver</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-black/30 rounded-2xl p-6 border border-indigo-500/20">
                  <div className="text-3xl mb-3">🔍</div>
                  <h4 className="text-xl font-bold text-white mb-2">Gather</h4>
                  <p className="text-gray-400 text-sm">
                    Collects data from profiles, market trends, investment history, and sector dynamics 
                    to build comprehensive understanding.
                  </p>
                </div>
                <div className="bg-black/30 rounded-2xl p-6 border border-purple-500/20">
                  <div className="text-3xl mb-3">⚡</div>
                  <h4 className="text-xl font-bold text-white mb-2">Optimize</h4>
                  <p className="text-gray-400 text-sm">
                    Applies machine learning to score compatibility across stage fit, sector alignment, 
                    check size match, and thesis overlap.
                  </p>
                </div>
                <div className="bg-black/30 rounded-2xl p-6 border border-violet-500/20">
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="text-xl font-bold text-white mb-2">Deliver</h4>
                  <p className="text-gray-400 text-sm">
                    Presents ranked matches with AI-generated explanations, next steps, and 
                    actionable insights for both parties.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why [pyth] ai */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose [pyth] ai?</h2>
            <p className="text-xl text-gray-400">Built for the modern fundraising landscape</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center hover:scale-105 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">Find matches in 60 seconds, not 6 months</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center hover:scale-105 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Privacy First</h3>
              <p className="text-gray-400 text-sm">Investor identities protected until mutual interest</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center hover:scale-105 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Data-Driven</h3>
              <p className="text-gray-400 text-sm">500+ investors, 700+ startups in our network</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center hover:scale-105 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Human Touch</h3>
              <p className="text-gray-400 text-sm">AI suggestions with human-readable explanations</p>
            </div>
          </div>
        </div>

        {/* For Startups & Investors */}
        <div className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* For Startups */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 backdrop-blur-lg rounded-3xl p-8 border border-emerald-500/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <FlameIcon variant={8} size="lg" />
                </div>
                <h3 className="text-2xl font-bold text-white">For Startups</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Get matched with investors who actually invest in your stage & sector</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Skip cold outreach—let AI find warm introductions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">See exactly why each investor is a good fit</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Track investor interest and engagement in real-time</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Access to 500+ verified active investors</span>
                </li>
              </ul>
            </div>

            {/* For Investors */}
            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">For Investors</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Discover pre-vetted startups that match your thesis</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Stay anonymous until you choose to reveal yourself</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">AI filters through 700+ startups to find your winners</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Vote and track trending startups before they blow up</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Efficient deal flow—review matches in minutes, not hours</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">700+</div>
              <div className="text-gray-400">Startups</div>
            </div>
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">500+</div>
              <div className="text-gray-400">Investors</div>
            </div>
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">337+</div>
              <div className="text-gray-400">Matches Made</div>
            </div>
            <div className="bg-gradient-to-br from-[#1a0033]/80 to-[#2d1b4e]/80 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/20 text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">60s</div>
              <div className="text-gray-400">Average Match Time</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-3xl p-12 border border-purple-500/30 max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-4">
              <span className="block">Perfect Matches</span>
              <span className="block">... in Seconds</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join hundreds of startups and investors already making connections on [pyth] ai.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-matched"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-cyan-500/30"
              >
                <Zap className="w-5 h-5" />
                Get Matched Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/match"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg"
              >
                <Star className="w-5 h-5" />
                Try AI Matching
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>© 2025 [pyth] ai. All rights reserved.</p>
          <p className="mt-2">Made with 🔥 for founders and investors everywhere.</p>
        </div>
      </div>
    </div>
  );
}
