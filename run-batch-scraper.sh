#!/bin/bash
# Batch Scraper Runner - Processes all VC URLs without stopping

echo "🚀 Starting batch VC scraper..."

# Combine all URL files
cat vc-urls.txt vc-urls-batch2.txt > all-vc-urls-combined.txt

# Remove duplicates
sort -u all-vc-urls-combined.txt > all-vc-urls-unique.txt

echo "📋 Total unique URLs: $(wc -l < all-vc-urls-unique.txt)"

# Run with nohup so it won't stop
nohup node batch-scrape-urls.js all-vc-urls-unique.txt > batch-scraper-output.log 2>&1 &

echo "✅ Batch scraper running in background (PID: $!)"
echo "📝 View progress: tail -f batch-scraper-output.log"
echo "🛑 Stop it: kill $!"

# Save PID
echo $! > batch-scraper.pid
