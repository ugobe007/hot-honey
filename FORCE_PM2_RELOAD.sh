#!/bin/bash
# Force PM2 to completely reload the autopilot with fresh code

echo "🔄 Force reloading PM2 autopilot..."

# Stop and delete the process
pm2 stop hot-match-autopilot
pm2 delete hot-match-autopilot

# Clear PM2 cache
pm2 flush

# Wait a moment
sleep 2

# Start fresh with updated environment
cd /Users/leguplabs/Desktop/hot-honey
pm2 start scripts/core/hot-match-autopilot.js \
  --name hot-match-autopilot \
  --update-env \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z"

echo ""
echo "✅ PM2 reloaded!"
echo ""
echo "Check status:"
pm2 status
echo ""
echo "Check logs:"
pm2 logs hot-match-autopilot --lines 20

