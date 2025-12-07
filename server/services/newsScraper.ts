import puppeteer, { Browser, Page } from 'puppeteer';
import OpenAI from 'openai';
import { supabase } from '../config/supabase.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const PAGE_TIMEOUT_MS = 45000; // Increased timeout

interface NewsSource {
  name: string;
  searchUrl: string; // URL template with {vc_name} placeholder
  type: 'news' | 'press_release';
}

// Pre-configured news sources for VC investment announcements
const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'TechCrunch Search',
    searchUrl: 'https://techcrunch.com/?s={vc_name}+raises+million+led',
    type: 'news'
  },
  {
    name: 'Crunchbase News',
    searchUrl: 'https://news.crunchbase.com/?s={vc_name}+funding+round+million',
    type: 'news'
  },
  {
    name: 'VentureBeat Search',
    searchUrl: 'https://venturebeat.com/?s={vc_name}+raises+Series+led',
    type: 'news'
  },
  {
    name: 'Business Wire',
    searchUrl: 'https://www.businesswire.com/portal/site/home/search/?searchType=news&searchTerm={vc_name}+announces+investment&searchPage=1',
    type: 'press_release'
  },
  {
    name: 'PR Newswire',
    searchUrl: 'https://www.prnewswire.com/search/news/?keyword={vc_name}+Series+million',
    type: 'press_release'
  }
];

