#!/bin/bash
# Quick commands for investor data enrichment

echo "🚀 Hot Money - Investor Data Enrichment"
echo "════════════════════════════════════════"
echo ""
echo "Available commands:"
echo ""
echo "1. Check current investor data:"
echo "   npm run tsx check-investor-data.ts"
echo ""
echo "2. Enrich investor data with OpenAI:"
echo "   npm run tsx enrich-investor-data.ts"
echo ""
echo "3. Test GOD algorithm:"
echo "   npm run tsx test-god-algorithm.ts"
echo ""
echo "4. Build and deploy:"
echo "   npm run build && npm run deploy"
echo ""
echo "════════════════════════════════════════"
echo ""

# Ask user which command to run
read -p "Enter command number (1-4) or 'q' to quit: " choice

case $choice in
  1)
    echo ""
    echo "📊 Checking investor data..."
    npx tsx check-investor-data.ts
    ;;
  2)
    echo ""
    echo "⚠️  Warning: This will use OpenAI API credits!"
    read -p "Continue? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
      echo ""
      echo "🤖 Enriching investor data with OpenAI..."
      npx tsx enrich-investor-data.ts
    else
      echo "Cancelled."
    fi
    ;;
  3)
    echo ""
    echo "🧪 Testing GOD algorithm..."
    npx tsx test-god-algorithm.ts
    ;;
  4)
    echo ""
    echo "🏗️  Building and deploying..."
    npm run build
    ;;
  q)
    echo "Goodbye!"
    ;;
  *)
    echo "Invalid choice"
    ;;
esac
