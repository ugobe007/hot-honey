/**
 * STARTUP ENRICHMENT SERVICE
 * ===========================
 * Uses AI inference to populate missing data in extracted_data JSONB column.
 * 
 * This is CRITICAL for GOD scoring - without this data, the scoring system
 * becomes biased because 94% of startups are missing traction/market/product data.
 * 
 * The inference model extracts:
 * - Traction metrics (revenue, MRR, growth, customers)
 * - Market data (market size, problem, solution)
 * - Product info (launched, demo, IP)
 * - Team details (founders, technical cofounders, team companies)
 * - Funding info (amount, stage, investors)
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

interface EnrichmentResult {
  // Traction
  revenue?: number;
  mrr?: number;
  arr?: number;
  growth_rate?: number;
  active_users?: number;
  customers?: number;
  customer_count?: number;
  
  // Market
  market_size?: string | number;
  problem?: string;
  solution?: string;
  value_proposition?: string;
  
  // Product
  is_launched?: boolean;
  has_demo?: boolean;
  launched?: boolean;
  demo_available?: boolean;
  mvp_stage?: boolean;
  
  // Team
  founders_count?: number;
  technical_cofounders?: number;
  team_companies?: string[];
  team?: Array<{
    name?: string;
    role?: string;
    previousCompanies?: string[];
  }>;
  
  // Funding
  funding_amount?: string | number;
  funding_stage?: string;
  investors_mentioned?: string[];
  backed_by?: string[];
  
  // Additional
  sectors?: string[];
  industries?: string[];
  tagline?: string;
  pitch?: string;
}

/**
 * Use AI to infer missing data from available startup information
 */
async function inferStartupData(
  name: string,
  description?: string,
  tagline?: string,
  pitch?: string,
  website?: string,
  sectors?: string[]
): Promise<EnrichmentResult> {
  if (!anthropic) {
    console.warn('⚠️  Anthropic API key not found - skipping AI inference');
    return {};
  }

  // Build context from available data
  const context = [
    name ? `Company: ${name}` : '',
    tagline ? `Tagline: ${tagline}` : '',
    description ? `Description: ${description}` : '',
    pitch ? `Pitch: ${pitch}` : '',
    website ? `Website: ${website}` : '',
    sectors && sectors.length > 0 ? `Sectors: ${sectors.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `You are a startup data analyst. Analyze the following startup information and extract structured data for GOD scoring.

${context}

Extract the following data (use null if truly unknown, but try to infer intelligently):

TRACTION METRICS:
- revenue: Annual revenue in USD (number, e.g., 500000 for $500K)
- mrr: Monthly recurring revenue in USD (number)
- arr: Annual recurring revenue in USD (number)
- growth_rate: Monthly growth rate as percentage (number, e.g., 15 for 15%)
- active_users: Number of active users (number)
- customers: Number of paying customers (number)
- customer_count: Total customer count (number)

MARKET DATA:
- market_size: Market size/TAM (string like "$10B market" or number in billions)
- problem: Specific problem being solved (string, 1-2 sentences)
- solution: How they solve it (string, 1-2 sentences)
- value_proposition: One-line value prop (string)

PRODUCT INFO:
- is_launched: Has launched product (boolean)
- has_demo: Has demo available (boolean)
- mvp_stage: Has MVP (boolean)

TEAM DATA:
- founders_count: Number of founders (number)
- technical_cofounder: Has technical cofounder (boolean, map to technical_cofounders: 1 or 0)
- team_companies: Notable previous companies (array of strings, e.g., ["Google", "Y Combinator"])

FUNDING:
- funding_amount: Funding amount (string like "$10M" or number)
- funding_stage: Stage (string like "Seed", "Series A")
- investors_mentioned: Investor names (array of strings)

ADDITIONAL:
- sectors: Industry sectors (array of strings)
- industries: Same as sectors (array of strings)

IMPORTANT:
- Infer intelligently from context - if they mention "raised $5M" extract that
- If they mention "10K users" extract that
- If they mention "launched" or "demo" set is_launched/has_demo
- If they mention team from "Google" or "Y Combinator" extract team_companies
- Be conservative - only extract what you can reasonably infer
- Return JSON only, no markdown

Return JSON format:
{
  "revenue": null or number,
  "mrr": null or number,
  "arr": null or number,
  "growth_rate": null or number,
  "active_users": null or number,
  "customers": null or number,
  "customer_count": null or number,
  "market_size": null or string or number,
  "problem": null or string,
  "solution": null or string,
  "value_proposition": null or string,
  "is_launched": null or boolean,
  "has_demo": null or boolean,
  "mvp_stage": null or boolean,
  "founders_count": null or number,
  "technical_cofounder": null or boolean,
  "team_companies": null or array,
  "funding_amount": null or string or number,
  "funding_stage": null or string,
  "investors_mentioned": null or array,
  "sectors": null or array,
  "industries": null or array
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return {};
    }

    // Parse JSON response
    let parsed: any = {};
    try {
      // Try direct parse
      parsed = JSON.parse(content.text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object
        const objectMatch = content.text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        }
      }
    }

    // Normalize the result
    const result: EnrichmentResult = {
      revenue: parsed.revenue ?? undefined,
      mrr: parsed.mrr ?? undefined,
      arr: parsed.arr ?? undefined,
      growth_rate: parsed.growth_rate ?? undefined,
      active_users: parsed.active_users ?? undefined,
      customers: parsed.customers ?? undefined,
      customer_count: parsed.customer_count ?? undefined,
      market_size: parsed.market_size ?? undefined,
      problem: parsed.problem ?? undefined,
      solution: parsed.solution ?? undefined,
      value_proposition: parsed.value_proposition ?? undefined,
      is_launched: parsed.is_launched ?? undefined,
      has_demo: parsed.has_demo ?? undefined,
      launched: parsed.is_launched ?? undefined,
      demo_available: parsed.has_demo ?? undefined,
      mvp_stage: parsed.mvp_stage ?? undefined,
      founders_count: parsed.founders_count ?? undefined,
      technical_cofounders: parsed.technical_cofounder ? 1 : (parsed.technical_cofounder === false ? 0 : undefined),
      team_companies: parsed.team_companies ?? undefined,
      funding_amount: parsed.funding_amount ?? undefined,
      funding_stage: parsed.funding_stage ?? undefined,
      investors_mentioned: parsed.investors_mentioned ?? undefined,
      backed_by: parsed.investors_mentioned ?? undefined,
      sectors: parsed.sectors ?? undefined,
      industries: parsed.industries ?? parsed.sectors ?? undefined,
    };

    // Remove undefined values
    Object.keys(result).forEach(key => {
      if (result[key as keyof EnrichmentResult] === undefined) {
        delete result[key as keyof EnrichmentResult];
      }
    });

    return result;
  } catch (error) {
    console.error(`❌ AI inference failed for ${name}:`, error);
    return {};
  }
}

