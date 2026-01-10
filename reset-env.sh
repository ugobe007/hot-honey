#!/bin/bash
# Reset .env file - backup existing and create clean template

echo "🔄 Resetting .env file..."

# Backup existing .env if it exists
if [ -f .env ]; then
    echo "📦 Backing up existing .env to .env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
fi

# Create clean .env template
cat > .env << 'EOF'
# Supabase Configuration
# Replace the values below with your actual Supabase credentials

VITE_SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Alternative variable names (use either set above or below, not both)
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=

# Optional: Other variables you may need
# GETLATE_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
EOF

echo ""
echo "✅ Clean .env file created!"
echo ""
echo "📝 Next steps:"
echo "   1. Open .env file: nano .env  (or use your editor)"
echo "   2. Add your Supabase URL after VITE_SUPABASE_URL="
echo "   3. Add your Supabase Service Key after SUPABASE_SERVICE_KEY="
echo "   4. Save the file"
echo ""
echo "🔍 Verify it worked:"
echo "   node check-env.js"
echo ""

