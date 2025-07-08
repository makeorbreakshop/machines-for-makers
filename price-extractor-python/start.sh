#!/bin/bash
# Simple start script for the Price Extractor API server

# Ensure the script is executable
chmod +x start.sh

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "Error: main.py not found. Make sure you're in the price-extractor-python directory."
    exit 1
fi

# Kill any existing processes on port 8000
echo "Checking for existing processes on port 8000..."
EXISTING_PID=$(lsof -ti:8000)
if [ ! -z "$EXISTING_PID" ]; then
    echo "Killing existing process on port 8000 (PID: $EXISTING_PID)..."
    kill -9 $EXISTING_PID
    sleep 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
fi

# Start the FastAPI server
echo "Starting Price Extractor API server on port 8000..."
echo "Access the API at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the main FastAPI application
python main.py