// src/store.ts

import { Startup, StoreState } from './types';
import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import startupData from './data/startupData';
import { getStartupUploads } from './lib/investorService';
import { supabase } from './lib/supabase';

// Function to load approved startups from Supabase with pagination
export async function loadApprovedStartups(limit: number = 50, offset: number = 0): Promise<Startup[]> {
  try {
    // Get total count first to calculate random offset
    const { count } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    
    // Use random offset if not specified (offset=0 means "random")
    const totalStartups = count || 500;
    const randomOffset = offset === 0 ? Math.floor(Math.random() * Math.max(0, totalStartups - limit)) : offset;
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 FETCHING STARTUPS FROM SUPABASE`);
    console.log(`   Query: startup_uploads WHERE status='approved'`);
    console.log(`   Total available: ${totalStartups}, Random offset: ${randomOffset}, Limit: ${limit}`);
    console.log('='.repeat(80));
    
    // Load approved ones with randomized pagination
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(randomOffset, randomOffset + limit - 1);
    
    // If Supabase fails or returns empty, fall back to local startupData
    if (error || !data || data.length === 0) {
      if (error) {
        console.warn('❌ SUPABASE ERROR:', error.message);
      } else {
        console.warn('⚠️ SUPABASE RETURNED EMPTY - startup_uploads table has 0 approved startups');
      }
      
      console.warn('🔄 FALLING BACK TO LOCAL DATA (startupData.ts)');
      console.warn('⚠️ NOTE: Local data uses NUMERIC IDs (0, 1, 2...), not UUIDs');
      console.warn('⚠️ This may cause "Startup Not Found" errors if detail pages expect UUIDs');
      
      // Return paginated slice of local startupData with 5-point format conversion
      const start = offset;
      const end = offset + limit;
      const localData = startupData.slice(start, end).map((startup: any) => {
        // Convert old fivePoints array to new individual fields
        const fivePoints = startup.fivePoints || [];
        return {
          ...startup,
          // Map fivePoints array [tagline, market, solution, team, raise] to new fields
          value_proposition: fivePoints[0] || startup.tagline || '', // Point 1: Value prop/tagline
          market_size: fivePoints[1] || startup.marketSize || '',    // Point 2: Market size
          solution: fivePoints[2] || startup.unique || '',           // Point 3: Solution/unique
          team_companies: fivePoints[3] ? [fivePoints[3]] : [],      // Point 4: Team (as array)
          raise_amount: fivePoints[4] || startup.raise || '',        // Point 5: Raise amount
          problem: startup.description || '',                         // Additional: Problem statement
        };
      });
      console.log(`✅ Using ${localData.length} startups from LOCAL FALLBACK DATA (offset: ${offset})`);
      console.log('🔥 Mapped fivePoints arrays to individual 5-point format fields');
      console.log('💡 TO FIX: Populate startup_uploads table in Supabase with approved startups\n');
      return localData;
    }

    console.log('✅ SUCCESS: Loaded ' + data.length + ' startups FROM SUPABASE');
    console.log('📊 Startup IDs are UUIDs:', data.length > 0);
    
    // 🔥 DEBUG: Check raw data from database
    if (data && data.length > 0) {
      console.log('🔥 FIRST STARTUP FROM DB:', data[0].name, 'GOD SCORE:', data[0].total_god_score);
      console.log('🔥 RAW UPLOAD OBJECT:', {
        id: data[0].id,
        name: data[0].name,
        status: data[0].status,
        total_god_score: data[0].total_god_score,
        typeof_score: typeof data[0].total_god_score
      });
    }
    console.log('='.repeat(80) + '\n');

    // Convert startup_uploads to Startup format
    const converted = data.map((upload: any, index: number) => {
      // Extract data from the extracted_data JSONB field
      const extractedData = upload.extracted_data || {};
      const fivePoints = extractedData.fivePoints || [];
      
      // Calculate hotness from votes if not present
      const yesVotes = upload.yes_votes || 0;
      const noVotes = upload.no_votes || 0;
      const totalVotes = yesVotes + noVotes;
      let calculatedHotness = 0;
      if (totalVotes > 0) {
        const voteRatio = yesVotes / totalVotes;
        calculatedHotness = voteRatio * 10; // 0-10 scale
      }
      
      const startup = {
        id: upload.id, // Use Supabase UUID directly - FIXED!
        name: upload.name || 'Unnamed Startup',
        description: upload.description || upload.pitch || upload.tagline || '',
        pitch: upload.pitch || upload.description || upload.tagline || '',
        tagline: upload.tagline || upload.description || '',
        marketSize: extractedData.marketSize || '',
        unique: extractedData.unique || '',
        raise: upload.raise_amount || '',
        stage: upload.stage || 1,
        yesVotes: yesVotes,
        noVotes: noVotes,
        hotness: upload.hotness || calculatedHotness, // Use DB hotness or calculate from votes
        
        // 🎯 GOD SCORE COMPONENTS - Pass through from database
        total_god_score: upload.total_god_score || 50, // Main GOD score (0-100)
        team_score: upload.team_score || 50,
        traction_score: upload.traction_score || 50,
        market_score: upload.market_score || 50,
        product_score: upload.product_score || 50,
        vision_score: upload.vision_score || 50,
        
        answersCount: 0,
        fivePoints: fivePoints, // ← CRITICAL: This comes from extracted_data.fivePoints
        website: upload.website || '',
        linkedin: upload.linkedin || '',
        comments: [],
        industries: extractedData.industries || upload.industries || [],
        
        // 🔥 VIBE SCORE - Qualitative story (minimized weight)
        value_proposition: upload.value_proposition || '',
        problem: upload.problem || '',
        solution: upload.solution || '',
        market_size: upload.market_size || '',
        team_companies: upload.team_companies || [],
        raise_amount: upload.raise_amount || '',
        raise_type: upload.raise_type || '',
        sectors: upload.sectors || [],
        team_size: upload.team_size || 0,
        revenue_annual: upload.revenue_annual || 0,
        mrr: upload.mrr || 0,
        growth_rate_monthly: upload.growth_rate_monthly || 0,
        has_technical_cofounder: upload.has_technical_cofounder || false,
        is_launched: upload.is_launched || false,
        location: upload.location || '',
        
        // Additional extracted data fields
        team: extractedData.team || upload.team || '',
        traction: extractedData.traction || upload.traction || '',
        founders: extractedData.founders || [],
      };
      
      // DEBUG: Log first 3 startups with detailed info INCLUDING GOD SCORES
      if (index < 3) {
        console.log(`\n📦 Startup #${index + 1}: ${startup.name}`);
        console.log(`   🎯 GOD SCORES FROM DATABASE:`);
        console.log(`      total_god_score: ${upload.total_god_score} → ${startup.total_god_score}`);
        console.log(`      team_score: ${upload.team_score}`);
        console.log(`      traction_score: ${upload.traction_score}`);
        console.log(`      market_score: ${upload.market_score}`);
        console.log(`      product_score: ${upload.product_score}`);
        console.log(`      vision_score: ${upload.vision_score}`);
        console.log(`   extracted_data keys:`, Object.keys(extractedData));
        console.log(`   fivePoints (${fivePoints.length} items):`, fivePoints);
        console.log(`   industries:`, extractedData.industries || upload.industries);
      }
      
      return startup;
    });
    
    return converted;
  } catch (err) {
    console.error('💥 Failed to load approved startups, using local data:', err);
    // Fall back to local data on exception
    const start = offset;
    const end = offset + limit;
    return startupData.slice(start, end);
  }
}

