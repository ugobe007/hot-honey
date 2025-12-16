import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Brain, Target, TrendingUp, MessageSquare, Lightbulb, FileText, 
  BarChart3, Users2, Handshake, Headphones, Crown, Lock,
  Sparkles, ArrowRight, Play, CheckCircle
} from 'lucide-react';
import FlameIcon from '../components/FlameIcon';
import { supabase } from '../lib/supabase';
import LogoDropdownMenu from '../components/LogoDropdownMenu';

interface ServiceTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tier_required: string;
  icon: string;
  estimated_time: string;
  is_active: boolean;
}

const iconMap: Record<string, any> = {
  '📊': BarChart3,
  '✨': Sparkles,
  '📖': FileText,
  '🎯': Target,
  '🗺️': TrendingUp,
  '🔗': Handshake,
  '📈': TrendingUp,
  '💬': MessageSquare,
  '👥': Users2,
  '🧠': Brain,
  '🔍': Target,
  '🤝': Handshake,
};

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  pitch: { bg: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', text: 'text-orange-400' },
  strategy: { bg: 'from-purple-500/20 to-indigo-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  traction: { bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  team: { bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  pmf: { bg: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', text: 'text-pink-400' },
  partnerships: { bg: 'from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/30', text: 'text-amber-400' },
};

const tierBadges: Record<string, { label: string; color: string }> = {
  spark: { label: 'Free', color: 'bg-gray-500' },
  flame: { label: 'Flame', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
  inferno: { label: 'Inferno', color: 'bg-gradient-to-r from-purple-500 to-indigo-500' },
};

export default function ServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<string>('spark');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [completedServices, setCompletedServices] = useState<string[]>([]);

  useEffect(() => {
    loadServices();
    loadUserTier();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading services:', error);
      // Use fallback data
      setServices([
        { id: '1', slug: 'pitch-analyzer', name: 'Pitch Deck Analyzer', description: 'AI analyzes your pitch deck and provides specific improvement recommendations.', category: 'pitch', tier_required: 'flame', icon: '📊', estimated_time: '2-3 min', is_active: true },
        { id: '2', slug: 'value-prop-sharpener', name: 'Value Prop Sharpener', description: 'Refine your one-liner and elevator pitch to capture investor attention.', category: 'pitch', tier_required: 'flame', icon: '✨', estimated_time: '1-2 min', is_active: true },
        { id: '3', slug: 'vc-approach-playbook', name: 'VC Approach Playbook', description: 'Custom strategies for approaching each matched investor.', category: 'strategy', tier_required: 'flame', icon: '🎯', estimated_time: '1-2 min', is_active: true },
        { id: '4', slug: 'funding-strategy', name: 'Funding Strategy Roadmap', description: 'Personalized fundraising plan with timeline and investor sequencing.', category: 'strategy', tier_required: 'inferno', icon: '🗺️', estimated_time: '3-5 min', is_active: true },
        { id: '5', slug: 'traction-improvement', name: 'Traction Improvement Plan', description: 'Data-driven recommendations to improve metrics VCs care about.', category: 'traction', tier_required: 'inferno', icon: '📈', estimated_time: '3-5 min', is_active: true },
        { id: '6', slug: 'team-gap-analysis', name: 'Team Gap Analysis', description: 'Identify missing roles and advisor types for your fundraise.', category: 'team', tier_required: 'inferno', icon: '👥', estimated_time: '3-5 min', is_active: true },
        { id: '7', slug: 'pmf-analysis', name: 'Product-Market Fit Analysis', description: 'Deep analysis of PMF signals with improvement recommendations.', category: 'pmf', tier_required: 'inferno', icon: '🎯', estimated_time: '5-7 min', is_active: true },
        { id: '8', slug: 'partnership-opportunities', name: 'Partnership Finder', description: 'Identify strategic partnership opportunities to accelerate growth.', category: 'partnerships', tier_required: 'inferno', icon: '🤝', estimated_time: '3-5 min', is_active: true },
      ]);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const loadUserTier = () => {
    const plan = localStorage.getItem('userPlan') || 'spark';
    setUserTier(plan);
    
    // Load completed services
    const completed = JSON.parse(localStorage.getItem('completedServices') || '[]');
    setCompletedServices(completed);
  };

  const canAccessService = (tierRequired: string): boolean => {
    const tierHierarchy = ['spark', 'flame', 'inferno'];
    const userTierIndex = tierHierarchy.indexOf(userTier);
    const requiredTierIndex = tierHierarchy.indexOf(tierRequired);
    return userTierIndex >= requiredTierIndex;
  };

  const categories = ['all', ...new Set(services.map(s => s.category))];

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

  const handleServiceClick = (service: ServiceTemplate) => {
    if (!canAccessService(service.tier_required)) {
      navigate('/get-matched');
      return;
    }
    navigate(`/services/${service.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] flex items-center justify-center">
        <div className="text-white text-2xl">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f]">
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
          to="/get-matched" 
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade
        </Link>
      </div>

      <div className="container mx-auto px-8 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-full mb-6">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">AI-Powered Services</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            � <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Fundraising</span> Toolkit
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            AI-powered tools to improve your pitch, strategy, traction, and more
          </p>
          
          {/* Current Plan Badge */}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full border border-white/10">
            <span className="text-gray-400 text-sm">Your Plan:</span>
            <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${tierBadges[userTier]?.color || 'bg-gray-500'}`}>
              {tierBadges[userTier]?.label || 'Free'}
            </span>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Services' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredServices.map(service => {
            const colors = categoryColors[service.category] || categoryColors.pitch;
            const IconComponent = iconMap[service.icon] || Brain;
            const canAccess = canAccessService(service.tier_required);
            const isCompleted = completedServices.includes(service.slug);

            return (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className={`relative text-left bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-6 transition-all hover:scale-105 ${
                  !canAccess ? 'opacity-60' : ''
                }`}
              >
                {/* Tier Badge */}
                <div className="absolute top-4 right-4">
                  {!canAccess ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-full">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{tierBadges[service.tier_required]?.label}</span>
                    </div>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-green-400">Done</span>
                    </div>
                  ) : (
                    <div className={`px-2 py-1 ${tierBadges[service.tier_required]?.color} rounded-full`}>
                      <span className="text-xs text-white font-medium">{tierBadges[service.tier_required]?.label}</span>
                    </div>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.bg} border ${colors.border} flex items-center justify-center mb-4`}>
                  <IconComponent className={`w-7 h-7 ${colors.text}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{service.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{service.estimated_time}</span>
                  <div className={`flex items-center gap-1 ${colors.text}`}>
                    {canAccess ? (
                      <>
                        <span className="text-sm font-medium">Start</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium">Unlock</span>
                        <Lock className="w-4 h-4" />
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Upgrade CTA */}
        {userTier === 'spark' && (
          <div className="mt-16 max-w-2xl mx-auto text-center bg-gradient-to-br from-orange-900/40 to-red-900/30 border border-orange-500/30 rounded-2xl p-8">
            <Crown className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Unlock All Services</h3>
            <p className="text-gray-300 mb-6">
              Upgrade to Flame or Inferno to access AI-powered tools that help you raise faster.
            </p>
            <Link
              to="/get-matched"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              View Pricing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
