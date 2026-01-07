#!/bin/bash
# Batch Enrichment Runner
# Usage: ./run-enrichment.sh <batch-number>

BATCH_NUM=${1:-1}
BATCH_FILE="data/enrichment-batches/batch-$(printf '%03d' $BATCH_NUM).json"

if [ ! -f "$BATCH_FILE" ]; then
  echo "❌ Batch file not found: $BATCH_FILE"
  exit 1
fi

echo "📦 Processing batch $BATCH_NUM..."
echo ""
echo "Investors in this batch:"
cat "$BATCH_FILE" | jq -r '.[].name'
echo ""
echo "Copy the contents of $BATCH_FILE and use with the prompt template."
echo "Then run: node scripts/apply-enrichment.js <batch-number>"
