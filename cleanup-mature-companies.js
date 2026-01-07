#!/usr/bin/env node
/**
 * CLEANUP MATURE COMPANIES
 * 
 * Removes mature/large companies from startup_uploads that shouldn't be there.
 * Examples: Google, Microsoft, Amazon, etc.
 * 
 * Usage:
 *   node cleanup-mature-companies.js --dry-run    # Preview what would be deleted
 *   node cleanup-mature-companies.js --confirm    # Actually delete them
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Known mature/large companies (expanded list)
const MATURE_COMPANIES = [
  // Big Tech
  'Google', 'Google AI', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook',
  'Tesla', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Palantir', 'Snowflake',
  'Databricks', 'OpenAI', 'Anthropic', 'Nvidia', 'Intel', 'AMD', 'IBM',
  'Oracle', 'Salesforce', 'Adobe', 'Cisco', 'VMware', 'Red Hat', 'MongoDB',
  'Atlassian', 'Zoom', 'Slack', 'Dropbox', 'Box', 'Twilio', 'Shopify',
  'Square', 'PayPal', 'Visa', 'Mastercard',
  
  // Financial Services
  'Goldman Sachs', 'JPMorgan', 'Bank of America', 'Wells Fargo', 'Citigroup',
  'Morgan Stanley', 'BlackRock', 'Fidelity', 'Charles Schwab',
  
  // Media & Entertainment
  'Disney', 'Warner Bros', 'Sony', 'Nintendo', 'Electronic Arts',
  'Activision', 'Blizzard', 'Riot Games', 'Epic Games', 'Valve',
  'Spotify', 'Pandora', 'SoundCloud', 'iHeartRadio',
  'Pinterest', 'Reddit', 'Snapchat', 'Instagram', 'WhatsApp',
  'YouTube', 'Vimeo', 'Dailymotion', 'Hulu', 'Disney+',
  'HBO', 'Showtime', 'Paramount', 'NBC', 'ABC', 'CBS', 'Fox',
  
  // Social Media & Platforms
  'LinkedIn', 'Twitter', 'X.com', 'TikTok', 'ByteDance',
  
  // International Tech
  'Alibaba', 'Tencent', 'Baidu', 'Samsung', 'LG', 'Panasonic',
  
  // Industrial & Manufacturing
  'General Electric', 'Boeing', 'Lockheed Martin', 'Raytheon',
  
  // Consumer Goods
  'Coca-Cola', 'PepsiCo', 'Nestle', 'Unilever', 'Procter & Gamble',
  'Walmart', 'Target', 'Costco', 'Home Depot', 'Lowe\'s',
  'McDonald\'s', 'Starbucks', 'Subway', 'Domino\'s', 'Pizza Hut',
  'Ford', 'General Motors', 'Toyota', 'Honda', 'BMW', 'Mercedes',
  'Volkswagen', 'Audi', 'Porsche', 'Ferrari', 'Lamborghini',
  'Nike', 'Adidas', 'Under Armour', 'Puma', 'Reebok',
  
  // Cloud & Infrastructure
  'Amazon Web Services', 'AWS', 'Azure', 'GCP', 'Google Cloud',
  'GitHub', 'GitLab', 'Bitbucket', 'Docker', 'Kubernetes',
  'Elastic', 'Splunk', 'Tableau', 'Power BI', 'Looker',
  'ServiceNow', 'Workday', 'SAP', 'Oracle Cloud', 'IBM Cloud',
  'Dell', 'HP', 'Lenovo', 'Acer', 'ASUS',
  
  // News & Media Companies
  'CNN', 'BBC', 'Reuters', 'Bloomberg', 'Wall Street Journal',
  'New York Times', 'Washington Post', 'USA Today', 'Forbes',
  'Fortune', 'Time', 'Newsweek', 'The Economist', 'Financial Times',
  'Crunchbase', 'TechCrunch', 'VentureBeat', 'The Information',
  
  // Products/Services of Large Companies (not startups)
  'Apple Music', 'Apple TV', 'Apple Pay', 'Apple Watch',
  'Amazon Prime', 'Amazon Music', 'Amazon Pay', 'Amazon Web Services',
  'Google Cloud', 'Google Pay', 'Google Workspace', 'Google Drive',
  'Microsoft Azure', 'Microsoft Office', 'Microsoft Teams',
  'Meta Quest', 'Meta Portal', 'Facebook Marketplace',
  'Netflix Originals', 'Disney Plus', 'HBO Max',
  'Spotify Premium', 'YouTube Premium', 'Twitch',
  'Cisco Security', 'Cisco Webex', 'VMware vSphere',
  'Salesforce CRM', 'Adobe Creative Cloud', 'Oracle Database',
  'IBM Watson', 'Intel Core', 'AMD Ryzen', 'Nvidia GeForce',
  'MongoDB Atlas', 'Atlassian Jira', 'Zoom Meetings',
  'Slack Workspace', 'Dropbox Business', 'Box Enterprise',
  'Twilio SendGrid', 'Shopify Plus', 'Square Payments',
  'PayPal Business', 'Stripe Connect', 'Databricks Lakehouse',
  'Snowflake Data Cloud', 'Palantir Foundry', 'OpenAI GPT',
  'Anthropic Claude', 'Red Hat Enterprise', 'GitHub Enterprise',
  'GitLab CI/CD', 'Docker Desktop', 'Kubernetes Engine',
  'Elasticsearch', 'Splunk Enterprise', 'Tableau Desktop',
  'ServiceNow Platform', 'Workday HCM', 'SAP ERP'
];

// Pattern-based detection
const MATURE_PATTERNS = [
  /^Google\s/i,
  /^Microsoft\s/i,
  /^Apple\s/i,
  /^Amazon\s/i,
  /^Meta\s/i,
  /^Facebook\s/i,
  /^Tesla\s/i,
  /^Netflix\s/i,
  /^Uber\s/i,
  /^Airbnb\s/i,
  /^Stripe\s/i,
  /^Palantir\s/i,
  /^Snowflake\s/i,
  /^Databricks\s/i,
  /^OpenAI\s/i,
  /^Anthropic\s/i,
  /^Nvidia\s/i,
  /^Intel\s/i,
  /^AMD\s/i,
  /^IBM\s/i,
  /^Oracle\s/i,
  /^Salesforce\s/i,
  /^Adobe\s/i,
  /^Cisco\s/i,
  /^VMware\s/i,
  /^Red\s+Hat\s/i,
  /^MongoDB\s/i,
  /^Atlassian\s/i,
  /^Zoom\s/i,
  /^Slack\s/i,
  /^Dropbox\s/i,
  /^Box\s/i,
  /^Twilio\s/i,
  /^Shopify\s/i,
  /^Square\s/i,
  /^PayPal\s/i,
  /^AWS\s/i,
  /^Azure\s/i,
  /^GCP\s/i,
  /^GitHub\s/i,
  /^GitLab\s/i,
  /^Docker\s/i,
  /^Kubernetes\s/i
];

// Large company domains
const MATURE_DOMAINS = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'meta.com',
  'facebook.com', 'tesla.com', 'netflix.com', 'uber.com', 'airbnb.com',
  'stripe.com', 'palantir.com', 'snowflake.com', 'databricks.com',
  'openai.com', 'anthropic.com', 'nvidia.com', 'intel.com', 'amd.com',
  'ibm.com', 'oracle.com', 'salesforce.com', 'adobe.com', 'cisco.com',
  'vmware.com', 'redhat.com', 'mongodb.com', 'atlassian.com', 'zoom.us',
  'slack.com', 'dropbox.com', 'box.com', 'twilio.com', 'shopify.com',
  'square.com', 'paypal.com', 'aws.amazon.com', 'azure.com',
  'github.com', 'gitlab.com', 'docker.com', 'kubernetes.io'
];

function isMatureCompany(startup) {
  const name = startup.name || '';
  const nameLower = name.toLowerCase();
  const website = (startup.website || '').toLowerCase();
  const description = (startup.description || '').toLowerCase();
  
  // Check exact matches (case-insensitive, with word boundaries)
  for (const mature of MATURE_COMPANIES) {
    const matureLower = mature.toLowerCase();
    if (nameLower === matureLower || 
        nameLower.startsWith(matureLower + ' ') ||
        nameLower.startsWith(matureLower + '\'') ||
        nameLower.startsWith(matureLower + '-')) {
      return { isMature: true, reason: `Exact match: ${mature}` };
    }
  }
  
  // Check patterns
  for (const pattern of MATURE_PATTERNS) {
    if (pattern.test(name)) {
      return { isMature: true, reason: 'Pattern match' };
    }
  }
  
  // Check website domains (but exclude GitHub repos unless from large companies)
  if (website.includes('github.com')) {
    // Only flag if it's from a large company's GitHub org
    const largeCompanyGitHub = [
      'github.com/microsoft/', 'github.com/google/', 'github.com/facebook/',
      'github.com/apple/', 'github.com/amazon/', 'github.com/meta/',
      'github.com/netflix/', 'github.com/uber/', 'github.com/airbnb/',
      'github.com/stripe/', 'github.com/palantir/', 'github.com/salesforce/',
      'github.com/adobe/', 'github.com/oracle/', 'github.com/ibm/',
      'github.com/intel/', 'github.com/nvidia/', 'github.com/vmware/',
      'github.com/redhat/', 'github.com/mongodb/', 'github.com/atlassian/'
    ];
    
    for (const largeGitHub of largeCompanyGitHub) {
      if (website.includes(largeGitHub)) {
        return { isMature: true, reason: `Large company GitHub: ${largeGitHub}` };
      }
    }
    // Skip other GitHub repos - might be legitimate startups
    return { isMature: false };
  }
  
  // Check other large company domains (exact match or subdomain)
  for (const domain of MATURE_DOMAINS) {
    // Match exact domain or subdomain (e.g., "box.com" matches "box.com" or "www.box.com", but not "bentobox.com")
    const domainPattern = new RegExp(`(^|://)([a-z0-9-]+\\.)?${domain.replace('.', '\\.')}(/|$)`, 'i');
    if (domainPattern.test(website)) {
      return { isMature: true, reason: `Large company domain: ${domain}` };
    }
  }
  
  // Check description for public company indicators
  const publicIndicators = [
    'publicly traded', 'fortune 500', 'fortune 100', 'fortune 50',
    'ipo', 'public company', 'listed on', 'nasdaq', 'nyse',
    'publicly listed', 'public offering', 'went public',
    'acquired by', 'merged with', 'billion dollar', 'multi-billion'
  ];
  
  for (const indicator of publicIndicators) {
    if (description.includes(indicator)) {
      return { isMature: true, reason: `Description: ${indicator}` };
    }
  }
  
  // Check for article titles (not real companies) - be more specific
  const articleTitlePatterns = [
    /^(Crunchbase|TechCrunch|VentureBeat|The Information|Forbes|Fortune)\s+(Predicts|Goes|Update|Announces|Launches|Releases)/i,
    /^(Predicts|Goes|Update|Announces|Launches|Releases)\s+(Crunchbase|TechCrunch|VentureBeat)/i
  ];
  
  for (const pattern of articleTitlePatterns) {
    if (pattern.test(name)) {
      // Only flag if website is also from a news source
      if (website.includes('crunchbase.com') || website.includes('techcrunch.com') ||
          website.includes('venturebeat.com') || website.includes('theinformation.com') ||
          website.includes('forbes.com') || website.includes('fortune.com')) {
        return { isMature: true, reason: 'Article title, not a company' };
      }
    }
  }
  
  // GitHub repos - only flag if it's clearly a product/service page, not a repo
  if (website.includes('github.com')) {
    // GitHub repos are usually: github.com/username/repo
    // If it's a company website, it would be github.io or a custom domain
    // For now, skip GitHub repos as they might be legitimate open-source startups
    // Only flag if it's clearly a large company's GitHub
    if (website.includes('github.com/microsoft/') || 
        website.includes('github.com/google/') ||
        website.includes('github.com/facebook/') ||
        website.includes('github.com/apple/') ||
        website.includes('github.com/amazon/')) {
      return { isMature: true, reason: 'Large company GitHub repo' };
    }
    // Otherwise, skip - might be a legitimate startup
    return { isMature: false };
  }
  
  // Acquired companies - be more careful
  // Only flag if description explicitly says "acquired by [large company]"
  if (description.includes('acquired by') || description.includes('acquired')) {
    const acquiredByLarge = [
      'google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook',
      'tesla', 'netflix', 'uber', 'airbnb', 'stripe', 'palantir',
      'salesforce', 'adobe', 'cisco', 'oracle', 'ibm', 'intel',
      'nvidia', 'amd', 'vmware', 'red hat', 'mongodb', 'atlassian',
      'disney', 'warner', 'sony', 'activision', 'electronic arts'
    ];
    
    const descLower = description.toLowerCase();
    for (const large of acquiredByLarge) {
      // More specific patterns to avoid false positives
      if (descLower.match(new RegExp(`acquired by ${large}`, 'i')) ||
          descLower.match(new RegExp(`${large} acquired`, 'i')) ||
          descLower.match(new RegExp(`was acquired by ${large}`, 'i')) ||
          descLower.match(new RegExp(`acquired ${large}`, 'i'))) {
        return { isMature: true, reason: `Acquired by large company: ${large}` };
      }
    }
  }
  
  return { isMature: false };
}

async function findMatureCompanies() {
  console.log('\n🔍 SCANNING FOR MATURE COMPANIES\n');
  console.log('═'.repeat(60) + '\n');
  
  // Get all approved startups
  const { data: allStartups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, description, total_god_score, created_at, status')
    .eq('status', 'approved')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return [];
  }
  
  if (!allStartups || allStartups.length === 0) {
    console.log('No startups found');
    return [];
  }
  
  console.log(`📊 Scanning ${allStartups.length} approved startups...\n`);
  
  const mature = [];
  
  for (const startup of allStartups) {
    const result = isMatureCompany(startup);
    if (result.isMature) {
      mature.push({
        ...startup,
        reason: result.reason
      });
    }
  }
  
  return mature;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--confirm');
  
  const mature = await findMatureCompanies();
  
  if (mature.length === 0) {
    console.log('✅ No mature companies found!');
    return;
  }
  
  console.log(`\n🔍 FOUND ${mature.length} MATURE COMPANIES:\n`);
  console.log('═'.repeat(60));
  
  mature.forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.name}`);
    console.log(`   Reason: ${s.reason}`);
    console.log(`   Website: ${s.website || 'N/A'}`);
    console.log(`   GOD Score: ${s.total_god_score || 'N/A'}`);
    console.log(`   Created: ${new Date(s.created_at).toLocaleDateString()}`);
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Total to remove: ${mature.length}\n`);
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - No changes made');
    console.log('   Run with --confirm to actually delete these companies\n');
    return;
  }
  
  // Confirm deletion
  console.log('⚠️  This will DELETE these companies from the database!');
  console.log('   Also removing from matching_queue and startup_investor_matches\n');
  
  const ids = mature.map(s => s.id);
  
  // Delete from matching_queue first
  console.log('🗑️  Removing from matching_queue...');
  const { error: queueError } = await supabase
    .from('matching_queue')
    .delete()
    .in('startup_id', ids);
  
  if (queueError) {
    console.error('   ⚠️  Error removing from queue:', queueError.message);
  } else {
    console.log('   ✅ Removed from matching_queue');
  }
  
  // Delete matches
  console.log('🗑️  Removing matches...');
  const { error: matchesError } = await supabase
    .from('startup_investor_matches')
    .delete()
    .in('startup_id', ids);
  
  if (matchesError) {
    console.error('   ⚠️  Error removing matches:', matchesError.message);
  } else {
    console.log('   ✅ Removed matches');
  }
  
  // Delete startups
  console.log('🗑️  Deleting startups...');
  const { error: deleteError } = await supabase
    .from('startup_uploads')
    .delete()
    .in('id', ids);
  
  if (deleteError) {
    console.error('   ❌ Error deleting startups:', deleteError.message);
  } else {
    console.log(`   ✅ Deleted ${mature.length} mature companies\n`);
    console.log('✅ Cleanup complete!\n');
  }
}

main().catch(console.error);

