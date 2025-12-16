import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Zap, Check, X, Sparkles, Building2, ArrowRight, Star, Shield, Clock,
  Crown, Brain, Target, TrendingUp, MessageSquare, Lightbulb,
  FileText, BarChart3, Users2, Handshake, Headphones, Lock
} from 'lucide-react';
import FlameIcon from '../components/FlameIcon';
import { supabase } from '../lib/supabase';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

type UserType = 'startup' | 'investor';
type PlanType = 'spark' | 'flame' | 'inferno' | 'scout' | 'dealflow_pro';

interface Service {
  name: string;
  icon: any;
  spark: boolean;
  flame: boolean;
  inferno: boolean;
}

const startupServices: Service[] = [
  { name: 'Browse Trending Rankings', icon: TrendingUp, spark: true, flame: true, inferno: true },
  { name: 'Preview 3 Investor Matches', icon: Target, spark: true, flame: true, inferno: true },
  { name: 'Basic GOD Score', icon: Brain, spark: true, flame: true, inferno: true },
  { name: 'Unlimited Investor Matches', icon: Sparkles, spark: false, flame: true, inferno: true },
  { name: 'Full GOD Score Breakdown', icon: BarChart3, spark: false, flame: true, inferno: true },
  { name: 'Match Reasoning (5 reasons)', icon: Lightbulb, spark: false, flame: true, inferno: true },
  { name: 'VC Approach Playbook', icon: Target, spark: false, flame: true, inferno: true },
  { name: 'Pitch Deck Analyzer', icon: FileText, spark: false, flame: true, inferno: true },
  { name: 'Value Prop Sharpener', icon: MessageSquare, spark: false, flame: true, inferno: true },
  { name: 'Warm Intro Path Finder', icon: Handshake, spark: false, flame: true, inferno: true },
  { name: 'Product-Market Fit Analysis', icon: Target, spark: false, flame: false, inferno: true },
  { name: 'Team & Advisor Gap Analysis', icon: Users2, spark: false, flame: false, inferno: true },
  { name: 'Traction Improvement Plan', icon: TrendingUp, spark: false, flame: false, inferno: true },
  { name: 'Funding Strategy Roadmap', icon: TrendingUp, spark: false, flame: false, inferno: true },
  { name: 'Partnership Opportunities', icon: Handshake, spark: false, flame: false, inferno: true },
  { name: 'Competitive Intelligence', icon: Brain, spark: false, flame: false, inferno: true },
  { name: 'Monthly Office Hours', icon: Headphones, spark: false, flame: false, inferno: true },
  { name: 'Priority Support', icon: Crown, spark: false, flame: false, inferno: true },
];

