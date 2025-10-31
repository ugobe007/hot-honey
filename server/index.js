// --- FILE: server/index.js ---
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const { saveStartupToSupabase, startupExists } = require('./supabaseClient');

const app = express();
const PORT = 3001;

// Initialize OpenAI - API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-api-key-here') {
  console.warn('⚠️  WARNING: OPENAI_API_KEY not set in .env file!');
  console.warn('   Get your key from: https://platform.openai.com/api-keys');
  console.warn('   Add it to server/.env as: OPENAI_API_KEY=sk-...');
}

// Enable CORS
app.use(cors());
app.use(express.json());

// File storage for uploaded documents
const upload = multer({ dest: 'uploads/' });

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Syndicate route
app.post('/syndicate', (req, res) => {
  const { name, email, message } = req.body;
  const record = `${new Date().toISOString()} - ${name}, ${email}: ${message}\n`;
  fs.appendFileSync('syndicates.txt', record);
  res.json({ success: true });
});

// AI-powered web scraping endpoint for startup data
app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`🤖 AI Scraping URL: ${url}`);
    
    // Extract company name from URL for research
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    const companyNameGuess = domain.charAt(0).toUpperCase() + domain.slice(1);

    // Fetch the main website HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    const h1 = $('h1').first().text().trim();
    
    // Remove non-content elements
    $('script, style, nav, footer, header, aside, .cookie, .banner, [class*="nav"]').remove();
    
    // Get clean text content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000);
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // Try to fetch additional context from Crunchbase (public data)
    let crunchbaseData = '';
    try {
      const crunchbaseUrl = `https://www.crunchbase.com/organization/${domain}`;
      console.log(`🔍 Checking Crunchbase: ${crunchbaseUrl}`);
      const cbResponse = await axios.get(crunchbaseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      const $cb = cheerio.load(cbResponse.data);
      crunchbaseData = $cb('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
      console.log(`✅ Found Crunchbase data`);
    } catch (cbError) {
      console.log(`⚠️ Crunchbase not available for ${domain}`);
    }

    // Try to fetch funding news from multiple sources
    let newsData = '';
    const newsSources = [
      `https://vcnewsdaily.com/?s=${companyNameGuess}`,
      `https://techcrunch.com/?s=${companyNameGuess}`,
      `https://www.geekwire.com/?s=${companyNameGuess}`
    ];

    for (const newsUrl of newsSources) {
      try {
        console.log(`📰 Checking news: ${newsUrl}`);
        const newsResponse = await axios.get(newsUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 8000
        });
        const $news = cheerio.load(newsResponse.data);
        // Extract article headlines and snippets
        $news('script, style, nav, footer, header, aside').remove();
        const newsText = $news('body').text().replace(/\s+/g, ' ').trim().substring(0, 1500);
        if (newsText.toLowerCase().includes('funding') || newsText.toLowerCase().includes('raised') || newsText.toLowerCase().includes('million')) {
          newsData += newsText + ' ';
          console.log(`✅ Found relevant news data`);
          break; // Stop after first relevant result
        }
      } catch (newsError) {
        console.log(`⚠️ News source unavailable: ${newsUrl}`);
      }
    }

    // Use OpenAI to extract the 5 points intelligently with enhanced research
    console.log(`🧠 Using AI to analyze content from multiple sources...`);
    
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert startup analyst with access to company websites and funding databases. Extract key information and cross-reference multiple sources.
          
Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "companyName": "Official company name",
  "valueProp": "One clear sentence describing what the company does and its unique value (50-150 chars)",
  "marketProblem": "The specific problem or pain point they're solving (50-150 chars)",
  "solution": "How their product/platform solves the problem (50-150 chars)",
  "team": "Founder names and their previous companies/schools (e.g., 'John Smith (ex-Google, Stanford), Jane Doe (ex-Meta)') or 'Team background not available'. Extract from any source including Crunchbase data.",
  "investment": "Specific funding info (e.g., 'Raised $5M Seed Round from a16z in 2024' or 'Series A: $15M led by Sequoia') or 'Investment details not available'. Extract from any source including Crunchbase data."
}

