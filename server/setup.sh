#!/bin/bash

# Quick setup script for OpenAI API key

echo "🤖 AI Scraper Setup"
echo "==================="
echo ""
echo "You need an OpenAI API key to use AI-powered scraping."
echo ""
echo "1. Go to: https://platform.openai.com/api-keys"
echo "2. Create a new key"
echo "3. Copy the key (starts with sk-)"
echo ""
read -p "Paste your OpenAI API key: " api_key

if [[ $api_key == sk-* ]]; then
  echo "OPENAI_API_KEY=$api_key" > .env
  echo ""
  echo "✅ API key saved to server/.env"
  echo ""
  echo "Starting server..."
  node index.js
else
  echo "❌ Invalid key format. OpenAI keys start with 'sk-'"
  echo "Please try again."
fi
