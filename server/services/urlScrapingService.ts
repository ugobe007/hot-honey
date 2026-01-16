/**
 * URL SCRAPING SERVICE
 * ====================
 * 
 * Scrapes a startup website and extracts structured data for GOD scoring.
 * This is the missing piece that makes the URL submission bar actually work.
 * 
 * Pipeline: URL → Scrape Website → AI Extract → Enrich → GOD Score
 */

import axios from 'axios';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const openaiApiKey = process.env.OPENAI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export interface ScrapedStartupData {
  // Basic info
  name: string;
  tagline?: string;
  description?: string;
  pitch?: string;
  
  // 5-point card data
  problem?: string;
  solution?: string;
  value_proposition?: string;
  market?: string;
  team?: string;
  traction?: string;
  
  // Structured data for GOD scoring
  sectors?: string[];
  stage?: number;
  
  // Traction metrics (for Tier A scoring)
  mrr?: number;
  arr?: number;
  revenue?: number;
  customer_count?: number;
  active_users?: number;
  growth_rate?: number;
  
  // Team signals
  founders_count?: number;
  has_technical_cofounder?: boolean;
  team_companies?: string[];
  
  // Product signals
  is_launched?: boolean;
  has_demo?: boolean;
  has_pricing?: boolean;
  
  // Funding
  funding_amount?: string;
  funding_stage?: string;
  investors?: string[];
}

/**
 * Fetch and extract text content from a website URL
 */
async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    console.log(`🌐 Fetching ${url}...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;
    
    // Strip scripts, styles, and HTML tags to get text
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit to reasonable size for AI processing
    return textContent.substring(0, 8000);
  } catch (error: any) {
    console.error(`❌ Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * Use AI to extract structured startup data from website content
 */
async function extractStartupData(companyName: string, websiteContent: string, websiteUrl: string): Promise<ScrapedStartupData> {
  if (!openai) {
    console.warn('⚠️  No OpenAI API key - returning minimal data');
    return { name: companyName };
  }

  const prompt = `You are a VC analyst extracting startup investment data from a company website.

COMPANY: ${companyName}
WEBSITE: ${websiteUrl}

WEBSITE CONTENT:
${websiteContent}

TASK: Extract comprehensive startup data for investor scoring. Be specific with numbers when available.

Return a JSON object with these fields (use null for unknown, be conservative):

{
  "name": "Company name (string)",
  "tagline": "One-line description (max 15 words)",
  "description": "Full description (2-3 sentences)",
  "pitch": "Elevator pitch for investors (1-2 sentences)",
  
  "problem": "What problem they solve (1 sentence)",
  "solution": "How they solve it (1 sentence)",
  "value_proposition": "Unique value prop (1 sentence)",
  "market": "Target market/customers (1 sentence)",
  "team": "Founder backgrounds if mentioned (1 sentence)",
  "traction": "Growth metrics if mentioned (1 sentence)",
  
  "sectors": ["Array of industry sectors", "e.g.", "AI/ML", "Fintech", "B2B SaaS"],
  "stage": "1=Pre-seed, 2=Seed, 3=Series A, 4=Series B+ (number or null)",
  
  "mrr": "Monthly recurring revenue in USD (number or null, e.g., 50000 for $50K)",
  "arr": "Annual recurring revenue in USD (number or null)",
  "revenue": "Annual revenue if not subscription (number or null)",
  "customer_count": "Number of customers (number or null)",
  "active_users": "Active users if mentioned (number or null)",
  "growth_rate": "Monthly growth rate as percentage (number or null, e.g., 15 for 15%)",
  
  "founders_count": "Number of founders (number or null)",
  "has_technical_cofounder": "Has technical co-founder (boolean or null)",
  "team_companies": ["Previous companies founders worked at", "e.g.", "Google", "Meta"],
  
  "is_launched": "Product is live (boolean)",
  "has_demo": "Demo available (boolean)",
  "has_pricing": "Pricing page exists (boolean)",
  
  "funding_amount": "Amount raised (string like '$5M' or null)",
  "funding_stage": "Latest round (string like 'Seed', 'Series A' or null)",
  "investors": ["Array of investor names if mentioned"]
}

IMPORTANT RULES:
- Extract REAL data from the content, don't make up metrics
- If they mention "1000+ customers" → customer_count: 1000
- If they mention "$50K MRR" → mrr: 50000
- If they mention team from "ex-Google" → team_companies: ["Google"]
- Sectors should match VC terminology: "AI/ML", "Fintech", "B2B SaaS", "Healthtech", "DevTools", "Consumer", "Marketplace", etc.
- Stage inference: YC = usually Seed (2), pricing page = launched, waiting list = pre-launch
- Return ONLY valid JSON, no markdown

JSON:`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a VC analyst extracting startup data for investment scoring. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { name: companyName };
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          console.error('❌ Could not parse AI response');
          return { name: companyName };
        }
      }
    }

    // Clean and return
    return {
      name: parsed.name || companyName,
      tagline: parsed.tagline || undefined,
      description: parsed.description || undefined,
      pitch: parsed.pitch || undefined,
      problem: parsed.problem || undefined,
      solution: parsed.solution || undefined,
      value_proposition: parsed.value_proposition || undefined,
      market: parsed.market || undefined,
      team: parsed.team || undefined,
      traction: parsed.traction || undefined,
      sectors: Array.isArray(parsed.sectors) ? parsed.sectors : undefined,
      stage: typeof parsed.stage === 'number' ? parsed.stage : undefined,
      mrr: typeof parsed.mrr === 'number' ? parsed.mrr : undefined,
      arr: typeof parsed.arr === 'number' ? parsed.arr : undefined,
      revenue: typeof parsed.revenue === 'number' ? parsed.revenue : undefined,
      customer_count: typeof parsed.customer_count === 'number' ? parsed.customer_count : undefined,
      active_users: typeof parsed.active_users === 'number' ? parsed.active_users : undefined,
      growth_rate: typeof parsed.growth_rate === 'number' ? parsed.growth_rate : undefined,
      founders_count: typeof parsed.founders_count === 'number' ? parsed.founders_count : undefined,
      has_technical_cofounder: typeof parsed.has_technical_cofounder === 'boolean' ? parsed.has_technical_cofounder : undefined,
      team_companies: Array.isArray(parsed.team_companies) ? parsed.team_companies : undefined,
      is_launched: typeof parsed.is_launched === 'boolean' ? parsed.is_launched : undefined,
      has_demo: typeof parsed.has_demo === 'boolean' ? parsed.has_demo : undefined,
      has_pricing: typeof parsed.has_pricing === 'boolean' ? parsed.has_pricing : undefined,
      funding_amount: parsed.funding_amount || undefined,
      funding_stage: parsed.funding_stage || undefined,
      investors: Array.isArray(parsed.investors) ? parsed.investors : undefined,
    };
  } catch (error) {
    console.error('❌ AI extraction failed:', error);
    return { name: companyName };
  }
}

