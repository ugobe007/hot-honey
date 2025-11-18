import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StartupCardOfficial from './StartupCardOfficial';
import HamburgerMenu from './HamburgerMenu';
import BonusCard from './BonusCard';
import FirePointsWidget from './FirePointsWidget';
import { NotificationBell } from './NotificationBell';
import startupData from '../data/startupData';
import { useAuth } from '../hooks/useAuth';
import { useVotes } from '../hooks/useVotes';
import { useStore } from '../store';
import { shouldShowBonusCard, initializeInvestorProfile } from '../utils/firePointsManager';

interface YesVote {
  id: number;
  name: string;
  pitch?: string;
  tagline?: string;
  stage?: number;
  fivePoints?: string[];
  votedAt: string;
}

const Dashboard: React.FC = () => {
  const { userId, isLoading: authLoading } = useAuth();
  const { votes, isLoading: votesLoading, getYesVotes, voteCounts } = useVotes(userId);
  const portfolio = useStore((state) => state.portfolio);
  const [myYesVotes, setMyYesVotes] = useState<YesVote[]>([]);
  const [showBonusCard, setShowBonusCard] = useState(false);

  useEffect(() => {
    if (authLoading || votesLoading) return;

    const isAnonymous = !userId || userId.startsWith('anon_');
    
    // Initialize investor profile if needed
    const userIdForProfile = userId || localStorage.getItem('userId') || `anon_${Date.now()}`;
    if (!localStorage.getItem('investorProfile')) {
      initializeInvestorProfile(userIdForProfile);
    }
    
    // Check for bonus card (20% chance)
    if (shouldShowBonusCard()) {
      setTimeout(() => setShowBonusCard(true), 2000); // Show after 2 seconds
    }
    
    console.log('Dashboard useEffect:', { 
      isAnonymous, 
      userId, 
      portfolioLength: portfolio.length,
      myYesVotes_localStorage: localStorage.getItem('myYesVotes')
    });
    
    if (isAnonymous) {
      // For anonymous users, read from myYesVotes localStorage
      const myYesVotesStr = localStorage.getItem('myYesVotes');
      console.log('myYesVotes from localStorage:', myYesVotesStr);
      
      if (myYesVotesStr) {
        try {
          const yesVotesArray = JSON.parse(myYesVotesStr);
          console.log('Parsed YES votes array:', yesVotesArray);
          
          // The votes are already full startup objects, just need to deduplicate by ID
          const uniqueVotesMap = new Map();
          yesVotesArray.forEach((vote: YesVote) => {
            if (vote && vote.id !== undefined) {
              uniqueVotesMap.set(vote.id, vote);
            }
          });
          
          const uniqueVotes = Array.from(uniqueVotesMap.values());
          console.log('Unique votes after deduplication:', uniqueVotes);
          
          setMyYesVotes(uniqueVotes);
        } catch (e) {
          console.error('Error parsing myYesVotes:', e);
        }
      } else {
        console.log('No myYesVotes in localStorage');
        setMyYesVotes([]);
      }
    } else {
      // For authenticated users, get YES vote startup IDs from Supabase
      const yesVoteIds = getYesVotes();
      
      // Enrich with full startup data
      const enrichedVotes = yesVoteIds.map(id => {
        const startup = startupData.find(s => s.id.toString() === id);
        if (startup) {
          return {
            id: startup.id,
            name: startup.name,
            pitch: startup.pitch,
            tagline: startup.tagline,
            stage: startup.stage,
            fivePoints: startup.fivePoints,
            votedAt: votes.find(v => v.startup_id === id)?.created_at || new Date().toISOString(),
          };
        }
        return null;
      }).filter(Boolean) as YesVote[];

      setMyYesVotes(enrichedVotes);
    }
  }, [authLoading, votesLoading, votes, portfolio, userId]); // Added portfolio and userId to dependencies

  const handleVote = (vote: 'yes' | 'no', startup?: any) => {
    if (vote === 'no' && startup) {
      // Remove from state immediately for instant UI update
      setMyYesVotes(prev => prev.filter(v => v.id !== startup.id));
      
      // Remove from localStorage
      const myYesVotesStr = localStorage.getItem('myYesVotes');
      if (myYesVotesStr) {
        try {
          const yesVotesArray = JSON.parse(myYesVotesStr);
          const updatedVotes = yesVotesArray.filter((v: any) => v.id !== startup.id);
          localStorage.setItem('myYesVotes', JSON.stringify(updatedVotes));
        } catch (e) {
          console.error('Error updating myYesVotes:', e);
        }
      }
      
      // Also remove from votedStartups
      const votedStartupsStr = localStorage.getItem('votedStartups');
      if (votedStartupsStr) {
        try {
          const votedStartups = JSON.parse(votedStartupsStr);
          const updatedVoted = votedStartups.filter((id: number) => id !== startup.id);
          localStorage.setItem('votedStartups', JSON.stringify(updatedVoted));
        } catch (e) {
          console.error('Error updating votedStartups:', e);
        }
      }
    }
  };

  if (authLoading || votesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 flex items-center justify-center">
        <div className="text-orange-600 text-2xl font-bold">Loading your picks...</div>
      </div>
    );
  }

  return (
    <>
      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Current Page Button */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <Link to="/" className="px-4 py-2 rounded-full bg-gradient-to-b from-slate-300 via-slate-200 to-slate-400 text-slate-800 font-medium text-sm flex items-center gap-2 shadow-lg hover:from-slate-400 hover:via-slate-300 hover:to-slate-500 transition-all"
          style={{
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.2)',
            textShadow: '0 1px 1px rgba(255,255,255,0.8)'
          }}>
          <span>📊</span>
          <span>Dashboard</span>
        </Link>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 p-4 sm:p-8">
        <div className="pt-24 sm:pt-28 px-2 sm:px-4 max-w-7xl mx-auto">
          
          <div className="text-center mb-8 sm:mb-12">
            <div className="relative inline-block">
              <h1 className="text-4xl sm:text-6xl font-bold text-orange-600 mb-2 sm:mb-4 inline-flex items-center gap-3">
                🔥 My Hot Picks
              </h1>
              {/* Mr. Bee next to title - larger and closer */}
              <img 
                src="/images/Mr_Bee.png" 
                alt="Mr. Bee" 
                className="absolute -right-20 sm:-right-24 w-24 sm:w-28 h-24 sm:h-28 object-contain"
                style={{ 
                  top: '-10px'
                }}
              />
            </div>
            <p className="text-lg sm:text-2xl text-slate-700 mt-4">You've voted YES on <span className="font-bold text-orange-500">{myYesVotes.length}</span> {myYesVotes.length === 1 ? 'startup' : 'startups'}</p>
          </div>

          {/* Fire Points Widget */}
          <div className="mb-8">
            <FirePointsWidget />
          </div>

          {myYesVotes.length === 0 ? (
            <div className="text-center py-20 bg-orange-50/50 backdrop-blur-lg rounded-3xl border-2 border-orange-200/50">
              <div className="text-8xl mb-6">🤷‍♂️</div>
              <h2 className="text-4xl font-bold text-orange-600 mb-4">No hot picks yet!</h2>
              <p className="text-xl text-slate-700 mb-8">Start voting YES on startups you're interested in</p>
              <Link to="/vote" className="inline-block px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-2xl shadow-xl transition-all">🔥 Start Voting Now</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myYesVotes.map((vote) => (
                <StartupCardOfficial key={vote.id} startup={vote} onVote={handleVote} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Bonus Card Modal */}
      {showBonusCard && (
        <BonusCard
          onClose={() => setShowBonusCard(false)}
          onClaim={() => setShowBonusCard(false)}
        />
      )}
    </>
  );
};

export default Dashboard;
