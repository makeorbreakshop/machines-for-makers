#!/bin/bash
# Daily price tracker automation script

echo "🚀 Starting Price Tracker - $(date)"

cd /Users/brandoncullum/machines-for-makers/price-extractor-python

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
fi

# Check if server is already running and healthy
SERVER_NEEDS_START=false
EXISTING_PID=$(lsof -ti:8000 | head -1)

if [ ! -z "$EXISTING_PID" ]; then
    echo "📡 Found existing process on port 8000 (PID: $EXISTING_PID)"
    echo "🔍 Checking if existing server is healthy..."
    
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Existing server is healthy - will use it for batch update"
        SERVER_PID=$EXISTING_PID
    else
        echo "⚠️ Existing server is not responding, attempting to restart..."
        kill -9 $EXISTING_PID 2>/dev/null
        sleep 2
        SERVER_NEEDS_START=true
    fi
else
    echo "📡 No server running on port 8000"
    SERVER_NEEDS_START=true
fi

# Start server if needed
if [ "$SERVER_NEEDS_START" = true ]; then
    echo "🚀 Starting new FastAPI server..."
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
    
    echo "✅ New server is ready"
fi

# Run batch update - force ALL machines with days=0
echo "🔄 Starting batch price update for ALL machines..."
RESPONSE=$(curl -X POST http://localhost:8000/api/v1/batch-update \
  -H "Content-Type: application/json" \
  -d '{"days_threshold": 0, "max_workers": 8, "use_scrapfly": true}' \
  -s)

echo "📊 Batch started: $RESPONSE"

# Wait for batch to complete (adjust based on your needs)
# 20 machines * ~30 seconds each = ~10 minutes, but we'll give it extra time
echo "⏰ Waiting for batch to complete (45 minutes)..."
sleep 2700  # 45 minutes

# Stop the server ONLY if we started it
if [ "$SERVER_NEEDS_START" = true ]; then
    echo "🛑 Stopping server we started..."
    kill $SERVER_PID 2>/dev/null
else
    echo "ℹ️ Leaving existing server running (it was already running before cron job)"
fi

echo "✅ Price Tracker completed - $(date)"
echo "----------------------------------------"