/**
 * Calculate GOD score from scraped data
 * Uses the tier system from god-score-v5-tiered.js
 */
function calculateGodScore(data: ScrapedStartupData): {
  total_god_score: number;
  team_score: number;
  traction_score: number;
  market_score: number;
  product_score: number;
  vision_score: number;
  data_tier: 'A' | 'B' | 'C';
} {
  // Determine data tier
  const hasRichData = !!(data.mrr || data.arr || data.revenue || data.customer_count || data.active_users);
  const hasSomeData = !!(data.description || data.pitch || data.problem || data.solution);
  
  const tier = hasRichData ? 'A' : (hasSomeData ? 'B' : 'C');
  
  // Sector bonuses (from god-score-v5-tiered.js)
  const SECTOR_WEIGHTS: Record<string, number> = {
    'AI/ML': 15, 'Artificial Intelligence': 15,
    'Fintech': 12, 'Financial Services': 12,
    'Healthtech': 12, 'Healthcare': 12, 'Biotech': 12,
    'Climate': 10, 'CleanTech': 10, 'Sustainability': 10,
    'Developer Tools': 10, 'DevTools': 10, 'DevOps': 10,
    'B2B SaaS': 8, 'Enterprise': 8, 'SaaS': 8,
    'Cybersecurity': 8, 'Security': 8,
    'E-commerce': 6, 'Marketplace': 6,
    'Consumer': 5, 'Social': 5,
  };
  
  // Calculate sector bonus
  let sectorBonus = 0;
  if (data.sectors) {
    for (const sector of data.sectors) {
      const weight = SECTOR_WEIGHTS[sector] || 5;
      sectorBonus = Math.max(sectorBonus, weight);
    }
  }
  
  if (tier === 'A') {
    // Full scoring with rich data (up to 100)
    let content = 0, market = 0, traction = 0, team = 0;
    
    // Content (0-25)
    if (data.description) content += 10;
    if (data.pitch) content += 5;
    if (data.problem) content += 5;
    if (data.solution) content += 5;
    content = Math.min(25, content);
    
    // Market (0-25)
    market += sectorBonus;
    if (data.market) market += 5;
    if (data.value_proposition) market += 5;
    market = Math.min(25, market);
    
    // Traction (0-25)
    if (data.mrr && data.mrr > 0) {
      if (data.mrr >= 100000) traction += 25;
      else if (data.mrr >= 50000) traction += 20;
      else if (data.mrr >= 10000) traction += 15;
      else traction += 10;
    } else if (data.customer_count && data.customer_count > 0) {
      if (data.customer_count >= 1000) traction += 20;
      else if (data.customer_count >= 100) traction += 15;
      else traction += 10;
    } else if (data.active_users && data.active_users > 0) {
      if (data.active_users >= 10000) traction += 18;
      else if (data.active_users >= 1000) traction += 12;
      else traction += 8;
    }
    if (data.growth_rate && data.growth_rate > 15) traction += 5;
    traction = Math.min(25, traction);
    
    // Team (0-25)
    if (data.has_technical_cofounder) team += 10;
    if (data.team_companies && data.team_companies.length > 0) {
      const topCompanies = ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Stripe', 'OpenAI', 'Y Combinator'];
      const hasTopCompany = data.team_companies.some(c => 
        topCompanies.some(top => c.toLowerCase().includes(top.toLowerCase()))
      );
      team += hasTopCompany ? 15 : 8;
    }
    if (data.founders_count && data.founders_count >= 2) team += 5;
    team = Math.min(25, team);
    
    const raw = content + market + traction + team;
    // Quality bonus for well-rounded data
    const qualityBonus = (content > 10 && market > 10 && traction > 5) ? 10 : 0;
    const total = Math.min(100, Math.round(raw + qualityBonus));
    
    return {
      total_god_score: total,
      vision_score: content,
      market_score: market,
      traction_score: traction,
      team_score: team,
      product_score: data.is_launched ? 20 : 10,
      data_tier: 'A',
    };
  } else if (tier === 'B') {
    // Capped at 55 (some data available)
    let base = 40;
    base += sectorBonus / 2;  // Half sector bonus
    if (data.pitch || data.description) base += 5;
    if (data.is_launched) base += 5;
    if (data.has_demo) base += 3;
    
    const total = Math.min(55, Math.round(base));
    
    return {
      total_god_score: total,
      vision_score: data.pitch ? 15 : 10,
      market_score: Math.min(20, sectorBonus),
      traction_score: 10,
      team_score: 10,
      product_score: data.is_launched ? 15 : 8,
      data_tier: 'B',
    };
  } else {
    // Tier C: Sparse data (capped at 40)
    const total = 40;
    
    return {
      total_god_score: total,
      vision_score: 10,
      market_score: 10,
      traction_score: 8,
      team_score: 8,
      product_score: 8,
      data_tier: 'C',
    };
  }
}

