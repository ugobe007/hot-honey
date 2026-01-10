#!/usr/bin/env node
/**
 * INVESTOR WEBSITE ENRICHMENT
 * ===========================
 * Scrapes investor/VC firm websites to get:
 * - Firm description (first 1-2 sentences from homepage)
 * - Investment thesis
 * - Notable portfolio companies
 * 
 * Uses simple fetch + regex (no Playwright needed for most sites)
 * Falls back to known firm descriptions for top VCs
 * 
 * Run: node enrich-investor-websites.js
 * Run limited: node enrich-investor-websites.js --limit 50
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Known firm descriptions (high-quality, manually curated)
const KNOWN_FIRM_DESCRIPTIONS = {
  'sequoia': {
    bio: 'Sequoia Capital is a legendary venture capital firm that has backed companies like Apple, Google, Airbnb, and Stripe. They partner with founders from idea to IPO and beyond.',
    thesis: 'We help the daring build legendary companies from idea to IPO and beyond.'
  },
  'andreessen horowitz': {
    bio: 'Andreessen Horowitz (a16z) is a venture capital firm backing bold entrepreneurs building the future through technology. Founded by Marc Andreessen and Ben Horowitz.',
    thesis: 'Software is eating the world. We back founders building category-defining companies.'
  },
  'a16z': {
    bio: 'Andreessen Horowitz (a16z) is a venture capital firm backing bold entrepreneurs building the future through technology. Founded by Marc Andreessen and Ben Horowitz.',
    thesis: 'Software is eating the world. We back founders building category-defining companies.'
  },
  'benchmark': {
    bio: 'Benchmark is an early-stage venture capital firm focused on consumer and enterprise technology. Known for investments in eBay, Twitter, Uber, and Instagram.',
    thesis: 'We are founders first. Small fund, big conviction, one partner per deal.'
  },
  'greylock': {
    bio: 'Greylock Partners is a leading venture capital firm focused on consumer and enterprise software. Investors in LinkedIn, Facebook, Airbnb, and Discord.',
    thesis: 'We partner with entrepreneurs to build iconic, enduring companies.'
  },
  'accel': {
    bio: 'Accel is a global venture capital firm that partners with exceptional founders from seed through growth. Backed Facebook, Slack, Spotify, and Dropbox.',
    thesis: 'We partner with exceptional founders at every stage to build iconic global businesses.'
  },
  'y combinator': {
    bio: 'Y Combinator is the world\'s most successful startup accelerator. Alumni include Airbnb, Stripe, DoorDash, Coinbase, and Reddit.',
    thesis: 'Make something people want. We fund startups twice a year and provide seed funding, advice, and connections.'
  },
  'yc': {
    bio: 'Y Combinator is the world\'s most successful startup accelerator. Alumni include Airbnb, Stripe, DoorDash, Coinbase, and Reddit.',
    thesis: 'Make something people want. We fund startups twice a year and provide seed funding, advice, and connections.'
  },
  'first round': {
    bio: 'First Round Capital is a seed-stage venture firm focused on building a vibrant community of technology entrepreneurs. Backed Uber, Square, and Notion.',
    thesis: 'We\'re seed investors who love working with technical founders building transformative companies.'
  },
  'lightspeed': {
    bio: 'Lightspeed Venture Partners is a global VC firm with over $18B under management. Invested in Snap, Affirm, Mulesoft, and AppDynamics.',
    thesis: 'We partner with exceptional entrepreneurs to build market-leading companies.'
  },
  'bessemer': {
    bio: 'Bessemer Venture Partners is the world\'s oldest venture capital firm, backing cloud and SaaS companies like Shopify, Twilio, and LinkedIn.',
    thesis: 'We identify visionary founders building breakthrough companies in cloud, consumer, and healthcare.'
  },
  'founders fund': {
    bio: 'Founders Fund is a San Francisco-based venture capital firm founded by Peter Thiel. Known for bold bets on SpaceX, Palantir, and Airbnb.',
    thesis: 'We wanted flying cars, instead we got 140 characters. We fund transformational companies.'
  },
  'khosla ventures': {
    bio: 'Khosla Ventures funds transformative technology companies at seed and early stages. Founded by Sun Microsystems co-founder Vinod Khosla.',
    thesis: 'We assist entrepreneurs to build impactful new energy and technology companies.'
  },
  'nea': {
    bio: 'New Enterprise Associates (NEA) is one of the largest venture capital firms in the world with $25B+ under management across technology and healthcare.',
    thesis: 'We partner with visionary entrepreneurs to build transformational companies.'
  },
  // Top Angel Investors (from 2025 active list)
  'naval ravikant': {
    bio: 'Naval Ravikant is an entrepreneur and investor, co-founder and CEO of AngelList. He has invested in over 200 companies including Uber, Twitter, FourSquare, and has recorded over 70 successful exits.',
    thesis: 'Invest in exceptional founders building category-defining companies.'
  },
  'mark cuban': {
    bio: 'Mark Cuban is an American entrepreneur, angel investor, and owner of the NBA Dallas Mavericks. Known for his role on Shark Tank, he has invested in 254+ companies including Relativity Space, Yuga Labs, and Metromile.',
    thesis: 'Invest in passionate founders solving real problems with scalable solutions.'
  },
  'fabrice grinda': {
    bio: 'Fabrice Grinda is a New York-based French entrepreneur and super angel investor. He runs FJ Labs, a startup studio and venture fund, and has invested in 640+ startups with 83 successful exits including Airbnb, Uber, and Palantir.',
    thesis: 'Focus on marketplaces that connect buyers to sellers, analyzing 100 companies weekly.'
  },
  'ron conway': {
    bio: 'Ron Conway (also known as Ronald Conway) is a legendary Silicon Valley angel investor and advisor. He has invested in over 105 companies including Google, PayPal, Facebook, and has achieved 60 successful exits with a 57% exit rate.',
    thesis: 'Support exceptional founders from the earliest stages through growth.'
  },
  'ronald conway': {
    bio: 'Ron Conway (also known as Ronald Conway) is a legendary Silicon Valley angel investor and advisor. He has invested in over 105 companies including Google, PayPal, Facebook, and has achieved 60 successful exits with a 57% exit rate.',
    thesis: 'Support exceptional founders from the earliest stages through growth.'
  },
  'paul buchheit': {
    bio: 'Paul Buchheit is the creator of Gmail and co-founder of FriendFeed (acquired by Facebook). He co-founded Y Combinator and has invested in 172+ companies with 70 successful exits, focusing on media, IT, health, and enterprise software.',
    thesis: 'Back exceptional founders building products that matter.'
  },
  'elad gil': {
    bio: 'Elad Gil is a prominent entrepreneur, angel investor, and advisor. Former VP of Corporate Strategy at Twitter, co-founder of Color Genomics and Mixer Labs. He has invested in 219+ companies including Airbnb, Pinterest, Square, and Stripe.',
    thesis: 'Invest in category-defining companies with exceptional founders.'
  },
  'scott belsky': {
    bio: 'Scott Belsky is Adobe\'s Chief Product Officer and co-founder of Behance (acquired by Adobe). He has invested in 220+ companies including Pinterest, Uber, and Reddit, with 43 successful exits.',
    thesis: 'Support creative entrepreneurs building products that empower communities.'
  },
  'alexis ohanian': {
    bio: 'Alexis Ohanian is the co-founder of Reddit and an early-stage venture capitalist at Initialized Capital. He has invested in 166+ companies with 51 successful exits, managing investments over $500 million.',
    thesis: 'Build companies that matter and invest in exceptional founders.'
  },
  'sam altman': {
    bio: 'Sam Altman is the CEO of OpenAI and former president of Y Combinator. He has invested in 119+ companies including Retro Biosciences, Helion Energy, and Neuralink, with 25 successful exits.',
    thesis: 'Support transformative technology companies that will shape the future.'
  },
  'peter thiel': {
    bio: 'Peter Thiel is a German-American entrepreneur, venture capitalist, and co-founder of PayPal and Palantir. He has invested in 122+ companies including Facebook, SpaceX, and has achieved 22 successful exits.',
    thesis: 'Invest in companies that create new categories and transform industries.'
  },
  'reid hoffman': {
    bio: 'Reid Hoffman is the co-founder of LinkedIn and a partner at Greylock Partners. He has invested in 95+ companies including Airbnb, Facebook, and has achieved 37 successful exits with a 39% exit rate.',
    thesis: 'Partner with exceptional entrepreneurs to build iconic, enduring companies.'
  },
  'esther dyson': {
    bio: 'Esther Dyson is a prominent angel investor and entrepreneur focused on healthcare, space, and technology. She has invested in 122+ companies including Openwater, Brightmail, and Swvl, with 30 successful exits.',
    thesis: 'Invest in companies solving important problems in healthcare, space, and technology.'
  },
  'edward lando': {
    bio: 'Edward Lando is an accomplished entrepreneur and founder of Pareto Holdings, an early-stage investment firm. He has invested in 522+ companies across fintech, healthcare, and consumer goods, with 56 successful exits.',
    thesis: 'Focus on team, market opportunity, and product when evaluating early-stage startups.'
  },
  'kunal shah': {
    bio: 'Kunal Shah is an Indian entrepreneur, angel investor, and founder/CEO of CRED. Co-founder of Freecharge (acquired by Snapdeal for $400M). He has made 289+ investments in startups including Razorpay, Unacademy, and Zetwerk.',
    thesis: 'Invest in fintech and technology startups with strong unit economics and growth potential.'
  },
  'general catalyst': {
    bio: 'General Catalyst is a venture capital firm investing across seed to growth stages. Backed Stripe, Airbnb, Snap, and Warby Parker.',
    thesis: 'We invest in powerful, positive change that endures across technology, healthcare, and fintech.'
  },
  'tiger global': {
    bio: 'Tiger Global Management is a global investment firm with $95B+ under management, known for rapid due diligence and large growth-stage checks.',
    thesis: 'We back the best companies with speed and conviction at growth stage.'
  },
  'insight partners': {
    bio: 'Insight Partners is a global software investor with $90B+ under management. Focused on growth-stage software and internet companies.',
    thesis: 'We scale software companies faster through our ScaleUp methodology and operational expertise.'
  },
  'kleiner perkins': {
    bio: 'Kleiner Perkins is a venture capital firm that has funded some of the most transformative companies including Amazon, Google, and Genentech.',
    thesis: 'We back wild ideas that generate huge impact across consumer, enterprise, and life sciences.'
  },
  'google ventures': {
    bio: 'GV (formerly Google Ventures) is the venture capital arm of Alphabet. Invested in Uber, Slack, and Stripe.',
    thesis: 'We provide venture capital funding to bold new companies in AI, life science, and enterprise.'
  },
  'gv': {
    bio: 'GV (formerly Google Ventures) is the venture capital arm of Alphabet. Invested in Uber, Slack, and Stripe.',
    thesis: 'We provide venture capital funding to bold new companies in AI, life science, and enterprise.'
  },
  'angellist': {
    bio: 'AngelList is the platform that powers the startup ecosystem. From fundraising to hiring to equity management, we help startups and investors succeed.',
    thesis: 'We democratize startup investing and help founders build their companies with less friction.'
  },
  'techstars': {
    bio: 'Techstars is a global accelerator network that has invested in over 3,500 companies including Sphero, SendGrid, and DigitalOcean.',
    thesis: 'We accelerate entrepreneurs and startups through mentorship-driven programs worldwide.'
  },
  '500 global': {
    bio: '500 Global (formerly 500 Startups) is one of the most active venture capital firms globally, having invested in 2,700+ companies across 80+ countries.',
    thesis: 'We discover and back founders building fast-growing technology companies worldwide.'
  },
  '500 startups': {
    bio: '500 Global (formerly 500 Startups) is one of the most active venture capital firms globally, having invested in 2,700+ companies across 80+ countries.',
    thesis: 'We discover and back founders building fast-growing technology companies worldwide.'
  },
  'union square ventures': {
    bio: 'Union Square Ventures (USV) is a thesis-driven VC firm focused on large networks and decentralized systems. Backed Twitter, Tumblr, and Coinbase.',
    thesis: 'We back trusted brands that broaden access to knowledge, capital, and well-being.'
  },
  'usv': {
    bio: 'Union Square Ventures (USV) is a thesis-driven VC firm focused on large networks and decentralized systems. Backed Twitter, Tumblr, and Coinbase.',
    thesis: 'We back trusted brands that broaden access to knowledge, capital, and well-being.'
  },
  // Angel Investor Groups (from startupsavant.com)
  'tca venture group': {
    bio: 'TCA Venture Group (formerly Tech Coast Angels) is one of the most popular angel investment groups, with over 400 accredited investors across four networks. Based in Southern California, investing in medtech, SaaS, IoT, and more.',
    thesis: 'Provide startup capital, mentoring, connections, and business assistance for entrepreneurs.'
  },
  'tech coast angels': {
    bio: 'TCA Venture Group (formerly Tech Coast Angels) is one of the most popular angel investment groups, with over 400 accredited investors across four networks. Based in Southern California, investing in medtech, SaaS, IoT, and more.',
    thesis: 'Provide startup capital, mentoring, connections, and business assistance for entrepreneurs.'
  },
  'golden seeds': {
    bio: 'Golden Seeds is an angel investment firm providing startup funding exclusively for women-founded and led startups. With over 340 members, focusing on consumer products, tech, and software industries.',
    thesis: 'Invest in and support women entrepreneurs building high-growth companies.'
  },
  'pasadena angels': {
    bio: 'Pasadena Angels is made up of over 100 angel investors providing up to $1.5 million in early-stage and seed financing. Based in Altadena, California, focusing on high-growth, scalable startups.',
    thesis: 'Support California-based startups with capital and mentorship.'
  },
  'alliance of angels': {
    bio: 'Alliance of Angels is an investment group based in Seattle, Washington, with over 140 angel investors. The group invests over $10 million in more than 20 startups annually while providing valuable mentorship services.',
    thesis: 'Support early-stage startups in the Northwest with capital and expertise.'
  },
  'new york angels': {
    bio: 'NY Angels is an angel investment group composed of over 140 angels with backgrounds as entrepreneurs, CEOs, VC, and business leaders. Has special interest groups in fintech, blockchain, and life sciences.',
    thesis: 'Invest in early-stage startups in the Northeast with a focus on technology.'
  },
  'band of angels': {
    bio: 'Band of Angels was the first high-tech angel investment group in the US, based in Menlo Park, California. Made up of over 165 angels who are current or former high-tech executives, investing in over 20 startups annually.',
    thesis: 'Support cutting-edge technology and life science startups with capital and expertise.'
  },
  'hyde park angels': {
    bio: 'Hyde Park Angels is a Chicago-based angel group composed of more than 100 investors. Funding is available for midwest startups in seed and early stages within industrial technology, IT, and financial services.',
    thesis: 'Support seed and early-stage startups in the Midwest with capital and mentorship.'
  },
  'sand hill angels': {
    bio: 'Sand Hill Angels is a Silicon Valley angel investment group made up of angel investors with backgrounds in tech entrepreneurship. Primarily invests in startups with products in the alpha/beta stage.',
    thesis: 'Invest in startups solving well-defined problems with products in development.'
  },
  'new world angels': {
    bio: 'New World Angels has provided over $20 million to early-stage companies in Florida since 2014. Has helped launch a wide range of Florida companies including Aegle Therapeutics, Admiral, and SwitchBoard.',
    thesis: 'Support biotech and tech startups in Florida with capital and expertise.'
  },
  'queen city angels': {
    bio: 'Queen City Angels has invested over $110 million across 237 different investments over the past 21 years. Owns the QCA Education Foundation, a nonprofit that trains and mentors founders.',
    thesis: 'Support tech, advanced materials, and life sciences startups with capital and education.'
  },
  'park city angels': {
    bio: 'Park City Angels is an angel investing group comprised of 100+ accredited investors who live in and around Park City, UT. Has a preference for Utah-based startups but considers applications from across the US.',
    thesis: 'Support healthcare and tech startups, with preference for Utah-based companies.'
  },
  'bluetree allied angels': {
    bio: 'BlueTree Allied Angels is an angel investor group that focuses on funding startup companies in Pennsylvania. Founded in 2003, with investments in companies like ALung Technologies, 4moms, and ApartmentJet.',
    thesis: 'Support high-growth startups in Pennsylvania seeking $200K to $3M in funding.'
  },
  'launchpad venture group': {
    bio: 'Launchpad Venture Group has provided over $125 million in funding to over 150 startup companies since 2001. Primarily focuses on science and tech startups located in Boston or the surrounding area.',
    thesis: 'Support science and technology startups in the Boston area with capital and expertise.'
  },
  'spark capital': {
    bio: 'Spark Capital is a venture firm that partners with exceptional founders. Invested in Twitter, Slack, Tumblr, and Wayfair.',
    thesis: 'We partner with founders who see potential others miss.'
  },
  'felicis ventures': {
    bio: 'Felicis Ventures backs iconic companies at seed and Series A. Portfolio includes Shopify, Notion, Plaid, and Credit Karma.',
    thesis: 'We back founders with a unique insight about how to create massive value.'
  },
  'craft ventures': {
    bio: 'Craft Ventures is a seed and early-stage venture fund founded by David Sacks. Invested in SpaceX, Bird, and Sourcegraph.',
    thesis: 'We back exceptional founders building the next generation of enterprise and consumer products.'
  },
  'initialized capital': {
    bio: 'Initialized Capital is a seed-stage fund co-founded by Alexis Ohanian and Garry Tan. Backed Coinbase, Instacart, and Flexport.',
    thesis: 'We\'re founders backing founders at the earliest stages.'
  },
  'pear vc': {
    bio: 'Pear is a pre-seed and seed-stage VC firm partnering with exceptional founders. Backed DoorDash, Gusto, and Branch.',
    thesis: 'We partner with extraordinary founders before product-market fit.'
  },
  'boldstart ventures': {
    bio: 'Boldstart Ventures is a first-check investor in developer-first and enterprise startups. Backed Snyk, BigID, and Kustomer.',
    thesis: 'We write the first check for developer-first and enterprise software companies.'
  },
  'redpoint': {
    bio: 'Redpoint Ventures is an early and growth-stage venture firm. Backed Netflix, Snowflake, Stripe, and Twilio.',
    thesis: 'We partner with founders building industry-defining technology companies.'
  },
  'ivp': {
    bio: 'Institutional Venture Partners (IVP) is a growth-stage venture firm. Backed Twitter, Snap, Slack, and Discord.',
    thesis: 'We partner with the best growth-stage companies to help them become market leaders.'
  },
  'battery ventures': {
    bio: 'Battery Ventures is a global technology-focused investment firm. Invested in Coinbase, Glassdoor, and Groupon.',
    thesis: 'We invest in cutting-edge companies that are creating value through technology.'
  },
};

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;lt;/g, '<')
    .replace(/&amp;gt;/g, '>')
    .replace(/&amp;amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Check if text looks like a LinkedIn profile (skip these)
 */
