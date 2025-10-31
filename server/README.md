# 🤖 AI-Powered Startup Scraper

This backend server uses **OpenAI GPT-4** to intelligently extract startup information from URLs.

## Setup Instructions

### 1. Get Your OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-`)

### 2. Add API Key to .env

Edit `server/.env` and replace `your-api-key-here` with your actual key:

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Start the Server

```bash
cd server
node index.js
```

You should see:
```
Server is running on http://localhost:3001
```

## Usage

The server will now use AI to extract:
- 💎 **Value Prop**: What the company does
- ⚠️ **Market Problem**: Problem they're solving
- 💡 **Solution**: How they solve it
- 👥 **Team**: Founder backgrounds
- 💰 **Investment**: Funding information

## Cost

Using `gpt-4o-mini` model:
- ~$0.0001 per startup (1/100th of a cent)
- Processing 24 URLs ≈ **$0.002** (less than 1 cent)

Very affordable! 🎉

## Troubleshooting

**Error: Missing credentials**
- Make sure your API key is in `server/.env`
- Key should start with `sk-`
- No quotes needed in .env file

**Error: Insufficient quota**
- Add billing info at [OpenAI Billing](https://platform.openai.com/account/billing)
- Minimum: $5 credit (will last for thousands of scrapes)