/**
 * MAIN FUNCTION: Scrape URL and return fully enriched startup data with GOD score
 */
export async function scrapeAndScoreStartup(url: string): Promise<{
  data: ScrapedStartupData;
  scores: ReturnType<typeof calculateGodScore>;
  websiteContent: string | null;
}> {
  // 1. Extract domain name for company name
  let domain: string;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = u.hostname.replace('www.', '');
  } catch {
    domain = url.split('/')[0].replace('www.', '');
  }
  const companyName = domain.split('.')[0];
  const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);

  // 2. Fetch website content
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const websiteContent = await fetchWebsiteContent(fullUrl);

  if (!websiteContent) {
    console.log(`⚠️  Could not fetch ${url} - using minimal data`);
    const minimalData: ScrapedStartupData = { name: formattedName };
    const scores = calculateGodScore(minimalData);
    return { data: minimalData, scores, websiteContent: null };
  }

  // 3. Extract structured data with AI
  console.log(`🤖 Extracting data for ${formattedName}...`);
  const data = await extractStartupData(formattedName, websiteContent, fullUrl);

  // 4. Calculate GOD score
  const scores = calculateGodScore(data);
  
  console.log(`✅ ${data.name}: GOD Score ${scores.total_god_score} (Tier ${scores.data_tier})`);
  
  return { data, scores, websiteContent };
}

