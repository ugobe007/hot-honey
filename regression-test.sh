#!/bin/bash

#######################################################################
# HOT MONEY HONEY - AUTOMATED REGRESSION TEST
# 
# Run this after EVERY Copilot session to catch blindspots
#
# Usage: ./regression-test.sh
#######################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║     🍯 HOT MONEY HONEY - REGRESSION TEST SUITE                 ║"
echo "║                                                                ║"
echo "║     Catching AI Copilot Blindspots Since 2025                  ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Function to report results
pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
  ((PASS++))
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  ((FAIL++))
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
  ((WARN++))
}

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

#######################################################################
# SECTION 1: CRITICAL FILE EXISTENCE
#######################################################################

section "SECTION 1: Critical File Existence"

# Core files that MUST exist
CRITICAL_FILES=(
  "src/services/matchingService.ts:Matching Service (GOD Algorithm)"
  "src/lib/supabase.ts:Supabase Client"
  "src/components/MatchingEngine.tsx:Matching Engine Component"
  ".env:Environment Variables"
  "package.json:Package Configuration"
  "vite.config.ts:Vite Configuration"
  "tsconfig.json:TypeScript Configuration"
)

for item in "${CRITICAL_FILES[@]}"; do
  FILE="${item%%:*}"
  DESC="${item##*:}"
  if [ -f "$FILE" ]; then
    pass "$DESC ($FILE)"
  else
    fail "$DESC ($FILE) - FILE MISSING!"
  fi
done

# Check for GOD algorithm files
echo ""
echo "GOD Algorithm Files:"
if [ -f "src/services/matchingService.ts" ]; then
  if grep -q "calculateHotScore\|calculateAdvancedMatchScore" src/services/matchingService.ts 2>/dev/null; then
    pass "GOD algorithm scoring functions present"
  else
    warn "GOD algorithm functions may be missing - check matchingService.ts"
  fi
fi

#######################################################################
# SECTION 2: IMPORT CHAIN VERIFICATION
#######################################################################

section "SECTION 2: Import Chain Verification"

# Check MatchingEngine imports
if [ -f "src/components/MatchingEngine.tsx" ]; then
  if grep -q "matchingService\|generateAdvancedMatches" src/components/MatchingEngine.tsx 2>/dev/null; then
    pass "MatchingEngine imports matching service"
  else
    fail "MatchingEngine does NOT import matching service"
  fi
  
  if grep -q "loadApprovedStartups\|getAllInvestors" src/components/MatchingEngine.tsx 2>/dev/null; then
    pass "MatchingEngine fetches data from database"
  else
    warn "MatchingEngine may not fetch from database"
  fi
fi

# Check matchingService imports
if [ -f "src/services/matchingService.ts" ]; then
  if grep -q "calculateHotScore\|function.*Score" src/services/matchingService.ts 2>/dev/null; then
    pass "matchingService has scoring functions"
  else
    fail "matchingService missing scoring functions"
  fi
  
  # Check for data mapping
  if grep -q "extracted_data" src/services/matchingService.ts 2>/dev/null; then
    pass "matchingService accesses extracted_data"
  else
    warn "matchingService may not read extracted_data - POTENTIAL BLINDSPOT!"
  fi
fi

# Check supabase client
if [ -f "src/lib/supabase.ts" ]; then
  if grep -q "createClient" src/lib/supabase.ts 2>/dev/null; then
    pass "Supabase client properly configured"
  else
    fail "Supabase client missing createClient"
  fi
fi

#######################################################################
# SECTION 3: ENVIRONMENT VARIABLES
#######################################################################

section "SECTION 3: Environment Variables"

if [ -f ".env" ]; then
  # Check for required variables
  if grep -q "^VITE_SUPABASE_URL=." .env 2>/dev/null; then
    pass "VITE_SUPABASE_URL is set"
  else
    fail "VITE_SUPABASE_URL is empty or missing"
  fi
  
  if grep -q "^VITE_SUPABASE_ANON_KEY=." .env 2>/dev/null; then
    pass "VITE_SUPABASE_ANON_KEY is set"
  else
    fail "VITE_SUPABASE_ANON_KEY is empty or missing"
  fi
  
  # Check for accidentally committed secrets
  if grep -q "sk-\|secret_\|password=" .env 2>/dev/null; then
    warn "Possible secrets in .env - ensure .gitignore covers this"
  fi
else
  fail ".env file missing - create from .env.example"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
  if grep -q "^\.env$" .gitignore 2>/dev/null; then
    pass ".env is in .gitignore"
  else
    fail ".env NOT in .gitignore - secrets may be exposed!"
  fi
fi

#######################################################################
# SECTION 4: DEPENDENCY CHECKS
#######################################################################

section "SECTION 4: Dependencies"

