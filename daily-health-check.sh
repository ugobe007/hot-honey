#!/bin/bash
# Daily Health Check Script for Hot Match
# Run this every morning to get a full system overview

echo "🔍 Daily Health Check - $(date)"
echo "================================="
echo ""

echo "📊 GOD Scores:"
echo "--------------"
node scripts/check-god-scores.js 2>&1 | head -30 || true
echo ""

echo "📋 Data Quality:"
echo "----------------"
node scripts/check-startup-data-quality.js
echo ""

echo "🗑️ Recent Deletions (Last 7 Days):"
echo "-----------------------------------"
node scripts/check-recent-deletions.js
echo ""

echo "✅ Health check complete!"
echo ""

