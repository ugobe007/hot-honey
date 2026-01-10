#!/bin/bash
# Quick script to regenerate matches after data deletion

echo "🚨 REGENERATING MATCHES - Data was deleted from startup_investor_matches"
echo ""
echo "Current status:"
echo "  - Table: 0 rows (0 bytes data, 71 MB orphaned indexes)"
echo "  - Queue: $(psql $POSTGRES_URL -t -c "SELECT COUNT(*) FROM matching_queue WHERE status='pending';" 2>/dev/null || echo 'check manually') pending startups"
echo ""
echo "Starting queue processor..."
echo ""

# Run queue processor
node scripts/core/queue-processor-v16.js

echo ""
echo "✅ Queue processor completed!"
echo ""
echo "Check results:"
echo "  psql \$POSTGRES_URL -c \"SELECT COUNT(*) FROM startup_investor_matches;\""
