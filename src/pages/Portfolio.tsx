// src/pages/Portfolio.tsx

import React from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';

const Portfolio: React.FC = () => {
  const { portfolio, rateStartup } = useStore();
  const navigate = useNavigate();

  const handleRatingChange = (index: number, rating: number) => {
    rateStartup(index, rating);
  };

  return (
  <div className="p-4 bg-orange-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6">My Portfolio</h2>
      {portfolio.length === 0 ? (
        <p className="text-gray-600">You haven't added any startups yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {portfolio.map((startup, index) => (
            <div key={startup.id} className="bg-orange-100 p-4 rounded-xl shadow-lg border border-orange-300">
              <h3 className="text-xl font-semibold mb-2">{startup.name}</h3>
              <p className="text-gray-700 mb-2">{startup.description}</p>
              <div className="flex space-x-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`text-xl ${startup.rating === star ? 'text-yellow-500' : 'text-gray-400'}`}
                    onClick={() => handleRatingChange(index, star)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => navigate(`/startup/${startup.id}`)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Portfolio;
