#!/bin/bash

# Force Redeploy with Clean Build
# This ensures all changes are included in production

set -e

echo "🔧 Force Redeploy [pyth] ai to Production"
echo "═══════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Clean build artifacts
echo -e "${YELLOW}🧹 Step 1: Cleaning build artifacts...${NC}"
rm -rf dist
rm -rf node_modules/.vite
rm -rf .vite
echo -e "${GREEN}✅ Cleaned!${NC}"
echo ""

# Step 2: Verify Dockerfile
echo -e "${YELLOW}📋 Step 2: Checking Dockerfile...${NC}"
if grep -q "FROM node.*AS builder" Dockerfile; then
    echo -e "${GREEN}✅ Dockerfile is correct (multi-stage build)${NC}"
else
    echo -e "${RED}❌ Dockerfile needs to be updated!${NC}"
    echo "   The Dockerfile should use multi-stage build to actually build the app."
    exit 1
fi
echo ""

# Step 3: Commit any uncommitted changes
echo -e "${YELLOW}💾 Step 3: Committing changes...${NC}"
git add -A

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit."
else
    git commit -m "Force rebuild: ensure all [pyth] ai updates are included

- Updated Dockerfile to use multi-stage build
- Ensures Vite builds app during deployment
- Includes all recent rebrand and UI changes"
    echo -e "${GREEN}✅ Committed!${NC}"
fi
echo ""

# Step 4: Push to repository
echo -e "${YELLOW}📤 Step 4: Pushing to repository...${NC}"
git push
echo -e "${GREEN}✅ Pushed!${NC}"
echo ""

# Step 5: Deploy with --no-cache to force rebuild
echo -e "${YELLOW}🚀 Step 5: Deploying to Fly.io (no cache)...${NC}"
echo "   This will force a complete rebuild on Fly.io"
echo ""

if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl not found!${NC}"
    echo ""
    echo "Install it with:"
    echo "  curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Deploy with no cache to ensure fresh build
flyctl deploy --no-cache --remote-only

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""
    echo "🌐 Verifying deployment..."
    echo ""
    echo "Please check:"
    echo "  1. Landing page shows '[pyth] ai, oracle of matches'"
    echo "  2. GetMatchedPage has new toolkit buttons"
    echo "  3. ServicesPage says 'Founder Toolkit'"
    echo "  4. All [pyth] ai branding is updated"
    echo ""
    echo "📊 Useful commands:"
    echo "   flyctl status    - Check app status"
    echo "   flyctl logs      - View build/deploy logs"
    echo "   flyctl open      - Open in browser"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo ""
    echo "🔍 Check logs:"
    echo "   flyctl logs"
    exit 1
fi