if [ -f "package.json" ]; then
  # Check critical dependencies
  DEPS=(
    "@supabase/supabase-js:Supabase Client"
    "react:React"
    "vite:Vite Build Tool"
  )
  
  for item in "${DEPS[@]}"; do
    DEP="${item%%:*}"
    DESC="${item##*:}"
    if grep -q "\"$DEP\"" package.json 2>/dev/null; then
      pass "$DESC dependency declared"
    else
      fail "$DESC ($DEP) not in package.json"
    fi
  done
fi

# Check node_modules
if [ -d "node_modules" ]; then
  pass "node_modules directory exists"
  
  if [ -d "node_modules/@supabase" ]; then
    pass "Supabase installed"
  else
    fail "Supabase not installed - run npm install"
  fi
else
  fail "node_modules missing - run npm install"
fi

#######################################################################
# SECTION 5: CODE QUALITY CHECKS
#######################################################################

section "SECTION 5: Code Quality"

echo "Checking for hardcoded values..."

# Hardcoded localhost ports (bad)
HARDCODED=$(grep -r "localhost:3001\|localhost:3000" src/ 2>/dev/null | grep -v node_modules | head -3)
if [ -z "$HARDCODED" ]; then
  pass "No hardcoded localhost ports in src/"
else
  warn "Found hardcoded localhost - use env vars"
fi

# Hardcoded Supabase URLs (bad)
HARDCODED_SUPA=$(grep -r "supabase.co" src/ 2>/dev/null | grep -v "import\|//" | grep -v node_modules | head -3)
if [ -z "$HARDCODED_SUPA" ]; then
  pass "No hardcoded Supabase URLs"
else
  warn "Possible hardcoded Supabase URL"
fi

# TODO comments that indicate incomplete work
TODOS=$(grep -r "TODO:\|FIXME:\|HACK:" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$TODOS" -gt 10 ]; then
  warn "Found $TODOS TODO/FIXME comments - review these"
else
  pass "Minimal TODO comments ($TODOS found)"
fi

#######################################################################
# SECTION 6: DATA MAPPING CHECK (THE BLINDSPOT)
#######################################################################

section "SECTION 6: Data Mapping (Common Blindspot)"

echo "Checking for potential data mapping issues..."

if [ -f "src/services/matchingService.ts" ]; then
  # Check if extracted_data is being accessed
  if grep -q "extracted_data" src/services/matchingService.ts 2>/dev/null; then
    pass "matchingService references extracted_data"
  else
    warn "matchingService may not access extracted_data - potential data mapping issue!"
  fi
  
  # Check for direct field access vs nested
  DIRECT_ACCESS=$(grep -E "startup\.(team|traction|revenue|sectors)" src/services/matchingService.ts 2>/dev/null | grep -v "extracted_data" | head -1)
  if [ -n "$DIRECT_ACCESS" ]; then
    warn "Found direct field access - verify these fields exist at top level"
  else
    pass "No suspicious direct field access detected"
  fi
fi

#######################################################################
# SECTION 7: BUILD CHECK
#######################################################################

section "SECTION 7: Build Verification"

echo "Checking if project compiles..."

# Quick TypeScript check (don't do full build, too slow)
if command -v npx &> /dev/null; then
  if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
    pass "TypeScript compiles without errors"
  else
    warn "TypeScript has errors (run 'npx tsc --noEmit' for details)"
  fi
else
  warn "npx not available - skipping TypeScript check"
fi

#######################################################################
# SECTION 8: GIT STATUS
#######################################################################

section "SECTION 8: Git Status"

if [ -d ".git" ]; then
  pass "Git repository initialized"
  
  # Check for uncommitted changes
  CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CHANGES" -gt 0 ]; then
    warn "$CHANGES uncommitted changes"
  else
    pass "Working directory clean"
  fi
else
  warn "Not a git repository"
fi

#######################################################################
# RESULTS SUMMARY
#######################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     REGRESSION TEST RESULTS                    ║"
echo "╠════════════════════════════════════════════════════════════════╣"
printf "║  ${GREEN}✅ PASSED: %-3s${NC}                                              ║\n" "$PASS"
printf "║  ${YELLOW}⚠️  WARNINGS: %-3s${NC}                                           ║\n" "$WARN"
printf "║  ${RED}❌ FAILED: %-3s${NC}                                              ║\n" "$FAIL"
echo "╠════════════════════════════════════════════════════════════════╣"

if [ $FAIL -gt 0 ]; then
  echo -e "║  ${RED}STATUS: ISSUES DETECTED - FIX BEFORE PROCEEDING${NC}             ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "❌ Regression test found $FAIL critical issues."
  echo "   Fix these before continuing development."
  exit 1
elif [ $WARN -gt 3 ]; then
  echo -e "║  ${YELLOW}STATUS: WARNINGS PRESENT - REVIEW RECOMMENDED${NC}              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "⚠️  Regression test passed but found $WARN warnings."
  echo "   Review warnings above before deploying."
  exit 0
else
  echo -e "║  ${GREEN}STATUS: ALL CHECKS PASSED ✓${NC}                                ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "✅ Regression test passed! Safe to continue."
  exit 0
fi
