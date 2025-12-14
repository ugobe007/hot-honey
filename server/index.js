// --- FILE: server/index.js ---
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// File storage for uploaded documents
const upload = multer({ dest: 'uploads/' });

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: PORT,
    version: '0.1.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Hot Money Honey API',
    version: '0.1.0',
    endpoints: [
      'GET /api/health',
      'GET /api',
      'POST /upload',
      'POST /syndicate',
      'POST /api/syndicates',
      'POST /api/documents'
    ]
  });
});

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// Syndicate route (legacy)
app.post('/syndicate', (req, res) => {
  const { name, email, message } = req.body;
  const record = `${new Date().toISOString()} - ${name}, ${email}: ${message}\n`;
  fs.appendFileSync('syndicates.txt', record);
  res.json({ success: true });
});

// API-style syndicate route
app.post('/api/syndicates', (req, res) => {
  const { name, email, message } = req.body;
  const record = `${new Date().toISOString()} - ${name}, ${email}: ${message}\n`;
  fs.appendFileSync('syndicates.txt', record);
  res.json({ success: true });
});

// API-style document upload route
app.post('/api/documents', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// RSS refresh endpoint
app.post('/api/rss/refresh', async (req, res) => {
  try {
    console.log('📡 RSS refresh triggered');
    // This endpoint triggers a manual refresh check
    // For now, just return success as the actual scraping happens via run-rss-scraper.js
    res.json({ 
      success: true, 
      message: 'RSS refresh initiated. Run the scraper script to process feeds.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering RSS refresh:', error);
    res.status(500).json({ error: 'Failed to refresh RSS feeds' });
  }
});

// Discover startups from RSS endpoint
app.post('/api/rss/discover-startups', async (req, res) => {
  try {
    console.log('🚀 Startup discovery triggered');
    res.json({ 
      success: true, 
      message: 'Startup discovery initiated. Run discover-startups-from-rss.js to extract startups from RSS feeds.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering startup discovery:', error);
    res.status(500).json({ error: 'Failed to start startup discovery' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
