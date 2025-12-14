#!/bin/bash
# Quick Enrichment Runner - Fills in all VC profile data

echo "🚀 ENRICHING ALL VC PROFILES"
echo "══════════════════════════════════════════════════════════════════════"
echo ""
echo "This will use OpenAI to fill in:"
echo "  • Sector focus (AI/ML, Fintech, SaaS, etc.)"
echo "  • Stage focus (seed, series A/B/C, growth)"
echo "  • Portfolio size (number of companies)"
echo "  • Notable investments (famous portfolio companies)"
echo "  • Check sizes ($1M-$50M ranges)"
echo "  • Exit counts"
echo ""
echo "Starting enrichment..."
echo ""

npx tsx enrich-investor-data.ts

echo ""
echo "══════════════════════════════════════════════════════════════════════"
echo "✅ ENRICHMENT COMPLETE!"
echo ""
echo "Check your VC cards - they should now have full profiles!"
echo "Visit: http://localhost:5173/investors"
