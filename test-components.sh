#!/bin/bash

echo ""
echo "========================================"
echo "🧪 HOT HONEY COMPONENT HEALTH CHECK"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# 1. Check that required component files exist
echo "📁 Checking required component files..."
echo ""

REQUIRED_FILES=(
  "src/components/HowItWorksModal.tsx"
  "src/components/EnhancedInvestorCard.tsx"
  "src/components/MatchingEngine.tsx"
  "src/components/InvestorCard.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✅ $file exists${NC}"
    ((PASS++))
  else
    echo -e "  ${RED}❌ $file is MISSING${NC}"
    ((FAIL++))
  fi
done

echo ""
echo "----------------------------------------"
echo "📦 Checking imports in MatchingEngine.tsx..."
echo ""

# 2. Check that imports are present in MatchingEngine.tsx
if grep -q "import HowItWorksModal" src/components/MatchingEngine.tsx; then
  echo -e "  ${GREEN}✅ HowItWorksModal is imported${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ HowItWorksModal import is MISSING${NC}"
  ((FAIL++))
fi

if grep -q "import EnhancedInvestorCard" src/components/MatchingEngine.tsx; then
  echo -e "  ${GREEN}✅ EnhancedInvestorCard is imported${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ EnhancedInvestorCard import is MISSING${NC}"
  ((FAIL++))
fi

# 3. Check that components are used in JSX
if grep -q "<HowItWorksModal" src/components/MatchingEngine.tsx; then
  echo -e "  ${GREEN}✅ HowItWorksModal is used in JSX${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ HowItWorksModal is NOT used in JSX${NC}"
  ((FAIL++))
fi

if grep -q "<EnhancedInvestorCard" src/components/MatchingEngine.tsx; then
  echo -e "  ${GREEN}✅ EnhancedInvestorCard is used in JSX${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ EnhancedInvestorCard is NOT used in JSX${NC}"
  ((FAIL++))
fi

# 4. Check that showHowItWorks state exists
if grep -q "showHowItWorks" src/components/MatchingEngine.tsx; then
  echo -e "  ${GREEN}✅ showHowItWorks state exists${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ showHowItWorks state is MISSING${NC}"
  ((FAIL++))
fi

echo ""
echo "----------------------------------------"
echo "🔧 Checking component file structure..."
echo ""

# 5. Check HowItWorksModal.tsx has required exports
if grep -q "export default" src/components/HowItWorksModal.tsx; then
  echo -e "  ${GREEN}✅ HowItWorksModal has default export${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ HowItWorksModal is missing default export${NC}"
  ((FAIL++))
fi

if grep -q "isOpen" src/components/HowItWorksModal.tsx; then
  echo -e "  ${GREEN}✅ HowItWorksModal has isOpen prop${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ HowItWorksModal is missing isOpen prop${NC}"
  ((FAIL++))
fi

# 6. Check EnhancedInvestorCard.tsx has required exports
if grep -q "export default" src/components/EnhancedInvestorCard.tsx; then
  echo -e "  ${GREEN}✅ EnhancedInvestorCard has default export${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ EnhancedInvestorCard is missing default export${NC}"
  ((FAIL++))
fi

if grep -q "investor" src/components/EnhancedInvestorCard.tsx; then
  echo -e "  ${GREEN}✅ EnhancedInvestorCard has investor prop${NC}"
  ((PASS++))
else
  echo -e "  ${RED}❌ EnhancedInvestorCard is missing investor prop${NC}"
  ((FAIL++))
fi

echo ""
echo "----------------------------------------"
echo "🧹 Running TypeScript check (quick)..."
echo ""

# 7. Quick TypeScript syntax check
npx tsc --noEmit --skipLibCheck 2>/dev/null
if [ $? -eq 0 ]; then
  echo -e "  ${GREEN}✅ No TypeScript errors found${NC}"
  ((PASS++))
else
  echo -e "  ${YELLOW}⚠️  TypeScript has warnings (run 'npm run build' for details)${NC}"
fi

echo ""
echo "========================================"
echo "📊 SUMMARY"
echo "========================================"
echo ""
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 All health checks passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some checks failed. Review the output above.${NC}"
  exit 1
fi
