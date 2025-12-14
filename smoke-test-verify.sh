#!/bin/bash

echo "🔍 Hot Money Honey - Pre-Smoke Test Verification"
echo "=================================================="
echo ""

# Check 1: Is dev server running?
echo "1️⃣ Checking if dev server is running..."
if lsof -Pi :5175 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✅ Dev server running on port 5175"
else
    echo "   ❌ Dev server NOT running"
    echo "   → Run: npm run dev"
fi
echo ""

# Check 2: Is DEBUG_GOD enabled?
echo "2️⃣ Checking DEBUG_GOD flag..."
if grep -q "const DEBUG_GOD = true" src/services/matchingService.ts 2>/dev/null; then
    echo "   ✅ DEBUG_GOD is enabled"
else
    echo "   ❌ DEBUG_GOD is not enabled or file not found"
fi
echo ""

# Check 3: Is GOD algorithm imported?
echo "3️⃣ Checking GOD algorithm import..."
if grep -q "generateAdvancedMatches" src/components/MatchingEngine.tsx 2>/dev/null; then
    echo "   ✅ generateAdvancedMatches imported in MatchingEngine"
else
    echo "   ❌ generateAdvancedMatches NOT imported"
fi
echo ""

# Check 4: Is GOD algorithm called?
echo "4️⃣ Checking if GOD algorithm is called..."
if grep -A 5 "loadMatches" src/components/MatchingEngine.tsx 2>/dev/null | grep -q "generateAdvancedMatches"; then
    echo "   ✅ generateAdvancedMatches is called"
else
    echo "   ❌ generateAdvancedMatches NOT called in loadMatches"
fi
echo ""

# Check 5: Critical files exist?
echo "5️⃣ Checking critical files..."
files=(
    "src/services/matchingService.ts"
    "src/services/matchingHelpers.ts"
    "server/services/startupScoringService.ts"
    "src/components/MatchingEngine.tsx"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file NOT FOUND"
        all_exist=false
    fi
done
echo ""

# Summary
echo "📊 SUMMARY"
echo "=========="
if lsof -Pi :5175 -sTCP:LISTEN -t >/dev/null 2>&1 && \
   grep -q "const DEBUG_GOD = true" src/services/matchingService.ts 2>/dev/null && \
   grep -q "generateAdvancedMatches" src/components/MatchingEngine.tsx 2>/dev/null && \
   $all_exist; then
    echo "✅ System is READY for smoke testing"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Open http://localhost:5175/"
    echo "   2. Open http://localhost:5175/smoke-test.html"
    echo "   3. Open browser console (F12)"
    echo "   4. Run through smoke test checklist"
else
    echo "❌ System NOT ready for smoke testing"
    echo "   → Fix issues above first"
fi
echo ""
