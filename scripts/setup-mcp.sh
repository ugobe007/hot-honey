#!/bin/bash

# MCP Server Setup Script
# This script helps configure MCP servers for Cursor IDE

set -e

echo "🔧 MCP Server Setup Script"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Check for Resend API key
if ! grep -q "RESEND_API_KEY=" .env || grep -q "RESEND_API_KEY=$" .env || grep -q "RESEND_API_KEY=your" .env; then
    echo -e "${YELLOW}⚠️  RESEND_API_KEY not found in .env${NC}"
    read -p "Enter your Resend API key (or press Enter to skip): " resend_key
    if [ ! -z "$resend_key" ]; then
        if grep -q "RESEND_API_KEY=" .env; then
            sed -i.bak "s/RESEND_API_KEY=.*/RESEND_API_KEY=$resend_key/" .env
        else
            echo "RESEND_API_KEY=$resend_key" >> .env
        fi
        echo -e "${GREEN}✅ Added RESEND_API_KEY to .env${NC}"
    fi
else
    echo -e "${GREEN}✅ RESEND_API_KEY already configured${NC}"
fi

# Check for TestSprite API key
if ! grep -q "TESTSPRITE_API_KEY=" .env || grep -q "TESTSPRITE_API_KEY=$" .env || grep -q "TESTSPRITE_API_KEY=your" .env; then
    echo -e "${YELLOW}⚠️  TESTSPRITE_API_KEY not found in .env${NC}"
    read -p "Enter your TestSprite API key (or press Enter to skip): " testsprite_key
    if [ ! -z "$testsprite_key" ]; then
        if grep -q "TESTSPRITE_API_KEY=" .env; then
            sed -i.bak "s/TESTSPRITE_API_KEY=.*/TESTSPRITE_API_KEY=$testsprite_key/" .env
        else
            echo "TESTSPRITE_API_KEY=$testsprite_key" >> .env
        fi
        echo -e "${GREEN}✅ Added TESTSPRITE_API_KEY to .env${NC}"
    fi
else
    echo -e "${GREEN}✅ TESTSPRITE_API_KEY already configured${NC}"
fi

# Check for MCP config file
MCP_CONFIG="$HOME/.cursor/mcp.json"

if [ ! -f "$MCP_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  MCP config file not found at $MCP_CONFIG${NC}"
    echo "Creating default MCP configuration..."
    
    # Get API keys from .env
    RESEND_KEY=$(grep "RESEND_API_KEY=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    TESTSPRITE_KEY=$(grep "TESTSPRITE_API_KEY=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    mkdir -p "$HOME/.cursor"
    cat > "$MCP_CONFIG" << EOF
{
  "mcpServers": {
    "Resend": {
      "name": "Resend",
      "url": "https://resend.com/docs/mcp",
      "headers": {
        "Authorization": "Bearer ${RESEND_KEY:-YOUR_RESEND_API_KEY}"
      }
    },
    "TestSprite": {
      "command": "npx @testsprite/testsprite-mcp@latest",
      "env": {
        "API_KEY": "${TESTSPRITE_KEY:-YOUR_TESTSPRITE_API_KEY}"
      },
      "args": []
    }
  }
}
EOF
    echo -e "${GREEN}✅ Created MCP config at $MCP_CONFIG${NC}"
    echo -e "${YELLOW}⚠️  Please update the API keys in the config file if they weren't set${NC}"
else
    echo -e "${GREEN}✅ MCP config file exists at $MCP_CONFIG${NC}"
    echo -e "${YELLOW}💡 You may need to update API keys manually in the config file${NC}"
fi

echo ""
echo "=========================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify API keys in .env file"
echo "2. Update ~/.cursor/mcp.json with your API keys if needed"
echo "3. Restart Cursor IDE to load MCP servers"
echo ""
echo "For more information, see MCP_SETUP.md"


