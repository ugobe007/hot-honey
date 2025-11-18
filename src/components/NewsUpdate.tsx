import React, { useEffect, useState } from 'react';

interface NewsItem {
  id: string;
  text: string;
  company: string;
  url: string;
}

/**
 * NEWS UPDATE TICKER
 * ==================
 * Displays venture capital and startup news in a rotating banner
 * Updates every 20 seconds with fade transition
 */

const newsItems: NewsItem[] = [
  {
    id: '1',
    text: 'Sequoia invests $400M in humanoid robot company',
    company: 'Shadow',
    url: 'https://techcrunch.com/tag/sequoia-capital/'
  },
  {
    id: '2',
    text: 'a16z leads $250M Series C in AI infrastructure startup',
    company: 'Cerebras',
    url: 'https://a16z.com/news/'
  },
  {
    id: '3',
    text: 'Tiger Global backs $180M raise for climate tech unicorn',
    company: 'Climeworks',
    url: 'https://techcrunch.com/tag/tiger-global/'
  },
  {
    id: '4',
    text: 'Founders Fund invests $320M in space mining venture',
    company: 'AstroForge',
    url: 'https://foundersfund.com/news/'
  },
  {
    id: '5',
    text: 'Lightspeed leads $150M round for fintech disruptor',
    company: 'Mercury',
    url: 'https://lsvp.com/stories/'
  },
  {
    id: '6',
    text: 'Accel partners with $200M investment in quantum computing',
    company: 'Rigetti',
    url: 'https://www.accel.com/noteworthy'
  },
  {
    id: '7',
    text: 'Kleiner Perkins backs $290M healthcare AI platform',
    company: 'Tempus',
    url: 'https://www.kleinerperkins.com/perspectives'
  },
  {
    id: '8',
    text: 'Benchmark invests $175M in next-gen battery startup',
    company: 'QuantumScape',
    url: 'https://www.benchmark.com/blog'
  },
  {
    id: '9',
    text: 'Greylock leads $220M round for enterprise SaaS leader',
    company: 'Notion',
    url: 'https://greylock.com/greymatter/'
  },
  {
    id: '10',
    text: 'Index Ventures backs $195M edtech revolution',
    company: 'Coursera',
    url: 'https://www.indexventures.com/perspectives'
  }
];

const NewsUpdate: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setFade(false);
      
      // Wait for fade out, then change news and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % newsItems.length);
        setFade(true);
      }, 300);
    }, 20000); // Change every 20 seconds

    return () => clearInterval(interval);
  }, []);

  const currentNews = newsItems[currentIndex];

  const handleClick = () => {
    window.open(currentNews.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleClick}
      className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-purple-700 to-purple-800 border-2 border-purple-700 rounded-xl shadow-lg cursor-pointer hover:border-purple-600 hover:shadow-xl transition-all"
      style={{ height: '50px' }}
      title="Click to read more"
    >
      {/* News content */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div 
          className={`transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'} flex items-center gap-3`}
        >
          <span className="text-xl">📰</span>
          <span className="text-white font-medium text-base">
            {currentNews.text}
          </span>
          <span className="text-purple-200 text-sm">—</span>
          <span className="text-purple-200 text-sm font-semibold">
            {currentNews.company}
          </span>
        </div>
      </div>

      {/* Subtle shimmer effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        style={{
          animation: 'shimmer 3s infinite',
        }}
      />
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default NewsUpdate;