IMPORTANT: For team and investment, search ALL provided sources (website, Crunchbase, news). Look for:
- Team: Founder names, previous employers (Google, Meta, Amazon, etc.), universities (Stanford, MIT, Harvard)
- Investment: Funding amounts, round types (Seed, Series A/B/C), investor names, dates

Be concise, factual, and professional. If info is missing, use the 'not available' defaults.`
        },
        {
          role: "user",
          content: `Company: ${companyNameGuess}
Website URL: ${url}
Title: ${title}
Headline: ${h1}
Meta Description: ${metaDescription || ogDescription}

=== MAIN WEBSITE CONTENT ===
${bodyText.substring(0, 4000)}

${crunchbaseData ? `\n=== CRUNCHBASE DATA ===\n${crunchbaseData.substring(0, 2000)}` : ''}

${newsData ? `\n=== NEWS & FUNDING ANNOUNCEMENTS ===\n${newsData.substring(0, 1500)}` : ''}

Extract the 5 key points as JSON. Pay special attention to team backgrounds and funding details from all sources.`
        }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const aiContent = aiResponse.choices[0].message.content.trim();
    console.log(`✅ AI Response:`, aiContent.substring(0, 200));
    
    // Parse AI response
    let aiData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      } else {
        aiData = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      throw new Error('AI returned invalid JSON');
    }

    const companyName = aiData.companyName || companyNameGuess;

    // Extract additional data
    const additionalData = {
      videos: [],
      presentations: [],
      socialMedia: {
        linkedin: $('a[href*="linkedin.com"]').attr('href') || null,
        twitter: $('a[href*="twitter.com"], a[href*="x.com"]').attr('href') || null
      },
      foundedYear: (() => {
        const yearMatch = bodyText.match(/\b(founded|established|started)\s+(in\s+)?(\d{4})\b/i);
        return yearMatch ? yearMatch[3] : null;
      })(),
      email: $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '') || null
    };

    // Look for video links
    $('iframe[src*="youtube"], iframe[src*="vimeo"], a[href*="youtube"], a[href*="vimeo"]').each((i, elem) => {
      const videoUrl = $(elem).attr('src') || $(elem).attr('href');
      if (videoUrl && !additionalData.videos.includes(videoUrl)) {
        additionalData.videos.push(videoUrl);
      }
    });

    console.log(`✅ Successfully scraped with AI: ${companyName}`);

    // Prepare startup data for response and Supabase
    const startupData = {
      id: `startup-${Date.now()}`,
      name: companyName,
      tagline: aiData.valueProp || `${companyName} - Manual research required`,
      pitch: aiData.marketProblem || 'Market problem needs manual research',
      fivePoints: [
        aiData.valueProp || 'Value proposition needs manual research',
        aiData.marketProblem || 'Market problem needs manual research',
        aiData.solution || 'Solution details need manual research',
        aiData.team || 'Team background needs manual research',
        aiData.investment || 'Investment details need manual research'
      ],
      secretFact: 'AI-researched startup from Hot Money Honey',
      logo: `${url}/favicon.ico`,
      website: url,
      scrapedAt: new Date().toISOString()
    };

    // 🔥 AUTO-SAVE TO SUPABASE
    const saveResult = await saveStartupToSupabase(startupData);
    if (saveResult.success) {
      console.log(`💾 Saved to Supabase database!`);
    } else {
      console.log(`⚠️ Could not save to Supabase (check env vars): ${saveResult.error}`);
    }

    res.json({
      success: true,
      data: {
        ...startupData,
        additionalData: {
          ...additionalData,
          sourcesUsed: ['Company Website', crunchbaseData ? 'Crunchbase' : null, newsData ? 'News Sources' : null].filter(Boolean)
        },
        aiPowered: true,
        multiSourceResearch: !!(crunchbaseData || newsData),
        savedToDatabase: saveResult.success
      }
    });

  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    
    // Return fallback data on error
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    const companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
    
    res.json({
      success: false,
      error: error.message,
      data: {
        companyName,
        url,
        fivePoints: [
          `${companyName} - Manual research required`,
          'Market problem needs manual research',
          'Solution details need manual research',
          'Team background needs manual research',
          'Investment details need manual research'
        ],
        additionalData: {
          videos: [],
          presentations: [],
          socialMedia: {},
          error: error.message
        },
        scrapedAt: new Date().toISOString()
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