export const useStore = create<StoreState>()(
  persist<StoreState>(
  (set, get) => ({
      unvote: (startup: Startup) => {
        const state = get();
        // Remove from portfolio
        const newPortfolio = state.portfolio.filter((s: Startup) => s.id !== startup.id);
        // Decrement yesVotes in startups
        const updatedStartups = state.startups.map((s: Startup) =>
          s.id === startup.id ? { ...s, yesVotes: Math.max((s.yesVotes || 1) - 1, 0) } : s
        );
        set({
          startups: updatedStartups,
          portfolio: newPortfolio,
        });
      },
      startups: startupData.map((s, idx) => ({
        ...s,
        id: idx,
        yesVotes: 0,
      })),
      currentIndex: 0,
      portfolio: [],
      voteYes: (startup: Startup) => {
        const state = get();
        console.log('voteYes called for:', startup.name, 'Current portfolio:', state.portfolio);
        const updatedStartups = [...state.startups];
        const index = updatedStartups.findIndex(s => s.id === startup.id);
        let updatedStartup = startup;
        if (index !== -1) {
          updatedStartups[index].yesVotes = (updatedStartups[index].yesVotes || 0) + 1;
          updatedStartup = { ...updatedStartups[index] };
        }
        // Only add to portfolio if not already present
        const alreadyInPortfolio = state.portfolio.some((s: Startup) => s.id === updatedStartup.id);
        const newPortfolio = alreadyInPortfolio
          ? state.portfolio.map((s: Startup) => s.id === updatedStartup.id ? updatedStartup : s)
          : [...state.portfolio, updatedStartup];
        
        console.log('New portfolio will be:', newPortfolio);
        
        // Save YES votes to localStorage for Dashboard
        const myYesVotes = JSON.parse(localStorage.getItem('myYesVotes') || '[]');
        const startupIdStr = updatedStartup.id.toString();
        if (!myYesVotes.includes(startupIdStr)) {
          myYesVotes.push(startupIdStr);
          localStorage.setItem('myYesVotes', JSON.stringify(myYesVotes));
        }
        
        // Also save to votedStartups
        const votedStartups = JSON.parse(localStorage.getItem('votedStartups') || '[]');
        if (!votedStartups.includes(startupIdStr)) {
          votedStartups.push(startupIdStr);
          localStorage.setItem('votedStartups', JSON.stringify(votedStartups));
        }
        
        set({
          startups: updatedStartups,
          portfolio: newPortfolio,
          currentIndex: state.currentIndex + 1,
        });
      },
      voteNo: () => {
        set((state) => ({
          currentIndex: state.currentIndex + 1,
        }));
      },
      rateStartup: (index: number, rating: number) => {
        set((state) => {
          const updated = [...state.portfolio];
          if (updated[index]) {
            updated[index].rating = rating;
          }
          return { portfolio: updated };
        });
      },
      resetVoting: () => {
        set((state) => ({
          currentIndex: 0,
        }));
      },
      loadStartupsFromDatabase: async () => {
        const approvedStartups = await loadApprovedStartups();
        const allStartups = [
          ...startupData.map((s, idx) => ({ ...s, id: idx, yesVotes: 0 })),
          ...approvedStartups
        ];
        set({ startups: allStartups });
      },
    }),
    {
      name: 'hot-money-honey-store',
    }
  )
);

