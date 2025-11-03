// Data Crawler Types

export interface FundingData {
  id?: string;
  companyName: string;
  amount: string;
  roundType: string; // Seed, Series A, B, C, etc.
  date: string;
  investors: string[];
  valuation?: string;
  description?: string;
  source: string;
  sourceUrl: string;
  crawledAt: string;
}

export interface StartupData {
  id?: string;
  name: string;
  website?: string;
  description: string;
  industry: string[];
  foundedYear?: string;
  location?: string;
  teamSize?: string;
  founders?: string[];
  founderBackgrounds?: string[];
  recentNews?: string;
  source: string;
  sourceUrl: string;
  crawledAt: string;
}

export interface InvestorData {
  id?: string;
  name: string;
  type: 'vc_firm' | 'angel' | 'accelerator';
  recentInvestments: string[]; // Company names
  investmentCount?: number;
  focusStages?: string[];
  focusIndustries?: string[];
  portfolioSize?: number;
  notableExits?: string[];
  source: string;
  sourceUrl: string;
  crawledAt: string;
}

export interface HotDeal {
  id?: string;
  companyName: string;
  dealType: 'funding' | 'acquisition' | 'ipo' | 'hot_news';
  headline: string;
  summary: string;
  amount?: string;
  significance: 'high' | 'medium' | 'low';
  trendingScore?: number;
  source: string;
  sourceUrl: string;
  publishedDate: string;
  crawledAt: string;
}

export interface DailyReport {
  id?: string;
  date: string;
  generatedAt: string;
  
  // Key metrics
  totalFundingAnnouncements: number;
  totalFundingAmount: string;
  newStartupsDiscovered: number;
  activeInvestors: number;
  hotDealsCount: number;
  
  // Top items
  topFundings: FundingData[];
  topStartups: StartupData[];
  topInvestors: InvestorData[];
  hotDeals: HotDeal[];
  
  // Trends
  trendingIndustries: { industry: string; count: number }[];
  trendingInvestors: { name: string; dealCount: number }[];
  averageRoundSize: { [key: string]: string }; // Seed: $2M, Series A: $10M, etc.
  
  // Insights
  insights: string[];
}

export interface CrawlerConfig {
  name: string;
  url: string;
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  lastRun?: string;
  dataType: 'funding' | 'startups' | 'investors' | 'deals';
}

export interface CrawlerResult {
  success: boolean;
  dataType: 'funding' | 'startups' | 'investors' | 'deals';
  itemsFound: number;
  data: (FundingData | StartupData | InvestorData | HotDeal)[];
  error?: string;
  crawledAt: string;
}

export abstract class BaseCrawler {
  protected name: string;
  protected baseUrl: string;
  protected enabled: boolean;

  constructor(name: string, baseUrl: string, enabled: boolean = true) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.enabled = enabled;
  }

  abstract crawl(): Promise<CrawlerResult>;

  protected async fetchWithRetry(url: string, retries = 3): Promise<Response | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
      } catch (error) {
        console.error(`Fetch attempt ${i + 1} failed for ${url}:`, error);
        if (i === retries - 1) return null;
        await this.delay(1000 * (i + 1)); // Exponential backoff
      }
    }
    return null;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected sanitizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  protected extractAmount(text: string): string | null {
    const amountRegex = /\$\s*(\d+(?:\.\d+)?)\s*(M|B|K|million|billion|thousand)/i;
    const match = text.match(amountRegex);
    return match ? match[0] : null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getName(): string {
    return this.name;
  }
}
