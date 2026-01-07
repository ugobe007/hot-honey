/**
 * Bulk Investor Import Script
 * 
 * This script takes investor data from your scraper and bulk inserts it into Supabase.
 * Run this after you've scraped investor data from Crunchbase, PitchBook, or other sources.
 */

import { supabase } from '../src/lib/supabase';

// Sample scraped investor data structure
interface ScrapedInvestor {
  name: string;
  firm?: string;
  type: 'vc_firm' | 'accelerator' | 'angel_network' | 'corporate_vc';
  tagline?: string;
  description?: string;
  bio?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  location?: string;
  geography?: string;
  
  // Investment details
  check_size_min?: number;
  check_size_max?: number;
  check_size?: string;
  stage_focus?: string[];
  sector_focus?: string[];
  
  // Portfolio
  portfolio_count?: number;
  portfolio_size?: number;
  exits?: number;
  unicorns?: number;
  notable_investments?: string[];
  
  // News & Updates (NEW!)
  news_feed_url?: string;
  last_news_update?: string;
  recent_news?: Array<{
    title: string;
    url: string;
    published_date: string;
    source: string;
  }>;
}

/**
 * Transform scraped data to match database schema
 */
function transformInvestorData(scraped: ScrapedInvestor) {
  return {
    name: scraped.name,
    firm: scraped.firm,
    type: scraped.type,
    tagline: scraped.tagline || scraped.bio?.substring(0, 200),
    description: scraped.description || scraped.bio,
    website: scraped.website,
    linkedin: scraped.linkedin,
    twitter: scraped.twitter,
    location: scraped.location || scraped.geography,
    geography: scraped.geography || scraped.location || 'Global',
    
    // Convert check size to proper format
    check_size_min: scraped.check_size_min,
    check_size_max: scraped.check_size_max,
    check_size: scraped.check_size || formatCheckSize(scraped.check_size_min, scraped.check_size_max),
    
    // Stage and sector as JSONB arrays
    stage: scraped.stage_focus || [],
    sectors: scraped.sector_focus || [],
    
    // Portfolio metrics
    portfolio_count: scraped.portfolio_count || scraped.portfolio_size,
    portfolio_size: scraped.portfolio_count || scraped.portfolio_size,
    exits: scraped.exits || 0,
    unicorns: scraped.unicorns || 0,
    notable_investments: scraped.notable_investments || [],
    
    // News integration (NEW!)
    news_feed_url: scraped.news_feed_url,
    last_news_update: scraped.last_news_update,
    recent_news: scraped.recent_news || []
  };
}

function formatCheckSize(min?: number, max?: number): string {
  if (!min && !max) return 'Undisclosed';
  if (!min) return `Up to $${(max! / 1000000).toFixed(1)}M`;
  if (!max) return `From $${(min / 1000000).toFixed(1)}M`;
  return `$${(min / 1000000).toFixed(1)}M - $${(max / 1000000).toFixed(1)}M`;
}

/**
 * Bulk insert investors into database
 */
async function bulkInsertInvestors(investors: ScrapedInvestor[]) {
  console.log(`🚀 Starting bulk insert of ${investors.length} investors...`);
  
  const transformedData = investors.map(transformInvestorData);
  
  // Insert in batches of 20 to avoid timeout
  const batchSize = 20;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedData.length / batchSize)}...`);
    
    const { data, error } = await supabase
      .from('investors')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Batch error:`, error);
      errorCount += batch.length;
    } else {
      console.log(`✅ Successfully inserted ${data?.length || 0} investors`);
      successCount += data?.length || 0;
    }
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 RESULTS:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Total: ${investors.length}`);
  
  return { successCount, errorCount };
}

/**
 * Example: Load investors from your scraper output
 */
async function loadInvestorsFromScraperOutput() {
  // OPTION 1: Load from JSON file exported by your scraper
  // const fs = require('fs');
  // const scrapedData = JSON.parse(fs.readFileSync('./scraper-output/investors.json', 'utf-8'));
  
  // OPTION 2: Load from your scraper database/API
  // const scrapedData = await yourScraperAPI.getInvestors();
  
  // OPTION 3: Manually define (for testing)
  const scrapedData: ScrapedInvestor[] = [
    {
      name: 'Benchmark',
      type: 'vc_firm',
      tagline: 'Early-stage venture capital',
      description: 'Benchmark is a venture capital firm focused on early-stage investments in technology companies.',
      website: 'https://www.benchmark.com',
      check_size_min: 1000000,
      check_size_max: 50000000,
      stage_focus: ['seed', 'series_a'],
      sector_focus: ['Software', 'Consumer', 'Marketplace'],
      geography: 'North America',
      portfolio_count: 400,
      exits: 80,
      unicorns: 15,
      notable_investments: ['Uber', 'Twitter', 'Snapchat', 'Instagram', 'eBay'],
      news_feed_url: 'https://www.benchmark.com/news',
      recent_news: [
        {
          title: 'Benchmark announces $1B Fund X',
          url: 'https://www.benchmark.com/fund-x',
          published_date: '2025-01-15',
          source: 'Benchmark Blog'
        }
      ]
    },
    // ... add 64 more investors
  ];
  
  return scrapedData;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔥 Hot Money - Investor Bulk Import Tool\n');
    
    // Load investor data
    const investors = await loadInvestorsFromScraperOutput();
    
    if (investors.length === 0) {
      console.error('❌ No investors found to import');
      return;
    }
    
    console.log(`📊 Loaded ${investors.length} investors from scraper`);
    
    // Confirm before proceeding
    console.log('\n⚠️  This will insert all investors into the database.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Bulk insert
    await bulkInsertInvestors(investors);
    
    console.log('\n✅ Bulk import complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { bulkInsertInvestors, transformInvestorData };