/**
 * Helper: Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper: Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS,
  context: string = 'operation'
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.log(`⚠️ ${context} failed (attempt ${i + 1}/${retries}): ${error.message}`);
      if (i < retries - 1) {
        const waitTime = delayMs * Math.pow(2, i); // Exponential backoff
        console.log(`   Retrying in ${waitTime}ms...`);
        await sleep(waitTime);
      }
    }
  }
  throw lastError;
}

export class NewsScraper {
  private browser: Browser | null = null;

  async initBrowser(): Promise<boolean> {
    try {
      console.log('🌐 Initializing browser for news scraping...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--disable-extensions',
        ],
      });
      console.log('✅ Browser initialized');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize browser:', error.message);
      return false;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('🔒 Browser closed');
      } catch (error) {
        console.log('⚠️ Browser already closed or error closing');
      }
      this.browser = null;
    }
  }

  /**
   * Ensure browser is available, restart if crashed
   */
  private async ensureBrowser(): Promise<boolean> {
    if (!this.browser || !this.browser.connected) {
      console.log('🔄 Browser not connected, reinitializing...');
      return await this.initBrowser();
    }
    return true;
  }

  /**
   * Scrape news articles for a specific VC firm's investments
   */
  async scrapeNewsForVC(vcName: string, jobId: string): Promise<any[]> {
    // Initialize browser
    const browserReady = await this.initBrowser();
    if (!browserReady) {
      await this.log(jobId, 'error', 'Failed to initialize browser');
      return [];
    }

    console.log(`\n🚀 Starting NEWS scrape for: ${vcName}`);
    await this.log(jobId, 'info', `Starting news scrape for ${vcName}`);

    const allCompanies: any[] = [];
    let totalArticles = 0;
    let sourcesChecked = 0;
    let successfulSources = 0;

    try {
      // Try each news source
      for (const source of NEWS_SOURCES) {
        sourcesChecked++;
        
        // Update progress
        await this.updateJobProgress(jobId, {
          sources_checked: sourcesChecked,
          articles_found: totalArticles,
          companies_found: allCompanies.length,
          current_source: source.name,
        });
        
        try {
          console.log(`\n📰 Checking ${source.name}... (${sourcesChecked}/${NEWS_SOURCES.length})`);
          
          // Ensure browser is still running
          const browserOk = await this.ensureBrowser();
          if (!browserOk) {
            console.log(`⚠️ Skipping ${source.name} - browser unavailable`);
            continue;
          }
          
          const url = source.searchUrl.replace('{vc_name}', encodeURIComponent(vcName));
          
          const result = await this.scrapeNewsSource(url, vcName, source.type, jobId);
          
          totalArticles += result.articlesFound;
          
          if (result.companies.length > 0) {
            console.log(`✅ Found ${result.companies.length} companies from ${source.name}`);
            allCompanies.push(...result.companies);
            successfulSources++;
          } else if (result.articlesFound > 0) {
            console.log(`ℹ️ ${source.name}: ${result.articlesFound} articles, but no ${vcName} investments found`);
          } else {
            console.log(`ℹ️ No results from ${source.name}`);
          }
          
          // Update progress after each source
          await this.updateJobProgress(jobId, {
            sources_checked: sourcesChecked,
            articles_found: totalArticles,
            companies_found: allCompanies.length,
            current_source: `Completed: ${source.name}`,
          });

          // Be respectful - wait between sources
          await sleep(2500);
          
        } catch (error: any) {
          console.error(`❌ Error scraping ${source.name}:`, error.message || error);
          await this.log(jobId, 'error', `Failed to scrape ${source.name}: ${error.message}`);
          
          // Continue with next source even if one fails
          continue;
        }
      }

      // Deduplicate by company name
      const uniqueCompanies = this.deduplicateCompanies(allCompanies);
      
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📊 SCRAPE SUMMARY for ${vcName}:`);
      console.log(`   Sources checked: ${sourcesChecked}/${NEWS_SOURCES.length}`);
      console.log(`   Successful sources: ${successfulSources}`);
      console.log(`   Total articles: ${totalArticles}`);
      console.log(`   Companies found: ${uniqueCompanies.length}`);
      console.log(`${'='.repeat(50)}\n`);
      
      await this.log(jobId, 'info', `Scrape complete: ${uniqueCompanies.length} companies from ${totalArticles} articles`);
      
      return uniqueCompanies;
      
    } finally {
      // Always close browser to prevent memory leaks
      await this.closeBrowser();
    }
  }

  /**
   * Scrape a single news source
   */
  private async scrapeNewsSource(
    url: string, 
    vcName: string, 
    sourceType: 'news' | 'press_release',
    jobId: string
  ): Promise<{ companies: any[], articlesFound: number }> {
    let page: Page | null = null;

    try {
      page = await this.browser!.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Block unnecessary resources for faster loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to the search results with retry
      console.log(`🔗 Loading: ${url}`);
      
      await withRetry(
        async () => {
          await page!.goto(url, {
            waitUntil: 'domcontentloaded', // Faster than networkidle2
            timeout: PAGE_TIMEOUT_MS,
          });
        },
        2,
        3000,
        'Page navigation'
      );

      // Wait for content to load
      await sleep(2000);

      // Extract article headlines and snippets
      const articles = await page.evaluate(() => {
        const results: Array<{ title: string; url: string; snippet: string }> = [];
        
        // Common article selectors for news sites
        const articleSelectors = [
          'article',
          '.post',
          '.article',
          '.news-item',
          '.search-result',
          '[class*="post-"]',
          '[class*="article-"]',
          '.river-item', // TechCrunch
          '.post-block', // TechCrunch
          '[data-content-type="article"]',
        ];

        const articleElements = document.querySelectorAll(articleSelectors.join(', '));
        
        articleElements.forEach((article: Element, index: number) => {
          if (index > 20) return; // Limit to first 20 articles
          
          const titleEl = article.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="headline"]');
          const linkEl = article.querySelector('a[href*="http"], a[href^="/"]');
          const snippetEl = article.querySelector('p, .excerpt, .description, [class*="excerpt"], [class*="description"], [class*="summary"]');
          
          const title = titleEl?.textContent?.trim() || '';
          const href = linkEl?.getAttribute('href') || '';
          
          // Only include if we have a meaningful title
          if (title && title.length > 10) {
            results.push({
              title,
              url: href.startsWith('http') ? href : `https://${window.location.host}${href}`,
              snippet: snippetEl?.textContent?.trim().slice(0, 500) || '',
            });
          }
        });

        return results;
      });

      console.log(`📄 Found ${articles.length} articles`);

      // Use AI to extract company information from headlines
      if (articles.length > 0) {
        const companies = await this.extractCompaniesFromNews(articles, vcName, sourceType, jobId);
        await page.close();
        return { companies, articlesFound: articles.length };
      }

      await page.close();
      return { companies: [], articlesFound: 0 };

    } catch (error: any) {
      console.error(`❌ Error scraping news source:`, error.message || error);
      await this.log(jobId, 'error', `Scrape error: ${error.message}`);
      if (page) {
        try { await page.close(); } catch (e) { /* ignore */ }
      }
      return { companies: [], articlesFound: 0 };
    }
  }

  /**
   * Use AI to extract company information from news articles
   * Improved with better prompts, JSON mode, and robust error handling
   */
  private async extractCompaniesFromNews(
    articles: any[],
    vcName: string,
    sourceType: string,
    jobId: string
  ): Promise<any[]> {
    // Filter out empty/invalid articles
    const validArticles = articles.filter(a => a.title && a.title.length > 10);
    
    if (validArticles.length === 0) {
      console.log('⚠️ No valid articles to analyze');
      return [];
    }

    const articlesText = validArticles
      .map((a, i) => `[Article ${i + 1}]\nTitle: ${a.title}\nSnippet: ${a.snippet || 'No snippet'}\nURL: ${a.url}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a specialized AI for extracting startup funding information from news articles.

YOUR TASK: Find companies that received venture capital investment where "${vcName}" is mentioned as an investor.

EXTRACTION RULES:
1. ONLY extract companies where "${vcName}" is explicitly mentioned as investor/lead/participant
2. Extract the STARTUP NAME (the company receiving funding), NOT the VC firm
3. Look for patterns like:
   - "[Company] raises $X million led by ${vcName}"
   - "${vcName} invests in [Company]"
   - "[Company] closes Series X with ${vcName}"
   - "${vcName} leads [Company]'s funding round"
4. If no companies are found where ${vcName} invested, return an empty array []

OUTPUT FORMAT: You must respond with ONLY a valid JSON array. No explanations, no markdown, no code blocks.

EXAMPLE VALID RESPONSES:
[{"name":"Acme Inc","description":"AI-powered analytics platform","funding_stage":"Series A","funding_amount":"$15M","article_url":"https://..."}]

[]

DO NOT include:
- The VC firm itself (${vcName})
- Companies where ${vcName} is NOT mentioned as investor
- Speculation or companies from different articles mixed up`;

    const userPrompt = `Extract all startups that received funding from ${vcName} based on these ${sourceType} articles:

${articlesText}

Remember: 
- Return ONLY valid JSON array
- Only include companies where "${vcName}" is mentioned as investor
- If no companies found, return []`;

    try {
      console.log(`🤖 Analyzing ${validArticles.length} articles with AI...`);
      
      // Try with JSON response format first (GPT-4 supports this)
      const response = await withRetry(
        async () => {
          return await openai.chat.completions.create({
            model: 'gpt-4o', // Use gpt-4o for better JSON handling
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: 'json_object' }, // Force JSON output
          });
        },
        2,
        3000,
        'OpenAI API call'
      );

      const content = response.choices[0].message.content || '';
      console.log('🤖 AI Response (first 300 chars):', content.substring(0, 300));

      // Parse the JSON response
      const companies = this.parseAIResponse(content, vcName, jobId);
      
      if (companies.length > 0) {
        console.log(`📊 AI extracted ${companies.length} companies:`);
        companies.forEach(c => console.log(`   • ${c.name}`));
      } else {
        console.log(`📊 AI found no companies invested by ${vcName} in these articles`);
      }
      
      return companies;

    } catch (error: any) {
      console.error('❌ Error extracting companies with AI:', error.message || error);
      await this.log(jobId, 'error', `AI extraction failed: ${error.message}`);
      
      // Fallback: Try a simpler extraction without JSON mode
      return await this.fallbackExtraction(validArticles, vcName, jobId);
    }
  }

  /**
   * Parse AI response with robust error handling
   */
  private parseAIResponse(content: string, vcName: string, jobId: string): any[] {
    try {
      // Try direct JSON parse first
      let parsed = JSON.parse(content);
      
      // Handle wrapped response like { "companies": [...] }
      if (parsed.companies && Array.isArray(parsed.companies)) {
        parsed = parsed.companies;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        parsed = parsed.results;
      } else if (parsed.startups && Array.isArray(parsed.startups)) {
        parsed = parsed.startups;
      }
      
      // If it's an array, validate and filter
      if (Array.isArray(parsed)) {
        return parsed.filter(company => {
          // Must have a name
          if (!company.name || typeof company.name !== 'string') return false;
          // Name should be reasonable length
          if (company.name.length < 2 || company.name.length > 100) return false;
          // Don't include the VC firm itself
          if (company.name.toLowerCase().includes(vcName.toLowerCase())) return false;
          return true;
        });
      }
      
      return [];
    } catch (parseError) {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          if (Array.isArray(extracted)) {
            return extracted.filter(c => c.name && !c.name.toLowerCase().includes(vcName.toLowerCase()));
          }
        } catch (e) {
          console.log('⚠️ Failed to parse extracted JSON array');
        }
      }
      
      console.log('⚠️ Could not parse AI response as JSON');
      return [];
    }
  }

  /**
   * Fallback extraction method if main AI call fails
   */
  private async fallbackExtraction(articles: any[], vcName: string, jobId: string): Promise<any[]> {
    console.log('🔄 Attempting fallback extraction...');
    
    try {
      // Simpler prompt for fallback
      const simplePrompt = `List any startup companies that received funding from ${vcName} mentioned in these headlines. Return ONLY a JSON array.

Headlines:
${articles.map(a => `- ${a.title}`).join('\n')}

Response format: [{"name":"Company Name","description":"What they do"}] or [] if none found.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Cheaper, faster fallback
        messages: [{ role: 'user', content: simplePrompt }],
        temperature: 0,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const companies = JSON.parse(jsonMatch[0]);
        console.log(`📊 Fallback extracted ${companies.length} companies`);
        return companies.filter((c: any) => c.name);
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Fallback extraction also failed:', error.message);
      await this.log(jobId, 'error', `Fallback extraction failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Deduplicate companies by name
   */
  private deduplicateCompanies(companies: any[]): any[] {
    const seen = new Map<string, any>();
    
    for (const company of companies) {
      const normalizedName = company.name.toLowerCase().trim();
      if (!seen.has(normalizedName)) {
        seen.set(normalizedName, company);
      } else {
        // Merge information if we see the same company again
        const existing = seen.get(normalizedName)!;
        if (!existing.description && company.description) {
          existing.description = company.description;
        }
        if (!existing.funding_stage && company.funding_stage) {
          existing.funding_stage = company.funding_stage;
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Save companies to database
   */
  async saveCompaniesToDB(companies: any[], jobId: string, sourceId: string): Promise<void> {
    console.log(`\n💾 Saving ${companies.length} companies to database...`);

    let successCount = 0;
    let errorCount = 0;

    for (const company of companies) {
      try {
        // Generate a placeholder URL if we don't have a website
        // Use the article URL or create a searchable placeholder
        const companyUrl = company.website || 
                          company.url || 
                          `https://www.google.com/search?q=${encodeURIComponent(company.name)}`;
        
        // Store all extracted data in enriched_data (matches actual DB schema)
        const enrichedData = {
          description: company.description || null,
          funding_stage: company.funding_stage || null,
          article_url: company.article_url || null,
          investment_date: company.investment_date || null,
          website: company.website || null,
          raw_extraction: company,
        };

        const { data, error } = await supabase.from('scraper_results').insert({
          job_id: jobId,
          source_id: sourceId || null,
          company_name: company.name,
          company_url: companyUrl, // Required field - use website or placeholder
          status: 'found', // Required field - set initial status
          entity_type: 'startup',
          enriched_data: enrichedData, // Store all data in enriched_data JSON field
        }).select();

        if (error) {
          console.error(`❌ Error saving ${company.name}:`, error.message);
          errorCount++;
          
          // Log the error for debugging
          await this.log(jobId, 'error', `Failed to save ${company.name}: ${error.message}`);
        } else {
          console.log(`✅ Saved: ${company.name}`);
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ Error saving company ${company.name}:`, err.message || err);
        errorCount++;
      }
    }

    console.log(`\n📊 Save results: ${successCount} saved, ${errorCount} failed`);
    await this.log(jobId, 'info', `Saved ${successCount}/${companies.length} companies to database`);
  }

  /**
   * Log message to database
   */
  private async log(jobId: string, level: string, message: string): Promise<void> {
    try {
      await supabase.from('scraper_logs').insert({
        job_id: jobId,
        level,
        message,
      });
    } catch (error) {
      // Silently fail if scraper_logs table doesn't exist
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: string,
    companiesFound?: number,
    error?: string
  ): Promise<void> {
    const updates: any = { status };
    
    if (companiesFound !== undefined) {
      updates.companies_found = companiesFound;
    }
    
    if (error) {
      updates.error_message = error;
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    await supabase.from('scraper_jobs').update(updates).eq('id', jobId);
  }

  /**
   * Update job progress with detailed stats
   */
  async updateJobProgress(
    jobId: string,
    stats: {
      sources_checked?: number;
      articles_found?: number;
      companies_found?: number;
      current_source?: string;
    }
  ): Promise<void> {
    const updates: any = {};
    
    if (stats.companies_found !== undefined) {
      updates.companies_found = stats.companies_found;
    }
    
    // Store progress in metadata JSON field
    const metadata = {
      sources_checked: stats.sources_checked || 0,
      articles_found: stats.articles_found || 0,
      current_source: stats.current_source || null,
      last_update: new Date().toISOString(),
    };
    
    updates.metadata = metadata;

    await supabase.from('scraper_jobs').update(updates).eq('id', jobId);
  }
}

// Export singleton instance
export const newsScraper = new NewsScraper();
