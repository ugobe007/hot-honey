// --- FILE: server/index.js ---
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3001;

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

// Web scraping endpoint for startup data
app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`🔍 Scraping URL: ${url}`);
    
    // Fetch the HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000 // 10 second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract company name
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    const companyName = $('h1').first().text().trim() || 
                       $('title').text().split('-')[0].trim() || 
                       domain.charAt(0).toUpperCase() + domain.slice(1);

    // Extract all text content for analysis
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // Helper function to find relevant text near keywords
    const findNearText = (keywords, context = 200) => {
      for (const keyword of keywords) {
        const regex = new RegExp(`(.{0,${context}}${keyword}.{0,${context}})`, 'i');
        const match = bodyText.match(regex);
        if (match) {
          return match[1].trim().substring(0, 150) + '...';
        }
      }
      return null;
    };

    // Extract the 5 points
    const fivePoints = {
      valueProp: metaDescription || ogDescription || 
                 findNearText(['value proposition', 'we help', 'we enable', 'we provide']) ||
                 'Value proposition to be researched',
      
      marketProblem: findNearText(['problem', 'challenge', 'pain point', 'struggle', 'difficulty']) ||
                     'Market problem to be researched',
      
      solution: findNearText(['solution', 'how it works', 'our approach', 'we solve', 'platform']) ||
                'Solution details to be researched',
      
      team: (() => {
        // Look for team member names and companies
        const teamText = findNearText(['team', 'founded by', 'founders', 'leadership', 'about us']);
        if (teamText) {
          // Try to extract company names (common patterns)
          const companies = teamText.match(/\b(Google|Apple|Microsoft|Amazon|Meta|Facebook|Tesla|Netflix|Uber|Airbnb|Stripe|Y Combinator|Stanford|MIT|Harvard)\b/gi);
          if (companies && companies.length > 0) {
            return `Team: Former employees from ${[...new Set(companies)].join(', ')}`;
          }
        }
        return 'Team background to be researched';
      })(),
      
      investment: (() => {
        // Look for funding information
        const fundingText = findNearText(['raising', 'funding', 'seed', 'series', 'investment', 'million', 'valuation']);
        if (fundingText) {
          const amountMatch = fundingText.match(/\$[\d.]+[MBK]?/i);
          const roundMatch = fundingText.match(/\b(seed|series [A-Z]|pre-seed)\b/i);
          if (amountMatch || roundMatch) {
            return fundingText.substring(0, 100);
          }
        }
        return 'Investment details to be researched';
      })()
    };

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

    console.log(`✅ Successfully scraped: ${companyName}`);

    res.json({
      success: true,
      data: {
        companyName,
        url,
        fivePoints: [
          fivePoints.valueProp,
          fivePoints.marketProblem,
          fivePoints.solution,
          fivePoints.team,
          fivePoints.investment
        ],
        additionalData,
        scrapedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    
    // Return partial data on error
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    const companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
    
    res.json({
      success: false,
      error: error.message,
      data: {
        companyName,
        url,
        fivePoints: [
          `${companyName} - Value proposition needs manual research`,
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
