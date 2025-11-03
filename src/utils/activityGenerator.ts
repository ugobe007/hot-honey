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

    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Remove duplicates based on startup ID
    const seenStartups = new Set<string>();
    const uniqueActivities = activities.filter(activity => {
      // Extract startup ID from the id field (e.g., "trending-123" -> "123")
      const startupId = activity.id.split('-').slice(1).join('-');
      
      if (seenStartups.has(startupId)) {
        return false; // Skip duplicate
      }
      
      seenStartups.add(startupId);
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

