import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Check, X, Sparkles, Users, Building2, ArrowRight, Star, Shield, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

type UserType = 'startup' | 'investor';
type PlanType = 'free' | 'pro' | 'enterprise';

interface PricingPlan {
  id: PlanType;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  matchLimit: number;
  cta: string;
  popular?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for exploring the platform',
    features: [
      '3 matches per month',
      'Basic startup/investor profiles',
      'View match compatibility scores',
      'Email notifications',
    ],
    limitations: [
      'Limited to 3 matches',
      'No advanced filters',
      'No priority support',
    ],
    matchLimit: 3,
    cta: 'Get Started Free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    period: 'per month',
    description: 'For serious founders & investors',
    features: [
      'Unlimited matches',
      'Advanced compatibility filters',
      'Priority matching algorithm',
      'Direct intro requests',
      'Match analytics & insights',
      'Priority email support',
      'Custom deal flow alerts',
    ],
    limitations: [],
    matchLimit: -1, // unlimited
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    period: 'per month',
    description: 'For VC firms & accelerators',
    features: [
      'Everything in Pro',
      'Team collaboration (5 seats)',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'White-label options',
      'Custom reporting',
      'SLA guarantee',
    ],
    limitations: [],
    matchLimit: -1,
    cta: 'Contact Sales',
  },
];

export default function GetMatchedPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'pricing' | 'signup'>('pricing');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
  const [userType, setUserType] = useState<UserType>('startup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    website: '',
    description: '',
  });

  const handlePlanSelect = (planId: PlanType) => {
    setSelectedPlan(planId);
    if (planId === 'enterprise') {
      // For enterprise, redirect to contact
      window.location.href = 'mailto:hello@hotmoney.co?subject=Enterprise%20Plan%20Inquiry';
      return;
    }
    setStep('signup');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create user in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            user_type: userType,
          }
        }
      });

      if (authError) {
        // If Supabase auth fails, fall back to localStorage
        console.warn('Supabase auth failed, using localStorage:', authError);
      }

      // Create user profile in database
      const userProfile = {
        id: authData?.user?.id || `user-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        user_type: userType,
        company_name: formData.companyName,
        website: formData.website,
        description: formData.description,
        plan: selectedPlan,
        matches_remaining: selectedPlan === 'free' ? 3 : -1,
        matches_used: 0,
        created_at: new Date().toISOString(),
      };

      // Try to save to Supabase
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert(userProfile);

      if (dbError) {
        console.warn('Database save failed, using localStorage:', dbError);
      }

      // Always save to localStorage as backup
      localStorage.setItem('currentUser', JSON.stringify(userProfile));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userPlan', selectedPlan);
      localStorage.setItem('matchesRemaining', selectedPlan === 'free' ? '3' : '-1');

      // Show success and redirect
      const plan = pricingPlans.find(p => p.id === selectedPlan);
      alert(`🎉 Welcome to Hot Match!\n\nPlan: ${plan?.name}\n${selectedPlan === 'free' ? '✨ You have 3 free matches to start!' : '✨ Unlimited matches activated!'}`);

      // Redirect based on user type
      if (userType === 'investor') {
        navigate('/matching');
      } else {
        navigate('/submit');
      }

    } catch (err) {
      console.error('Signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-blue-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Navigation Buttons - Top Right */}
      <div className="fixed top-6 right-8 z-50 flex items-center gap-4">
        <Link 
          to="/about" 
          className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-purple-900 font-bold rounded-xl transition-all shadow-lg"
        >
          About
        </Link>
        <Link 
          to="/login" 
          className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-purple-900 font-bold rounded-xl transition-all shadow-lg"
        >
          Log In
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-8">
        {step === 'pricing' ? (
          <>
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">AI-Powered Matching</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Get <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">Matched</span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Connect with the perfect investors or startups using our AI-powered matching algorithm. 
                Start free, upgrade when you're ready.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-gradient-to-br ${
                    plan.popular 
                      ? 'from-purple-900/60 via-pink-900/40 to-cyan-900/60 border-2 border-purple-500/50' 
                      : 'from-gray-900/60 to-gray-800/60 border border-gray-700/50'
                  } backdrop-blur-xl rounded-3xl p-8 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-400 ml-2">/{plan.period}</span>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, idx) => (
                      <li key={idx} className="flex items-start gap-3 opacity-60">
                        <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-400 text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelect(plan.id)}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-8 mb-16">
              <div className="flex items-center gap-2 text-gray-400">
                <Shield className="w-5 h-5" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-5 h-5" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Star className="w-5 h-5" />
                <span>500+ successful matches</span>
              </div>
            </div>

            {/* How It Works */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white text-center mb-12">How Hot Match Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">1. Create Profile</h3>
                  <p className="text-gray-400">Tell us about your startup or investment thesis</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">2. AI Matching</h3>
                  <p className="text-gray-400">Our algorithm finds your perfect matches</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">3. Connect</h3>
                  <p className="text-gray-400">Get warm intros to your best matches</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Signup Form */
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => setStep('pricing')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
            >
              ← Back to pricing
            </button>

            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Create Your Account</h2>
                <p className="text-gray-400">
                  {selectedPlan === 'free' 
                    ? '🎉 Start with 3 free matches!' 
                    : '🚀 Unlimited matches await!'}
                </p>
              </div>

              {/* User Type Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-gray-800/50 rounded-xl p-1 flex gap-1">
                  <button
                    onClick={() => setUserType('startup')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      userType === 'startup'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    I'm a Startup
                  </button>
                  <button
                    onClick={() => setUserType('investor')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      userType === 'investor'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    I'm an Investor
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-red-300 text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    {userType === 'startup' ? 'Startup Name' : 'Fund/Firm Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder={userType === 'startup' ? 'Acme Inc.' : 'Sequoia Capital'}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Website (optional)</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    {userType === 'startup' ? 'Brief Description' : 'Investment Thesis'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                    placeholder={userType === 'startup' 
                      ? 'We are building AI-powered...' 
                      : 'We invest in early-stage B2B SaaS...'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-center text-gray-500 text-sm">
                  By signing up, you agree to our{' '}
                  <Link to="/privacy" className="text-purple-400 hover:underline">Terms & Privacy Policy</Link>
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
