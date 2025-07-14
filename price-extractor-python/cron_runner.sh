#!/bin/bash
# Daily price tracker automation script

echo "🚀 Starting Price Tracker - $(date)"

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

# Run batch update - force ALL machines with days=0
echo "🔄 Starting batch price update for ALL machines..."
RESPONSE=$(curl -X POST http://localhost:8000/api/v1/batch-update \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 20, "days_threshold": 0}' \
  -s)

echo "📊 Batch started: $RESPONSE"

# Wait for batch to complete (adjust based on your needs)
# 20 machines * ~30 seconds each = ~10 minutes, but we'll give it extra time
echo "⏰ Waiting for batch to complete (45 minutes)..."
sleep 2700  # 45 minutes

# Stop the server
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo "✅ Price Tracker completed - $(date)"
echo "----------------------------------------"