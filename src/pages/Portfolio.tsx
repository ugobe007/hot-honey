import React from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import StartupCard from '../components/StartupCard';

const Portfolio: React.FC = () => {
  const { portfolioStartups, startups, userVotes } = usePortfolioStore();

  const portfolioStartupsList = startups.filter(startup => 
    portfolioStartups.includes(startup.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-orange-600 mb-4">
            👥 Investor Dashboard 👥
          </h1>
          <p className="text-lg text-gray-600">
            Your investment portfolio and voting history
          </p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <h3 className="text-2xl font-bold text-orange-500 mb-2">
              {portfolioStartups.length}
            </h3>
            <p className="text-gray-600">Startups in Portfolio</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <h3 className="text-2xl font-bold text-green-500 mb-2">
              {userVotes.filter(vote => vote.vote === 'yes').length}
            </h3>
            <p className="text-gray-600">Total "Yes" Votes</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <h3 className="text-2xl font-bold text-blue-500 mb-2">
              {userVotes.length}
            </h3>
            <p className="text-gray-600">Total Votes Cast</p>
          </div>
        </div>

        {/* Portfolio Startups */}
        {portfolioStartupsList.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {portfolioStartupsList.map((startup) => (
              <StartupCard
                key={startup.id}
                id={startup.id}
                name={startup.name}
                description={startup.description}
                votes={startup.votes}
                totalVotes={startup.totalVotes}
                stage={startup.stage}
              />
            ))}
          </div>
        ) : (
          <div className="text-center bg-white rounded-xl p-12 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-500 mb-4">
              No Startups in Portfolio Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start voting "Yes" on startups to build your investment portfolio!
            </p>
            <a 
              href="/"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium inline-block"
            >
              🚀 Start Voting
            </a>
          </div>
        )}

        {/* Recent Votes */}
        <div className="mt-12 bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Votes</h3>
          {userVotes.length > 0 ? (
            <div className="space-y-3">
              {userVotes.slice(-5).reverse().map((vote, index) => {
                const startup = startups.find(s => s.id === vote.startupId);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{startup?.name || 'Unknown Startup'}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {vote.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      vote.vote === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {vote.vote === 'yes' ? '👍 Yes' : '👎 No'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No votes cast yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
