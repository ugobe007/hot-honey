/**
 * Investor News Scraper Service
 * 
 * This service integrates with your existing scraper to:
 * 1. Fetch news articles from various sources
 * 2. Enrich investor profiles with latest updates
 * 3. Track investor activity (investments, exits, announcements)
 */

import { supabase } from '../lib/supabase';

interface NewsArticle {
  title: string;
  url: string;
  summary?: string;
  content?: string;
  published_date: string;
  source: string;
  source_type: 'news' | 'blog' | 'press_release' | 'social';
  author?: string;
  image_url?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
  entities?: string[];
}

interface InvestorActivity {
  activity_type: 'investment' | 'exit' | 'hire' | 'announcement' | 'fund_raise' | 'portfolio_update';
  title: string;
  description?: string;
  startup_id?: string;
  amount?: string;
  round_type?: string;
  date: string;
  source_url?: string;
}

/**
 * Scrape news for a specific investor
 */
export async function scrapeInvestorNews(investorId: string, investorName: string) {
  console.log(`📰 Scraping news for: ${investorName}`);
  
  try {
    // INTEGRATE WITH YOUR EXISTING SCRAPER HERE
    // Example sources to scrape:
    const newsSources = [
      `https://news.google.com/search?q=${encodeURIComponent(investorName)}`,
      `https://techcrunch.com/tag/${encodeURIComponent(investorName.toLowerCase().replace(/\s+/g, '-'))}`,
      `https://www.axios.com/search?q=${encodeURIComponent(investorName)}`,
      // Add your scraper endpoints
    ];
    
    // Mock data for now - replace with your actual scraper
    const scrapedArticles: NewsArticle[] = await fetchArticlesFromSources(investorName, newsSources);
    
    // Insert articles into database
    if (scrapedArticles.length > 0) {
      const { data, error } = await supabase
        .from('investor_news')
        .insert(
          scrapedArticles.map(article => ({
            investor_id: investorId,
            ...article,
            topics: article.topics || [],
            entities: article.entities || []
          }))
        )
        .select();
      
      if (error) {
        console.error(`❌ Error inserting news:`, error);
        return { success: false, error };
      }
      
      console.log(`✅ Inserted ${data.length} news articles`);
      return { success: true, count: data.length, articles: data };
    }
    
    return { success: true, count: 0 };
  } catch (error) {
    console.error(`❌ Error scraping news:`, error);
    return { success: false, error };
  }
}

/**
 * Fetch articles from multiple news sources
 * REPLACE THIS WITH YOUR ACTUAL SCRAPER IMPLEMENTATION
 */
async function fetchArticlesFromSources(investorName: string, sources: string[]): Promise<NewsArticle[]> {
  // This is a placeholder - integrate with your actual scraper
  // Examples of what your scraper might return:
  
  const mockArticles: NewsArticle[] = [
    {
      title: `${investorName} leads $50M Series B in AI startup`,
      url: `https://techcrunch.com/${investorName.toLowerCase()}-series-b`,
      summary: `${investorName} has led a $50 million Series B round in an AI infrastructure company.`,
      published_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'TechCrunch',
      source_type: 'news',
      sentiment: 'positive',
      topics: ['funding', 'ai', 'series_b'],
      entities: [investorName, 'AI', 'Series B']
    },
    {
      title: `${investorName} announces new $500M fund`,
      url: `https://axios.com/${investorName.toLowerCase()}-fund`,
      summary: `${investorName} has closed a new $500 million fund focused on early-stage startups.`,
      published_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'Axios',
      source_type: 'news',
      sentiment: 'positive',
      topics: ['fund_raise', 'venture_capital'],
      entities: [investorName, 'Fund']
    }
  ];
  
  // TODO: Replace with your actual scraper logic
  // return await yourScraper.fetchNews(investorName, sources);
  
  return mockArticles;
}

/**
 * Track investor activity (investments, exits, etc.)
 */
export async function trackInvestorActivity(investorId: string, activity: InvestorActivity) {
  try {
    const { data, error } = await supabase
      .from('investor_activity')
      .insert({
        investor_id: investorId,
        ...activity
      })
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error tracking activity:`, error);
      return { success: false, error };
    }
    
    console.log(`✅ Tracked activity: ${activity.title}`);
    return { success: true, activity: data };
  } catch (error) {
    console.error(`❌ Error:`, error);
    return { success: false, error };
  }
}

/**
 * Get enriched investor profile (with news and activity)
 */
export async function getEnrichedInvestorProfile(investorId: string) {
  try {
    const { data, error } = await supabase
      .from('investor_profile_enriched')
      .select('*')
      .eq('id', investorId)
      .single();
    
    if (error) {
      console.error(`❌ Error fetching profile:`, error);
      return { success: false, error };
    }
    
    return { success: true, profile: data };
  } catch (error) {
    console.error(`❌ Error:`, error);
    return { success: false, error };
  }
}

/**
 * Bulk scrape news for all investors
 * Run this as a cron job (daily/hourly)
 */
export async function bulkScrapeAllInvestorNews() {
  console.log('🔥 Starting bulk news scrape for all investors...\n');
  
  try {
    // Get all investors
    const { data: investors, error } = await supabase
      .from('investors')
      .select('id, name')
      .order('name');
    
    if (error) throw error;
    
    console.log(`📊 Found ${investors.length} investors\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const investor of investors) {
      console.log(`\n📰 [${successCount + errorCount + 1}/${investors.length}] ${investor.name}`);
      
      const result = await scrapeInvestorNews(investor.id, investor.name);
      
      if (result.success) {
        successCount++;
        console.log(`   ✅ Success (${result.count} articles)`);
      } else {
        errorCount++;
        console.log(`   ❌ Failed`);
      }
      
      // Brief pause to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 BULK SCRAPE RESULTS:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total: ${investors.length}`);
    
    return { successCount, errorCount, total: investors.length };
  } catch (error) {
    console.error('❌ Fatal error in bulk scrape:', error);
    return { success: false, error };
  }
}

/**
 * Get latest news for all investors (for matching engine)
 */
export async function getInvestorNewsForMatching() {
  try {
    const { data, error } = await supabase
      .from('investor_news')
      .select(`
        id,
        investor_id,
        title,
        url,
        summary,
        published_date,
        source,
        sentiment,
        investors (name)
      `)
      .eq('is_published', true)
      .order('published_date', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    return { success: true, news: data };
  } catch (error) {
    console.error('❌ Error fetching news:', error);
    return { success: false, error };
  }
}

// Export all functions
export default {
  scrapeInvestorNews,
  trackInvestorActivity,
  getEnrichedInvestorProfile,
  bulkScrapeAllInvestorNews,
  getInvestorNewsForMatching
};
