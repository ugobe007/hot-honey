// --- FILE: server/index.js ---
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');

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
    
    // Fetch the HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract company name
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    const title = $('title').text().trim();
    const h1 = $('h1').first().text().trim();
    
    // Remove non-content elements
    $('script, style, nav, footer, header, aside, .cookie, .banner, [class*="nav"]').remove();
    
    // Get clean text content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000); // Limit to 8k chars
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // Use OpenAI to extract the 5 points intelligently
    console.log(`🧠 Using AI to analyze content...`);
    
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast and cheap model
      messages: [
        {
          role: "system",
          content: `You are an expert startup analyst. Extract key information from startup websites.
          
Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "companyName": "Official company name",
  "valueProp": "One clear sentence describing what the company does and its unique value (50-150 chars)",
  "marketProblem": "The specific problem or pain point they're solving (50-150 chars)",
  "solution": "How their product/platform solves the problem (50-150 chars)",
  "team": "Founder names and their previous companies (e.g., 'John Smith (ex-Google), Jane Doe (ex-Meta)') or 'Team background not available'",
  "investment": "Funding info (e.g., 'Raised $5M Seed Round') or 'Investment details not available'"
}

Be concise, factual, and professional. If info is missing, use the 'not available' defaults.`
        },
        {
          role: "user",
          content: `Website: ${url}
Title: ${title}
Headline: ${h1}
Meta Description: ${metaDescription || ogDescription}

Content excerpt:
${bodyText.substring(0, 4000)}

Extract the 5 key points as JSON.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const aiContent = aiResponse.choices[0].message.content.trim();
    console.log(`✅ AI Response:`, aiContent.substring(0, 200));
    
    // Parse AI response
    let aiData;
    try {
      // Remove markdown code blocks if present
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

    const companyName = aiData.companyName || domain.charAt(0).toUpperCase() + domain.slice(1);

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

    res.json({
      success: true,
      data: {
        companyName,
        url,
        fivePoints: [
          aiData.valueProp || 'Value proposition needs manual research',
          aiData.marketProblem || 'Market problem needs manual research',
          aiData.solution || 'Solution details need manual research',
          aiData.team || 'Team background needs manual research',
          aiData.investment || 'Investment details need manual research'
        ],
        additionalData,
        scrapedAt: new Date().toISOString(),
        aiPowered: true
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