export default function GetMatchedPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'type' | 'pricing' | 'signup'>('type');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('spark');
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

  const handleTypeSelect = (type: UserType) => {
    setUserType(type);
    setStep('pricing');
  };

  const handlePlanSelect = (planId: PlanType) => {
    setSelectedPlan(planId);
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
        console.warn('Supabase auth failed, using localStorage:', authError);
      }

      // Create subscription record
      const subscription = {
        user_id: authData?.user?.id,
        email: formData.email,
        tier: selectedPlan,
        user_type: userType,
        status: 'active',
        matches_viewed_count: 0,
        matches_limit: selectedPlan === 'spark' ? 3 : -1,
      };

      // Try to save to Supabase
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .insert(subscription);

      if (subError) {
        console.warn('Subscription save failed:', subError);
      }

      // Create user profile
      const userProfile = {
        id: authData?.user?.id || `user-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        user_type: userType,
        company_name: formData.companyName,
        website: formData.website,
        description: formData.description,
        plan: selectedPlan,
        matches_remaining: selectedPlan === 'spark' ? 3 : -1,
        matches_used: 0,
        created_at: new Date().toISOString(),
      };

      // Always save to localStorage as backup
      localStorage.setItem('currentUser', JSON.stringify(userProfile));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userPlan', selectedPlan);
      localStorage.setItem('userType', userType);
      localStorage.setItem('matchesRemaining', selectedPlan === 'spark' ? '3' : '-1');

      // Show success
      const tierNames: Record<PlanType, string> = {
        spark: 'Spark (Free)',
        flame: 'Flame ($49/mo)',
        inferno: 'Inferno ($199/mo)',
        scout: 'Scout ($99/mo)',
        dealflow_pro: 'Dealflow Pro ($499/mo)',
      };
      
      alert(`🎉 Welcome to Hot Match!\n\nPlan: ${tierNames[selectedPlan]}\n${selectedPlan === 'spark' ? '✨ You have 3 free matches to start!' : '✨ Full access activated!'}`);

      // Redirect based on user type
      if (userType === 'investor') {
        navigate('/trending');
      } else {
        navigate('/matching');
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
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Logo Dropdown Menu */}
      <LogoDropdownMenu />

      {/* Navigation Buttons - Top Right */}
      <div className="fixed top-6 right-8 z-50 flex items-center gap-3">
        <Link 
          to="/trending" 
          className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20"
        >
          Trending
        </Link>
        <Link 
          to="/matching" 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          Try Demo
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-8 py-8 pt-24">
        
        {/* Step 1: Choose User Type */}
        {step === 'type' && (
          <>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 text-sm font-medium">Choose Your Path</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Are you a <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Startup</span> or <span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">Investor</span>?
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                We have different tools and services tailored for each
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Startup Card */}
              <button
                onClick={() => handleTypeSelect('startup')}
                className="group bg-gradient-to-br from-orange-900/40 to-red-900/30 border-2 border-orange-500/30 hover:border-orange-500/60 rounded-3xl p-10 text-left transition-all hover:scale-105"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-6">
                  <FlameIcon variant={5} size="3xl" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">I'm a Startup</h2>
                <p className="text-gray-300 mb-6">
                  Find investors who match your stage, sector, and vision. Get strategic tools to improve your fundraise.
                </p>
                <div className="flex items-center gap-2 text-orange-400 group-hover:text-orange-300">
                  <span className="font-semibold">Get Matched with Investors</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Investor Card */}
              <button
                onClick={() => handleTypeSelect('investor')}
                className="group bg-gradient-to-br from-purple-900/40 to-indigo-900/30 border-2 border-purple-500/30 hover:border-purple-500/60 rounded-3xl p-10 text-left transition-all hover:scale-105"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-6">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">I'm an Investor</h2>
                <p className="text-gray-300 mb-6">
                  Discover pre-vetted startups with AI-powered scoring. Streamline your deal flow with smart tools.
                </p>
                <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300">
                  <span className="font-semibold">Discover Startups</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </>
        )}

        {/* Step 2: Pricing for Startups */}
        {step === 'pricing' && userType === 'startup' && (
          <>
            <button 
              onClick={() => setStep('type')}
              className="text-orange-400 hover:text-orange-300 mb-6 flex items-center gap-2"
            >
              ← Back
            </button>

            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                🔥 Choose Your <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Hot Match</span> Plan
              </h1>
              <p className="text-xl text-gray-300">
                Unlock AI-powered tools to supercharge your fundraise
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
              
              {/* SPARK - Free */}
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-gray-700/50 rounded-3xl p-8 transition-all hover:border-gray-600/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Spark</h3>
                    <p className="text-gray-400 text-sm">Explore & Discover</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">Free</span>
                  <span className="text-gray-400 ml-2">forever</span>
                </div>

                <ul className="space-y-3 mb-8 text-sm">
                  {startupServices.slice(0, 3).map((service, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{service.name}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3 opacity-50">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500">Limited to 3 matches</span>
                  </li>
                </ul>

                <button
                  onClick={() => handlePlanSelect('spark')}
                  className="w-full py-3 rounded-xl font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
                >
                  Get Started Free
                </button>
              </div>

              {/* FLAME - $49 */}
              <div className="relative bg-gradient-to-br from-orange-900/40 via-red-900/30 to-amber-900/40 border-2 border-orange-500/50 rounded-3xl p-8 transition-all hover:border-orange-500/70 scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold rounded-full">
                    🔥 Most Popular
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Flame</h3>
                    <p className="text-orange-300 text-sm">Active Fundraising</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$49</span>
                  <span className="text-gray-300 ml-2">/month</span>
                </div>

                <ul className="space-y-2 mb-8 text-sm">
                  {startupServices.filter(s => s.flame).slice(0, 10).map((service, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <span className="text-gray-200">{service.name}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelect('flame')}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all shadow-lg"
                >
                  Start 7-Day Free Trial
                </button>
              </div>

              {/* INFERNO - $199 */}
              <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/30 border border-purple-500/30 rounded-3xl p-8 transition-all hover:border-purple-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Inferno</h3>
                    <p className="text-purple-300 text-sm">Full Stack Fundraising</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$199</span>
                  <span className="text-gray-300 ml-2">/month</span>
                </div>

                <ul className="space-y-2 mb-8 text-sm">
                  <li className="flex items-center gap-2 text-purple-300 font-medium">
                    <Sparkles className="w-4 h-4" />
                    Everything in Flame, plus:
                  </li>
                  {startupServices.filter(s => s.inferno && !s.flame).map((service, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-gray-200">{service.name}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelect('inferno')}
                  className="w-full py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all"
                >
                  Start 7-Day Free Trial
                </button>
              </div>
            </div>

            {/* Feature Comparison Table */}
            <div className="max-w-4xl mx-auto bg-black/30 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 text-center">Full Feature Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-gray-400 font-medium">Service</th>
                      <th className="text-center py-3 text-gray-400 font-medium w-24">Spark</th>
                      <th className="text-center py-3 text-orange-400 font-medium w-24">Flame</th>
                      <th className="text-center py-3 text-purple-400 font-medium w-24">Inferno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {startupServices.map((service, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="py-3 text-gray-300 flex items-center gap-2">
                          <service.icon className="w-4 h-4 text-gray-500" />
                          {service.name}
                        </td>
                        <td className="text-center py-3">
                          {service.spark ? <Check className="w-5 h-5 text-green-400 mx-auto" /> : <X className="w-5 h-5 text-gray-600 mx-auto" />}
                        </td>
                        <td className="text-center py-3">
                          {service.flame ? <Check className="w-5 h-5 text-orange-400 mx-auto" /> : <X className="w-5 h-5 text-gray-600 mx-auto" />}
                        </td>
                        <td className="text-center py-3">
                          {service.inferno ? <Check className="w-5 h-5 text-purple-400 mx-auto" /> : <X className="w-5 h-5 text-gray-600 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Pricing for Investors */}
        {step === 'pricing' && userType === 'investor' && (
          <>
            <button 
              onClick={() => setStep('type')}
              className="text-purple-400 hover:text-purple-300 mb-6 flex items-center gap-2"
            >
              ← Back
            </button>

            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                🔍 <span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">Investor</span> Plans
              </h1>
              <p className="text-xl text-gray-300">
                Discover pre-vetted, AI-scored startups for your portfolio
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Scout */}
              <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 border border-gray-700/50 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Scout</h3>
                    <p className="text-gray-400 text-sm">Angels & Solo GPs</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$99</span>
                  <span className="text-gray-300 ml-2">/month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-cyan-400" /><span className="text-gray-300">Full startup database access</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-cyan-400" /><span className="text-gray-300">GOD Score filtering</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-cyan-400" /><span className="text-gray-300">Save & organize pipeline</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-cyan-400" /><span className="text-gray-300">Weekly hot startups digest</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-cyan-400" /><span className="text-gray-300">Founder contact requests</span></li>
                </ul>

                <button
                  onClick={() => handlePlanSelect('scout')}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white transition-all"
                >
                  Start Free Trial
                </button>
              </div>

              {/* Dealflow Pro */}
              <div className="relative bg-gradient-to-br from-purple-900/40 to-indigo-900/30 border-2 border-purple-500/50 rounded-3xl p-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-bold rounded-full">
                    For VC Firms
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Dealflow Pro</h3>
                    <p className="text-purple-300 text-sm">VC Firms & Family Offices</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">$499</span>
                  <span className="text-gray-300 ml-2">/month</span>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-purple-300 font-medium"><Sparkles className="w-4 h-4" />Everything in Scout, plus:</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-purple-400" /><span className="text-gray-300">Team seats (up to 5)</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-purple-400" /><span className="text-gray-300">API access for CRM</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-purple-400" /><span className="text-gray-300">Custom scoring weights</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-purple-400" /><span className="text-gray-300">First look at new startups</span></li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-purple-400" /><span className="text-gray-300">White-label deal memos</span></li>
                </ul>

                <button
                  onClick={() => handlePlanSelect('dealflow_pro')}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white transition-all"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Signup Form */}
        {step === 'signup' && (
          <>
            <button 
              onClick={() => setStep('pricing')}
              className="text-orange-400 hover:text-orange-300 mb-6 flex items-center gap-2"
            >
              ← Back to Plans
            </button>

            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Create Your Account
                </h1>
                <p className="text-gray-400">
                  {selectedPlan === 'spark' ? 'Start with 3 free matches' : 'Start your 7-day free trial'}
                </p>
              </div>

              <form onSubmit={handleSignUp} className="bg-black/30 rounded-2xl p-8 border border-white/10">
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      placeholder="john@startup.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500"
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-4 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                  Already have an account? <Link to="/login" className="text-orange-400 hover:underline">Log in</Link>
                </p>
              </form>
            </div>
          </>
        )}

        {/* Trust Section */}
        <div className="flex flex-wrap justify-center gap-8 mt-16 text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Bank-level Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            <span>7-Day Free Trial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
