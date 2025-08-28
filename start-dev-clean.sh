#!/bin/bash

echo "🔧 Cleaning up existing development servers..."

# Kill any existing Next.js dev servers (port 3000)
echo "Killing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill any existing Node processes that might be running dev servers
echo "Killing existing Node dev processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*dev" 2>/dev/null || true

# Kill any MCP browser processes
echo "Killing MCP browser processes..."
pkill -f "mcp.*browser" 2>/dev/null || true
pkill -f "playwright" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

echo "✅ Cleanup complete! Starting fresh development server..."
echo ""

# Start the development server
npm run dev