import React, { useState, useEffect } from 'react';
import { X, Brain, Users, Zap, Target, TrendingUp, Sparkles, ChevronRight, BarChart3, Flame, Lightbulb, Code2 } from 'lucide-react';
import FlameIcon from './FlameIcon';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [demoScores, setDemoScores] = useState({ god: 0, yc: 0, sequoia: 0, a16z: 0 });
  const [showDemoScores, setShowDemoScores] = useState(false);

  const steps = [
    {
      icon: Flame,
      title: "Startups Submit",
      description: "Founders submit their pitch, team background, traction metrics, and funding goals.",
      color: "from-orange-500 to-amber-500",
      details: ["Company overview", "Team credentials", "Traction data", "Funding ask"]
    },
    {
      icon: Brain,
      title: "AI Analyzes with GOD Algorithm",
      description: "Our proprietary scoring system evaluates startups using criteria from top 20 VCs.",
      color: "from-purple-500 to-indigo-500",
      details: ["Team Score (20%)", "Traction Score (18%)", "Market Score (15%)", "Product Score (12%)"]
    },
    {
      icon: Target,
      title: "Smart Matching",
      description: "AI matches startups with investors based on stage, sector, check size, and fit.",
      color: "from-cyan-500 to-blue-500",
      details: ["Stage alignment", "Sector overlap", "Check size fit", "Geographic match"]
    },
    {
      icon: Users,
      title: "Anonymous Discovery",
      description: "Investors browse matches anonymously. Identity revealed only when they engage.",
      color: "from-amber-500 to-orange-500",
      details: ["Private browsing", "Swipe to save", "No cold outreach", "Quality signal"]
    },
    {
      icon: TrendingUp,
      title: "Dynamic Scores",
      description: "Scores update in real-time based on voting, funding news, and traction updates.",
      color: "from-emerald-500 to-green-500",
      details: ["User voting impact", "News integration", "Competitor tracking", "Growth signals"]
    },
    {
      icon: BarChart3,
      title: "Multi-VC Algorithm Views",
      description: "See how top VCs would score the same startup - YC, Sequoia, A16Z styles all in one place.",
      color: "from-pink-500 to-rose-500",
      details: ["GOD Algorithm", "YC Smell Test", "Sequoia Style", "A16Z Style"],
      isDemo: true
    }
  ];

  // Auto-advance animation
  useEffect(() => {
    if (isOpen && !isAnimating) {
      const timer = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [isOpen, isAnimating, steps.length]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setShowDemoScores(false);
      setDemoScores({ god: 0, yc: 0, sequoia: 0, a16z: 0 });
    }
  }, [isOpen]);

  // Animate demo scores when on step 6
  useEffect(() => {
    if (currentStep === 5 && isOpen) {
      setShowDemoScores(false);
      setDemoScores({ god: 0, yc: 0, sequoia: 0, a16z: 0 });
      
      setTimeout(() => setShowDemoScores(true), 300);
      
      // Animate each score
      const targetScores = { god: 94, yc: 87, sequoia: 91, a16z: 89 };
      const keys = ['god', 'yc', 'sequoia', 'a16z'] as const;
      
      keys.forEach((key, index) => {
        setTimeout(() => {
          let current = 0;
          const target = targetScores[key];
          const interval = setInterval(() => {
            current += 3;
            if (current >= target) {
              current = target;
              clearInterval(interval);
            }
            setDemoScores(prev => ({ ...prev, [key]: current }));
          }, 25);
        }, index * 200);
      });
    }
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 rounded-3xl border border-purple-500/30 shadow-2xl">
        
        {/* Close button - sticky at top right */}
        <button
          onClick={onClose}
          className="sticky top-4 float-right mr-4 mt-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors border border-white/20"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="text-center pt-8 pb-4 px-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Powered by AI</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            How <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">HotMatch</span> Works
          </h2>
          <p className="text-gray-400 text-lg">
            AI-powered matching in 6 simple steps
          </p>
        </div>

        {/* Main content area */}
        <div className="px-8 pb-8">
          
          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentStep(index);
                  setIsAnimating(true);
                  setTimeout(() => setIsAnimating(false), 500);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 bg-gradient-to-r from-orange-500 to-pink-500' 
                    : 'w-2 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          {/* Animated step display */}
          <div className="relative min-h-[320px]">
            
            {/* Central animation area */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              
              {/* Left: Animated icon */}
              <div className="flex-shrink-0">
                <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br ${steps[currentStep].color} p-1 animate-pulse`}>
                  <div className="w-full h-full rounded-3xl bg-gray-900 flex items-center justify-center">
                    <CurrentIcon className="w-16 h-16 md:w-20 md:h-20 text-white animate-bounce" />
                  </div>
                  
                  {/* Orbiting particles */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                    <div className="absolute top-0 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
                  </div>
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                    <div className="absolute bottom-0 left-1/2 w-2 h-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-orange-400/70" />
                  </div>
                </div>
                
                {/* Step number */}
                <div className="text-center mt-4">
                  <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                    {currentStep + 1}
                  </span>
                  <span className="text-gray-500 text-lg">/{steps.length}</span>
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  {steps[currentStep].title}
                </h3>
                <p className="text-gray-300 text-lg mb-6">
                  {steps[currentStep].description}
                </p>
                
                {/* Step 6: Algorithm Demo with animated scores */}
                {currentStep === 5 && showDemoScores ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'god', name: 'GOD', icon: Flame, color: 'from-red-500 to-pink-500', textColor: 'text-red-400' },
                      { key: 'yc', name: 'YC', icon: Lightbulb, color: 'from-orange-500 to-amber-500', textColor: 'text-orange-400' },
                      { key: 'sequoia', name: 'Sequoia', icon: TrendingUp, color: 'from-emerald-500 to-green-500', textColor: 'text-emerald-400' },
                      { key: 'a16z', name: 'A16Z', icon: Code2, color: 'from-purple-500 to-indigo-500', textColor: 'text-purple-400' },
                    ].map((algo) => {
                      const AlgoIcon = algo.icon;
                      const score = demoScores[algo.key as keyof typeof demoScores];
                      return (
                        <div key={algo.key} className="bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${algo.color} flex items-center justify-center`}>
                              <AlgoIcon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-white text-sm font-semibold">{algo.name}</span>
                          </div>
                          <div className={`text-2xl font-bold ${algo.textColor} font-mono`}>
                            {score > 0 ? score : '---'}<span className="text-gray-500 text-sm">/100</span>
                          </div>
                          <div className="h-1.5 bg-black/30 rounded-full mt-2 overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${algo.color} transition-all duration-300`} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Detail pills for other steps */
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {steps[currentStep].details.map((detail, idx) => (
                      <span
                        key={idx}
                        className={`px-4 py-2 rounded-full bg-gradient-to-r ${steps[currentStep].color} bg-opacity-20 text-white text-sm font-medium border border-white/10`}
                        style={{
                          animation: `fadeInUp 0.3s ease-out ${idx * 0.1}s both`
                        }}
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Flow visualization */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStep;
                  const isPast = index < currentStep;
                  
                  return (
                    <React.Fragment key={index}>
                      <button
                        onClick={() => setCurrentStep(index)}
                        className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 ${
                          isActive 
                            ? 'bg-white/10 scale-110' 
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? `bg-gradient-to-br ${step.color}` 
                            : isPast 
                              ? 'bg-green-500/30' 
                              : 'bg-gray-700'
                        }`}>
                          <StepIcon className={`w-6 h-6 ${isActive || isPast ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          Step {index + 1}
                        </span>
                      </button>
                      
                      {index < steps.length - 1 && (
                        <ChevronRight className={`flex-shrink-0 w-5 h-5 ${
                          isPast ? 'text-green-500' : 'text-gray-600'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-8 pb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-orange-500/25 hover:scale-105"
            >
              Start Matching
            </button>
            <button
              onClick={() => setCurrentStep((prev) => (prev + 1) % steps.length)}
              className="px-8 py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-all"
            >
              Next Step →
            </button>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default HowItWorksModal;
