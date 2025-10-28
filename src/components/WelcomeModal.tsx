import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface WelcomeModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WelcomeModal({ forceOpen = false, onClose }: WelcomeModalProps = {}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    } else {
      // Check if user has already acknowledged
      const hasAcknowledged = localStorage.getItem('hmh_acknowledged');
      if (!hasAcknowledged) {
        setIsOpen(true);
      }
    }
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-500 rounded-3xl p-1 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-3xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-7xl mb-4 animate-bounce">🍯</div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
              Welcome to Hot Money Honey!
            </h2>
            <p className="text-xl text-orange-600 font-semibold">
              Get Them While They're Hot.
            </p>
          </div>

          {/* How It Works */}
          <div className="bg-orange-50 rounded-2xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-orange-600 mb-4">🔥 How It Works</h3>
            
            {/* For Investors */}
            <div className="mb-4">
              <h4 className="text-lg font-bold text-gray-800 mb-2">💰 For Investors:</h4>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                Hot Money Honey helps identify quality investment candidates faster and with more precision. The Hot Money Process enables quick discovery without all the overhead and utilizes crowd and market intelligence to identify the winners.
              </p>
              
              {/* 5-Point Format Highlight */}
              <div className="bg-white rounded-xl p-4 mb-3 border-2 border-orange-300">
                <h5 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                  📋 Our 5-Point StartupCard Format
                </h5>
                <p className="text-xs text-gray-700 mb-2">
                  Each startup is distilled into <strong>5 key data points</strong> for quick, informed decisions:
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
                  <div>1️⃣ <strong>Problem</strong> - What pain point is solved?</div>
                  <div>2️⃣ <strong>Solution</strong> - How does the startup solve it?</div>
                  <div>3️⃣ <strong>Market Size</strong> - What's the opportunity?</div>
                  <div>4️⃣ <strong>Team Companies</strong> - Where have founders worked?</div>
                  <div>💰 <strong>Investment Amount</strong> - How much are they raising?</div>
                </div>
              </div>

              {/* Investor Anonymity Highlight */}
              <div className="bg-purple-100 rounded-xl p-4 mb-3 border-2 border-purple-300">
                <h5 className="font-bold text-purple-700 mb-2 flex items-center gap-2">
                  🔒 You're Incognito Until Stage 3
                </h5>
                <p className="text-xs text-gray-700">
                  <strong>Browse and vote anonymously.</strong> Your identity stays hidden until you reach Stage 3 (Reveal) and choose to disclose yourself for meetings. Enjoy unbiased review with complete privacy!
                </p>
              </div>

              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-lg">👀</span>
                  <span className="font-medium">Browse hot startup deals from the best founders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">👍</span>
                  <span className="font-medium">Vote YES or NO on startups that interest you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">🍯</span>
                  <span className="font-medium">Click the honeypot to reveal secret traction data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">📊</span>
                  <span className="font-medium">Track your hot picks on your personal dashboard</span>
                </li>
              </ul>
            </div>

            {/* For Startups */}
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">🚀 For Startups:</h4>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                <strong>Connect with investors faster and build syndicates through the Hot Money Honey discovery process.</strong> Our gamified approach helps you fine-tune your pitch and attract more interested investors than traditional platforms.
              </p>

              {/* Game Play & Progressive Reveal */}
              <div className="bg-white rounded-xl p-4 mb-3 border-2 border-green-300">
                <h5 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                  🎮 Game Play & Information Development
                </h5>
                <p className="text-xs text-gray-700 mb-2">
                  Information is revealed progressively as investor interest grows. This unique approach allows you to:
                </p>
                <ul className="space-y-1 text-xs text-gray-700">
                  <li>✓ <strong>Fine-tune your pitch</strong> based on real-time investor engagement</li>
                  <li>✓ <strong>Get noticed</strong> through a process of strategic information reveal</li>
                  <li>✓ <strong>Build momentum</strong> as votes unlock new visibility stages</li>
                  <li>✓ <strong>Improve your value proposition</strong> with direct market feedback</li>
                </ul>
              </div>

              {/* Syndicate Building */}
              <div className="bg-white rounded-xl p-4 mb-3 border-2 border-blue-300">
                <h5 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                  👥 Build Investor Syndicates
                </h5>
                <p className="text-xs text-gray-700">
                  As your startup gains traction, you'll attract groups of investors who can form syndicates. This helps you <strong>reach funding goals faster</strong> and build a stronger investor network than traditional one-on-one approaches.
                </p>
              </div>

              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-lg">📝</span>
                  <span className="font-medium">Submit your startup for investor review</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">📈</span>
                  <span className="font-medium">Progress through stages as you get more votes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">👥</span>
                  <span className="font-medium">Connect with interested investors directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">💬</span>
                  <span className="font-medium">Receive feedback and build traction</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Risk Warning */}
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-bold text-red-700 mb-3 flex items-center gap-2">
              ⚠️ Investment Risk Disclosure
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              <strong>Investing in early-stage startups is highly risky.</strong> You may lose all of your investment. Only invest what you can afford to lose. Past performance is not indicative of future results.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              By using Hot Money Honey, you acknowledge that you understand these risks and are making your own investment decisions. We are not financial advisors. Always do your own research and consult with licensed professionals.
            </p>
          </div>

          {/* Age Verification */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-700 font-semibold text-center">
              🔞 You must be 18 years or older to use this platform
            </p>
          </div>

          {/* Links */}
          <div className="flex justify-center gap-6 mb-6 text-sm">
            <Link to="/privacy" className="text-orange-600 hover:text-orange-700 font-semibold underline">
              Privacy Policy
            </Link>
            <Link to="/about" className="text-orange-600 hover:text-orange-700 font-semibold underline">
              About Us
            </Link>
          </div>

          {/* Agreement Button */}
          <button
            onClick={forceOpen ? handleClose : handleAgree}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg"
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
