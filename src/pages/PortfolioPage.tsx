// src/pages/PortfolioPage.tsx

import React from 'react';
import { useStore } from '../store';
import '../PortfolioPage.css';

const PortfolioPage: React.FC = () => {
  const portfolio = useStore((state) => state.portfolio);
  const updateRating = useStore((state) => state.rateStartup);

  return (
  <div className="portfolio-container bg-orange-50 min-h-screen">
      <h2>Your Portfolio</h2>
      <div className="portfolio-grid">
        {portfolio.map((startup, index) => (
          <div key={index} className="portfolio-card">
            <h3>{startup.name}</h3>
            <p><strong>Tagline:</strong> {startup.description}</p>
            <p><strong>Market Size:</strong> {startup.marketSize}</p>
            <p><strong>Uniqueness:</strong> {startup.unique}</p>
            <p><strong>Raise:</strong> {startup.raise}</p>
            <div className="rating">
              <label htmlFor={`rating-${index}`}>Rating:</label>
              <select
                id={`rating-${index}`}
                value={startup.rating || ''}
                onChange={(e) => updateRating(index, parseInt(e.target.value))}
              >
                <option value="">Rate</option>
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortfolioPage;
