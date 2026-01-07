#!/usr/bin/env node
/**
 * REMOVE PUBLIC AND LARGE PRIVATE COMPANIES
 * 
 * Removes companies that are:
 * 1. Public companies (listed on stock exchanges)
 * 2. Large private companies (Fortune 500, major corporations)
 * 3. Mature startups (well-established, likely IPO'd or acquired)
 * 
 * These companies create bias in GOD scoring and are not actual startups.
 * 
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/remove-public-companies.ts [--dry-run]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Import filter functions (CommonJS module)
const { shouldFilterCompany, PUBLIC_COMPANIES, MATURE_STARTUPS } = require('../utils/companyFilters');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Additional large private companies that might not be in the filter list
const ADDITIONAL_LARGE_COMPANIES = [
  'Amazon Web Services', 'AWS', 'ServiceNow', 'Cloudflare', 'Moderna', 'Workday', 'Nutanix',
  'Okta', 'Docker', 'Grammarly', 'Supabase', 'Retool', 'Plaid', 'Carta', 'Benchling',
  'Rubrik', 'Segment', 'Pinecone', 'Weaviate', 'Celonis', 'Tanium', 'Doximity',
  'Hinge Health', 'Carbon Health', 'Thirty Madison', 'Hims & Hers', 'Braze', 'Highspot',
  'Attentive', 'Nextdoor', 'Character.AI', 'ElevenLabs', 'Perplexity', 'Mistral',
  'Hugging Face', 'Huggingface', 'Anthropic', 'OpenAI', 'Cohere', 'Adept', 'Inflection',
  'Stability AI', 'Midjourney', 'Runway', 'Scale AI', 'Labelbox', 'Weights & Biases',
  'Discord', 'Telegram', 'Signal', 'Patreon', 'Kickstarter', 'Indiegogo',
  'Wise', 'Remitly', 'WorldRemit', 'Payoneer', 'Razorpay',
  'Airtable', 'Monday.com', 'Asana', 'Smartsheet', 'ClickUp', 'Linear', 'Jira',
  'Miro', 'Figma', 'Webflow', 'Zapier', 'Make', 'n8n', 'Workato',
  'Rippling', 'Gusto', 'Deel', 'Remote', 'Oyster', 'Papaya Global',
  'Stripe', 'Square', 'Block', 'Coinbase', 'Robinhood', 'SoFi', 'Affirm',
  'Shopify', 'Square', 'Toast', 'Lightspeed', 'Revel Systems',
  'DoorDash', 'Instacart', 'Grubhub', 'Uber Eats', 'Postmates',
  'Airbnb', 'Booking.com', 'Expedia', 'Tripadvisor', 'Kayak',
  'Peloton', 'Lululemon', 'Warby Parker', 'Casper', 'Allbirds',
  'Canva', 'Notion', 'Figma', 'GitHub', 'GitLab', 'Atlassian',
  'MongoDB', 'Elastic', 'Splunk', 'Datadog', 'New Relic', 'Sentry',
  'Snowflake', 'Databricks', 'Palantir', 'C3.ai', 'UiPath',
  'Twilio', 'SendGrid', 'Mailchimp', 'Constant Contact', 'Campaign Monitor',
  'Zendesk', 'Intercom', 'Drift', 'HubSpot', 'Salesforce',
  'Zoom', 'Microsoft Teams', 'Slack', 'Discord', 'Telegram',
  'Dropbox', 'Box', 'Google Drive', 'OneDrive', 'iCloud',
  'Spotify', 'Apple Music', 'YouTube Music', 'Pandora', 'SoundCloud',
  'Netflix', 'Disney+', 'Hulu', 'Amazon Prime Video', 'HBO Max',
  'Uber', 'Lyft', 'Via', 'Juno', 'Gett',
  'Tesla', 'Rivian', 'Lucid Motors', 'Fisker', 'Polestar',
  'SpaceX', 'Blue Origin', 'Rocket Lab', 'Relativity Space', 'Astra',
  'Moderna', 'Pfizer', 'BioNTech', 'Novavax', 'Johnson & Johnson',
  'Amazon', 'Apple', 'Microsoft', 'Google', 'Alphabet', 'Meta', 'Facebook',
  'Oracle', 'IBM', 'Intel', 'Nvidia', 'AMD', 'Qualcomm', 'Broadcom',
  'Cisco', 'Adobe', 'Salesforce', 'VMware', 'Dell', 'HP', 'Hewlett-Packard',
  'Samsung', 'LG', 'Sony', 'Panasonic', 'Toshiba', 'Hitachi',
  'Walmart', 'Target', 'Costco', 'Home Depot', 'Lowe\'s',
  'JPMorgan', 'Bank of America', 'Wells Fargo', 'Goldman Sachs', 'Morgan Stanley',
  'Citigroup', 'American Express', 'Discover', 'Capital One',
  'AT&T', 'Verizon', 'T-Mobile', 'Sprint', 'Comcast',
  'Disney', 'Warner Bros', 'Universal', 'Paramount', 'Sony Pictures',
  'Nike', 'Adidas', 'Under Armour', 'Puma', 'Reebok',
  'Coca-Cola', 'PepsiCo', 'Starbucks', 'McDonald\'s', 'Yum Brands',
  'Procter & Gamble', 'Unilever', 'Johnson & Johnson', 'Colgate-Palmolive',
  'Boeing', 'Lockheed Martin', 'Northrop Grumman', 'Raytheon', 'General Dynamics',
  'General Electric', 'Siemens', 'ABB', 'Schneider Electric', 'Emerson',
  'Ford', 'General Motors', 'Toyota', 'Honda', 'Nissan',
  'FedEx', 'UPS', 'DHL', 'Amazon Logistics', 'USPS',
  'Walgreens', 'CVS', 'Rite Aid', 'Walmart Pharmacy',
  'ExxonMobil', 'Chevron', 'Shell', 'BP', 'Total',
  'McKinsey', 'BCG', 'Bain', 'Deloitte', 'PwC', 'EY', 'KPMG',
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Citigroup',
  'BlackRock', 'Vanguard', 'Fidelity', 'State Street', 'Charles Schwab'
];

// Enhanced detection function
function isLargeOrPublicCompany(name: string, description?: string, extractedData?: any): boolean {
  if (!name) return false;
  
  const nameLower = name.toLowerCase().trim();
  const desc = (description || extractedData?.description || extractedData?.pitch || '').toLowerCase();
  const fullText = `${nameLower} ${desc}`;
  
  // Check against known public companies
  for (const company of PUBLIC_COMPANIES) {
    if (nameLower === company.toLowerCase() || nameLower.includes(company.toLowerCase())) {
      return true;
    }
  }
  
  // Check against additional large companies
  for (const company of ADDITIONAL_LARGE_COMPANIES) {
    if (nameLower === company.toLowerCase() || nameLower.includes(company.toLowerCase())) {
      return true;
    }
  }
  
  // Check against mature startups
  for (const company of MATURE_STARTUPS) {
    if (nameLower === company.toLowerCase() || nameLower.includes(company.toLowerCase())) {
      return true;
    }
  }
  
  // Check for public company indicators in text
  const publicIndicators = [
    'nyse:', 'nasdaq:', 'ipo', 'publicly traded', 'ticker', 'stock symbol',
    'fortune 500', 'fortune 100', 's&p 500', 'listed on', 'trades on',
    'market cap', 'market capitalization', 'shareholder', 'dividend',
    'earnings report', 'quarterly earnings', 'sec filing', '10-k', '10-q',
    'public company', 'went public', 'going public', 'post-ipo'
  ];
  
  for (const indicator of publicIndicators) {
    if (fullText.includes(indicator)) {
      return true;
    }
  }
  
  // Check for large company indicators
  const largeCompanyIndicators = [
    'billion valuation', 'unicorn', 'decacorn', 'centicorn',
    'series d', 'series e', 'series f', 'series g', 'series h',
    'thousands of employees', 'hundreds of employees', 'global team',
    'enterprise customers', 'fortune 500', 'fortune 1000',
    'market leader', 'category leader', 'established platform'
  ];
  
  for (const indicator of largeCompanyIndicators) {
    if (fullText.includes(indicator)) {
      return true;
    }
  }
  
  // Check for very high revenue (likely large company)
  if (extractedData?.revenue || extractedData?.arr) {
    const revenue = Number(extractedData.revenue || extractedData.arr || 0);
    if (revenue > 100_000_000) { // $100M+ annual revenue = likely large company
      return true;
    }
  }
  
  // Check for very large team size
  if (extractedData?.team_size) {
    const teamSize = Number(extractedData.team_size || 0);
    if (teamSize > 500) { // 500+ employees = likely large company
      return true;
    }
  }
  
  return false;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('═'.repeat(70));
  console.log('    🚫 REMOVE PUBLIC AND LARGE PRIVATE COMPANIES');
  console.log('═'.repeat(70));
  console.log(`\n📊 Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will remove companies)'}\n`);
  
  try {
    // Fetch all approved startups
    let allStartups: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: startups, error } = await supabase
        .from('startup_uploads')
        .select('id, name, description, extracted_data, status')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      
      if (error) {
        throw error;
      }
      
      if (!startups || startups.length === 0) {
        hasMore = false;
      } else {
        allStartups = [...allStartups, ...startups];
        from += pageSize;
        hasMore = startups.length === pageSize;
      }
    }
    
    console.log(`📈 Found ${allStartups.length} approved startups\n`);
    
    // Identify companies to remove
    const toRemove: Array<{ id: string; name: string; reason: string }> = [];
    
    for (const startup of allStartups) {
      const shouldRemove = isLargeOrPublicCompany(
        startup.name,
        startup.description,
        startup.extracted_data
      );
      
      if (shouldRemove) {
        // Use existing filter to get reason
        const filterResult = shouldFilterCompany(
          startup.name,
          startup.description,
          startup.extracted_data?.stage || startup.extracted_data?.funding_stage
        );
        
        toRemove.push({
          id: startup.id,
          name: startup.name,
          reason: filterResult.reason || 'Large/Public company'
        });
      }
    }
    
    console.log(`🚫 Found ${toRemove.length} companies to remove:\n`);
    
    // Group by reason
    const byReason = toRemove.reduce((acc, company) => {
      if (!acc[company.reason]) acc[company.reason] = [];
      acc[company.reason].push(company);
      return acc;
    }, {} as Record<string, typeof toRemove>);
    
    for (const [reason, companies] of Object.entries(byReason)) {
      console.log(`   ${reason}: ${companies.length}`);
      companies.slice(0, 10).forEach(c => console.log(`      - ${c.name}`));
      if (companies.length > 10) {
        console.log(`      ... and ${companies.length - 10} more`);
      }
    }
    
    if (toRemove.length === 0) {
      console.log('\n✅ No public/large companies found!');
      return;
    }
    
    if (isDryRun) {
      console.log('\n' + '═'.repeat(70));
      console.log('✅ DRY RUN COMPLETE - No changes made');
      console.log(`   Would remove: ${toRemove.length} companies`);
      console.log('═'.repeat(70));
      return;
    }
    
    // Remove companies (mark as rejected)
    console.log('\n🔄 Removing companies...\n');
    
    const idsToRemove = toRemove.map(c => c.id);
    let removed = 0;
    
    // Process in batches of 100
    for (let i = 0; i < idsToRemove.length; i += 100) {
      const batch = idsToRemove.slice(i, i + 100);
      
      const { error } = await supabase
        .from('startup_uploads')
        .update({ 
          status: 'rejected',
          admin_notes: `Removed: ${toRemove.find(t => t.id === batch[0])?.reason || 'Public/Large company'}`
        })
        .in('id', batch);
      
      if (error) {
        console.error(`❌ Error removing batch ${i / 100 + 1}:`, error.message);
      } else {
        removed += batch.length;
        console.log(`   ✅ Removed ${removed}/${idsToRemove.length} companies...`);
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ COMPLETE');
    console.log(`   Removed: ${removed} companies`);
    console.log(`   Remaining approved: ${allStartups.length - removed}`);
    console.log('═'.repeat(70));
    
    // Also remove their matches
    console.log('\n🔄 Cleaning up matches for removed companies...\n');
    
    const { error: matchError } = await supabase
      .from('startup_investor_matches')
      .delete()
      .in('startup_id', idsToRemove);
    
    if (matchError) {
      console.error(`⚠️  Error removing matches: ${matchError.message}`);
    } else {
      console.log(`   ✅ Removed matches for ${idsToRemove.length} companies`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

