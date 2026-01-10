#!/bin/bash
# Helper script to fix .env file format

echo "🔍 Checking .env file format..."

if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  exit 1
fi

# Check for common issues
if grep -q ' = ' .env; then
  echo "⚠️  Found spaces around = signs"
  echo "   Fix: Remove spaces around ="
fi

if grep -q 'VITE_SUPABASE_URL="' .env; then
  echo "⚠️  Found quotes around values"
  echo "   Fix: Remove quotes"
fi

# Count variables
url_count=$(grep -cE '^(VITE_)?SUPABASE_URL=' .env || echo "0")
key_count=$(grep -cE 'SUPABASE.*KEY=' .env || echo "0")

echo ""
echo "Found:"
echo "  URL variables: $url_count"
echo "  KEY variables: $key_count"

if [ "$url_count" -eq "0" ] || [ "$key_count" -eq "0" ]; then
  echo ""
  echo "❌ Missing required variables!"
  echo ""
  echo "Your .env should have:"
  echo "  VITE_SUPABASE_URL=https://xxx.supabase.co"
  echo "  SUPABASE_SERVICE_KEY=eyJxxx..."
  echo ""
  echo "Make sure:"
  echo "  1. No spaces around ="
  echo "  2. No quotes around values"
  echo "  3. One variable per line"
else
  echo ""
  echo "✅ Variables found! Testing load..."
  node check-env.js
fi

