import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Check, 
  Crown, 
  Rocket, 
  Zap, 
  ArrowRight,
  Sparkles,
  Briefcase,
  Users,
  Shield,
  Star,
  TrendingUp,
  Brain
} from 'lucide-react';
import { TIER_DETAILS, TierName, BillingCycle, getYearlySavings, formatPrice } from '../lib/stripe';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

export default function PricingPage() {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'startup' | 'investor'>('startup');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const startupTiers: TierName[] = ['spark', 'flame', 'inferno'];
  const investorTiers: TierName[] = ['scout', 'dealflow_pro'];

  const currentTiers = userType === 'startup' ? startupTiers : investorTiers;

  const handleSelectTier = (tier: TierName) => {
    navigate(`/checkout?tier=${tier}&type=${userType}&billing=${billingCycle}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#1a0a2e] to-[#0f0520] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-orange-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <LogoDropdownMenu />

      <div className="relative z-10 container mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 rounded-full mb-6">
            <Crown className="w-4 h-4 text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Choose Your Plan</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-orange-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Choose the perfect plan to accelerate your fundraising or find the best deals
          </p>

          {/* User Type Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-slate-800/60 rounded-xl border border-white/10 mb-8">
            <button
              onClick={() => setUserType('startup')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                userType === 'startup'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Rocket className="w-4 h-4 inline mr-2" />
              For Startups
            </button>
            <button
              onClick={() => setUserType('investor')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                userType === 'investor'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              For Investors
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-slate-800/60 rounded-xl border border-white/10 mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {currentTiers.map((tierName, index) => {
            const tier = TIER_DETAILS[tierName];
            const isPopular = (userType === 'startup' && tierName === 'flame') || (userType === 'investor' && tierName === 'scout');
            const yearlySavings = getYearlySavings(tierName);
            const price = billingCycle === 'monthly' ? tier.price : tier.priceYearly;
            const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(tier.priceYearly / 12) : tier.price;

            return (
              <div
                key={tierName}
                className={`relative bg-gradient-to-br ${
                  isPopular
                    ? 'from-slate-800 via-slate-800 to-slate-900 border-2 border-orange-500/60 shadow-2xl shadow-orange-500/20 scale-105'
                    : 'from-slate-900/80 via-slate-800/80 to-slate-900/80 border border-white/10'
                } rounded-2xl p-8 hover:border-orange-500/40 transition-all`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-full">
                    Most Popular
                  </div>
                )}

                {/* Tier Header */}
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">{tier.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-1">{tier.name}</h3>
                  <p className="text-gray-400 text-sm">{tier.description}</p>
                </div>

                {/* Pricing */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black text-white">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-400 text-lg">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-gray-400 text-sm mt-1">
                      ${monthlyEquivalent}/mo billed annually
                    </p>
                  )}
                  {yearlySavings > 0 && billingCycle === 'yearly' && (
                    <p className="text-orange-400 text-sm font-semibold mt-1">
                      Save ${yearlySavings}/year
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectTier(tierName)}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    isPopular
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30'
                      : tierName === 'spark'
                      ? 'bg-slate-700 text-white hover:bg-slate-600 border border-white/20'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
                  }`}
                >
                  {tierName === 'spark' ? 'Get Started Free' : `Choose ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            What's Included in Each Plan
          </h2>

          {userType === 'startup' ? (
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-white/10">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gray-400" />
                    Spark (Free)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• 3 investor matches per month</li>
                    <li>• Basic startup profile</li>
                    <li>• Access to community</li>
                    <li>• Email support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-orange-400" />
                    Flame ($49/mo)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Everything in Spark</li>
                    <li>• Unlimited matches</li>
                    <li>• Pitch Deck Analyzer</li>
                    <li>• Value Prop Sharpener</li>
                    <li>• VC Approach Playbook</li>
                    <li>• Founder Story Framework</li>
                    <li>• Customer Story Templates</li>
                    <li>• Advisor Matching</li>
                    <li>• Warm Intro Finder</li>
                    <li>• Priority support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Inferno ($199/mo)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Everything in Flame</li>
                    <li>• PMF Analysis</li>
                    <li>• Funding Strategy Roadmap</li>
                    <li>• Traction Improvement Plan</li>
                    <li>• Team Gap Analysis</li>
                    <li>• Competitive Intelligence</li>
                    <li>• Partnership Finder</li>
                    <li>• 1-on-1 advisor calls (2/month)</li>
                    <li>• Custom reports</li>
                    <li>• White-glove support</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-white/10">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                    Scout ($99/mo)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Deal flow dashboard</li>
                    <li>• Startup search & filters</li>
                    <li>• Match notifications</li>
                    <li>• Basic due diligence tools</li>
                    <li>• Save & track startups</li>
                    <li>• Email support</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    Dealflow Pro ($499/mo)
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Everything in Scout</li>
                    <li>• Advanced search filters</li>
                    <li>• Portfolio tracking</li>
                    <li>• LP reporting tools</li>
                    <li>• Team collaboration</li>
                    <li>• API access</li>
                    <li>• White-label options</li>
                    <li>• Dedicated success manager</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-2">Can I change my plan later?</h3>
              <p className="text-gray-300 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-300 text-sm">
                We accept all major credit cards, debit cards, and ACH transfers. All payments are securely processed through Stripe.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-2">Is there a free trial?</h3>
              <p className="text-gray-300 text-sm">
                Yes! The Spark plan is completely free forever. 14 day free trial.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-2">What happens if I cancel?</h3>
              <p className="text-gray-300 text-sm">
                You can cancel anytime. Your subscription will remain active until the end of your billing period, and you'll retain access to all features until then.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-6">Still have questions?</p>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all"
          >
            Contact Support
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