/**
 * Enrich a single startup by populating extracted_data
 */
export async function enrichStartup(startupId: string): Promise<{ success: boolean; enriched: number }> {
  try {
    // Fetch startup
    const { data: startup, error: fetchError } = await supabase
      .from('startup_uploads')
      .select('id, name, description, tagline, pitch, website, sectors, extracted_data')
      .eq('id', startupId)
      .single();

    if (fetchError || !startup) {
      console.error(`❌ Failed to fetch startup ${startupId}:`, fetchError);
      return { success: false, enriched: 0 };
    }

    // Check if already has rich extracted_data
    const existingData = startup.extracted_data || {};
    const hasRichData = existingData.revenue || existingData.mrr || existingData.problem || existingData.team_companies;

    if (hasRichData) {
      console.log(`   ⏭️  ${startup.name} - Already has rich data`);
      return { success: true, enriched: 0 };
    }

    // Run AI inference
    console.log(`   🤖 Enriching ${startup.name}...`);
    const inferred = await inferStartupData(
      startup.name,
      startup.description || undefined,
      startup.tagline || undefined,
      startup.pitch || undefined,
      startup.website || undefined,
      startup.sectors || undefined
    );

    if (Object.keys(inferred).length === 0) {
      console.log(`   ⚠️  ${startup.name} - No data inferred`);
      return { success: true, enriched: 0 };
    }

    // Merge with existing extracted_data
    const mergedData = {
      ...existingData,
      ...inferred
    };

    // Update database
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ extracted_data: mergedData })
      .eq('id', startupId);

    if (updateError) {
      console.error(`   ❌ Failed to update ${startup.name}:`, updateError);
      return { success: false, enriched: 0 };
    }

    const enrichedCount = Object.keys(inferred).length;
    console.log(`   ✅ ${startup.name} - Enriched with ${enrichedCount} fields`);
    return { success: true, enriched: enrichedCount };
  } catch (error) {
    console.error(`❌ Error enriching startup ${startupId}:`, error);
    return { success: false, enriched: 0 };
  }
}

/**
 * Batch enrich multiple startups
 */
export async function batchEnrichStartups(
  limit: number = 100,
  missingOnly: boolean = true
): Promise<{ enriched: number; skipped: number; errors: number }> {
  console.log(`\n🔍 Starting batch enrichment (limit: ${limit}, missingOnly: ${missingOnly})...\n`);

  // Build query
  let query = supabase
    .from('startup_uploads')
    .select('id, name, description, tagline, pitch, website, sectors, extracted_data')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(limit);

  // If missingOnly, filter for startups with sparse extracted_data
  if (missingOnly) {
    // This is tricky - we need to check JSONB content
    // For now, we'll fetch all and filter in code
  }

  const { data: startups, error } = await query;

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return { enriched: 0, skipped: 0, errors: 1 };
  }

  if (!startups || startups.length === 0) {
    console.log('   ✅ No startups to enrich');
    return { enriched: 0, skipped: 0, errors: 0 };
  }

  // Filter for startups missing data if needed
  const toEnrich = missingOnly
    ? startups.filter(s => {
        const data = s.extracted_data || {};
        return !data.revenue && !data.mrr && !data.problem && !data.team_companies;
      })
    : startups;

  console.log(`📊 Found ${toEnrich.length} startups to enrich (out of ${startups.length} total)\n`);

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < toEnrich.length; i += batchSize) {
    const batch = toEnrich.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (startup) => {
        const result = await enrichStartup(startup.id);
        if (result.success) {
          if (result.enriched > 0) {
            enriched++;
          } else {
            skipped++;
          }
        } else {
          errors++;
        }
      })
    );

    // Rate limiting - wait between batches
    if (i + batchSize < toEnrich.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Enriched: ${enriched}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${toEnrich.length}\n`);

  return { enriched, skipped, errors };
}

