#!/bin/bash
# Launch All Scrapers for Maximum Startup Discovery
# Target: 100+ startups per day

echo "🚀 Launching Hot Match Scrapers..."
echo "Target: 100+ startups per day"
echo ""

# Check if automation engine is already running
if pgrep -f "automation-engine.js" > /dev/null; then
    echo "✅ Automation engine is already running"
    echo "   It will run discovery every 30 minutes"
else
    echo "📦 Starting automation engine..."
    nohup node automation-engine.js > logs/automation.log 2>&1 &
    echo "   ✅ Started in background (PID: $!)"
    echo "   Logs: tail -f logs/automation.log"
fi

echo ""
echo "🔄 Running initial discovery cycle..."
echo ""

# Run discovery immediately
echo "1️⃣ Running RSS discovery (discover-startups-from-rss.js)..."
node discover-startups-from-rss.js

echo ""
echo "2️⃣ Running RSS article scraper (run-rss-scraper.js)..."
node run-rss-scraper.js

echo ""
echo "3️⃣ Auto-importing discovered startups..."
node auto-import-pipeline.js

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Scrapers Launched!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Check status:"
echo "   node check-startup-stats.js"
echo ""
echo "📋 View logs:"
echo "   tail -f logs/automation.log"
echo ""
echo "🔄 Automation engine will run:"
echo "   - RSS scraping: every 30 minutes"
echo "   - Startup discovery: every 30 minutes"
echo "   - Auto-import: every 15 minutes"
echo "   - Match generation: every 60 minutes"
echo ""
echo "🎯 Expected: 100+ startups per day"
echo ""

