import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StartupCardV2 from '../components/StartupCardV2';
import startupData from '../data/startupData';
import { colors, spacing, borderRadius, shadows } from '../design/v2-system';

export default function HomePageV2() {
  const navigate = useNavigate();
  const [currentStartupIndices, setCurrentStartupIndices] = useState([0, 1, 2]);
  const [slidingCards, setSlidingCards] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleVote = (startupId: number, vote: 'yes' | 'no') => {
    // Save YES votes to localStorage for dashboard
    if (vote === 'yes') {
      const yesVotes = localStorage.getItem('myYesVotes');
      const yesVotesList = yesVotes ? JSON.parse(yesVotes) : [];
      const startup = startupData.find(s => s.id === startupId);
      
      if (startup) {
        yesVotesList.push({
          id: startupId,
          name: startup.name,
          pitch: startup.pitch,
          tagline: startup.tagline,
          stage: startup.stage,
          fivePoints: startup.fivePoints,
          votedAt: new Date().toISOString()
        });
        localStorage.setItem('myYesVotes', JSON.stringify(yesVotesList));
      }
    }
  };

  const handleSwipeAway = (cardPosition: number) => {
    const cardsToSlide = [cardPosition + 1, cardPosition + 2].filter(pos => pos < 3);
    setSlidingCards(cardsToSlide);

    setTimeout(() => {
      setCurrentStartupIndices(prev => {
        const nextIndices = [...prev];
        nextIndices[cardPosition] = (nextIndices[cardPosition] + 3) % startupData.length;
        return nextIndices;
      });
      setSlidingCards([]);
    }, 800);
  };

  const currentStartups = currentStartupIndices.map(index => startupData[index]);

  return (
    <div 
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${colors.wafer} 0%, ${colors.snow} 100%)`,
      }}
    >
      {/* Hamburger Menu */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 p-6"
        style={{
          background: colors.steelGray,
          borderBottom: `2px solid ${colors.caribbeanGreen}`,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Hamburger Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col gap-1.5 p-2 hover:opacity-80 transition-opacity"
            aria-label="Menu"
          >
            <div style={{ 
              width: '30px', 
              height: '3px', 
              background: colors.snow,
              transition: 'all 0.3s',
              transform: menuOpen ? 'rotate(45deg) translateY(10px)' : 'none'
            }} />
            <div style={{ 
              width: '30px', 
              height: '3px', 
              background: colors.snow,
              transition: 'all 0.3s',
              opacity: menuOpen ? 0 : 1
            }} />
            <div style={{ 
              width: '30px', 
              height: '3px', 
              background: colors.snow,
              transition: 'all 0.3s',
              transform: menuOpen ? 'rotate(-45deg) translateY(-10px)' : 'none'
            }} />
          </button>

          {/* Logo */}
          <div 
            className="text-2xl font-bold cursor-pointer"
            style={{ color: colors.snow }}
            onClick={() => navigate('/v2')}
          >
            🔥 Hot Money Honey
          </div>

          {/* Spacer for alignment */}
          <div style={{ width: '46px' }} />
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div
            className="absolute left-0 top-full mt-0 py-4 px-6 flex flex-col gap-3"
            style={{
              background: colors.steelGray,
              borderBottom: `2px solid ${colors.caribbeanGreen}`,
              minWidth: '250px',
            }}
          >
            <button
              onClick={() => { navigate('/v2'); setMenuOpen(false); }}
              className="text-left px-4 py-3 hover:bg-opacity-80 transition-all"
              style={{
                color: colors.wafer,
                background: 'transparent',
                border: `1px solid ${colors.wafer}`,
                borderRadius: borderRadius.none,
              }}
            >
              Home
            </button>
            <button
              onClick={() => { navigate('/v2/dashboard'); setMenuOpen(false); }}
              className="text-left px-4 py-3 hover:bg-opacity-80 transition-all"
              style={{
                color: colors.wafer,
                background: 'transparent',
                border: `1px solid ${colors.wafer}`,
                borderRadius: borderRadius.none,
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => { navigate('/v2/vote'); setMenuOpen(false); }}
              className="text-left px-4 py-3 hover:bg-opacity-80 transition-all"
              style={{
                color: colors.wafer,
                background: 'transparent',
                border: `1px solid ${colors.wafer}`,
                borderRadius: borderRadius.none,
              }}
            >
              Vote
            </button>
            <button
              onClick={() => { navigate('/v2/deals'); setMenuOpen(false); }}
              className="text-left px-4 py-3 hover:bg-opacity-80 transition-all"
              style={{
                color: colors.wafer,
                background: 'transparent',
                border: `1px solid ${colors.wafer}`,
                borderRadius: borderRadius.none,
              }}
            >
              Deals
            </button>
            <button
              onClick={() => { navigate('/v2/portfolio'); setMenuOpen(false); }}
              className="text-left px-4 py-3 hover:bg-opacity-80 transition-all"
              style={{
                color: colors.wafer,
                background: 'transparent',
                border: `1px solid ${colors.wafer}`,
                borderRadius: borderRadius.none,
              }}
            >
              Portfolio
            </button>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <section className="pt-32 pb-2 px-8"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="text-8xl mb-6">🔥</div>
            <h1 
              className="text-6xl font-bold mb-6"
              style={{ color: colors.steelGray }}
            >
              Find Your Next
              <br />
              <span style={{ color: colors.texasRose }}>Big Investment</span>
            </h1>
            <p 
              className="text-xl max-w-2xl mx-auto leading-relaxed"
              style={{ color: colors.text.secondary }}
            >
              Swipe through hand-curated startups. Vote on the hottest companies. 
              Build your investment portfolio with data-driven insights.
            </p>
          </div>

          {/* CTA Section */}
          <div className="flex gap-4 justify-center mb-1">
            <button
              onClick={() => navigate('/vote')}
              className="px-10 py-5 text-xl font-bold transition-all hover:scale-105"
              style={{
                background: colors.texasRose,
                color: colors.snow,
                border: 'none',
                borderRadius: borderRadius.none,
                boxShadow: shadows.strong,
              }}
            >
              🔥 Start Investing
            </button>
            <button
              onClick={() => navigate('/submit')}
              className="px-10 py-5 text-xl font-bold transition-all hover:scale-105"
              style={{
                background: 'transparent',
                color: colors.steelGray,
                border: `3px solid ${colors.steelGray}`,
                borderRadius: borderRadius.none,
              }}
            >
              📤 Submit Startup
            </button>
          </div>
        </div>
      </section>

      {/* Featured Startups Preview */}
      <section className="pt-1 pb-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ color: colors.steelGray }}
            >
              Featured Startups
            </h2>
            <p 
              className="text-xl"
              style={{ color: colors.text.secondary }}
            >
              Get a preview of the hottest companies on the platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {currentStartups.map((startup, index) => (
              <div
                key={`${startup.id}-${index}`}
                className={`transition-all duration-800 ${
                  slidingCards.includes(index) ? 'transform translate-x-full opacity-0' : ''
                }`}
              >
                <StartupCardV2
                  startup={startup}
                  onVote={(vote) => handleVote(startup.id, vote)}
                  onSwipeAway={() => handleSwipeAway(index)}
                />
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/vote')}
              className="px-8 py-4 text-lg font-bold transition-all hover:scale-105"
              style={{
                background: colors.caribbeanGreen,
                color: colors.snow,
                border: 'none',
                borderRadius: borderRadius.none,
                boxShadow: shadows.medium,
              }}
            >
              See All {startupData.length} Startups 🔥
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        className="py-20 px-8"
        style={{
          background: colors.steelGray,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 
            className="text-4xl font-bold text-center mb-12"
            style={{ color: colors.snow }}
          >
            Platform Stats
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div 
              className="p-8"
              style={{
                background: colors.snow,
                borderRadius: borderRadius.none,
                boxShadow: shadows.medium,
              }}
            >
              <div 
                className="text-5xl font-bold mb-2"
                style={{ color: colors.texasRose }}
              >
                {startupData.length}
              </div>
              <div 
                className="text-lg font-medium"
                style={{ color: colors.steelGray }}
              >
                Curated Startups
              </div>
            </div>
            
            <div 
              className="p-8"
              style={{
                background: colors.snow,
                borderRadius: borderRadius.none,
                boxShadow: shadows.medium,
              }}
            >
              <div 
                className="text-5xl font-bold mb-2"
                style={{ color: colors.caribbeanGreen }}
              >
                $2.1B
              </div>
              <div 
                className="text-lg font-medium"
                style={{ color: colors.steelGray }}
              >
                Total Funding
              </div>
            </div>
            
            <div 
              className="p-8"
              style={{
                background: colors.snow,
                borderRadius: borderRadius.none,
                boxShadow: shadows.medium,
              }}
            >
              <div 
                className="text-5xl font-bold mb-2"
                style={{ color: colors.texasRose }}
              >
                94%
              </div>
              <div 
                className="text-lg font-medium"
                style={{ color: colors.steelGray }}
              >
                Success Rate
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}