import React, { useState } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';

interface StartupProfile {
  id: string;
  name: string;
  description: string;
  foundedYear: number;
  industry: string;
  teamSize: number;
  funding: string;
  stage: string;
  pitchDeck?: string;
  website?: string;
  contacts: {
    founder: string;
    email: string;
    phone?: string;
  };
  metrics: {
    totalVotes: number;
    popularityScore: number;
    currentStage: string;
  };
}

const Dashboard: React.FC = () => {
  const { startups, calculatePopularityScore } = usePortfolioStore();
  
  const [selectedStartup, setSelectedStartup] = useState<string | null>(null);
  
  // Convert portfolio startups to startup profiles
  const startupProfiles: StartupProfile[] = startups.map(startup => ({
    id: startup.id,
    name: startup.name,
    description: startup.description,
    foundedYear: 2024,
    industry: startup.name.includes('AI') || startup.name.includes('Neural') ? 'AI/ML' :
              startup.name.includes('Green') ? 'CleanTech' :
              startup.name.includes('Fin') ? 'FinTech' : 'Technology',
    teamSize: Math.floor(Math.random() * 50) + 5,
    funding: ['Pre-Seed', 'Seed', 'Series A'][Math.floor(Math.random() * 3)],
    stage: startup.stage,
    website: `https://${startup.name.toLowerCase()}.com`,
    contacts: {
      founder: `${startup.name} Founder`,
      email: `founder@${startup.name.toLowerCase()}.com`,
      phone: '+1 (555) 123-4567'
    },
    metrics: {
      totalVotes: startup.yesVotes,
      popularityScore: calculatePopularityScore(startup.id),
      currentStage: startup.stage
    }
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-orange-600 mb-4">
            🚀 Startup Profiles 🚀
          </h1>
          <p className="text-lg text-gray-600">
            Detailed profiles of startups in the Hot Money Honey ecosystem
          </p>
        </div>

        {/* Startup Profiles Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {startupProfiles.map((profile) => (
            <div 
              key={profile.id} 
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-800">{profile.name}</h3>
                <div className="text-2xl">🚀</div>
              </div>

              {/* Basic Info */}
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">{profile.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {profile.industry}
                  </span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    {profile.funding}
                  </span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                    Team: {profile.teamSize}
                  </span>
                </div>
              </div>

              {/* Stage Badge */}
              <div className="mb-3">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {profile.stage}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-orange-600">
                    {profile.metrics.totalVotes}
                  </div>
                  <div className="text-xs text-gray-500">Total Votes</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-purple-600">
                    {profile.metrics.popularityScore}
                  </div>
                  <div className="text-xs text-gray-500">Popularity Score</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Contact:</h4>
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium">Founder:</span> {profile.contacts.founder}</p>
                  <p><span className="font-medium">Email:</span> {profile.contacts.email}</p>
                  {profile.website && (
                    <p>
                      <span className="font-medium">Website:</span> 
                      <a href={profile.website} className="text-blue-500 hover:underline ml-1">
                        {profile.website}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-lg text-sm font-medium">
                  View Details
                </button>
                <button className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 px-3 rounded-lg text-sm font-medium">
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action for Startups */}
        <div className="mt-16 text-center bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-4">Are you a Startup?</h2>
          <p className="text-lg mb-6">
            Join Hot Money Honey and get your startup in front of engaged investors!
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-white text-orange-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100">
              📝 Create Profile
            </button>
            <button className="bg-orange-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-800">
              📧 Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
