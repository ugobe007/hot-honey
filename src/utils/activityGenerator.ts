import startupData from '../data/startupData';
import type { ActivityItem } from '../components/ActivityTicker';

export function generateRecentActivities(): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const now = new Date();

  // Generate activities from startup data (last 15 startups)
  startupData.slice(0, 15).forEach((startup, index) => {
    const hoursAgo = index * 3; // Stagger by 3 hours
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    // Vary the activity types
    if (index % 4 === 0) {
      // New startup
      activities.push({
        id: `new-${startup.id}-${index}`,
        type: 'new',
        icon: '🚀',
        text: `New: ${startup.name} just launched`,
        timestamp,
      });
    } else if (index % 4 === 1) {
      // Trending
      const votes = Math.floor(Math.random() * 150) + 50;
      activities.push({
        id: `trending-${startup.id}-${index}`,
        type: 'trending',
        icon: '🔥',
        text: `${startup.name}: ${votes} YES votes`,
        timestamp,
      });
    } else if (index % 4 === 2) {
      // Approved
      activities.push({
        id: `approved-${startup.id}-${index}`,
        type: 'approved',
        icon: '✅',
        text: `${startup.name} approved`,
        timestamp,
      });
    } else {
      // Funding
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

  // Sort by timestamp (newest first) then return
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
