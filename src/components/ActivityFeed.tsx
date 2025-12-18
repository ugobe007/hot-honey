import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  type: 'view' | 'match' | 'connection' | 'funding' | 'trending';
  investor?: string;
  startup?: string;
  count?: number;
  sector?: string;
  amount?: string;
  timestamp: number;
  icon: string;
  color: string;
}

const ActivityFeed: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample activity templates for realistic feed
  const activityTemplates = [
    { type: 'match', template: 'matched with', icon: '✨', color: 'from-purple-500 to-violet-500' },
    { type: 'funding', template: 'just funded', icon: '💰', color: 'from-yellow-500 to-orange-500' },
    { type: 'trending', template: 'trending in', icon: '🔥', color: 'from-red-500 to-orange-500' },
  ];

  const investors = [
    'Founders Fund', 'Sequoia Capital', 'Andreessen Horowitz', 'Y Combinator',
    'Accel Partners', 'Benchmark', 'Greylock Partners', 'General Catalyst'
  ];

  const sectors = [
    'AI/ML', 'Fintech', 'Healthcare', 'Crypto', 'SaaS', 'DevTools'
  ];

  const startups = [
    'Anthropic', 'Stripe', 'Databricks', 'Notion', 'Figma', 'Discord',
    'Ramp', 'OpenAI', 'Vercel', 'Linear'
  ];

  // Generate realistic activity
  const generateActivity = (): Activity => {
    const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
    const investor = investors[Math.floor(Math.random() * investors.length)];
    const startup = startups[Math.floor(Math.random() * startups.length)];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const count = Math.floor(Math.random() * 10) + 1;

    return {
      id: `activity_${Date.now()}_${Math.random()}`,
      type: template.type as Activity['type'],
      investor,
      startup,
      count,
      sector,
      amount: `$${Math.floor(Math.random() * 50 + 1)}M`,
      timestamp: Date.now(),
      icon: template.icon,
      color: template.color,
    };
  };

  // Initialize with some activities
  useEffect(() => {
    const initial = Array.from({ length: 3 }, () => generateActivity());
    setActivities(initial);

    // Add new activity every 8-12 seconds
    const interval = setInterval(() => {
      const newActivity = generateActivity();
      setActivities((prev) => [newActivity, ...prev].slice(0, 5)); // Keep last 5
    }, Math.random() * 4000 + 8000); // 8-12 seconds

    return () => clearInterval(interval);
  }, []);

  const getActivityText = (activity: Activity): string => {
    switch (activity.type) {
      case 'match':
        return `${activity.startup} matched with ${activity.investor}`;
      case 'funding':
        return `${activity.investor} just funded a ${activity.sector} startup for ${activity.amount}`;
      case 'trending':
        return `${activity.count} new ${activity.sector} startups added today`;
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Navigate to signup with email
    navigate('/submit', { state: { email } });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeIn" />
      
      {/* Popup */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-blue-900/95 backdrop-blur-xl rounded-t-3xl border-t-4 border-x-4 border-purple-500/50 shadow-[0_-20px_80px_rgba(168,85,247,0.6)]">
            {/* Close Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all group"
            >
              <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-8 p-8">
              {/* Left: Live Activity */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Live Right Now</h3>
                    <p className="text-xs text-gray-300">Real-time matches</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {activities.slice(0, 3).map((activity, index) => (
                    <div
                      key={activity.id}
                      className="bg-white/10 rounded-xl p-3 border border-white/20 animate-slideIn"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`bg-gradient-to-r ${activity.color} p-1.5 rounded-lg flex-shrink-0`}>
                          <span className="text-sm">{activity.icon}</span>
                        </div>
                        <p className="text-white text-xs font-medium leading-relaxed flex-1">
                          {getActivityText(activity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-xs text-green-300 font-medium">Live updates</span>
                </div>
              </div>

              {/* Center: Divider */}
              <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>

              {/* Right: CTA */}
              <div className="flex flex-col justify-center">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-4">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-semibold uppercase tracking-wide">Join Now</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    Get Your Perfect Match
                  </h2>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Join 500+ founders and investors finding their perfect matches with AI-powered precision
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-all"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span>Getting Started...</span>
                    ) : (
                      <>
                        <span>Start Matching</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-4">
                  Free to join • No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default ActivityFeed;
