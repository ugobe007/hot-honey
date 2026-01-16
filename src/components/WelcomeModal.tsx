import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface WelcomeModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WelcomeModal({ forceOpen = false, onClose }: WelcomeModalProps = {}) {
  // Initialize state based on forceOpen prop - never auto-show
  const [isOpen, setIsOpen] = useState(forceOpen);
  const location = useLocation();

  // NEVER show modal on these pages (absolute block)
  const excludedPaths = ['/dashboard', '/portfolio', '/vote', '/submit', '/settings', '/startup'];
  const shouldExclude = excludedPaths.some(path => location.pathname.startsWith(path));

  // If on excluded page and not forced, don't render at all
  if (shouldExclude && !forceOpen) {
    return null;
  }

  // If not forced open, never render
  if (!forceOpen) {
    return null;
  }

  useEffect(() => {
    // Sync state with forceOpen prop
    setIsOpen(forceOpen);
  }, [forceOpen]);

  const handleAgree = () => {
    localStorage.setItem('hmh_acknowledged', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-2 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500/50">
        <div className="bg-gradient-to-br from-[#1a1140] via-[#2d1b69] to-[#4a2a8f] rounded-3xl p-8 relative overflow-hidden">
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>

          {/* Close button */}
          {forceOpen && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 text-white/60 hover:text-white text-3xl transition-colors"
            >
              ×
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="text-7xl mb-4">🔥</div>
            <h2 className="text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
                [pyth]
              </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                ai
              </span>
            </h2>
            <p className="text-2xl text-cyan-400 font-bold mb-2">
              Where Startups Meet Smart Money
            </p>
            <p className="text-gray-300 text-sm">
              The AI-powered platform connecting visionary founders with strategic investors
            </p>
          </div>

          {/* How It Works */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6 relative z-10">
            <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-4xl">⚡</span>
              How It Works
            </h3>
            
            {/* For Investors */}
            <div className="mb-6">
              <h4 className="text-xl font-bold text-cyan-400 mb-3 flex items-center gap-2">
                💰 For Investors
              </h4>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Discover quality deals faster with AI-powered matching and crowd intelligence. Make informed decisions with our streamlined 5-point format.
              </p>
              
              {/* 5-Point Format Highlight */}
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-400/30 rounded-xl p-4 mb-4">
                <h5 className="font-bold text-purple-300 mb-2 flex items-center gap-2">
                  📋 5-Point StartupCard Format
                </h5>
                <p className="text-xs text-gray-300 mb-3">
                  Every startup distilled into <strong>5 key data points</strong> for fast decisions:
                </p>
                <div className="space-y-1.5 text-xs text-gray-200">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">1️⃣</span>
                    <span><strong className="text-white">Problem</strong> - What pain point is solved?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">2️⃣</span>
                    <span><strong className="text-white">Solution</strong> - How does the startup solve it?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">3️⃣</span>
                    <span><strong className="text-white">Market Size</strong> - What's the opportunity?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">4️⃣</span>
                    <span><strong className="text-white">Team Pedigree</strong> - Where have founders worked?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">💰</span>
                    <span><strong className="text-white">Investment Amount</strong> - How much are they raising?</span>
                  </div>
                </div>
              </div>

              {/* Investor Anonymity Highlight */}
              <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-sm border border-indigo-400/30 rounded-xl p-4 mb-4">
                <h5 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                  🔒 Anonymous Browsing
                </h5>
                <p className="text-xs text-gray-300">
                  <strong className="text-white">Your identity stays hidden</strong> until you choose to reveal yourself at Stage 3. Browse and vote with complete privacy!
                </p>
              </div>

              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-xl">👀</span>
                  <span className="text-gray-200">Browse hot startup deals from top founders</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">👍</span>
                  <span className="text-gray-200">Vote YES or NO on startups instantly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">🍯</span>
                  <span className="text-gray-200">Unlock secret traction data with honeypot</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <span className="text-gray-200">Track your portfolio on personal dashboard</span>
                </li>
              </ul>
            </div>

            {/* For Startups */}
            <div>
              <h4 className="text-xl font-bold text-pink-400 mb-3 flex items-center gap-2 mt-6">
                🚀 For Startups
              </h4>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Get discovered by strategic investors and build syndicates faster. Our AI-powered platform amplifies your reach beyond traditional fundraising.
              </p>

              {/* Game Play & Progressive Reveal */}
              <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4 mb-4">
                <h5 className="font-bold text-green-300 mb-2 flex items-center gap-2">
                  🎮 Progressive Discovery
                </h5>
                <p className="text-xs text-gray-300 mb-2">
                  Information reveals as interest grows. This creates momentum:
                </p>
                <ul className="space-y-1.5 text-xs text-gray-200">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong className="text-white">Fine-tune</strong> your pitch with real-time engagement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong className="text-white">Get noticed</strong> through strategic information reveal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong className="text-white">Build momentum</strong> as votes unlock visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span><strong className="text-white">Improve messaging</strong> with direct feedback</span>
                  </li>
                </ul>
              </div>

              {/* Syndicate Building */}
              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4 mb-4">
                <h5 className="font-bold text-blue-300 mb-2 flex items-center gap-2">
                  👥 Build Syndicates
                </h5>
                <p className="text-xs text-gray-300">
                  <strong className="text-white">Attract investor groups</strong> that can form syndicates. Reach funding goals faster than one-on-one approaches.
                </p>
              </div>

              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-xl">📝</span>
                  <span className="text-gray-200">Submit startup for AI-powered matching</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">📈</span>
                  <span className="text-gray-200">Progress through stages with votes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">👥</span>
                  <span className="text-gray-200">Connect directly with interested investors</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-xl">💬</span>
                  <span className="text-gray-200">Receive feedback and build momentum</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Risk Warning */}
          <div className="bg-red-900/30 border-2 border-red-500/50 rounded-2xl p-6 mb-6 relative z-10 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
              ⚠️ Investment Risk Disclosure
            </h3>
            <p className="text-sm text-gray-200 leading-relaxed mb-3">
              <strong className="text-white">Investing in early-stage startups is highly risky.</strong> You may lose all of your investment. Only invest what you can afford to lose. Past performance is not indicative of future results.
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              By using [pyth] ai, you acknowledge these risks and are making your own decisions. We are not financial advisors. Always do your own research.
            </p>
          </div>

          {/* Age Verification */}
          <div className="bg-yellow-600/20 border-2 border-yellow-500/50 rounded-2xl p-4 mb-6 relative z-10 backdrop-blur-sm">
            <p className="text-sm text-yellow-200 font-bold text-center">
              🔞 You must be 18 years or older to use this platform
            </p>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-6 mb-6 text-sm relative z-10">
            <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300 font-semibold underline">
              Privacy Policy
            </Link>
            <Link to="/why" className="text-cyan-400 hover:text-cyan-300 font-semibold underline">
              About Us
            </Link>
          </div>

          {/* Agreement Button */}
          <button
            onClick={forceOpen ? handleClose : handleAgree}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg relative z-10 border-2 border-purple-400/50"
          >
            {forceOpen ? '✅ Got It!' : '✅ I Agree - I\'m 18+ and Understand the Risks'}
          </button>

          {!forceOpen && (
            <p className="text-xs text-gray-500 text-center mt-4">
              By clicking "I Agree", you confirm you are at least 18 years old and accept the terms above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
