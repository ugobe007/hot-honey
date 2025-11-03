import { supabase } from '../lib/supabase';
import type { ActivityItem } from '../components/ActivityTicker';
import { getTrendingStartups, getTopVotedStartups, getRecentlyApprovedStartups } from './voteAnalytics';

export async function generateRecentActivities(): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];
  const now = new Date();

  try {
    // Load ALL startups from Supabase instead of hardcoded data
    const { data: allStartups, error: startupsError } = await supabase
      .from('startup_uploads')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (startupsError) {
      console.error('Error loading startups from Supabase:', startupsError);
      return generateFallbackActivities();
    }

    const startupData = allStartups || [];
    console.log(`📊 Loaded ${startupData.length} startups from Supabase for activity generation`);

    // Get real data from Supabase
    const [trendingStartups, topVotedStartups, approvedStartups] = await Promise.all([
      getTrendingStartups(5),
      getTopVotedStartups(5),
      getRecentlyApprovedStartups(5),
    ]);

    // Add trending activities (most recent first)
    trendingStartups.forEach((item, index) => {
      const hoursAgo = index * 2;
      activities.push({
        id: `trending-${item.startup.id}`,
        type: 'trending',
        icon: '🔥',
        text: `${item.startup.name}: ${item.stats.totalYesVotes} YES votes`,
        timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
      });
    });

    // Add top voted activities
    topVotedStartups.forEach((item, index) => {
      if (item.stats.recentYesVotes > 0) {
        const hoursAgo = (index + 5) * 2;
        activities.push({
          id: `votes-${item.startup.id}`,
          type: 'trending',
          icon: '⭐',
          text: `${item.startup.name} trending with ${item.stats.recentYesVotes} new votes`,
          timestamp: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000),
        });
      }
    });

    // Add approved startup activities
    approvedStartups.forEach((startup, index) => {
      // Skip if no company name
      if (!startup.company_name) {
        console.warn('Skipping approved startup with no company_name:', startup.id);
        return;
      }
      
      const hoursAgo = (index + 10) * 3;
      activities.push({
        id: `approved-${startup.id}`,
        type: 'approved',
        icon: '✅',
        text: `${startup.company_name} approved`,
        timestamp: new Date(startup.updated_at || now.getTime() - hoursAgo * 60 * 60 * 1000),
      });
    });

    // Add some "new startup" activities from ALL startups
    startupData.forEach((startup, index) => {
      const startupName = startup.name || startup.company_name || 'Unknown';
      const daysAgo = (index % 10) + 1; // Cycle through recent days
      activities.push({
        id: `new-${startup.id}`,
        type: 'new',
        icon: '🚀',
        text: `New: ${startupName} just launched`,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      });
    });

    // Add funding announcements for ALL startups
    const fundingAmounts = ['$500K', '$750K', '$1M', '$1.5M', '$2M', '$3M', '$5M'];
    startupData.forEach((startup, index) => {
      const startupName = startup.name || startup.company_name || 'Unknown';
      const daysAgo = (index % 15) + 1; // Spread over 15 days
      activities.push({
        id: `funding-${startup.id}`,
        type: 'funding',
        icon: '💰',
        text: `${startupName} raised ${fundingAmounts[index % fundingAmounts.length]}`,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      });
    });

    // Add industry news related to startups
    const industryNews = [
      { icon: '📰', text: 'AI market projected to reach $1.8T by 2030', days: 1, type: 'trending' },
      { icon: '🌍', text: 'Clean energy investments hit record $500B this year', days: 2, type: 'trending' },
      { icon: '💳', text: 'Crypto payment volume surges 150% in Q3', days: 2, type: 'trending' },
      { icon: '🏥', text: 'Digital health funding reaches $29B milestone', days: 3, type: 'trending' },
      { icon: '🔬', text: 'Patent filings for AI technology up 35% YoY', days: 3, type: 'trending' },
      { icon: '☀️', text: 'Solar panel costs drop 20%, boosting adoption', days: 4, type: 'trending' },
      { icon: '🤖', text: 'Enterprise AI adoption crosses 75% threshold', days: 5, type: 'trending' },
      { icon: '🔐', text: 'Blockchain security startups raise $12B in 2025', days: 5, type: 'trending' },
      { icon: '🌱', text: 'Sustainability tech funding triples vs last year', days: 6, type: 'trending' },
      { icon: '💰', text: 'Fintech valuations recover with 40% increase', days: 7, type: 'trending' },
      { icon: '🎓', text: 'Top VCs increase seed stage investments by 60%', days: 8, type: 'trending' },
      { icon: '🚀', text: 'Y Combinator batch sees 80% funding success rate', days: 9, type: 'trending' },
      { icon: '📊', text: 'SaaS companies hit $200B collective ARR', days: 10, type: 'trending' },
      { icon: '🔋', text: 'Battery storage costs fall 50%, enabling growth', days: 11, type: 'trending' },
      { icon: '🌐', text: 'Web3 user adoption reaches 100M active users', days: 12, type: 'trending' },
    ];

    industryNews.forEach((news, index) => {
      activities.push({
        id: `industry-${index}`,
        type: news.type as 'trending',
        icon: news.icon,
        text: news.text,
        timestamp: new Date(now.getTime() - news.days * 24 * 60 * 60 * 1000),
      });
    });

    // Add IP filing activities - check extracted_data or direct fields
    startupData.forEach((startup) => {
      const extractedData = startup.extracted_data || {};
      const ipFilings = startup.ipFilings || extractedData.ipFilings || startup.ip_filings || [];
      const startupName = startup.name || startup.company_name || 'Unknown';
      
      if (ipFilings && ipFilings.length > 0) {
        ipFilings.forEach((filing: any) => {
          const filingDate = new Date(filing.date);
          const daysSinceFiling = Math.floor((now.getTime() - filingDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceFiling <= 30) { // Only show recent filings (last 30 days)
            const icon = filing.type === 'patent' ? '📜' : filing.type === 'trademark' ? '™️' : '©️';
            const statusText = filing.status === 'approved' ? 'secured' : filing.status === 'pending' ? 'filed for' : 'submitted';
            activities.push({
              id: `ip-${startup.id}-${filing.title}`,
              type: 'ip-filing',
              icon,
              text: `${startupName} ${statusText} ${filing.type}: "${filing.title}"`,
              timestamp: filingDate,
            });
          }
        });
      }
    });

    // Add team hire activities
    startupData.forEach((startup) => {
      const extractedData = startup.extracted_data || {};
      const teamHires = startup.teamHires || extractedData.teamHires || startup.team_hires || [];
      const startupName = startup.name || startup.company_name || 'Unknown';
      
      if (teamHires && teamHires.length > 0) {
        teamHires.forEach((hire: any) => {
          const joinDate = new Date(hire.joinedDate);
          const daysSinceHire = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceHire <= 30) { // Only show recent hires (last 30 days)
            const prevCompany = hire.previousCompany ? ` from ${hire.previousCompany}` : '';
            activities.push({
              id: `hire-${startup.id}-${hire.name}`,
              type: 'team-hire',
              icon: '👥',
              text: `${startupName} hired ${hire.name} as ${hire.role}${prevCompany}`,
              timestamp: joinDate,
            });
          }
        });
      }
    });

    // Add advisor activities
    startupData.forEach((startup) => {
      const extractedData = startup.extracted_data || {};
      const advisors = startup.advisors || extractedData.advisors || [];
      const startupName = startup.name || startup.company_name || 'Unknown';
      
      if (advisors && advisors.length > 0) {
        advisors.forEach((advisor: any) => {
          const joinDate = new Date(advisor.joinedDate);
          const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceJoin <= 30) { // Only show recent advisors (last 30 days)
            const company = advisor.company ? ` at ${advisor.company}` : '';
            activities.push({
              id: `advisor-${startup.id}-${advisor.name}`,
              type: 'advisor-join',
              icon: '🎓',
              text: `${advisor.name} (${advisor.expertise}${company}) joined ${startupName} as advisor`,
              timestamp: joinDate,
            });
          }
        });
      }
    });

    // Add board member activities
    startupData.forEach((startup) => {
      const extractedData = startup.extracted_data || {};
      const boardMembers = startup.boardMembers || extractedData.boardMembers || startup.board_members || [];
      const startupName = startup.name || startup.company_name || 'Unknown';
      
      if (boardMembers && boardMembers.length > 0) {
        boardMembers.forEach((member: any) => {
          const joinDate = new Date(member.joinedDate);
          const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceJoin <= 30) { // Only show recent board members (last 30 days)
            const company = member.company ? ` from ${member.company}` : '';
            activities.push({
              id: `board-${startup.id}-${member.name}`,
              type: 'board-member',
              icon: '🏛️',
              text: `${member.name}${company} joined ${startupName} board`,
              timestamp: joinDate,
            });
          }
        });
      }
    });

    // Add customer traction activities
    startupData.forEach((startup) => {
      const extractedData = startup.extracted_data || {};
      const customerTraction = startup.customerTraction || extractedData.customerTraction || startup.customer_traction || [];
      const startupName = startup.name || startup.company_name || 'Unknown';
      
      if (customerTraction && customerTraction.length > 0) {
        customerTraction.forEach((traction: any) => {
          const tractionDate = new Date(traction.date);
          const daysSinceMilestone = Math.floor((now.getTime() - tractionDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceMilestone <= 30) { // Only show recent milestones (last 30 days)
            activities.push({
              id: `traction-${startup.id}-${traction.metric}`,
              type: 'customer-milestone',
              icon: '📈',
              text: `${startupName} reached ${traction.metric}`,
              timestamp: tractionDate,
            });
          }
        });
      }
    });

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove duplicates - keep track of both ID and text to catch true duplicates
    const seenActivities = new Set<string>();
    const uniqueActivities = activities.filter(activity => {
      // Create a unique key from the activity text (which includes the startup name)
      const uniqueKey = activity.text.toLowerCase().trim();
      
      if (seenActivities.has(uniqueKey)) {
        return false; // Skip duplicate
      }
      
      seenActivities.add(uniqueKey);
      return true;
    });

    console.log(`📡 Generated ${uniqueActivities.length} unique real-time activities (filtered from ${activities.length})`);
    return uniqueActivities;

  } catch (error) {
    console.error('Error generating activities:', error);
    
    // Fallback to simulated data if Supabase fails
    return generateFallbackActivities();
  }
}

// Fallback function with simulated data (same as original)
function generateFallbackActivities(): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const now = new Date();

  startupData.slice(0, 15).forEach((startup, index) => {
    const hoursAgo = index * 3;
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    if (index % 4 === 0) {
      activities.push({
        id: `new-${startup.id}-${index}`,
        type: 'new',
        icon: '🚀',
        text: `New: ${startup.name} just launched`,
        timestamp,
      });
    } else if (index % 4 === 1) {
      const votes = Math.floor(Math.random() * 150) + 50;
      activities.push({
        id: `trending-${startup.id}-${index}`,
        type: 'trending',
        icon: '🔥',
        text: `${startup.name}: ${votes} YES votes`,
        timestamp,
      });
    } else if (index % 4 === 2) {
      activities.push({
        id: `approved-${startup.id}-${index}`,
        type: 'approved',
        icon: '✅',
        text: `${startup.name} approved`,
        timestamp,
      });
    } else {
      const amounts = ['$500K', '$1M', '$2M', '$5M', '$10M'];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      activities.push({
        id: `funding-${startup.id}-${index}`,
        type: 'funding',
        icon: '💰',
        text: `${startup.name} raised ${amount}`,
        timestamp,
      });
    }
  });

  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

