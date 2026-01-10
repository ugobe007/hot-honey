#!/bin/bash

# Deploy [pyth] ai to Fly.io
# This script commits changes, pushes to git, and deploys to Fly.io

set -e

echo "🚀 Deploying [pyth] ai to Fly.io for Andy"
echo "═══════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build the app
echo -e "${YELLOW}📦 Step 1: Building the app...${NC}"
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ Build failed! dist folder is missing.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Step 2: Check git status
echo -e "${YELLOW}📋 Step 2: Checking git status...${NC}"
git status

echo ""
read -p "Continue with commit and push? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Step 3: Add all changes
echo -e "${YELLOW}➕ Step 3: Staging changes...${NC}"
git add -A

# Step 4: Commit
echo -e "${YELLOW}💾 Step 4: Committing changes...${NC}"
git commit -m "Deploy [pyth] ai updates: rebrand, admin guide, UI improvements

- Rebranded to [pyth] ai throughout platform
- Added origin story and Oracle of Truth messaging
- Updated landing page with new tagline and links
- Redesigned GetMatchedPage (removed Smart Matching, promoted toolkits)
- Added comprehensive admin guide for Andy
- Improved Founder Toolkit button styling (blue-violet gradient)
- Added industry rankings page with horizontal bar chart
- Updated footer messaging throughout

Ready for production deployment."

echo -e "${GREEN}✅ Committed!${NC}"
echo ""

# Step 5: Push to repository
echo -e "${YELLOW}📤 Step 5: Pushing to repository...${NC}"
git push

echo -e "${GREEN}✅ Pushed!${NC}"
echo ""

# Step 6: Deploy to Fly.io
echo -e "${YELLOW}🌐 Step 6: Deploying to Fly.io...${NC}"
echo ""

# Check if flyctl is available
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl not found!${NC}"
    echo ""
    echo "Install it with:"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo ""
    echo "Or deploy manually:"
    echo "  flyctl deploy --remote-only"
    exit 1
fi

# Deploy
flyctl deploy --remote-only

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════${NC}"
    echo ""
    echo "🌐 Your app should be live at:"
    flyctl status | grep -i "Hostname" || echo "   Run 'flyctl status' to see your URL"
    echo ""
    echo "📊 Useful commands:"
    echo "   flyctl status    - Check app status"
    echo "   flyctl logs      - View logs"
    echo "   flyctl open      - Open in browser"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check logs: flyctl logs"
    echo "   2. Check status: flyctl status"
    echo "   3. Verify build: ls -la dist/"
    echo ""
    exit 1
fi
