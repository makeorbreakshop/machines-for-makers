#!/bin/bash
# Quick test version of cron runner - only processes 2 machines

echo "🧪 TEST MODE - Price Tracker - $(date)"

cd /Users/brandoncullum/machines-for-makers/price-extractor-python

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
fi

# Kill any existing processes on port 8000
EXISTING_PID=$(lsof -ti:8000)
if [ ! -z "$EXISTING_PID" ]; then
    echo "🛑 Killing existing process on port 8000..."
    kill -9 $EXISTING_PID
    sleep 2
fi

# Start the FastAPI server in background
echo "📡 Starting FastAPI server..."
python main.py &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 15

# Check if server is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Server failed to start"
    exit 1
fi

echo "✅ Server is ready"

# Run TEST batch - only 2 machines, all machines regardless of last update
echo "🔄 TEST: Updating 2 machines..."
RESPONSE=$(curl -X POST http://localhost:8000/api/v1/batch-update \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 20, "days_threshold": 0, "limit": 2}' \
  -s)

echo "📊 Test batch started: $RESPONSE"

# Only wait 2 minutes for test
echo "⏰ Waiting 2 minutes for test batch..."
sleep 120

# Stop the server
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo "✅ TEST completed - $(date)"