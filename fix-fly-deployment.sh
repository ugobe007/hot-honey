#!/bin/bash
# Fix Fly.io Deployment Issues

echo "🔧 Fixing Fly.io Deployment..."
echo ""

# Check if dist folder exists and is built
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "⚠️  dist folder missing or empty - building now..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed! Check for errors above."
        exit 1
    fi
    echo "✅ Build complete"
fi

# Check fly.toml configuration
echo ""
echo "📋 Checking fly.toml configuration..."
if grep -q "min_machines_running = 0" fly.toml; then
    echo "⚠️  Machines can auto-stop (min_machines_running = 0)"
    echo "   This means the site goes down when idle"
    echo ""
    echo "💡 To fix: Change to min_machines_running = 1"
fi

# Check if fly CLI is installed
if ! command -v flyctl &> /dev/null; then
    echo "⚠️  flyctl not found. Install with:"
    echo "   curl -L https://fly.io/install.sh | sh"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🚀 Deploying to Fly.io..."
echo ""

# Deploy
flyctl deploy --remote-only

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🔍 Check status:"
    echo "   flyctl status"
    echo ""
    echo "📊 View logs:"
    echo "   flyctl logs"
    echo ""
    echo "🌐 Open site:"
    echo "   flyctl open"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check logs: flyctl logs"
    echo "   2. Check status: flyctl status"
    echo "   3. Verify build: npm run build"
    echo "   4. Check fly.toml configuration"
fi

