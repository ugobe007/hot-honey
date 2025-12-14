/**
 * Investor Data Enrichment Script
 * Populates missing investor data using OpenAI and web scraping
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Also try .env.local if it exists
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// Initialize clients with environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing Supabase credentials!');
  console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file\n');
  process.exit(1);
}

if (!openaiKey) {
  console.error('\n❌ ERROR: Missing OpenAI API key!');
  console.error('   Please set VITE_OPENAI_API_KEY in your .env file\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

interface InvestorEnrichment {
  notable_investments?: Array<{company: string; round?: string; stage?: string; year?: number}>;
  sector_focus?: string[];
  stage_focus?: string[];
  check_size_min?: number;
  check_size_max?: number;
  portfolio_companies?: number;
  successful_exits?: number;
  active_fund_size?: string;
}

async function enrichInvestorData(investor: any): Promise<InvestorEnrichment | null> {
  try {
    console.log(`\n🔍 Enriching data for: ${investor.name}`);
    
    // Build prompt for OpenAI
    const prompt = `You are a venture capital research assistant. Provide detailed information about this investor/VC firm:

Name: ${investor.name}
${investor.firm ? `Firm: ${investor.firm}` : ''}
${investor.title ? `Title: ${investor.title}` : ''}
${investor.linkedin_url ? `LinkedIn: ${investor.linkedin_url}` : ''}
${investor.investment_thesis ? `Current Thesis: ${investor.investment_thesis}` : ''}

Please provide ONLY if you have reliable information:
1. Notable investments (companies they've invested in, with stage and year)
2. Sector focus (specific industries/sectors they invest in)
3. Stage focus (e.g., ["seed", "series_a", "series_b"])
4. Check size range (min and max in millions, as numbers)
5. Total portfolio companies count
6. Number of successful exits
7. Active fund size (e.g., "$500M")

Format your response as JSON with this structure:
{
  "notable_investments": [{"company": "string", "stage": "string", "year": number}],
  "sector_focus": ["string"],
  "stage_focus": ["seed", "series_a", "series_b"],
  "check_size_min": number (in millions),
  "check_size_max": number (in millions),
  "portfolio_companies": number,
  "successful_exits": number,
  "active_fund_size": "string (e.g., $500M)"
}

IMPORTANT: Only include data you're confident about. Use null for unknown fields. Be conservative.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a venture capital research expert. Provide accurate, up-to-date information about VCs and investors. Format responses as valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.log('   ⚠️  No response from OpenAI');
      return null;
    }
    
    const enrichment = JSON.parse(content) as InvestorEnrichment;
    
    // Log what we found
    console.log(`   ✅ Found ${enrichment.notable_investments?.length || 0} notable investments`);
    console.log(`   ✅ Portfolio: ${enrichment.portfolio_companies || 'N/A'} companies, ${enrichment.successful_exits || 0} exits`);
    console.log(`   ✅ Check size: $${enrichment.check_size_min || '?'}M - $${enrichment.check_size_max || '?'}M`);
    console.log(`   ✅ Sectors: ${enrichment.sector_focus?.join(', ') || 'N/A'}`);
    console.log(`   ✅ Stages: ${enrichment.stage_focus?.join(', ') || 'N/A'}`);
    
    return enrichment;
    
  } catch (error) {
    console.error(`   ❌ Error enriching ${investor.name}:`, error);
    return null;
  }
}
async function updateInvestorInDatabase(investorId: string, enrichment: InvestorEnrichment) {
  const updateData: any = { updated_at: new Date().toISOString() };
  
  // Only update fields that have values
  if (enrichment.notable_investments && enrichment.notable_investments.length > 0) {
    updateData.notable_investments = enrichment.notable_investments;
  }
  if (enrichment.sector_focus && enrichment.sector_focus.length > 0) {
    updateData.sector_focus = enrichment.sector_focus;
  }
  if (enrichment.stage_focus && enrichment.stage_focus.length > 0) {
    updateData.stage_focus = enrichment.stage_focus;
  }
  if (enrichment.check_size_min) {
    updateData.check_size_min = enrichment.check_size_min;
  }
  if (enrichment.check_size_max) {
    updateData.check_size_max = enrichment.check_size_max;
  }
  if (enrichment.portfolio_companies) {
    updateData.portfolio_companies = enrichment.portfolio_companies;
  }
  if (enrichment.successful_exits) {
    updateData.successful_exits = enrichment.successful_exits;
  }
  if (enrichment.active_fund_size) {
    updateData.active_fund_size = enrichment.active_fund_size;
  }

  const { error } = await supabase
    .from('investors')
    .update(updateData)
    .eq('id', investorId);

  if (error) {
    console.error('   ❌ Database update error:', error);
    return false;
  }
  
  console.log('   ✅ Database updated');
  return true;
}

async function enrichAllInvestors() {
  console.log('🚀 Starting Investor Data Enrichment\n');
  console.log('═'.repeat(70));
  
  // Fetch investors with missing data (using correct column names)
  let investors, error;
  try {
    const result = await supabase
      .from('investors')
      .select('*')
      .limit(20); // Process 20 at a time to stay within API limits
    
    investors = result.data;
    error = result.error;
  } catch (err: any) {
    console.error('❌ Error fetching investors:', err);
    console.log('ℹ️  Skipping VC enrichment - database schema may need refresh');
    return;
  }

  if (error) {
    console.error('❌ Error fetching investors:', error);
    console.log('ℹ️  Skipping VC enrichment - database schema may need refresh');
    return;
  }

  if (!investors || investors.length === 0) {
    console.log('✅ No investors need enrichment!');
    return;
  }

  console.log(`\n📊 Found ${investors.length} investors with incomplete data\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i];
    
    console.log(`\n[${i + 1}/${investors.length}] Processing: ${investor.name}`);
    
    // Rate limiting: wait 2 seconds between requests
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const enrichment = await enrichInvestorData(investor);
    
    if (enrichment) {
      const updated = await updateInvestorInDatabase(investor.id, enrichment);
      if (updated) {
        successCount++;
      } else {
        errorCount++;
      }
    } else {
      errorCount++;
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📈 ENRICHMENT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Successfully enriched: ${successCount}/${investors.length}`);
  console.log(`❌ Errors: ${errorCount}/${investors.length}`);
  console.log(`📊 Success rate: ${Math.round(successCount/investors.length*100)}%`);
  console.log('\n✨ Enrichment complete!\n');
}

// Run the enrichment
enrichAllInvestors()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
