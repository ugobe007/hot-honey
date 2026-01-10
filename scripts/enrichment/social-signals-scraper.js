#!/usr/bin/env node
/**
 * SOCIAL SIGNALS INTELLIGENCE SYSTEM
 * ===================================
 * 
 * Scrapes social platforms to find what founders REALLY think about startups
 * when they're not pitching. This is the kind of edge VCs wish they had.
 * 
 * Platforms:
 * - Reddit (r/startups, r/Entrepreneur, etc.)
 * - Hacker News
 * - Twitter (via Getlate API - real-time tweets with engagement)
 * 
 * Signals tracked:
 * - Mentions & discussions
 * - Sentiment (praise, concern, interest, help)
 * - Founder reputation (helpful posts, experience, connections)
 * - Engagement metrics
 * 
 * Run: node scripts/enrichment/social-signals-scraper.js [limit]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables!');
  console.error('   Please ensure your .env file contains:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY');
  console.error('');
  console.error('   Current values:');
  console.error(`   - VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.error(`   - SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.error(`   - SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.error(`   - VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GETLATE API KEY - for Twitter scraping
const GETLATE_API_KEY = process.env.GETLATE_API_KEY || 'sk_096f15a9dc12b3fa1d05dc08e1ec84425c733d2cb3532888ce7f5addb692f2a9';

// SOCIAL PLATFORMS TO MONITOR
const PLATFORMS = {
  reddit: {
    subreddits: [
      'startups',
      'Entrepreneur',
      'SaaS',
      'smallbusiness',
      'venturecapital',
      'YCombinator',
      'TechStartups',
      'IMadeThis'
    ]
  },
  twitter: {
    hashtags: [
      'buildinpublic',
      'indiehacker',
      'startup',
      'ycombinator',
      'foundersjourney',
      'startuplife',
      'saas'
    ]
  },
  hackernews: {
    endpoints: [
      'https://hn.algolia.com/api/v1/search?query=startup&tags=story',
      'https://hn.algolia.com/api/v1/search?query=founder&tags=story',
      'https://hn.algolia.com/api/v1/search?query=YC&tags=story'
    ]
  },
  indiehackers: {
    sections: ['milestones', 'products', 'projects']
  }
};

// SENTIMENT PATTERNS
const SENTIMENT = {
  praise: [
    /amazing (product|startup|founder)/i,
    /impressive/i,
    /crushing it/i,
    /well done/i,
    /congratulations/i,
    /respect/i,
    /inspiring/i,
    /game[-\s]?changer/i,
    /love (this|what|how)/i,
    /brilliant/i
  ],
  concern: [
    /struggling/i,
    /concerned/i,
    /worried/i,
    /red flag/i,
    /be careful/i,
    /avoid/i,
    /scam/i,
    /overhyped/i
  ],
  interest: [
    /how did you/i,
    /what.*stack/i,
    /can you share/i,
    /would love to know/i,
    /curious about/i,
    /how are you/i,
    /advice on/i
  ],
  help: [
    /happy to help/i,
    /dm me/i,
    /reach out/i,
    /let me know/i,
    /can intro you/i,
    /know someone/i,
    /connect you/i
  ]
};

// FOUNDER REPUTATION SIGNALS
const REPUTATION_SIGNALS = {
  helpful: [
    /here'?s how/i,
    /i can help/i,
    /happy to share/i,
    /let me explain/i,
    /here are some tips/i
  ],
  experienced: [
    /when (i|we) raised/i,
    /in my experience/i,
    /i'?ve been through/i,
    /learned the hard way/i,
    /previously (built|founded|exited)/i
  ],
  connected: [
    /know (a|the) (vc|investor|founder)/i,
    /can intro/i,
    /let me connect you/i,
    /work with.*at/i
  ]
};

// Create social_signals table if it doesn't exist
async function createSocialSignalsTable() {
  // Check if table exists by trying to query it
  const { error: checkError } = await supabase
    .from('social_signals')
    .select('id')
    .limit(1);
  
  if (checkError && checkError.code === 'PGRST116') {
    // Table doesn't exist, create it
    console.log('📊 Creating social_signals table...');
    // Note: We'll need to run the SQL manually or via migration
    // Supabase JS client doesn't support CREATE TABLE directly
    console.log('⚠️  Please create the social_signals table manually with this SQL:');
    console.log(`
CREATE TABLE IF NOT EXISTS social_signals (
  id SERIAL PRIMARY KEY,
  startup_id INTEGER REFERENCES startup_uploads(id),
  startup_name TEXT,
  platform TEXT NOT NULL,
  source_url TEXT,
  author TEXT,
  content TEXT,
  sentiment TEXT,
  signal_type TEXT,
  reputation_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  collected_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_signals_startup ON social_signals(startup_id);
CREATE INDEX IF NOT EXISTS idx_social_signals_platform ON social_signals(platform);
CREATE INDEX IF NOT EXISTS idx_social_signals_sentiment ON social_signals(sentiment);
    `);
  }
}

// REDDIT SCRAPER
async function scrapeReddit(subreddit, startupName, startup) {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(startupName)}&sort=new&limit=100`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StartupResearch/1.0)'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        console.log(`  ⚠️  Rate limited on Reddit, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return [];
      }
      return [];
    }
    
    const data = await response.json();
    const signals = [];
    
    for (const post of data.data?.children || []) {
      const p = post.data;
      const content = `${p.title} ${p.selftext}`;
      
      // Validate it's actually about the startup (not a false positive)
      if (!isValidStartupMention(content, { name: startupName, description: startup.description, website: startup.website })) {
        continue;
      }
      
      // Analyze sentiment (on lowercased content)
      const contentLower = content.toLowerCase();
      let sentiment = 'neutral';
      for (const [type, patterns] of Object.entries(SENTIMENT)) {
        if (patterns.some(pattern => pattern.test(contentLower))) {
          sentiment = type;
          break;
        }
      }
      
      // Determine signal type
      let signalType = 'mention';
      if (sentiment === 'help') signalType = 'help_offered';
      else if (sentiment === 'interest') signalType = 'seeking_help';
      else if (sentiment === 'concern') signalType = 'criticism';
      else if (sentiment === 'praise') signalType = 'discussion';
      
      signals.push({
        platform: 'reddit',
        source_url: `https://reddit.com${p.permalink}`,
        author: p.author,
        content: (p.title || '').substring(0, 500), // Limit content length
        sentiment,
        signal_type: signalType,
        engagement_score: (p.score || 0) + (p.num_comments || 0),
        created_at: new Date(p.created_utc * 1000).toISOString()
      });
    }
    
    return signals;
  } catch (error) {
    console.error(`  ❌ Reddit error for r/${subreddit}:`, error.message);
    return [];
  }
}

// HACKER NEWS SCRAPER
async function scrapeHackerNews(startupName, startup) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(startupName)}&tags=story&hitsPerPage=100`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const signals = [];
    
    for (const hit of data.hits || []) {
      const content = `${hit.title} ${hit.story_text || ''}`;
      
      // Validate it's actually about the startup (not a false positive)
      if (!isValidStartupMention(content, { name: startupName, description: startup.description, website: startup.website })) {
        continue;
      }
      
      // Analyze sentiment (on lowercased content)
      const contentLower = content.toLowerCase();
      let sentiment = 'neutral';
      for (const [type, patterns] of Object.entries(SENTIMENT)) {
        if (patterns.some(pattern => pattern.test(contentLower))) {
          sentiment = type;
          break;
        }
      }
      
      let signalType = 'mention';
      if (sentiment === 'help') signalType = 'help_offered';
      else if (sentiment === 'interest') signalType = 'seeking_help';
      else if (sentiment === 'concern') signalType = 'criticism';
      else if (sentiment === 'praise') signalType = 'discussion';
      
      signals.push({
        platform: 'hackernews',
        source_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author,
        content: hit.title.substring(0, 500),
        sentiment,
        signal_type: signalType,
        engagement_score: (hit.points || 0) + (hit.num_comments || 0),
        created_at: new Date(hit.created_at).toISOString()
      });
    }
    
    return signals;
  } catch (error) {
    console.error('  ❌ HackerNews error:', error.message);
    return [];
  }
}

// TWITTER SCRAPER - Using Getlate API
async function scrapeTwitterGetlate(startupName, startup) {
  const signals = [];
  
  try {
    console.log(`  🐦 Searching Twitter via Getlate...`);
    
    // Search tweets using Getlate API (fallback to Nitter if unavailable)
    const url = `https://getlate.dev/api/v1/search/tweets?query=${encodeURIComponent(startupName)}&count=50`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GETLATE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        console.log(`  ⚠️  Getlate API endpoint changed or unavailable (404), skipping Twitter for now`);
      } else {
        console.error(`  ❌ Getlate error (${response.status}):`, errorText.substring(0, 200));
      }
      return []; // Skip Twitter if API is unavailable, continue with other platforms
    }
    
    const data = await response.json();
    
    // Handle different response formats
    const tweets = data.tweets || data.data || data.results || [];
    
    if (tweets.length === 0) {
      console.log(`  ℹ️  No tweets found`);
      return [];
    }
    
    // Process tweets
    for (const tweet of tweets) {
      const content = tweet.text || tweet.full_text || tweet.content || '';
      
      if (content.length < 10) continue;
      
      // Validate it's actually about the startup (not a false positive)
      if (!isValidStartupMention(content, { name: startupName, description: startup.description, website: startup.website })) {
        continue;
      }
      
      // Analyze sentiment (on lowercased content)
      const contentLower = content.toLowerCase();
      let sentiment = 'neutral';
      for (const [type, patterns] of Object.entries(SENTIMENT)) {
        if (patterns.some(pattern => pattern.test(contentLower))) {
          sentiment = type;
          break;
        }
      }
      
      // Determine signal type
      let signalType = 'mention';
      if (sentiment === 'help') signalType = 'help_offered';
      else if (sentiment === 'interest') signalType = 'seeking_help';
      else if (sentiment === 'concern') signalType = 'criticism';
      else if (sentiment === 'praise') signalType = 'discussion';
      
      // Extract engagement metrics
      const likes = tweet.favorite_count || tweet.likes || tweet.like_count || 0;
      const retweets = tweet.retweet_count || tweet.retweets || 0;
      const replies = tweet.reply_count || tweet.replies || 0;
      
      // Extract author info
      const author = tweet.user?.screen_name || 
                    tweet.user?.username || 
                    tweet.author_id || 
                    'twitter_user';
      
      // Build tweet URL
      const tweetId = tweet.id_str || tweet.id || '';
      const tweetUrl = tweet.url || 
                      `https://twitter.com/${author}/status/${tweetId}`;
      
      signals.push({
        platform: 'twitter',
        source_url: tweetUrl,
        author,
        content: content.substring(0, 500),
        sentiment,
        signal_type: signalType,
        engagement_score: likes + (retweets * 2) + replies, // Weight retweets higher
        created_at: tweet.created_at || new Date().toISOString()
      });
    }
    
    console.log(`  ✅ Found ${signals.length} tweets`);
    
  } catch (error) {
    console.error(`  ❌ Twitter error:`, error.message);
  }
  
  return signals;
}

// X/TWITTER SCRAPER - Nitter fallback (kept for backup)
async function scrapeTwitterNitter(startupName) {
  // Use Nitter (free Twitter frontend) - no API needed
  const nitterInstances = [
    'https://nitter.net',
    'https://nitter.1d4.us',
    'https://nitter.kavin.rocks'
  ];
  
  const signals = [];
  
  for (const instance of nitterInstances) {
    try {
      const url = `${instance}/search?f=tweets&q=${encodeURIComponent(startupName)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      
      // Parse HTML for tweets (simple regex - in production use cheerio/jsdom)
      const tweetPattern = /<div class="tweet-content">(.*?)<\/div>/gs;
      const matches = [...html.matchAll(tweetPattern)];
      
      for (const match of matches.slice(0, 20)) { // Limit to 20 per instance
        const content = match[1].replace(/<[^>]*>/g, '').trim();
        
        if (content.length < 10) continue;
        
      // Analyze sentiment (on lowercased content)
      const contentLower = content.toLowerCase();
      let sentiment = 'neutral';
      for (const [type, patterns] of Object.entries(SENTIMENT)) {
        if (patterns.some(pattern => pattern.test(contentLower))) {
          sentiment = type;
          break;
        }
      }
      
      let signalType = 'mention';
        if (sentiment === 'help') signalType = 'help_offered';
        else if (sentiment === 'interest') signalType = 'seeking_help';
        else if (sentiment === 'concern') signalType = 'criticism';
        else if (sentiment === 'praise') signalType = 'discussion';
        
        signals.push({
          platform: 'twitter',
          source_url: url,
          author: 'twitter_user', // Would need better parsing for actual username
          content: content.substring(0, 500),
          sentiment,
          signal_type: signalType,
          engagement_score: 0, // Nitter doesn't show likes/RTs easily
          created_at: new Date().toISOString()
        });
      }
      
      // If we got results, break (don't need to try other instances)
      if (signals.length > 0) break;
      
    } catch (error) {
      console.error(`  ❌ Nitter instance ${instance} failed:`, error.message);
      continue;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return signals;
}


// FACEBOOK SCRAPER - Public groups/pages
async function scrapeFacebookPublic(startupName) {
  // Facebook is harder - they block scrapers aggressively
  // Best approach: Use their Graph API or a service like Apify
  
  const FB_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!FB_ACCESS_TOKEN) {
    console.log('  ⏭️  Facebook API key not found - skipping');
    return [];
  }
  
  try {
    // Search public posts (requires pages_read_engagement permission)
    const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(startupName)}&type=post&access_token=${FB_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('  ❌ Facebook API error:', await response.text());
      return [];
    }
    
    const data = await response.json();
    const signals = [];
    
    for (const post of data.data || []) {
      const content = (post.message || '').toLowerCase();
      
      if (content.length < 10) continue;
      
      let sentiment = 'neutral';
      for (const [type, patterns] of Object.entries(SENTIMENT)) {
        if (patterns.some(pattern => pattern.test(content))) {
          sentiment = type;
          break;
        }
      }
      
      let signalType = 'mention';
      if (sentiment === 'help') signalType = 'help_offered';
      else if (sentiment === 'interest') signalType = 'seeking_help';
      else if (sentiment === 'concern') signalType = 'criticism';
      else if (sentiment === 'praise') signalType = 'discussion';
      
      signals.push({
        platform: 'facebook',
        source_url: post.permalink_url || `https://facebook.com/${post.id}`,
        author: post.from?.name || 'facebook_user',
        content: post.message || '',
        sentiment,
        signal_type: signalType,
        engagement_score: (post.likes?.summary?.total_count || 0) + 
                         (post.comments?.summary?.total_count || 0) + 
                         (post.shares?.count || 0),
        created_at: post.created_time
      });
    }
    
    return signals;
  } catch (error) {
    console.error('  ❌ Facebook error:', error.message);
    return [];
  }
}

// FACEBOOK GROUPS - Using Apify (paid service)
async function scrapeFacebookApify(startupName) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  
  if (!APIFY_TOKEN) {
    console.log('  ⏭️  Apify token not found - skipping Facebook groups');
    return [];
  }
  
  try {
    // Run Apify Facebook scraper
    const response = await fetch('https://api.apify.com/v2/acts/apify~facebook-pages-scraper/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        search: startupName,
        maxPosts: 50
      })
    });
    
    const run = await response.json();
    
    // Wait for completion and get results
    // (In production, you'd poll for completion or use webhooks)
    console.log('  ⏳ Apify scraper running... (implement polling)');
    
    return [];
  } catch (error) {
    console.error('  ❌ Apify error:', error.message);
    return [];
  }
}

// VALIDATE IF MENTION IS ACTUALLY ABOUT THE STARTUP (not a false positive)
function isValidStartupMention(content, startup) {
  const startupName = startup.name.toLowerCase().trim();
  const contentLower = content.toLowerCase();
  
  // 1. Word boundary check - ensure it's a full word match (prevents "Corli" matching "Corliss")
  const wordBoundaryRegex = new RegExp(`\\b${startupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (!wordBoundaryRegex.test(content)) {
    return false;
  }
  
  // 2. Filter out common person name patterns
  const personNamePatterns = [
    /(first|last|middle)\s+name/i,
    /^[A-Z][a-z]+\s+[A-Z]/i, // "Jeb Corliss", "William R. Corliss"
    /\b(professor|dr\.|mr\.|mrs\.|ms\.|captain|colonel)\s+/i,
  ];
  
  // If content looks like it's about a person, skip unless we have strong startup signals
  const looksLikePersonName = personNamePatterns.some(pattern => pattern.test(content));
  
  // 3. Check for startup/company context keywords
  const startupKeywords = [
    'startup', 'company', 'app', 'product', 'saas', 'platform',
    'raised', 'funding', 'investor', 'venture', 'seed', 'series',
    'launched', 'beta', 'yc', 'ycombinator', 'demo', 'trial',
    startup.description?.toLowerCase().split(' ').slice(0, 5) || []
  ].flat();
  
  const hasStartupContext = startupKeywords.some(keyword => 
    keyword && contentLower.includes(keyword.toLowerCase())
  );
  
  // 4. Check if website domain is mentioned (strong signal)
  let hasWebsiteMention = false;
  if (startup.website) {
    try {
      const domain = new URL(startup.website).hostname.replace('www.', '');
      const domainParts = domain.split('.');
      if (domainParts.length > 0) {
        hasWebsiteMention = contentLower.includes(domainParts[0].toLowerCase());
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // 5. For Hacker News "Show HN" posts, be more lenient (these are usually about startups)
  const isShowHN = /show\s+hn/i.test(content);
  
  // Decision logic:
  // - If it looks like a person name AND no startup context, reject
  // - If it has startup context OR website mention OR Show HN, accept
  // - Otherwise, reject to avoid false positives
  
  if (looksLikePersonName && !hasStartupContext && !hasWebsiteMention && !isShowHN) {
    return false;
  }
  
  if (hasStartupContext || hasWebsiteMention || isShowHN) {
    return true;
  }
  
  // Default: reject if we can't confirm it's about the startup
  return false;
}

// AGGREGATE SIGNALS FOR A STARTUP
async function collectSignalsForStartup(startup) {
  const signals = [];
  
  console.log(`\n🔍 Searching for: ${startup.name}`);
  
  // Reddit
  for (const subreddit of PLATFORMS.reddit.subreddits) {
    const redditSignals = await scrapeReddit(subreddit, startup.name, startup);
    signals.push(...redditSignals.map(s => ({ 
      ...s, 
      startup_id: startup.id, 
      startup_name: startup.name 
    })));
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Twitter - Using Getlate API (primary)
  const twitterSignals = await scrapeTwitterGetlate(startup.name, startup);
  signals.push(...twitterSignals.map(s => ({ 
    ...s, 
    startup_id: startup.id, 
    startup_name: startup.name 
  })));
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Hacker News
  const hnSignals = await scrapeHackerNews(startup.name, startup);
  signals.push(...hnSignals.map(s => ({ 
    ...s, 
    startup_id: startup.id, 
    startup_name: startup.name 
  })));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return signals;
}

// CALCULATE STARTUP BUZZ SCORE
function calculateBuzzScore(signals) {
  let score = 0;
  
  for (const signal of signals) {
    // Base score for being mentioned
    score += 1;
    
    // Sentiment multipliers
    if (signal.sentiment === 'praise') score += 5;
    if (signal.sentiment === 'help') score += 3;
    if (signal.sentiment === 'interest') score += 2;
    if (signal.sentiment === 'concern') score -= 3;
    
    // Engagement multiplier
    score += Math.min((signal.engagement_score || 0) / 10, 10);
  }
  
  return Math.round(score);
}

// CALCULATE FOUNDER REPUTATION
async function calculateFounderReputation(founderName) {
  // Search for founder's helpful posts across platforms
  const signals = [];
  
  // Reddit search for founder
  for (const subreddit of PLATFORMS.reddit.subreddits) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=author:${encodeURIComponent(founderName)}&limit=100`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StartupResearch/1.0)' }
      });
      
      if (response.ok) {
        const data = await response.json();
        for (const post of data.data?.children || []) {
          const content = `${post.data.title} ${post.data.selftext}`;
          
          let reputationPoints = 0;
          
          // Check for helpful signals
          for (const pattern of REPUTATION_SIGNALS.helpful) {
            if (pattern.test(content)) reputationPoints += 5;
          }
          
          // Check for experience
          for (const pattern of REPUTATION_SIGNALS.experienced) {
            if (pattern.test(content)) reputationPoints += 3;
          }
          
          // Check for being connected
          for (const pattern of REPUTATION_SIGNALS.connected) {
            if (pattern.test(content)) reputationPoints += 4;
          }
          
          signals.push({
            platform: 'reddit',
            reputation_points: reputationPoints,
            engagement: post.data.score
          });
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // Silently continue on errors
    }
  }
  
  // Calculate total reputation
  const totalReputation = signals.reduce((sum, s) => sum + s.reputation_points + (s.engagement / 10), 0);
  
  return {
    reputation_score: Math.round(totalReputation),
    helpful_posts: signals.filter(s => s.reputation_points > 0).length,
    total_posts: signals.length
  };
}

// MAIN EXECUTION
async function main() {
  console.log('🕵️  SOCIAL SIGNALS INTELLIGENCE SYSTEM');
  console.log('========================================\n');
  console.log('📡 Using Getlate API for Twitter scraping\n');
  
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 10;
  
  // Check/create table
  await createSocialSignalsTable();
  
  // Get startups to analyze (include website for better filtering)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, description, website')
    .eq('status', 'approved')
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }
  
  console.log(`Analyzing ${startups.length} startups...\n`);
  
  let totalSignals = 0;
  
  for (const startup of startups) {
    // Collect signals
    const signals = await collectSignalsForStartup(startup);
    
    if (signals.length > 0) {
      console.log(`  📊 Found ${signals.length} valid mentions (false positives filtered)`);
      
      // Use raw SQL to bypass cache - batch insert for efficiency
      // Escape single quotes in text fields
      const escapeSql = (str) => {
        if (!str) return '';
        return String(str).replace(/'/g, "''").replace(/\\/g, '\\\\');
      };
      
      // Build batch insert SQL
      const values = signals.map(signal => {
        const createdAt = signal.created_at || new Date().toISOString();
        return `(
          ${signal.startup_id}, 
          '${escapeSql(signal.startup_name)}', 
          '${escapeSql(signal.platform)}', 
          '${escapeSql(signal.source_url || '')}', 
          '${escapeSql(signal.author || '')}', 
          '${escapeSql(signal.content || '')}', 
          '${escapeSql(signal.sentiment || 'neutral')}', 
          '${escapeSql(signal.signal_type || 'mention')}', 
          ${signal.engagement_score || 0}, 
          '${createdAt}', 
          NOW()
        )`;
      }).join(',');
      
      // Batch insert using raw SQL to bypass cache
      const sql = `
        INSERT INTO social_signals 
        (startup_id, startup_name, platform, source_url, author, content, sentiment, signal_type, engagement_score, created_at, collected_at)
        VALUES ${values}
      `;
      
      const { error: insertError } = await supabase.rpc('exec_sql_modify', {
        sql_query: sql
      });
      
      if (insertError) {
        console.error(`  ❌ Error saving signals:`, insertError.message);
        // Fallback to individual inserts if batch fails
        console.log(`  ⚠️  Falling back to individual inserts...`);
        let inserted = 0;
        for (const signal of signals) {
          const createdAt = signal.created_at || new Date().toISOString();
          // Individual insert - simpler, no conflict handling needed
          const singleSql = `
            INSERT INTO social_signals 
            (startup_id, startup_name, platform, source_url, author, content, sentiment, signal_type, engagement_score, created_at, collected_at)
            VALUES 
            (${signal.startup_id}, '${escapeSql(signal.startup_name)}', '${escapeSql(signal.platform)}', 
             '${escapeSql(signal.source_url || '')}', '${escapeSql(signal.author || '')}', 
             '${escapeSql(signal.content || '')}', '${escapeSql(signal.sentiment || 'neutral')}', 
             '${escapeSql(signal.signal_type || 'mention')}', ${signal.engagement_score || 0}, 
             '${createdAt}', NOW())
          `;
          
          const { error: singleError } = await supabase.rpc('exec_sql_modify', {
            sql_query: singleSql
          });
          
          if (!singleError) inserted++;
        }
        console.log(`  ✅ Saved ${inserted}/${signals.length} signals (fallback mode)`);
        totalSignals += inserted;
      } else {
        console.log(`  ✅ Saved ${signals.length} signals`);
        totalSignals += signals.length;
      }
      
      // Calculate and display buzz score
      const buzzScore = calculateBuzzScore(signals);
      console.log(`  🔥 Buzz Score: ${buzzScore}`);
      
      // Show sentiment breakdown
      const sentiments = {
        praise: signals.filter(s => s.sentiment === 'praise').length,
        concern: signals.filter(s => s.sentiment === 'concern').length,
        interest: signals.filter(s => s.sentiment === 'interest').length,
        help: signals.filter(s => s.sentiment === 'help').length,
        neutral: signals.filter(s => s.sentiment === 'neutral').length
      };
      
      console.log(`  💭 Sentiment:`, JSON.stringify(sentiments));
      
      // Platform breakdown
      const platforms = {
        twitter: signals.filter(s => s.platform === 'twitter').length,
        reddit: signals.filter(s => s.platform === 'reddit').length,
        hackernews: signals.filter(s => s.platform === 'hackernews').length
      };
      
      console.log(`  📱 Platforms:`, JSON.stringify(platforms));
    } else {
      console.log(`  ℹ️  No mentions found`);
    }
    
    // Rate limiting between startups
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n========================================');
  console.log(`✅ Complete! Collected ${totalSignals} total signals`);
  console.log('========================================');
}

main().catch(console.error);

