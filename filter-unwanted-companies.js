#!/usr/bin/env node
/**
 * FILTER UNWANTED COMPANIES
 * 
 * Removes:
 * 1. Public companies (Apple, Oracle, Facebook, etc.)
 * 2. Mature startups (Airbnb, Rivian, Zoox, Slack, etc.)
 * 3. Startups that are closing or ran out of funding (iRobot, etc.)
 * 
 * Run: node filter-unwanted-companies.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Known public companies (Fortune 500, major tech companies)
const PUBLIC_COMPANIES = [
  // Tech Giants
  'Apple', 'Microsoft', 'Google', 'Alphabet', 'Amazon', 'Meta', 'Facebook', 'Oracle', 'IBM', 'Intel',
  'Cisco', 'Adobe', 'Salesforce', 'Nvidia', 'AMD', 'Qualcomm', 'Broadcom', 'Dell', 'HP', 'Hewlett-Packard',
  'VMware', 'Netflix', 'Tesla', 'Twitter', 'X Corp', 'Snapchat', 'Snap', 'Uber', 'Lyft', 'PayPal',
  'eBay', 'Yahoo', 'LinkedIn', 'Reddit', 'Pinterest', 'Spotify', 'Zoom', 'Dropbox', 'Box',
  // Other Major Companies
  'Walmart', 'ExxonMobil', 'Chevron', 'JPMorgan', 'Bank of America', 'Wells Fargo', 'Goldman Sachs',
  'Morgan Stanley', 'Citigroup', 'AT&T', 'Verizon', 'Comcast', 'Disney', 'Nike', 'Coca-Cola', 'PepsiCo',
  'Procter & Gamble', 'Johnson & Johnson', 'Pfizer', 'Merck', 'Boeing', 'General Electric', 'Ford',
  'General Motors', 'FedEx', 'UPS', 'Walgreens', 'CVS', 'Target', 'Home Depot', 'Lowe\'s'
];

// Mature startups (well-established, likely IPO'd or acquired)
const MATURE_STARTUPS = [
  'Airbnb', 'Rivian', 'Zoox', 'Slack', 'Stripe', 'Palantir', 'Snowflake', 'Databricks', 'Canva',
  'Notion', 'Figma', 'GitHub', 'GitLab', 'Atlassian', 'MongoDB', 'Elastic', 'Splunk', 'Okta',
  'Twilio', 'Zendesk', 'Shopify', 'Square', 'Block', 'Coinbase', 'Robinhood', 'DoorDash', 'Instacart',
  'Grubhub', 'Postmates', 'WeWork', 'Peloton', 'Lululemon', 'Warby Parker', 'Casper', 'Allbirds',
  'Glossier', 'Away', 'Outdoor Voices', 'Everlane', 'Revolut', 'N26', 'Chime', 'SoFi', 'Affirm',
  'Klarna', 'Afterpay', 'Brex', 'Ramp', 'Plaid', 'Marqeta', 'Checkout.com', 'Adyen', 'Square',
  'Toast', 'Toast POS', 'Toast Inc', 'Toast Tab', 'Toast Restaurant', 'Toast POS System'
];

// Companies that are closing or ran out of funding
const CLOSED_FAILED_COMPANIES = [
  'iRobot', 'Theranos', 'WeWork', 'Quibi', 'Juicero', 'Bodega', 'Homejoy', 'Secret', 'Yik Yak',
  'Vine', 'Meerkat', 'Periscope', 'Rdio', 'Grooveshark', 'Beats Music', 'Songza', 'Turntable.fm',
  'Color Labs', 'Path', 'Ello', 'Yo', 'Peach', 'Bebo', 'Friendster', 'MySpace', 'Orkut',
  'Google+', 'Google Plus', 'Google Wave', 'Google Buzz', 'Google Reader', 'Google Hangouts',
  'Allo', 'Duo', 'Inbox', 'Google Inbox', 'Google Play Music', 'Google Play Movies', 'Google Play Books'
];

// Keywords that indicate public/mature companies
const PUBLIC_KEYWORDS = [
  'NYSE:', 'NASDAQ:', 'IPO', 'publicly traded', 'ticker', 'stock symbol', 'Fortune 500',
  'Fortune 100', 'S&P 500', 'listed on', 'trades on', 'market cap', 'market capitalization',
  'shareholder', 'dividend', 'earnings report', 'quarterly earnings', 'SEC filing', '10-K', '10-Q'
];

// Keywords that indicate closing/failure
const FAILURE_KEYWORDS = [
  'shutting down', 'closing', 'bankruptcy', 'liquidating', 'ceased operations', 'discontinued',
  'out of business', 'no longer operating', 'winding down', 'going out of business', 'shut down',
  'ran out of funding', 'ran out of money', 'failed to raise', 'unable to raise', 'funding dried up',
  'insolvent', 'insolvency', 'creditor', 'debt restructuring', 'Chapter 11', 'Chapter 7'
];

// Funding stages that indicate maturity
const MATURE_STAGES = [
  'IPO', 'Public', 'Post-IPO', 'Acquired', 'Merger', 'Exit', 'Acquisition', 'M&A'
];

function isPublicCompany(name, description) {
  const nameLower = name.toLowerCase();
  
  // Check against known list
  for (const company of PUBLIC_COMPANIES) {
    if (nameLower === company.toLowerCase() || nameLower.includes(company.toLowerCase())) {
      return true;
    }
  }
  
  // Check for public keywords in description
  if (description) {
    const descLower = description.toLowerCase();
    for (const keyword of PUBLIC_KEYWORDS) {
      if (descLower.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}

function isMatureStartup(name, description, fundingStage) {
  const nameLower = name.toLowerCase();
  
  // Check against known list
  for (const company of MATURE_STARTUPS) {
    if (nameLower === company.toLowerCase() || nameLower.includes(company.toLowerCase())) {
      return true;
    }
  }
  
  // Check funding stage
  if (fundingStage && typeof fundingStage === 'string') {
    const stageLower = fundingStage.toLowerCase();
    for (const stage of MATURE_STAGES) {
      if (stageLower.includes(stage.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}

function isClosedOrFailed(name, description) {
  const nameLower = name.toLowerCase();
  
  // Check against known list
  for (const company of CLOSED_FAILED_COMPANIES) {
    if (nameLower === company.toLowerCase() || nameLower.includes(company.toLowerCase())) {
      return true;
    }
  }
  
  // Check for failure keywords in description
  if (description) {
    const descLower = description.toLowerCase();
    for (const keyword of FAILURE_KEYWORDS) {
      if (descLower.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }
  
  return false;
}

async function filterUnwantedCompanies() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🚫 FILTER UNWANTED COMPANIES                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Scan startup_uploads
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  SCANNING STARTUP_UPLOADS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: startups, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('id, name, description, stage, status')
    .eq('status', 'approved')
    .limit(2000);

  if (fetchError) {
    console.error(`❌ Error fetching startups: ${fetchError.message}`);
    return;
  }

  if (!startups || startups.length === 0) {
    console.log('✅ No startups to check');
    return;
  }

  console.log(`📊 Checking ${startups.length} approved startups...\n`);

  const toRemove = {
    public: [],
    mature: [],
    closed: []
  };

  for (const startup of startups) {
    const reasons = [];
    
    if (isPublicCompany(startup.name, startup.description)) {
      toRemove.public.push({ id: startup.id, name: startup.name, reason: 'Public company' });
      reasons.push('Public');
    }
    
    if (isMatureStartup(startup.name, startup.description, startup.stage)) {
      toRemove.mature.push({ id: startup.id, name: startup.name, reason: 'Mature startup' });
      reasons.push('Mature');
    }
    
    if (isClosedOrFailed(startup.name, startup.description)) {
      toRemove.closed.push({ id: startup.id, name: startup.name, reason: 'Closed/Failed' });
      reasons.push('Closed');
    }
    
    if (reasons.length > 0) {
      console.log(`   🚫 ${startup.name} - ${reasons.join(', ')}`);
    }
  }

  // 2. Scan discovered_startups
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  SCANNING DISCOVERED_STARTUPS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: discovered, error: discError } = await supabase
    .from('discovered_startups')
    .select('id, name, description, funding_stage')
    .limit(2000);

  if (!discError && discovered) {
    console.log(`📊 Checking ${discovered.length} discovered startups...\n`);

    const toRemoveDiscovered = {
      public: [],
      mature: [],
      closed: []
    };

    for (const startup of discovered) {
      const reasons = [];
      
      if (isPublicCompany(startup.name, startup.description)) {
        toRemoveDiscovered.public.push({ id: startup.id, name: startup.name });
        reasons.push('Public');
      }
      
      if (isMatureStartup(startup.name, startup.description, startup.funding_stage)) {
        toRemoveDiscovered.mature.push({ id: startup.id, name: startup.name });
        reasons.push('Mature');
      }
      
      if (isClosedOrFailed(startup.name, startup.description)) {
        toRemoveDiscovered.closed.push({ id: startup.id, name: startup.name });
        reasons.push('Closed');
      }
      
      if (reasons.length > 0) {
        console.log(`   🚫 ${startup.name} - ${reasons.join(', ')}`);
        // Add to main removal lists
        toRemove.public.push(...toRemoveDiscovered.public);
        toRemove.mature.push(...toRemoveDiscovered.mature);
        toRemove.closed.push(...toRemoveDiscovered.closed);
      }
    }
  }

  // 3. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  REMOVAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const totalToRemove = toRemove.public.length + toRemove.mature.length + toRemove.closed.length;
  const uniqueIds = new Set([...toRemove.public, ...toRemove.mature, ...toRemove.closed].map(s => s.id));

  console.log(`📊 Found to remove:`);
  console.log(`   Public companies: ${toRemove.public.length}`);
  console.log(`   Mature startups: ${toRemove.mature.length}`);
  console.log(`   Closed/Failed: ${toRemove.closed.length}`);
  console.log(`   Total unique: ${uniqueIds.size}`);

  if (totalToRemove === 0) {
    console.log('\n✅ No unwanted companies found!');
    return;
  }

  // 4. Remove from startup_uploads
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4️⃣  REMOVING FROM STARTUP_UPLOADS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let removedFromUploads = 0;
  const uploadIds = [...toRemove.public, ...toRemove.mature, ...toRemove.closed]
    .filter(s => startups.some(su => su.id === s.id))
    .map(s => s.id);

  if (uploadIds.length > 0) {
    // Update status to 'rejected' instead of deleting (safer)
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ status: 'rejected' })
      .in('id', uploadIds);

    if (updateError) {
      console.error(`❌ Error removing from startup_uploads: ${updateError.message}`);
    } else {
      removedFromUploads = uploadIds.length;
      console.log(`✅ Removed ${removedFromUploads} companies from startup_uploads (marked as rejected)`);
    }
  }

  // 5. Remove from discovered_startups
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('5️⃣  REMOVING FROM DISCOVERED_STARTUPS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let removedFromDiscovered = 0;
  const discoveredIds = [...toRemove.public, ...toRemove.mature, ...toRemove.closed]
    .filter(s => !uploadIds.includes(s.id))
    .map(s => s.id);

  if (discoveredIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('discovered_startups')
      .delete()
      .in('id', discoveredIds);

    if (deleteError) {
      console.error(`❌ Error removing from discovered_startups: ${deleteError.message}`);
    } else {
      removedFromDiscovered = discoveredIds.length;
      console.log(`✅ Removed ${removedFromDiscovered} companies from discovered_startups`);
    }
  }

  // 6. Final summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('6️⃣  FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Removed from startup_uploads: ${removedFromUploads}`);
  console.log(`✅ Removed from discovered_startups: ${removedFromDiscovered}`);
  console.log(`📊 Total removed: ${removedFromUploads + removedFromDiscovered}`);

  if (toRemove.public.length > 0) {
    console.log(`\n📋 Sample public companies removed:`);
    toRemove.public.slice(0, 10).forEach(s => console.log(`   - ${s.name}`));
  }

  if (toRemove.mature.length > 0) {
    console.log(`\n📋 Sample mature startups removed:`);
    toRemove.mature.slice(0, 10).forEach(s => console.log(`   - ${s.name}`));
  }

  if (toRemove.closed.length > 0) {
    console.log(`\n📋 Sample closed/failed companies removed:`);
    toRemove.closed.slice(0, 10).forEach(s => console.log(`   - ${s.name}`));
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Filtering complete\n');
}

filterUnwantedCompanies().catch(console.error);

