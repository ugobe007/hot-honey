import React, { useState, useEffect } from 'react';
import { 
  awardPoints, 
  getRandomBonusMultiplier, 
  getInvestorProfile 
} from '../utils/firePointsManager';

interface BonusCardProps {
  onClose: () => void;
  onClaim: () => void;
}

/**
 * BONUS FIRE POINTS CARD
 * =======================
 * Random reward card that appears to incentivize engagement
 * Styled like a scratch-off lottery card
 */
const BonusCard: React.FC<BonusCardProps> = ({ onClose, onClaim }) => {
  const [multiplier] = useState(getRandomBonusMultiplier());
  const [isRevealed, setIsRevealed] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [perksUnlocked, setPerksUnlocked] = useState<string[]>([]);

  const handleReveal = () => {
    setIsRevealed(true);
    
    // Award random bonus points
    const result = awardPoints('RANDOM_CARD_BONUS', multiplier);
    setPointsAwarded(result.pointsEarned);
    setPerksUnlocked(result.perksUnlocked);
    
    // Auto-close after showing rewards
    setTimeout(() => {
      onClaim();
      onClose();
    }, 5000);
  };

  const profile = getInvestorProfile();

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in spin-in duration-500"
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 40px rgba(255,255,255,0.2)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold z-10"
        >
          ×
        </button>

        {!isRevealed ? (
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bounce">
              🍯
            </div>
            <h2 className="text-4xl font-bold text-white mb-4"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Honeypot Bonus!
            </h2>
            <p className="text-xl text-white/90 mb-4">
              You've been randomly selected for bonus Fire Points!
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6 text-white/90 text-sm">
              <p className="mb-2">
                <strong>🍯 What's a Honeypot?</strong>
              </p>
              <p>
                Random honeypot rewards appear to engaged investors who actively vote. 
                The more you participate, the more chances you have to discover these sweet bonus multipliers!
              </p>
            </div>
            
            <button
              onClick={handleReveal}
              className="px-8 py-4 bg-white text-cyan-600 font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              🍯 Reveal Your Honeypot
            </button>
          </div>
        ) : (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="text-8xl mb-6 animate-pulse">
              🍯
            </div>
            <h2 className="text-4xl font-bold text-white mb-4"
              style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              +{pointsAwarded} Fire Points!
            </h2>
            <p className="text-2xl text-white/90 mb-4">
              {multiplier}x Bonus Multiplier!
            </p>
            
            {profile && (
              <div className="bg-white/20 rounded-2xl p-4 mb-6 backdrop-blur-sm">
                <p className="text-white text-lg">
                  Your Total: <span className="font-bold text-2xl">🔥 {profile.firePoints.total}</span>
                </p>
                <p className="text-white/80 text-sm mt-1">
                  Tier: <span className="font-bold">{profile.tier}</span>
                </p>
              </div>
            )}

            {perksUnlocked.length > 0 && (
              <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-4 mb-4 animate-in slide-in-from-bottom duration-500">
                <p className="text-white font-bold text-lg mb-2">🎊 Perk Unlocked!</p>
                {perksUnlocked.map((perk, i) => (
                  <p key={i} className="text-white">{perk}</p>
                ))}
              </div>
            )}

            <p className="text-white/70 text-sm">
              Keep engaging to earn more rewards!
            </p>
          </div>
        )}

        {/* Decorative elements - simplified without framer-motion */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute top-10 left-10 text-4xl animate-bounce" style={{ animationDelay: '0s' }}>🍯</div>
          <div className="absolute top-20 right-20 text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>🔥</div>
          <div className="absolute bottom-20 left-20 text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>🍯</div>
          <div className="absolute bottom-10 right-10 text-4xl animate-bounce" style={{ animationDelay: '0.6s' }}>✨</div>
        </div>
      </div>
    </div>
  );
};

export default BonusCard;