function isLinkedInProfile(text) {
  if (!text) return false;
  const linkedInPatterns = [
    /Experience:\s*[^·]+·\s*Education:/i,
    /Education:\s*[^·]+·\s*Location:/i,
    /linkedin\.com\/in\//i,
    /View\s+(my\s+)?profile/i,
    /Connect\s+with\s+me/i
  ];
  return linkedInPatterns.some(pattern => pattern.test(text));
}

/**
 * Try to fetch and parse a firm's website for description
 */
async function scrapeWebsite(url) {
  if (!url) return null;
  
  // Skip LinkedIn URLs - they're personal profiles, not firm descriptions
  if (url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/')) {
    return null; // LinkedIn company pages might be OK, but personal profiles aren't
  }
  
  try {
    // Clean URL
    let cleanUrl = url;
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000); // Reduced to 5s for faster failures
    
    let response;
    try {
      response = await Promise.race([
        fetch(cleanUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 5000))
      ]);
      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      // Timeout or network error - silently fail
      return null;
    }
    
    if (!response || !response.ok) return null;
    
    // Also timeout the text() call
    const html = await Promise.race([
      response.text(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Read timeout')), 5000))
    ]).catch(() => null);
    
    if (!html) return null;
    
    // Extract meta description
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    
    if (metaMatch && metaMatch[1] && metaMatch[1].length > 30) {
      const desc = decodeHtmlEntities(metaMatch[1].trim());
      // Skip if it looks like a LinkedIn profile
      if (!isLinkedInProfile(desc)) {
        return desc;
      }
    }
    
    // Try og:description
    const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    
    if (ogMatch && ogMatch[1] && ogMatch[1].length > 30) {
      const desc = decodeHtmlEntities(ogMatch[1].trim());
      if (!isLinkedInProfile(desc)) {
        return desc;
      }
    }
    
    // Try first meaningful paragraph
    const pMatch = html.match(/<p[^>]*>([^<]{50,300})<\/p>/i);
    if (pMatch && pMatch[1]) {
      const desc = decodeHtmlEntities(pMatch[1].replace(/<[^>]+>/g, '').trim());
      if (!isLinkedInProfile(desc) && desc.length > 30) {
        return desc;
      }
    }
    
    return null;
  } catch (err) {
    // Silently fail for network errors
    return null;
  }
}

