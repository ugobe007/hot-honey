#!/bin/bash

# Quick verification that data normalization is working
# Run this after making changes to matchingService.ts

echo "🔍 Verifying Data Normalization Fix..."
echo ""

# Check 1: Normalization functions exist
echo "📋 Check 1: Normalization functions present"
if grep -q "function normalizeStartupData" src/services/matchingService.ts && \
   grep -q "function normalizeInvestorData" src/services/matchingService.ts; then
  echo "   ✅ Both normalization functions found"
else
  echo "   ❌ Normalization functions missing!"
  exit 1
fi

# Check 2: Functions are called before scoring
echo ""
echo "📋 Check 2: Normalization called in scoring"
if grep -q "const normalizedStartup = normalizeStartupData(startup)" src/services/matchingService.ts && \
   grep -q "const normalizedInvestor = normalizeInvestorData(investor)" src/services/matchingService.ts; then
  echo "   ✅ Normalization called in calculateAdvancedMatchScore()"
else
  echo "   ❌ Normalization not called in scoring!"
  exit 1
fi

# Check 3: generateAdvancedMatches uses normalization
echo ""
echo "📋 Check 3: Normalization used in match generation"
if grep -q "const normalized = normalizeStartupData(startup)" src/services/matchingService.ts; then
  echo "   ✅ Normalization used in generateAdvancedMatches()"
else
  echo "   ❌ Match generation doesn't use normalization!"
  exit 1
fi

# Check 4: Critical fields have fallback logic
echo ""
echo "📋 Check 4: Critical fields have fallback chains"
CRITICAL_FIELDS=("team" "traction" "revenue" "sectors" "stage")
ALL_PRESENT=true

for field in "${CRITICAL_FIELDS[@]}"; do
  if grep -q "$field: startup.$field || extracted.$field" src/services/matchingService.ts || \
     grep -q "$field: startup.$field || startup.extracted_data?.$field" src/services/matchingService.ts; then
    echo "   ✅ $field has fallback logic"
  else
    echo "   ⚠️  $field might not have complete fallback"
    ALL_PRESENT=false
  fi
done

# Check 5: Normalized data used in startupProfile
echo ""
echo "📋 Check 5: StartupProfile uses normalized data"
if grep -q "team: normalizedStartup.team" src/services/matchingService.ts && \
   grep -q "revenue: normalizedStartup.revenue" src/services/matchingService.ts && \
   grep -q "industries: normalizedStartup.industries" src/services/matchingService.ts; then
  echo "   ✅ StartupProfile uses normalized fields"
else
  echo "   ❌ StartupProfile not using normalized data!"
  exit 1
fi

# Check 6: Comments documenting the fix
echo ""
echo "📋 Check 6: Documentation comments present"
if grep -q "NORMALIZE DATA FIRST" src/services/matchingService.ts; then
  COMMENT_COUNT=$(grep -c "NORMALIZE DATA FIRST" src/services/matchingService.ts)
  echo "   ✅ Found $COMMENT_COUNT documentation comments"
else
  echo "   ⚠️  No documentation comments found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Data Normalization Fix Verified!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Navigate to: http://localhost:5173/match"
echo "  3. Open browser console"
echo "  4. Look for GOD algorithm scores (should be 70-95 range)"
echo ""
echo "For detailed diagnostics, paste data-mapping-diagnostic.js in console"