/**
 * Update startup record with scraped data and real GOD score
 */
export async function updateStartupWithScrapedData(
  startupId: string,
  data: ScrapedStartupData,
  scores: ReturnType<typeof calculateGodScore>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('startup_uploads')
      .update({
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || data.pitch || null,
        pitch: data.pitch || null,
        problem: data.problem || null,
        solution: data.solution || null,
        value_proposition: data.value_proposition || null,
        sectors: data.sectors || ['Technology'],
        stage: data.stage || 1,
        is_launched: data.is_launched || false,
        has_demo: data.has_demo || false,
        has_technical_cofounder: data.has_technical_cofounder || false,
        team_size: data.founders_count || null,
        mrr: data.mrr || null,
        arr: data.arr || null,
        customer_count: data.customer_count || null,
        growth_rate_monthly: data.growth_rate || null,
        team_companies: data.team_companies || null,
        // GOD scores
        total_god_score: scores.total_god_score,
        team_score: scores.team_score,
        traction_score: scores.traction_score,
        market_score: scores.market_score,
        product_score: scores.product_score,
        vision_score: scores.vision_score,
        // Store extracted data in JSONB
        extracted_data: {
          ...data,
          data_tier: scores.data_tier,
          scraped_at: new Date().toISOString(),
        },
      })
      .eq('id', startupId);

    if (error) {
      console.error(`❌ Failed to update startup ${startupId}:`, error);
      return false;
    }

    console.log(`✅ Updated startup ${startupId} with real GOD score: ${scores.total_god_score}`);
    return true;
  } catch (error) {
    console.error('❌ Update error:', error);
    return false;
  }
}

/**
 * Convenience function: Scrape URL and create/update startup in one call
 */
export async function processUrlSubmission(url: string): Promise<{
  success: boolean;
  startupId?: string;
  godScore?: number;
  dataTier?: 'A' | 'B' | 'C';
  error?: string;
}> {
  try {
    // 1. Scrape and score
    const { data, scores } = await scrapeAndScoreStartup(url);
    
    // 2. Check if startup already exists
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
    
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .or(`website.ilike.%${domain}%`)
      .limit(1)
      .maybeSingle();

    let startupId: string;

    if (existing) {
      // Update existing
      startupId = existing.id;
      await updateStartupWithScrapedData(startupId, data, scores);
    } else {
      // Create new
      const { data: created, error: createError } = await supabase
        .from('startup_uploads')
        .insert({
          name: data.name,
          website: `https://${domain}`,
          tagline: data.tagline || `Startup at ${domain}`,
          description: data.description || data.pitch,
          pitch: data.pitch,
          problem: data.problem,
          solution: data.solution,
          value_proposition: data.value_proposition,
          sectors: data.sectors || ['Technology'],
          stage: data.stage || 1,
          status: 'approved',
          source_type: 'url',
          is_launched: data.is_launched || false,
          has_demo: data.has_demo || false,
          has_technical_cofounder: data.has_technical_cofounder || false,
          team_size: data.founders_count,
          mrr: data.mrr,
          arr: data.arr,
          customer_count: data.customer_count,
          growth_rate_monthly: data.growth_rate,
          team_companies: data.team_companies,
          total_god_score: scores.total_god_score,
          team_score: scores.team_score,
          traction_score: scores.traction_score,
          market_score: scores.market_score,
          product_score: scores.product_score,
          vision_score: scores.vision_score,
          extracted_data: {
            ...data,
            data_tier: scores.data_tier,
            scraped_at: new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (createError) {
        return { success: false, error: createError.message };
      }
      startupId = created.id;
    }

    return {
      success: true,
      startupId,
      godScore: scores.total_god_score,
      dataTier: scores.data_tier,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
