/**
 * COMPANY FILTERS
 * 
 * Filters to prevent unwanted companies from being added:
 * - Public companies
 * - Mature startups
 * - Closed/failed companies
 */

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
  'Toast', 'Toast POS', 'Toast Inc', 'Toast Tab', 'Toast Restaurant', 'Toast POS System',
  // Late-stage AI/tech companies
  'xAI', 'x.ai', 'Substack', 'Anthropic', 'OpenAI', 'Mistral AI', 'Cohere', 'Adept', 'Inflection',
  'Character.AI', 'Jasper', 'Copy.ai', 'Runway', 'Midjourney', 'Stability AI', 'Hugging Face',
  'Scale AI', 'Labelbox', 'Weights & Biases', 'Neptune', 'Comet', 'Arize', 'Fiddler',
  // Late-stage platforms
  'Discord', 'Telegram', 'Signal', 'WhatsApp Business', 'Clubhouse', 'OnlyFans', 'Patreon',
  'Kickstarter', 'Indiegogo', 'GoFundMe', 'Tilt', 'Crowdfunder', 'SeedInvest', 'Republic',
  // Late-stage fintech
  'Wise', 'TransferWise', 'Remitly', 'WorldRemit', 'Western Union Digital', 'MoneyGram',
  'Payoneer', 'Payoneer', 'Razorpay', 'Razorpay', 'Razorpay', 'Razorpay', 'Razorpay',
  // Late-stage SaaS
  'Airtable', 'Monday.com', 'Asana', 'Smartsheet', 'ClickUp', 'Linear', 'Jira', 'Confluence',
  'Miro', 'Mural', 'Figma', 'Sketch', 'InVision', 'Zeplin', 'Abstract', 'Framer',
  'Webflow', 'Bubble', 'Zapier', 'Make', 'Integromat', 'n8n', 'Tray.io', 'Workato'
];

// Companies that are closing or ran out of funding
const CLOSED_FAILED_COMPANIES = [
  'iRobot', 'Theranos', 'WeWork', 'Quibi', 'Juicero', 'Bodega', 'Homejoy', 'Secret', 'Yik Yak',
  'Vine', 'Meerkat', 'Periscope', 'Rdio', 'Grooveshark', 'Beats Music', 'Songza', 'Turntable.fm',
  'Color Labs', 'Path', 'Ello', 'Yo', 'Peach', 'Bebo', 'Friendster', 'MySpace', 'Orkut',
  'Google+', 'Google Plus', 'Google Wave', 'Google Buzz', 'Google Reader', 'Google Hangouts',
  'Allo', 'Duo', 'Inbox', 'Google Inbox', 'Google Play Music', 'Google Play Movies', 'Google Play Books'
];

// Invalid names (countries, places, government entities)
const INVALID_NAMES = [
  'North Korea', 'South Korea', 'North America', 'South America', 'East Africa', 'West Africa',
  'United States', 'United Kingdom', 'United Arab Emirates', 'United Nations',
  'New Zealand', 'New York', 'New Jersey', 'New Hampshire', 'New Mexico',
  'South Africa', 'South Sudan', 'South Carolina', 'South Dakota',
  'North Carolina', 'North Dakota', 'North Macedonia',
  'East Timor', 'West Bank', 'East Germany', 'West Germany',
  'Federal Reserve', 'Federal Government', 'State Department',
];

// Keywords that indicate public/mature companies
const PUBLIC_KEYWORDS = [
  'NYSE:', 'NASDAQ:', 'IPO', 'publicly traded', 'ticker', 'stock symbol', 'Fortune 500',
  'Fortune 100', 'S&P 500', 'listed on', 'trades on', 'market cap', 'market capitalization',
  'shareholder', 'dividend', 'earnings report', 'quarterly earnings', 'SEC filing', '10-K', '10-Q'
];

