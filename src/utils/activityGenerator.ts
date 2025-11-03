import startupData from '../data/startupData';
import type { ActivityItem } from '../components/ActivityTicker';
import { getTrendingStartups, getTopVotedStartups, getRecentlyApprovedStartups } from './voteAnalytics';

export async function generateRecentActivities(): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];
  const now = new Date();

  try {
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

    // Add some "new startup" activities from recent data
    const recentStartups = startupData.slice(0, 5);
    recentStartups.forEach((startup, index) => {
      const daysAgo = index + 1;
      activities.push({
        id: `new-${startup.id}`,
        type: 'new',
        icon: '🚀',
        text: `New: ${startup.name} just launched`,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      });
    });

    // Add some funding announcements (simulated for now - can connect to real data later)
    const fundingStartups = startupData.slice(5, 8);
    const fundingAmounts = ['$500K', '$1M', '$2M', '$5M'];
    fundingStartups.forEach((startup, index) => {
      const daysAgo = (index + 2) * 2;
      activities.push({
        id: `funding-${startup.id}`,
        type: 'funding',
        icon: '💰',
        text: `${startup.name} raised ${fundingAmounts[index % fundingAmounts.length]}`,
        timestamp: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      });
    });

    // Add IP filing activities
    startupData.forEach((startup) => {
      if (startup.ipFilings && startup.ipFilings.length > 0) {
        startup.ipFilings.forEach((filing) => {
          const daysSinceFiling = Math.floor((now.getTime() - filing.date.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceFiling <= 30) { // Only show recent filings (last 30 days)
            const icon = filing.type === 'patent' ? '📜' : filing.type === 'trademark' ? '™️' : '©️';
            const statusText = filing.status === 'approved' ? 'secured' : filing.status === 'pending' ? 'filed for' : 'submitted';
            activities.push({
              id: `ip-${startup.id}-${filing.title}`,
              type: 'ip-filing',
              icon,
              text: `${startup.name} ${statusText} ${filing.type}: "${filing.title}"`,
              timestamp: filing.date,
            });
          }
        });
      }
    });

    // Add team hire activities
    startupData.forEach((startup) => {
      if (startup.teamHires && startup.teamHires.length > 0) {
        startup.teamHires.forEach((hire) => {
          const daysSinceHire = Math.floor((now.getTime() - hire.joinedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceHire <= 30) { // Only show recent hires (last 30 days)
            const prevCompany = hire.previousCompany ? ` from ${hire.previousCompany}` : '';
            activities.push({
              id: `hire-${startup.id}-${hire.name}`,
              type: 'team-hire',
              icon: '👥',
              text: `${startup.name} hired ${hire.name} as ${hire.role}${prevCompany}`,
              timestamp: hire.joinedDate,
            });
          }
        });
      }
    });

    // Add advisor activities
    startupData.forEach((startup) => {
      if (startup.advisors && startup.advisors.length > 0) {
        startup.advisors.forEach((advisor) => {
          const daysSinceJoin = Math.floor((now.getTime() - advisor.joinedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceJoin <= 30) { // Only show recent advisors (last 30 days)
            const company = advisor.company ? ` at ${advisor.company}` : '';
            activities.push({
              id: `advisor-${startup.id}-${advisor.name}`,
              type: 'advisor-join',
              icon: '🎓',
              text: `${advisor.name} (${advisor.expertise}${company}) joined ${startup.name} as advisor`,
              timestamp: advisor.joinedDate,
            });
          }
        });
      }
    });

    // Add board member activities
    startupData.forEach((startup) => {
      if (startup.boardMembers && startup.boardMembers.length > 0) {
        startup.boardMembers.forEach((member) => {
          const daysSinceJoin = Math.floor((now.getTime() - member.joinedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceJoin <= 30) { // Only show recent board members (last 30 days)
            const company = member.company ? ` from ${member.company}` : '';
            activities.push({
              id: `board-${startup.id}-${member.name}`,
              type: 'board-member',
              icon: '🏛️',
              text: `${member.name}${company} joined ${startup.name} board`,
              timestamp: member.joinedDate,
            });
          }
        });
      }
    });

    // Add customer traction activities
    startupData.forEach((startup) => {
      if (startup.customerTraction && startup.customerTraction.length > 0) {
        startup.customerTraction.forEach((traction) => {
          const daysSinceMilestone = Math.floor((now.getTime() - traction.date.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceMilestone <= 30) { // Only show recent milestones (last 30 days)
            activities.push({
              id: `traction-${startup.id}-${traction.metric}`,
              type: 'customer-milestone',
              icon: '📈',
              text: `${startup.name} reached ${traction.metric}`,
              timestamp: traction.date,
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

