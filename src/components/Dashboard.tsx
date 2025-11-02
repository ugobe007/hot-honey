import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StartupCardOfficial from './StartupCardOfficial';
import { NotificationBell } from './NotificationBell';
import startupData from '../data/startupData';
import { useAuth } from '../hooks/useAuth';
import { useVotes } from '../hooks/useVotes';
import { useStore } from '../store';

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

  useEffect(() => {
    if (authLoading || votesLoading) return;

    const isAnonymous = !userId || userId.startsWith('anon_');
    
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading your picks...</div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-[200] pointer-events-auto w-full px-2 sm:px-0 sm:w-auto">
        <div className="flex gap-1 sm:gap-2 pointer-events-auto items-center justify-center flex-wrap">
          <Link to="/" className="text-4xl sm:text-6xl hover:scale-110 transition-transform">🍯</Link>
          <Link to="/" className="px-2 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">🏠 Home</Link>
          <Link to="/vote" className="px-2 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">🗳️ Vote</Link>
          <Link to="/investors" className="px-2 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">💼 Investors</Link>
          <Link to="/upload" className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-lg text-xs sm:text-sm whitespace-nowrap">🚀 Submit</Link>
          <Link to="/dashboard" className="px-3 sm:px-6 py-1.5 sm:py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold rounded-full shadow-xl scale-105 sm:scale-110 text-xs sm:text-base whitespace-nowrap">📊 Dashboard</Link>
          <Link to="/portfolio" className="px-2 sm:px-4 py-1 sm:py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-full transition-all shadow-lg text-xs sm:text-sm whitespace-nowrap">⭐ Portfolio</Link>
        </div>
      </div>

      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-[200] flex gap-1 sm:gap-2 pointer-events-auto flex-wrap justify-end">
        <NotificationBell />
        <Link to="/settings" className="px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-all shadow-md whitespace-nowrap">⚙️</Link>
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-all shadow-md">🚪</button>
      </div>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 sm:p-8">
        <div className="pt-24 sm:pt-28 px-2 sm:px-4 max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2 sm:mb-4">🔥 My Hot Picks</h1>
            <p className="text-lg sm:text-2xl text-purple-200">You've voted YES on <span className="font-bold text-cyan-400">{myYesVotes.length}</span> {myYesVotes.length === 1 ? 'startup' : 'startups'}</p>
          </div>

          {myYesVotes.length === 0 ? (
            <div className="text-center py-20 bg-white/10 backdrop-blur-lg rounded-3xl border-2 border-purple-400/50">
              <div className="text-8xl mb-6">🤷‍♂️</div>
              <h2 className="text-4xl font-bold text-white mb-4">No hot picks yet!</h2>
              <p className="text-xl text-purple-200 mb-8">Start voting YES on startups you're interested in</p>
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
    </>
  );
};

export default Dashboard;
