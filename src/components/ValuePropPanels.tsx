import React from 'react';
import { 
  Rocket, 
  DollarSign, 
  Target, 
  Zap, 
  TrendingUp, 
  Brain,
  Calendar,
  BarChart3,
  Diamond,
  Sparkles,
  ArrowRight,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Custom Flame Icon component
const FlameIconComponent = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c-1.1 4.55-4 6.8-4 10.5 0 2.49 1.79 4.5 4 4.5s4-2.01 4-4.5c0-3.7-2.9-5.95-4-10.5zm1 14c-1.1 0-2-.9-2-2 0-1.33.67-2.19 1.45-3.35.18-.27.37-.54.55-.88.18.34.37.61.55.88.78 1.16 1.45 2.02 1.45 3.35 0 1.1-.9 2-2 2z"/>
  </svg>
);

export default function ValuePropPanels() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      {/* Section Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/30 rounded-full mb-4">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-orange-300 text-sm font-medium">AI-Powered Matching • Real-Time Intelligence</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 px-4">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Choose Your Path
          </span>
        </h2>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto px-4">
          Matches are calculated on-demand using live data from 500+ investors and
          thousands of startups. Every score reflects current market conditions.
        </p>
      </div>

      {/* Value Prop Cards - Side by Side - Mobile Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        
        {/* FOUNDER CARD */}
        <Link to="/get-matched" className="group">
          <div className="relative h-full bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-800 border-2 border-orange-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 hover:border-orange-500/60 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 hover:scale-[1.02]">
            
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Content */}
            <div className="relative z-10">
              
              {/* Icon + Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">I'm a Founder</h3>
                  <p className="text-orange-400 text-sm font-medium">Get funded faster</p>
                </div>
              </div>

              {/* Features - Law of 3 */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Perfect-Fit Investor Matches</h4>
                    <p className="text-gray-400 text-sm">AI-powered matching to your stage, sector, and geography</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Clear Action Plan</h4>
                    <p className="text-gray-400 text-sm">AI explains why each VC fits + next steps + timing intelligence</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Diamond className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Premium Strategy Support</h4>
                    <p className="text-gray-400 text-sm">1-on-1 fundraising strategy + pitch deck review + intro prep</p>
                  </div>
                </div>
              </div>


              {/* CTA Button */}
              <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 px-6 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 transition-all group-hover:shadow-2xl group-hover:shadow-orange-500/40 flex items-center justify-center gap-2">
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </Link>

        {/* INVESTOR CARD */}
        <Link to="/investor/signup" className="group">
          <div className="relative h-full bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-800 border-2 border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02]">
            
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Content */}
            <div className="relative z-10">
              
              {/* Icon + Title */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">I'm an Investor</h3>
                  <p className="text-purple-400 text-sm font-medium">Find winners earlier</p>
                </div>
              </div>

              {/* Features - Law of 3 */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FlameIconComponent className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Pre-Screened Quality Startups</h4>
                    <p className="text-gray-400 text-sm">AI quality scoring with momentum, traction, and growth signals</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Market Intelligence & Automation</h4>
                    <p className="text-gray-400 text-sm">See trends before competitors + automated deal flow discovery</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Diamond className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Premium Intelligence Access</h4>
                    <p className="text-gray-400 text-sm">Early access to deals + founder background checks + social signals</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30 transition-all group-hover:shadow-2xl group-hover:shadow-purple-500/40 flex items-center justify-center gap-2">
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </Link>
      </div>

      {/* Social Proof */}
      <div className="text-center mt-12">
        <div className="flex items-center justify-center gap-6 text-gray-400 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>4.8/5 from 200+ founders</span>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2">
            <FlameIconComponent className="w-4 h-4 text-orange-400" />
            <span>50+ deals closed in 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
}