/**
 * Normalize firm description to consistent third-person format
 * Converts: "We are...", "At [Firm], we...", "Our firm..." → "[Firm] is..."
 */
function normalizeFirmDescription(rawDescription, firmName) {
  if (!rawDescription) return null;
  
  let normalized = rawDescription.trim();
  const firm = firmName || 'The firm';
  
  // Remove common first-person prefixes
  normalized = normalized.replace(/^(At|at)\s+[^,]+,?\s+we\s+/i, `${firm} `);
  normalized = normalized.replace(/^(Our firm|Our|We|We are|We're)\s+/i, `${firm} `);
  normalized = normalized.replace(/^We\s+think\s+like\s+founders,?\s+we\s+/i, `${firm} `);
  normalized = normalized.replace(/^We\s+([a-z])/i, (match, letter) => `${firm} ${letter}`);
  
  // Fix common patterns
  normalized = normalized.replace(/\bwe\b/gi, firm);
  normalized = normalized.replace(/\bour\b/gi, `${firm}'s`);
  normalized = normalized.replace(/\bus\b/gi, firm);
  
  // Ensure it starts with firm name or "The firm"
  if (!normalized.match(/^[A-Z]/)) {
    normalized = `${firm} ${normalized}`;
  }
  
  // Standardize structure: "[Firm] is a [type] that [focus]. [Notable investments]."
  // Try to extract key parts
  const isMatch = normalized.match(/is\s+(a|an)\s+([^.]+?)(?:\.|that|which)/i);
  if (isMatch) {
    // Already in good format
    return normalized;
  }
  
  // If description doesn't follow standard format, try to restructure
  // For now, just return cleaned version
  return normalized;
}

/**
 * Capitalize a lowercase name (e.g., "nzt.capital" -> "NZT Capital")
 */
function capitalizeName(name) {
  if (!name) return name;
  
  // If it's already capitalized, return as is
  if (/^[A-Z]/.test(name)) return name;
  
  // Handle domain-like names (e.g., "nzt.capital")
  if (/^[a-z]+\.[a-z]+/.test(name)) {
    return name.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }
  
  // Capitalize first letter of each word
  return name.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Clean titles/roles from names (Managing, Partner, Senior, Founding, etc.)
 */
function cleanNameFromTitles(name) {
  if (!name) return name;
  
  // Remove common titles/roles (case-insensitive)
  const titles = [
    'Managing', 'Partner', 'Senior', 'Founding', 'Executive', 'General', 
    'Emeritus', 'Special', 'Talent', 'Venture', 'MDVenture', 'Principal',
    'Associate', 'Administrator', 'Operations', 'Financial', 'Officer',
    'MDPrincipal', 'Senior Associate'
  ];
  
  // Remove common prefixes
  const prefixes = [
    'ai', 'heard of', 'ago', 'on', 'and', 'networks and', 'with', 'rom', 'first'
  ];
  
  let cleaned = name.trim();
  
  // Remove prefixes at the beginning
  for (const prefix of prefixes) {
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remove titles at the end
  for (const title of titles) {
    const regex = new RegExp(`\\s+${title}\\s*$`, 'i');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remove titles at the beginning
  for (const title of titles) {
    const regex = new RegExp(`^${title}\\s+`, 'i');
    cleaned = cleaned.replace(regex, '');
  }
  
  // Remove concatenated titles (like "Financial OfficerBrett" -> "Brett")
  for (const title of titles) {
    // Match "TitleName" pattern (no space, title followed by capital letter)
    const regex = new RegExp(`${title}([A-Z][a-z]+)`, 'i');
    cleaned = cleaned.replace(regex, '$1');
    // Match "NameTitle" pattern (no space, name followed by title)
    const regex2 = new RegExp(`([a-z]+)${title}`, 'i');
    cleaned = cleaned.replace(regex2, '$1');
  }
  
  // Remove multi-word concatenated titles (like "Financial OfficerBrett" or "Senior AssociateMaanasi")
  // But only if there's no space between title and name (concatenated)
  cleaned = cleaned.replace(/(Financial|Chief|Senior|Junior|Principal|Managing|General)\s*(Officer|Partner|Associate|Director|Manager)([A-Z][a-z]+)/gi, '$3');
  cleaned = cleaned.replace(/(Administrator|Operations|Venture)([A-Z][a-z]+)/gi, '$2');
  
  // Don't remove titles that are followed by a space and then a name (like "Officer Brett" -> keep "Brett")
  // The beginning title removal above should handle "Officer Brett" -> "Brett"
  
  // Handle "OfName" pattern (like "OfHummingbird" -> "Hummingbird")
  cleaned = cleaned.replace(/Of([A-Z][a-z]+)/g, '$1');
  
  // Handle complex concatenated patterns (like "EzrattySenior AssociateMaanasi" -> "Maanasi")
  // Find the last capitalized word that looks like a name
  const words = cleaned.split(/\s+/);
  if (words.length > 1) {
    // If we have multiple words and the last one looks like a title concatenated with a name
    const lastWord = words[words.length - 1];
    const nameMatch = lastWord.match(/(Senior|Associate|Partner|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture|Operating)([A-Z][a-z]+)/i);
    if (nameMatch) {
      // Replace the last word with just the name part
      words[words.length - 1] = nameMatch[2];
      cleaned = words.join(' ');
    }
    
    // Handle complex patterns like "ResidenceAndrew JeffersonOperating"
    // Extract name parts that are concatenated
    const complexPattern = cleaned.match(/([A-Z][a-z]+)([A-Z][a-z]+)(Operating|Senior|Associate|Partner|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture)/i);
    if (complexPattern) {
      // Extract the name parts
      cleaned = `${complexPattern[1]} ${complexPattern[2]}`;
    }
    
    // If first word looks like garbage (ends with title-like word), remove it
    // But only if it's a single word (not "Officer Brett" where "Officer" should be removed but "Brett" kept)
    const firstWord = words[0];
    if (words.length > 2 && firstWord.match(/(Senior|Associate|Partner|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture|Financial|Chief|Operating|Residence)$/i)) {
      // First word is likely garbage, remove it (but only if we have 3+ words total)
      cleaned = words.slice(1).join(' ');
    } else if (words.length === 2 && firstWord.match(/^(Senior|Associate|Partner|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture|Financial|Chief|Operating|Residence)$/i)) {
      // Two words where first is a title - remove the title, keep the name
      cleaned = words[1];
    }
  }
  
  // Handle very complex concatenated names like "MDPrincipalHui ChengPrincipalKevin Deng"
  // This is too complex, skip it
  if (cleaned.match(/[A-Z][a-z]+(Principal|Senior|Associate|Partner|General|Managing|Officer|Director|Administrator|Operations|Venture)[A-Z][a-z]+(Principal|Senior|Associate|Partner|General|Managing|Officer|Director|Administrator|Operations|Venture)[A-Z]/)) {
    // Too complex, return null to skip
    return null;
  }
  
  // Handle single-word concatenated patterns (like "EzrattySenior" -> extract the name part)
  // Re-split cleaned in case it was modified
  const currentWords = cleaned.split(/\s+/);
  if (currentWords.length === 1) {
    const singleWord = currentWords[0];
    // Try to extract name from patterns like "WordTitleName" or "TitleName"
    const extractMatch = singleWord.match(/(?:[A-Z][a-z]+)?(Senior|Associate|Partner|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture|Financial|Chief)([A-Z][a-z]+)/i);
    if (extractMatch && extractMatch[2]) {
      cleaned = extractMatch[2];
    }
  }
  
  // Handle cases where we have concatenated words that should be split
  // Like "ResearchCaitlin Pintavorn" -> "Caitlin Pintavorn"
  // But preserve "Mc" names like "McLain", "McDonald", etc.
  // Split on capital letters within words, but not after "Mc"
  cleaned = cleaned.replace(/([a-z])([A-Z][a-z]+)/g, (match, p1, p2) => {
    // Don't split if the second part starts with "Mc" (like "McLain")
    if (p2.startsWith('Mc')) {
      return match; // Keep as is
    }
    return p1 + ' ' + p2;
  });
  
  // Handle patterns like "InvestingAbout Our" -> should be skipped (garbage)
  // But first check if it's actually garbage
  if (isGarbageName(cleaned)) {
    return null;
  }
  
  // Handle prefix words that should be removed (like "Research" before a name)
  // But preserve the full name after the prefix
  const prefixWords = ['Research', 'Officer', 'Financial', 'Chief', 'Administrator', 'Operations', 'Assistant', 'Of'];
  for (const prefix of prefixWords) {
    // Match "Prefix FirstName LastName" and keep "FirstName LastName"
    const regex = new RegExp(`^${prefix}\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+)`, 'i');
    const match = cleaned.match(regex);
    if (match) {
      cleaned = match[1]; // Keep the full name
      break; // Only apply once
    }
    // Fallback: just remove prefix if followed by single capitalized word
    const regex2 = new RegExp(`^${prefix}\\s+([A-Z][a-z]+)`, 'i');
    cleaned = cleaned.replace(regex2, '$1');
  }
  
  // Handle "of ResearchAlex Brussell" -> "Alex Brussell" (concatenated, before splitting)
  // Match "of Research" followed by concatenated name
  const ofResearchConcatenated = cleaned.match(/of\s+Research([A-Z][a-z]+)([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (ofResearchConcatenated) {
    cleaned = ofResearchConcatenated[2]; // Extract the name part
  }
  
  // Handle "of ResearchAlex Brussell" -> "Alex Brussell" (after potential splitting)
  const ofResearchPattern = cleaned.match(/of\s+Research([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (ofResearchPattern) {
    cleaned = ofResearchPattern[1];
  }
  
  // Handle "of Research Alex Brussell" (after splitting) -> "Alex Brussell"
  const ofResearchSplitPattern = cleaned.match(/of\s+Research\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (ofResearchSplitPattern) {
    cleaned = ofResearchSplitPattern[1];
  }
  
  // Handle "ai Antoine Moyroud" -> "Antoine Moyroud" (concatenated, before splitting)
  const aiConcatenated = cleaned.match(/^ai([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (aiConcatenated) {
    cleaned = aiConcatenated[1];
  }
  
  // Handle "ai Antoine Moyroud" -> "Antoine Moyroud" (with space)
  const aiPrefixPattern = cleaned.match(/^ai\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (aiPrefixPattern) {
    cleaned = aiPrefixPattern[1];
  }
  
  // Handle "SeawellVenture PartnerAlex Sharata" -> "Alex Sharata"
  const venturePartnerPattern = cleaned.match(/([A-Z][a-z]+Venture|Venture)\s*Partner([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (venturePartnerPattern) {
    cleaned = venturePartnerPattern[2];
  }
  
  // Remove duplicate consecutive words (like "Everest Systems Everest" -> "Everest Systems")
  const wordsForDedup = cleaned.split(/\s+/);
  const uniqueWords = [];
  for (let i = 0; i < wordsForDedup.length; i++) {
    // Skip if this word is the same as the previous one (case-insensitive)
    if (i === 0 || wordsForDedup[i].toLowerCase() !== wordsForDedup[i-1].toLowerCase()) {
      uniqueWords.push(wordsForDedup[i]);
    }
  }
  cleaned = uniqueWords.join(' ');
  
  // Clean up multiple spaces again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Final check: If we have what looks like a first+last name, make sure we keep both
  const finalWords = cleaned.split(/\s+/);
  if (finalWords.length >= 2) {
    // Check if first word is a valid first name (2+ chars, capitalized)
    const firstWord = finalWords[0];
    const secondWord = finalWords[1];
    if (firstWord.length >= 2 && /^[A-Z]/.test(firstWord) && 
        secondWord.length >= 2 && /^[A-Z]/.test(secondWord) &&
        !firstWord.match(/^(Senior|Associate|Partner|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture|Financial|Chief|Manager|Enablement)$/i)) {
      // Looks like a valid first+last name, keep it as is
      return cleaned;
    }
  }
  
  // Remove "Partner" from beginning or middle
  cleaned = cleaned.replace(/^Partner\s+/i, '');
  cleaned = cleaned.replace(/\s+Partner\s+/i, ' ');
  
  // Handle Ph.D., M.D., etc. - keep these but clean up commas
  cleaned = cleaned.replace(/,\s*Ph\.?D\.?/i, '');
  cleaned = cleaned.replace(/,\s*M\.?D\.?/i, '');
  cleaned = cleaned.replace(/Ph\.?D\.?,/i, '');
  cleaned = cleaned.replace(/M\.?D\.?,/i, '');
  
  // Remove concatenated title words (like "HawkinsVenture" -> "Hawkins")
  // But be careful not to break valid names like "McDonald"
  cleaned = cleaned.replace(/([a-z]+)(Venture|Capital|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions)([A-Z][a-z]+)?/gi, (match, p1, p2, p3) => {
    // If there's a name after the title, return that
    if (p3) return p3;
    // Otherwise return the part before the title
    return p1;
  });
  
  // Remove title words that are concatenated at the end (like "HawkinsVenture")
  const titleEndings = ['Venture', 'Capital', 'Partners', 'Fund', 'Equity', 'Management'];
  for (const ending of titleEndings) {
    const regex = new RegExp(`([a-z]+)${ending}$`, 'i');
    cleaned = cleaned.replace(regex, '$1');
  }
  
  // Handle patterns like "Enablement ManagerRachel Ruggieri" -> "Rachel Ruggieri"
  // Match "TitleWordName" where Title is a known title word
  const titleWords = ['Manager', 'Officer', 'Director', 'Associate', 'Partner', 'Principal', 'Senior', 'Junior', 'Executive', 'Administrator', 'Operations', 'Enablement', 'Venture', 'Managing'];
  for (const title of titleWords) {
    // Match "Title Name" (with space) or "TitleName" (no space, title followed by capital letter)
    // Pattern 1: "Title Name" -> extract "Name"
    const regex1 = new RegExp(`^${title}\\s+([A-Z][a-z]+\\s+[A-Z][a-z]+)`, 'i');
    const match1 = cleaned.match(regex1);
    if (match1) {
      // Extract just the name part
      cleaned = match1[1];
      break;
    }
    // Pattern 2: "TitleName" (no space) -> extract "Name"
    const regex2 = new RegExp(`${title}([A-Z][a-z]+\\s+[A-Z][a-z]+)`, 'i');
    const match2 = cleaned.match(regex2);
    if (match2) {
      // Extract just the name part
      cleaned = match2[1];
      break;
    }
  }
  
  // Handle "Managing PartnerFred Ehrsam" -> "Fred Ehrsam"
  const managingPartnerPattern = cleaned.match(/Managing\s+Partner([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (managingPartnerPattern) {
    cleaned = managingPartnerPattern[1];
  }
  
  // Handle complex patterns like "McAdamsVenture PartnerDanielle Lay"
  // Extract the last name pattern (FirstName LastName) after title words
  const complexNamePattern = cleaned.match(/([A-Z][a-z]+(?:Venture|Capital|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions))?\s*(?:Partner|Senior|Associate|General|Managing|Principal|Officer|Director|Administrator|Operations|Venture|Manager)\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  if (complexNamePattern && complexNamePattern[2]) {
    // Extract the name part after the title
    cleaned = complexNamePattern[2];
  }
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Extract person name and firm from investor name
 * Handles formats like: "Name (Firm)", "Name at Firm", "Firm Name"
 */
function parseInvestorName(fullName) {
  if (!fullName) return { personName: null, firmName: null };
  
  // Early garbage check - skip obviously garbage names
  if (isGarbageName(fullName)) {
    // If it has parentheses, might be "Garbage (Firm)" - extract firm only
    const parenMatch = fullName.match(/^.+?\s*\(([^)]+)\)$/);
    if (parenMatch) {
      return {
        personName: null,
        firmName: parenMatch[1].trim()
      };
    }
    return { personName: null, firmName: null };
  }
  
  // Handle complex concatenated patterns BEFORE parsing parentheses
  let namePart = fullName;
  
  // First, try to split concatenated words to normalize the input
  // Focus on CAPITAL LETTER transitions - valid names start with capitals
  // "of ResearchAlex Brussell" -> "of Research Alex Brussell"
  // "ai Antoine Moyroud" -> "ai Antoine Moyroud" (already spaced)
  // But preserve "Mc" names and other special cases
  let normalizedPart = namePart.replace(/([a-z])([A-Z][a-z]+)/g, (match, p1, p2) => {
    if (p2.startsWith('Mc')) return match;
    // Don't split if it's a common word that can be lowercase (like "ai", "of")
    if (p1 === 'i' && p2 === 'Antoine') return 'i ' + p2; // "aiAntoine" -> "ai Antoine"
    return p1 + ' ' + p2;
  });
  
  // Also handle cases where we have "ResearchAlex" - split to "Research Alex"
  // This handles "ResearchAlex Brussell" -> "Research Alex Brussell"
  normalizedPart = normalizedPart.replace(/(Research|Partner|Senior|Managing|Operating)([A-Z][a-z]+)(\s+[A-Z][a-z]+\s*\(?)/g, (match, p1, p2, p3) => {
    // Split: "ResearchAlex Brussell" -> "Research Alex Brussell"
    return p1 + ' ' + p2 + p3;
  });
  
  // FOCUS ON CAPITAL LETTERS: Extract names that start with capital letters
  // Try normalized first (after splitting), then original
  const testParts = [normalizedPart, namePart];
  
  for (const testPart of testParts) {
    // "of Research Alex Brussell (Forerunnerventures)" -> extract "Alex Brussell"
    const ofResearchMatch = testPart.match(/of\s+Research\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(/i);
    if (ofResearchMatch) {
      namePart = ofResearchMatch[1] + testPart.substring(testPart.indexOf('('));
      break;
    }
    
    // "of ResearchAlex Brussell" (concatenated) -> extract "Alex Brussell"
    // Look for: "of Research" + CapitalName + CapitalName CapitalName
    const ofResearchConcatenated = testPart.match(/of\s+Research([A-Z][a-z]+)([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(/i);
    if (ofResearchConcatenated && ofResearchConcatenated[2]) {
      namePart = ofResearchConcatenated[2] + testPart.substring(testPart.indexOf('('));
      break;
    }
    
    // "ai Antoine Moyroud (Lsvp)" or "ai Bejul Somaia (Lsvp)" -> extract name
    const aiMatch = testPart.match(/^ai\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(/i);
    if (aiMatch) {
      namePart = aiMatch[1] + testPart.substring(testPart.indexOf('('));
      break;
    }
    
    // "aiAntoine Moyroud" (concatenated) -> extract "Antoine Moyroud"
    const aiConcatenated = testPart.match(/^ai([A-Z][a-z]+)([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(/i);
    if (aiConcatenated && aiConcatenated[2]) {
      namePart = aiConcatenated[2] + testPart.substring(testPart.indexOf('('));
      break;
    }
  }
  
  // "SeawellVenture PartnerAlex Sharata (Nea)" -> extract "Alex Sharata"
  const venturePartnerMatch = namePart.match(/([A-Z][a-z]+Venture|Venture)\s*Partner([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(/i);
  if (venturePartnerMatch) {
    namePart = venturePartnerMatch[2] + namePart.substring(namePart.indexOf('('));
  }
  
  // "Michelle WagnerOperating (Playground)" -> extract "Michelle Wagner"
  const operatingMatch = namePart.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)Operating\s*\(/i);
  if (operatingMatch) {
    namePart = operatingMatch[1] + namePart.substring(namePart.indexOf('('));
  }
  
  // "PartnerClaudia Fan MunceVenture (Nea)" -> extract "Claudia Fan Munce"
  const partnerNameVentureMatch = namePart.match(/Partner([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)Venture\s*\(/i);
  if (partnerNameVentureMatch) {
    namePart = partnerNameVentureMatch[1] + namePart.substring(namePart.indexOf('('));
  }
  
  // "PartnerName (Firm)" -> extract "Name"
  const partnerMatch = namePart.match(/Partner([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\(/i);
  if (partnerMatch) {
    namePart = partnerMatch[1] + namePart.substring(namePart.indexOf('('));
  }
  
  // Pattern: "Name (Firm)" or "Name (Firmname)"
  const parenMatch = namePart.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    let personName = cleanNameFromTitles(parenMatch[1].trim());
    let firmName = parenMatch[2].trim();
    
    // If person name is garbage after cleaning, skip it
    if (isGarbageName(personName) || !personName || personName.length < 2) {
      // Treat as firm name only
      return {
        personName: null,
        firmName: firmName
      };
    }
    
    // Make sure firm name doesn't include the person name
    // Handle cases like "Tilly McLain (Tilly McLain (Uncork Capital))" -> just "Uncork Capital"
    if (firmName.includes(personName)) {
      // Try to extract the actual firm name (usually the last part)
      const parts = firmName.split(/\s*\(/);
      firmName = parts[parts.length - 1].replace(/\)/g, '').trim();
    }
    
    return {
      personName: personName,
      firmName: firmName
    };
  }
  
  // Pattern: "Name at Firm" or "Name, Firm"
  const atMatch = fullName.match(/^(.+?)\s+(at|,)\s+(.+)$/i);
  if (atMatch) {
    const personName = cleanNameFromTitles(atMatch[1].trim());
    return {
      personName: personName,
      firmName: atMatch[3].trim()
    };
  }
  
  // Check if it looks like a person's name (has first + last name pattern)
  const nameParts = fullName.trim().split(/\s+/);
  
  // Check if it's clearly NOT a person name (firm-like patterns)
  const firmLikePatterns = [
    /^(AI|VC|PE|LP|GP|LLC|Inc|Corp|Capital|Ventures|Partners|Fund|Equity|Management|General|Atlantic)/i,
    /(Capital|Ventures|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions|Atlantic)$/i,
    /\s+(Capital|Ventures|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions|Atlantic)$/i,
    /^General\s+Atlantic$/i, // "General Atlantic" is a firm name
    /^General\s+[A-Z]/i // "General [Something]" is usually a firm
  ];
  
  const looksLikeFirm = firmLikePatterns.some(pattern => pattern.test(fullName));
  
  if (looksLikeFirm) {
    // Treat as firm name
    return {
      personName: null,
      firmName: fullName.trim()
    };
  }
  
  if (nameParts.length >= 2 && nameParts[0].length > 1 && nameParts[1].length > 1) {
    // Likely a person's name (has first and last name)
    return {
      personName: cleanNameFromTitles(fullName.trim()),
      firmName: null
    };
  }
  
  // If it's lowercase, try capitalizing it first
  if (/^[a-z]/.test(fullName.trim())) {
    const capitalized = capitalizeName(fullName.trim());
    // Check if capitalized version looks like a firm
    const looksLikeFirmAfterCap = firmLikePatterns.some(pattern => pattern.test(capitalized));
    if (looksLikeFirmAfterCap) {
      return {
        personName: null,
        firmName: capitalized
      };
    }
    // Otherwise treat as person name
    return {
      personName: cleanNameFromTitles(capitalized),
      firmName: null
    };
  }
  
  // Otherwise, treat as firm name
  return {
    personName: null,
    firmName: fullName.trim()
  };
}

/**
 * Check if a name looks like garbage/invalid
 */
function isGarbageName(name) {
  if (!name || name.length < 3) return true;
  
  const garbagePatterns = [
    /^(while|how|for|our|the|a|an|in|and|founded|billion|million|recent|new|chronic|service|professionals|of|with|rom|first|networks|on|ago|heard|ai|lessons|curate|powered|backed|alongside|residence|tactical|details|enablement|based|not|remain|investing|about|events|investors|who|were|run|this)\s+/i, // Starts with common/descriptive words
    /portfolio/i, // Contains "portfolio"
    /^[a-z]\s/, // Starts with lowercase letter + space (likely sentence fragment)
    /^(and|in|for|the|a|an|of|with|rom|first|networks|on|ago|heard|ai|lessons|curate|powered|backed|alongside|residence|tactical|details|enablement|based|not|remain|investing|about|events|investors|who|were|run|this)\s+[a-z]/i, // Starts with article/preposition + lowercase
    /^founded\s+/i, // Starts with "founded"
    /^and\s+/i, // Starts with "and"
    /^of\s+/i, // Starts with "of"
    /^on\s+private\s+equity/i, // "on private equity"
    /^with\s+participation\s+from/i, // "with participation from..."
    /^rom\s+/i, // Starts with "rom" (likely fragment)
    /^first\s+/i, // Starts with "first"
    /^networks\s+and$/i, // "Networks and" (sentence fragment)
    /^ago\s+/i, // Starts with "ago"
    /^ai\s+[a-z]/i, // Starts with "ai" + lowercase (likely fragment)
    /^lessons\s+for/i, // "lessons for"
    /^curate\s+content\s+for/i, // "curate content for"
    /^powered\s+/i, // "powered incident management"
    /^venture\s+fund$/i, // "venture fund" (too generic)
    /^backed\s+group$/i, // "backed group"
    /^alongside\s+its$/i, // "alongside its"
    /^residence/i, // "Residence..." (sentence fragment)
    /^tactical\s+advice\s+for/i, // "Tactical advice for"
    /^details\s+and\s+delegation$/i, // "Details and Delegation"
    /^enablement\s+manager/i, // "Enablement Manager..." (when standalone)
    /^based\s+/i, // "based venture capital"
    /^not\s+remain\s+as$/i, // "not remain as"
    /^investing\s+about\s+our$/i, // "InvestingAbout Our"
    /^investingabout/i, // "InvestingAbout" (concatenated)
    /^events\s+private\s+equity$/i, // "Events Private equity"
    /^investors\s+who\s+were$/i, // "Investors who were"
    /^run\s+this$/i, // "Run This"
    /^team\s+of\s+former$/i, // "team of former"
    /^and\s+joint\s+ventures$/i, // "and joint ventures"
    /^investing\s+network\s+for$/i, // "investing network for"
    /^new\s+investor/i, // "new investor"
    /^mercury\s+and\s+more$/i, // "Mercury and More"
    /^liu\s+view\s+profile$/i, // "Liu view profile"
    /^assistant\s+/i, // "Assistant Guy" (should extract just the name)
    /^re\s+former$/i, // "re former"
    /^are\s+built\s+by$/i, // "are built by"
    /^insights\s+webinar$/i, // "Insights Webinar"
    /^alongside\s+its\s+partners$/i, // "alongside its partners"
    /^bezos\s+playbook/i, // "Bezos PlaybookThe management"
    /^the\s+management$/i, // "The management"
    /^design/i, // "DesignVidhu..." (garbage)
    /^up\s+shares\s+where$/i, // "up shares where"
    /^senior\s+finance$/i, // "Senior Finance" (when standalone)
    /design.*finance$/i, // "Design...Finance" (garbage pattern)
    /.*senior\s+finance$/i, // "...Senior Finance" (garbage pattern)
    /^from\s+our$/i, // "from our"
    /^access\s+additional\s+capital$/i, // "access additional capital"
    /^legal\s+compliance\s+operations$/i, // "Legal Compliance Operations" (when standalone, it's a department, not a person)
    /^with\s+participation\s+from/i, // "with participation from"
  ];
  
  // KEY INSIGHT: Valid names (people and firms) typically start with CAPITAL LETTERS
  // Garbage entries often start with lowercase or have weird patterns
  const startsWithCapital = /^[A-Z]/.test(name);
  const hasValidCapitalStructure = /^[A-Z][a-zA-Z\s&'-]+/.test(name) || /^[a-z]+\.[a-z]+/.test(name);
  
  // If it matches garbage patterns, it's garbage
  const matchesGarbage = garbagePatterns.some(pattern => pattern.test(name));
  
  // If it matches garbage patterns AND doesn't start with capital (unless it's a valid domain), it's definitely garbage
  if (matchesGarbage) {
    if (!startsWithCapital && !/^[a-z]+\.[a-z]+/.test(name)) {
      return true; // Garbage pattern + lowercase start = definitely garbage
    }
    // Even if it starts with capital, if it matches garbage patterns, it's likely garbage
    return true;
  }
  
  // If it doesn't start with capital and isn't a domain, it's likely garbage
  if (!startsWithCapital && !/^[a-z]+\.[a-z]+/.test(name)) {
    return true;
  }
  
  return false;
}

/**
 * Generate a basic description from available data
 */
function generateDescriptionFromData(investor) {
  const fullName = (investor.name || '').trim();
  const firmFromDb = (investor.firm || '').trim();
  
  // Skip garbage names
  if (isGarbageName(fullName) && !firmFromDb) {
    return null;
  }
  
  // Skip very complex concatenated names (like "MDPrincipalHui ChengPrincipalKevin Deng")
  if (fullName.match(/[A-Z][a-z]+(Principal|Senior|Associate|Partner|General|Managing|Officer|Director|Administrator|Operations|Venture)[A-Z][a-z]+(Principal|Senior|Associate|Partner|General|Managing|Officer|Director|Administrator|Operations|Venture)[A-Z]/)) {
    return null;
  }
  
  // Parse name to extract person and firm
  let { personName, firmName: firmFromName } = parseInvestorName(fullName);
  
  // Prioritize firm from database, then from parsed name
  let firmName = firmFromDb || firmFromName;
  
  // If person name is garbage, skip generating description
  if (personName && isGarbageName(personName)) {
    return null;
  }
  
  // If firm name is garbage, skip generating description
  if (firmName && isGarbageName(firmName)) {
    return null;
  }
  
  // Capitalize lowercase names
  if (personName && /^[a-z]/.test(personName)) {
    personName = capitalizeName(personName);
  }
  if (firmName && /^[a-z]/.test(firmName)) {
    firmName = capitalizeName(firmName);
  }
  
  // Determine if this is an individual or firm
  // If we have a firm name and a person name that's different, it's an individual
  const isIndividual = personName && firmName && 
                       personName.toLowerCase() !== firmName.toLowerCase() &&
                       personName.length > 0;
  
  // Special case: If we only have a person name (no firm), check if it's actually a firm name
  // by looking at the database firm field
  if (!firmName && personName && investor.firm) {
    // We have a firm in the database, so this is an individual
    const dbFirm = investor.firm.trim();
    // Skip if firm name is too generic or looks like a type (e.g., "Angel", "VC")
    const genericFirmNames = ['angel', 'vc', 'vc firm', 'investor', 'capital', 'ventures', 'partners'];
    if (dbFirm && 
        dbFirm.toLowerCase() !== personName.toLowerCase() &&
        !genericFirmNames.includes(dbFirm.toLowerCase())) {
      return {
        bio: `${personName} is an investor at ${dbFirm}.`,
        normalized: `${personName} is an investor at ${dbFirm}.`,
        thesis: null
      };
    }
  }
  
  // Define firm-like patterns for checking
  const firmLikePatterns = [
    /^(AI|VC|PE|LP|GP|LLC|Inc|Corp|Capital|Ventures|Partners|Fund|Equity|Management)/i,
    /(Capital|Ventures|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions)$/i,
    /\s+(Capital|Ventures|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions)$/i
  ];
  
  // If we have a person name but no firm, check if we should skip or use DB firm
  if (personName && !firmName) {
    if (investor.firm) {
      // We have a firm in the database, use it
      const dbFirm = investor.firm.trim();
      // Skip if firm name is too generic or looks like a type (e.g., "Angel", "VC")
      const genericFirmNames = ['angel', 'vc', 'vc firm', 'investor', 'capital', 'ventures', 'partners'];
      if (dbFirm && 
          dbFirm.toLowerCase() !== personName.toLowerCase() &&
          !genericFirmNames.includes(dbFirm.toLowerCase())) {
        // Generate description with DB firm
        return {
          bio: `${personName} is an investor at ${dbFirm}.`,
          normalized: `${personName} is an investor at ${dbFirm}.`,
          thesis: null
        };
      }
    }
    // No firm in DB or name, and it's a person name (first + last pattern)
    // Check if it's clearly a person name (2+ words, both capitalized, not firm-like)
    const nameWords = personName.split(/\s+/);
    const isPersonName = nameWords.length >= 2 && 
                         nameWords.every(w => w.length >= 2 && /^[A-Z]/.test(w)) &&
                         !firmLikePatterns.some(pattern => pattern.test(personName));
    
    if (isPersonName) {
      // This is a person without firm info - skip generating description
      return null;
    }
  }
  
  // For display, use person name if individual, otherwise use firm name or full name
  let displayName;
  if (isIndividual) {
    displayName = personName;
  } else if (firmName) {
    displayName = firmName;
  } else {
    displayName = fullName;
  }
  
  if (!displayName || isGarbageName(displayName)) {
    return null;
  }
  
  // Early check: If displayName is clearly a person name (first + last) with no firm, skip
  const displayWords = displayName.split(/\s+/);
  const isDisplayNamePerson = displayWords.length >= 2 && 
                               displayWords.every(w => w.length >= 2 && /^[A-Z]/.test(w)) &&
                               !firmLikePatterns.some(pattern => pattern.test(displayName)) &&
                               !displayName.match(/(Capital|Ventures|Partners|Fund|Equity|Management|Infrastructure|Technology|Solutions)$/i) &&
                               !displayName.match(/^(AI|VC|PE|LP|GP|LLC|Inc|Corp)/i);
  
  if (isDisplayNamePerson && !firmName && !investor.firm) {
    // This is clearly a person name with no firm info - skip
    return null;
  }
  
  const parts = [];
  
  // Firm type
  const type = investor.type || 'investment firm';
  const typeMap = {
    'VC': 'venture capital firm',
    'Angel': 'angel investor',
    'Family Office': 'family office',
    'Corporate VC': 'corporate venture capital firm',
    'Accelerator': 'startup accelerator'
  };
  const firmType = typeMap[type] || type.toLowerCase() || 'investment firm';
  
  // For individuals, describe them differently
  if (isIndividual && firmName) {
    // Use clean person name and firm name (make sure firm name doesn't include person name)
    let cleanFirmName = firmName;
    // Remove person name from firm name if it somehow got included
    if (firmName.includes(personName)) {
      // Extract just the firm part (usually in parentheses or after comma)
      const parenMatch = firmName.match(/\(([^)]+)\)/);
      if (parenMatch) {
        cleanFirmName = parenMatch[1].trim();
      } else {
        // Try to extract firm name after person name
        const afterName = firmName.replace(new RegExp(`^${personName}\\s*[,\\(]?\\s*`, 'i'), '').trim();
        if (afterName && afterName.length > 2) {
          cleanFirmName = afterName;
        }
      }
    }
    parts.push(`${personName} is an investor at ${cleanFirmName}`);
  } else {
    // For firms, use the display name (which should be the firm name)
    parts.push(`${displayName} is a ${firmType}`);
  }
  
  // Add sectors if available
  if (investor.sectors && Array.isArray(investor.sectors) && investor.sectors.length > 0) {
    const sectors = investor.sectors.slice(0, 3).join(', ');
    parts.push(`focused on ${sectors}`);
  }
  
  // Add stage if available
  if (investor.stage && Array.isArray(investor.stage) && investor.stage.length > 0) {
    const stages = investor.stage.slice(0, 2).join(' and ');
    parts.push(`investing at ${stages} stage`);
  }
  
  const description = parts.join(' ') + '.';
  return {
    bio: description,
    normalized: description, // Generated descriptions are already normalized
    thesis: null
  };
}

/**
 * Get description for an investor
 */
async function getInvestorDescription(investor) {
  // Parse name to get firm name for matching
  const { personName, firmName: firmFromName } = parseInvestorName(investor.name || '');
  const firmName = (investor.firm || firmFromName || investor.name || '').trim();
  const firmNameForNormalization = firmName || 'The firm';
  
  // Check known firms first (use firm name for matching)
  for (const [key, data] of Object.entries(KNOWN_FIRM_DESCRIPTIONS)) {
    const investorFirmLower = firmName.toLowerCase();
    if (investorFirmLower.includes(key) || key.includes(investorFirmLower.replace(/\s+/g, ''))) {
      // Known firms already have normalized descriptions
      return {
        bio: data.bio,
        normalized: data.bio, // Known descriptions are already normalized
        thesis: data.thesis
      };
    }
  }
  
  // Try scraping website (try multiple URL sources in order, but skip LinkedIn personal profiles)
  const urlsToTry = [
    investor.url,
    investor.blog_url,
    investor.crunchbase_url
    // Skip linkedin_url for personal profiles - only use if it's a company page
  ].filter(Boolean);
  
  // Only try LinkedIn if it looks like a company page, not personal profile
  if (investor.linkedin_url && investor.linkedin_url.includes('/company/')) {
    urlsToTry.push(investor.linkedin_url);
  }
  
  // Skip website scraping if --no-scrape flag is set (faster, uses only known/generated descriptions)
  const skipScraping = process.argv.includes('--no-scrape') || process.argv.includes('--skip-scrape');
  
  if (!skipScraping) {
    // Try scraping websites with timeout per URL
    for (const urlToScrape of urlsToTry) {
      try {
        const scraped = await Promise.race([
          scrapeWebsite(urlToScrape),
          new Promise((resolve) => setTimeout(() => resolve(null), 8000)) // 8s timeout per URL
        ]);
        
        if (scraped && scraped.length > 30 && !isLinkedInProfile(scraped)) {
          const normalized = normalizeFirmDescription(scraped, firmNameForNormalization);
          return { 
            bio: scraped, // Raw scraped description
            normalized: normalized, // Normalized version
            thesis: null 
          };
        }
      } catch (err) {
        // Silently continue to next URL
        continue;
      }
    }
  }
  
  // Fallback: Generate description from available data
  const generated = generateDescriptionFromData(investor);
  if (generated) {
    return generated;
  }
  
  return null;
}

/**
 * Main enrichment function
 */
async function enrichInvestors(limit = 100) {
  console.log('🔍 INVESTOR WEBSITE ENRICHMENT');
  console.log('==============================\n');
  
  // Get investors with missing or short bios/descriptions
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, bio, investment_thesis, blog_url, url, investment_firm_description, firm_description_normalized, linkedin_url, crunchbase_url, sectors, stage, type')
    .or('bio.is.null,bio.eq.,investment_firm_description.is.null,firm_description_normalized.is.null,investment_thesis.is.null')
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching investors:', error);
    return;
  }
  
  console.log(`Found ${investors?.length || 0} investors needing enrichment\n`);
  
  let enriched = 0;
  let skipped = 0;
  
  for (let i = 0; i < (investors || []).length; i++) {
    const investor = investors[i];
    
    // Progress logging every 10 investors
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`\n[${i + 1}/${investors.length}] Processing investors...`);
    }
    
    // Log every investor for better visibility
    process.stdout.write(`\r  Processing: ${investor.name}${investor.firm ? ` @ ${investor.firm}` : ''}...`);
    
    // Skip if already has good descriptions (both raw and normalized)
    if (investor.bio && investor.bio.length > 50 && 
        investor.investment_firm_description && investor.investment_firm_description.length > 50 &&
        investor.firm_description_normalized && investor.firm_description_normalized.length > 50 &&
        investor.investment_thesis) {
      skipped++;
      continue;
    }
    
    // Skip garbage names
    if (isGarbageName(investor.name) && !investor.firm) {
      console.log(`⏭️  ${investor.name}: Skipped (garbage name)`);
      skipped++;
      continue;
    }
    
    // Add timeout for the entire getInvestorDescription call
    const description = await Promise.race([
      getInvestorDescription(investor),
      new Promise((resolve) => setTimeout(() => resolve(null), 15000)) // 15 second timeout per investor
    ]).catch(() => null); // Catch any errors and return null
    
    if (description) {
      const updates = {};
      
      // Update bio if missing or short
      if (description.bio && (!investor.bio || investor.bio.length < 30)) {
        updates.bio = description.bio;
      }
      
      // Update investment_firm_description (raw/authentic voice)
      if (description.bio && (!investor.investment_firm_description || investor.investment_firm_description.length < 30)) {
        updates.investment_firm_description = description.bio;
      }
      
      // Update firm_description_normalized (standardized third-person format)
      if (description.normalized && (!investor.firm_description_normalized || investor.firm_description_normalized.length < 30)) {
        updates.firm_description_normalized = description.normalized;
      }
      
      // Update investment thesis
      if (description.thesis && !investor.investment_thesis) {
        updates.investment_thesis = description.thesis;
      }
      
      // Update url if we have blog_url but no url
      if (investor.blog_url && !investor.url) {
        updates.url = investor.blog_url;
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('investors')
          .update(updates)
          .eq('id', investor.id);
        
        if (!updateError) {
          const updatePreview = updates.firm_description_normalized?.substring(0, 60) || 
                               updates.investment_firm_description?.substring(0, 60) || 
                               updates.bio?.substring(0, 60) || 
                               updates.investment_thesis?.substring(0, 60) || 
                               'Updated';
          console.log(`✅ ${investor.name}: ${updatePreview}...`);
          enriched++;
        } else {
          console.log(`❌ ${investor.name}: Update failed - ${updateError.message}`);
        }
      }
    } else {
      console.log(`⏭️  ${investor.name}: No description found`);
      skipped++;
    }
    
    // Small delay to be polite (skip delay on last item to speed up)
    if (i < (investors || []).length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  console.log(`\n📊 SUMMARY`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${investors?.length || 0}`);
}

// Parse args
const args = process.argv.slice(2);
let limit = 100;
const limitIndex = args.findIndex(a => a.startsWith('--limit'));
if (limitIndex !== -1) {
  const limitArg = args[limitIndex];
  if (limitArg.includes('=')) {
    limit = parseInt(limitArg.split('=')[1]) || 100;
  } else if (args[limitIndex + 1]) {
    limit = parseInt(args[limitIndex + 1]) || 100;
  }
}

enrichInvestors(limit);