// Keywords that indicate late-stage/mature companies
const LATE_STAGE_KEYWORDS = [
  'valued at', 'valuation of', 'billion valuation', 'unicorn', 'decacorn', 'centicorn',
  'series d', 'series e', 'series f', 'series g', 'series h', 'growth stage', 'late stage',
  'pre-ipo', 'pre-ipo', 'post-ipo', 'public company', 'went public', 'going public',
  '$100m', '$100 million', '$500m', '$500 million', '$1b', '$1 billion', '$10b', '$10 billion',
  'raised over', 'raised more than', 'total funding', 'total raised', 'cumulative funding',
  'well-established', 'established platform', 'leading platform', 'market leader', 'category leader',
  'founded by', 'led by', 'backed by', 'invested by', 'funded by', // Famous founders/investors
  'Elon Musk', 'Sam Altman', 'Peter Thiel', 'Marc Andreessen', 'Reid Hoffman', 'Paul Graham',
  'Y Combinator', 'Sequoia', 'a16z', 'Andreessen Horowitz', 'Accel', 'Benchmark', 'Kleiner Perkins',
  'General Catalyst', 'Lightspeed', 'Greylock', 'First Round', 'Founders Fund', 'NEA',
  'established in', 'founded in', 'since 20', 'since 19', // Old companies (before 2015)
  'millions of users', 'millions of customers', 'millions of subscribers', 'millions of downloads',
  'thousands of employees', 'hundreds of employees', 'global team', 'worldwide', 'international',
  'enterprise customers', 'fortune 500', 'fortune 1000', 'enterprise clients', 'large enterprises'
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

/**
 * Check if name is invalid (country, place, government entity)
 */
function isInvalidName(name) {
  if (!name) return true;
  
  const nameLower = name.toLowerCase().trim();
  
  // Check against invalid names list
  for (const invalid of INVALID_NAMES) {
    if (nameLower === invalid.toLowerCase()) {
      return true;
    }
  }
  
  // Check patterns
  const invalidPatterns = [
    /^(North|South|East|West)\s+(Korea|America|Africa|Carolina|Dakota|Macedonia|Timor|Bank|Germany)$/i,
    /^(United\s+)?(States|Kingdom|Nations|Arab\s+Emirates)$/i,
    /^New\s+(Zealand|York|Jersey|Hampshire|Mexico|Delhi|Orleans)$/i,
    /^(State|Federal|Government|Department)\s+of/i,
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if company is a public company
 */
function isPublicCompany(name, description) {
  if (!name) return false;
  
  // Check if invalid name first
  if (isInvalidName(name)) {
    return true; // Treat invalid names as public (to filter them out)
  }
  
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

/**
 * Check if company is a mature startup
 */
function isMatureStartup(name, description, fundingStage) {
  if (!name) return false;
  
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
  
  // Check for late-stage keywords in description
  if (description) {
    const descLower = description.toLowerCase();
    
    // Check for late-stage funding indicators
    for (const keyword of LATE_STAGE_KEYWORDS) {
      if (descLower.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    // Check for high valuation mentions
    const valuationPatterns = [
      /\$(\d+\.?\d*)\s*(billion|b)/i,
      /valued\s+at\s+\$(\d+)/i,
      /valuation\s+of\s+\$(\d+)/i,
      /unicorn/i,
      /decacorn/i
    ];
    
    for (const pattern of valuationPatterns) {
      const match = descLower.match(pattern);
      if (match) {
        // If valuation is $100M+ or mentions unicorn, it's likely mature
        const value = parseFloat(match[1] || match[2] || '0');
        const unit = match[2] || match[3] || '';
        if (unit.toLowerCase().includes('billion') || value >= 100) {
          return true;
        }
      }
    }
    
    // Check for Series D+ funding
    const seriesPattern = /series\s+([d-z])/i;
    const seriesMatch = descLower.match(seriesPattern);
    if (seriesMatch) {
      const series = seriesMatch[1].toLowerCase();
      if (series >= 'd') {
        return true;
      }
    }
    
    // Check for old founding dates (before 2015 = likely mature)
    const foundingPattern = /(?:founded|established|since)\s+(?:in\s+)?(19\d{2}|20[01][0-4])/i;
    if (foundingPattern.test(descLower)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if company is closed or failed
 */
function isClosedOrFailed(name, description) {
  if (!name) return false;
  
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

/**
 * Check if company should be filtered out
 * Returns { shouldFilter: boolean, reason: string }
 */
function shouldFilterCompany(name, description, fundingStage) {
  if (isPublicCompany(name, description)) {
    return { shouldFilter: true, reason: 'Public company' };
  }
  
  if (isMatureStartup(name, description, fundingStage)) {
    return { shouldFilter: true, reason: 'Mature startup' };
  }
  
  if (isClosedOrFailed(name, description)) {
    return { shouldFilter: true, reason: 'Closed/Failed' };
  }
  
  return { shouldFilter: false, reason: null };
}

module.exports = {
  isInvalidName,
  isPublicCompany,
  isMatureStartup,
  isClosedOrFailed,
  shouldFilterCompany,
  PUBLIC_COMPANIES,
  MATURE_STARTUPS,
  CLOSED_FAILED_COMPANIES,
  INVALID_NAMES
};

