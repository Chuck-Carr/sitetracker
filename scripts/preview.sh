#!/bin/bash
set -e

echo "Building production bundle..."
npm run build

echo "Copying static assets to standalone output..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo ""
echo "✅ Starting production server"
echo ""
echo "   Your Mac:       http://localhost:3000"
echo "   Other devices:  http://${LOCAL_IP}:3000"
echo ""

node --env-file=.env.local .next/standalone/server.js
