import { createClient } from '@supabase/supabase-js';
import { 
  FundingData, 
  StartupData, 
  InvestorData, 
  HotDeal, 
  DailyReport,
  CrawlerResult 
} from './types';
import { 
  TechCrunchFundingCrawler,
  CrunchbaseCrawler,
  VentureBeatCrawler,
  YCombinatorCrawler
} from './fundingCrawlers';
import {
  VCActivityCrawler,
  HotDealsAggregator,
  AngelListCrawler,
  SECEdgarCrawler
} from './investorCrawlers';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export class CrawlerOrchestrator {
  private crawlers: any[] = [];
  private isRunning: boolean = false;

  constructor() {
    // Initialize all crawlers
    this.crawlers = [
      new TechCrunchFundingCrawler(),
      new VentureBeatCrawler(),
      new YCombinatorCrawler(),
      new VCActivityCrawler(),
      new HotDealsAggregator(),
      new AngelListCrawler(),
      new SECEdgarCrawler(),
      // Add Crunchbase if API key is available
      // new CrunchbaseCrawler(import.meta.env.VITE_CRUNCHBASE_API_KEY || '')
    ];
  }

  /**
   * Run all enabled crawlers
   */
  async runAllCrawlers(): Promise<{
    success: boolean;
    results: CrawlerResult[];
    timestamp: string;
  }> {
    if (this.isRunning) {
      throw new Error('Crawlers are already running');
    }

    this.isRunning = true;
    const timestamp = new Date().toISOString();
    const results: CrawlerResult[] = [];

    console.log('🕷️ Starting crawler orchestration...');

    try {
      // Run crawlers in parallel
      const crawlerPromises = this.crawlers
        .filter(crawler => crawler.isEnabled())
        .map(crawler => crawler.crawl());

      const crawlerResults = await Promise.allSettled(crawlerPromises);

      // Process results
      for (const result of crawlerResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          
          // Save to database
          if (result.value.success && result.value.data.length > 0) {
            await this.saveToDatabase(result.value);
          }
        } else {
          console.error('Crawler failed:', result.reason);
        }
      }

      return {
        success: true,
        results,
        timestamp
      };
    } catch (error) {
      console.error('Crawler orchestration failed:', error);
      return {
        success: false,
        results,
        timestamp
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Save crawled data to Supabase
   */
  private async saveToDatabase(result: CrawlerResult): Promise<void> {
    try {
      const tableName = this.getTableName(result.dataType);
      
      if (!tableName) return;

      const { error } = await supabase
        .from(tableName)
        .insert(result.data);

      if (error) {
        console.error(`Failed to save to ${tableName}:`, error);
      } else {
        console.log(`✅ Saved ${result.itemsFound} items to ${tableName}`);
      }
    } catch (error) {
      console.error('Database save error:', error);
    }
  }

  private getTableName(dataType: string): string | null {
    const mapping: { [key: string]: string } = {
      funding: 'funding_data',
      startups: 'crawled_startups',
      investors: 'investor_data',
      deals: 'hot_deals'
    };
    return mapping[dataType] || null;
  }

  /**
   * Generate daily report from crawled data
   */
  async generateDailyReport(): Promise<DailyReport> {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('📊 Generating daily report...');

    try {
      // Fetch today's data
      const [fundings, startups, investors, deals] = await Promise.all([
        this.getTodaysFunding(),
        this.getTodaysStartups(),
        this.getTodaysInvestors(),
        this.getTodaysHotDeals()
      ]);

      // Calculate metrics
      const totalFundingAmount = this.calculateTotalFunding(fundings);
      const trendingIndustries = this.analyzeTrendingIndustries(fundings, startups);
      const trendingInvestors = this.analyzeTrendingInvestors(fundings);
      const averageRoundSize = this.calculateAverageRoundSizes(fundings);
      const insights = this.generateInsights(fundings, startups, investors, deals);

      const report: DailyReport = {
        date: today,
        generatedAt: new Date().toISOString(),
        totalFundingAnnouncements: fundings.length,
        totalFundingAmount,
        newStartupsDiscovered: startups.length,
        activeInvestors: investors.length,
        hotDealsCount: deals.length,
        topFundings: fundings.slice(0, 10),
        topStartups: startups.slice(0, 10),
        topInvestors: investors.slice(0, 10),
        hotDeals: deals.slice(0, 10),
        trendingIndustries,
        trendingInvestors,
        averageRoundSize,
        insights
      };

      // Save report to database
      await this.saveDailyReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate daily report:', error);
      throw error;
    }
  }

  private async getTodaysFunding(): Promise<FundingData[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('funding_data')
      .select('*')
      .gte('date', today)
      .order('amount', { ascending: false });

    return data || [];
  }

  private async getTodaysStartups(): Promise<StartupData[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('crawled_startups')
      .select('*')
      .gte('crawledAt', today);

    return data || [];
  }

  private async getTodaysInvestors(): Promise<InvestorData[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('investor_data')
      .select('*')
      .gte('crawledAt', today);

    return data || [];
  }

  private async getTodaysHotDeals(): Promise<HotDeal[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('hot_deals')
      .select('*')
      .gte('publishedDate', today)
      .order('trendingScore', { ascending: false });

    return data || [];
  }

  private calculateTotalFunding(fundings: FundingData[]): string {
    let totalInMillions = 0;

    for (const funding of fundings) {
      const match = funding.amount.match(/(\d+(?:\.\d+)?)\s*(M|B)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        totalInMillions += unit === 'B' ? value * 1000 : value;
      }
    }

    if (totalInMillions >= 1000) {
      return `$${(totalInMillions / 1000).toFixed(1)}B`;
    }
    return `$${totalInMillions.toFixed(0)}M`;
  }

  private analyzeTrendingIndustries(
    fundings: FundingData[], 
    startups: StartupData[]
  ): { industry: string; count: number }[] {
    const industryCount: { [key: string]: number } = {};

    // Count from startups
    for (const startup of startups) {
      for (const industry of startup.industry) {
        industryCount[industry] = (industryCount[industry] || 0) + 1;
      }
    }

    // Sort by count
    return Object.entries(industryCount)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private analyzeTrendingInvestors(fundings: FundingData[]): 
    { name: string; dealCount: number }[] {
    const investorCount: { [key: string]: number } = {};

    for (const funding of fundings) {
      for (const investor of funding.investors) {
        investorCount[investor] = (investorCount[investor] || 0) + 1;
      }
    }

    return Object.entries(investorCount)
      .map(([name, dealCount]) => ({ name, dealCount }))
      .sort((a, b) => b.dealCount - a.dealCount)
      .slice(0, 10);
  }

  private calculateAverageRoundSizes(fundings: FundingData[]): 
    { [key: string]: string } {
    const roundTotals: { [key: string]: { sum: number; count: number } } = {};

    for (const funding of fundings) {
      const roundType = funding.roundType;
      const match = funding.amount.match(/(\d+(?:\.\d+)?)\s*(M|B)/i);
      
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        const amountInMillions = unit === 'B' ? value * 1000 : value;

        if (!roundTotals[roundType]) {
          roundTotals[roundType] = { sum: 0, count: 0 };
        }
        roundTotals[roundType].sum += amountInMillions;
        roundTotals[roundType].count += 1;
      }
    }

    const averages: { [key: string]: string } = {};
    for (const [roundType, data] of Object.entries(roundTotals)) {
      const avg = data.sum / data.count;
      averages[roundType] = avg >= 1000 
        ? `$${(avg / 1000).toFixed(1)}B`
        : `$${avg.toFixed(1)}M`;
    }

    return averages;
  }

  private generateInsights(
    fundings: FundingData[],
    startups: StartupData[],
    investors: InvestorData[],
    deals: HotDeal[]
  ): string[] {
    const insights: string[] = [];

    // Insight 1: Largest funding of the day
    if (fundings.length > 0) {
      const largest = fundings[0];
      insights.push(
        `🚀 ${largest.companyName} raised ${largest.amount} in a ${largest.roundType} round, led by ${largest.investors[0] || 'undisclosed investors'}.`
      );
    }

    // Insight 2: Most active investor
    const investorCounts = this.analyzeTrendingInvestors(fundings);
    if (investorCounts.length > 0) {
      insights.push(
        `💼 ${investorCounts[0].name} was the most active investor today with ${investorCounts[0].dealCount} deals.`
      );
    }

    // Insight 3: Hot industry
    const industries = this.analyzeTrendingIndustries(fundings, startups);
    if (industries.length > 0) {
      insights.push(
        `🔥 ${industries[0].industry} is trending with ${industries[0].count} companies in the spotlight.`
      );
    }

    // Insight 4: Total funding momentum
    insights.push(
      `📈 Total funding tracked today: ${this.calculateTotalFunding(fundings)} across ${fundings.length} deals.`
    );

    return insights;
  }

  private async saveDailyReport(report: DailyReport): Promise<void> {
    const { error } = await supabase
      .from('daily_reports')
      .insert(report);

    if (error) {
      console.error('Failed to save daily report:', error);
    } else {
      console.log('✅ Daily report saved successfully');
    }
  }

  /**
   * Get the latest daily report
   */
  async getLatestReport(): Promise<DailyReport | null> {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to fetch latest report:', error);
      return null;
    }

    return data;
  }
}
