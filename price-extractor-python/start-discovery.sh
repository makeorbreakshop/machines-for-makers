#!/bin/bash
# Start script for the Discovery Service (separate from main price extractor)

# Check if we're in the right directory
if [ ! -f "discovery_api.py" ]; then
    echo "Error: discovery_api.py not found. Make sure you're in the price-extractor-python directory."
    exit 1
fi

# Kill any existing processes on port 8001
echo "Checking for existing processes on port 8001..."
EXISTING_PID=$(lsof -ti:8001 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo "Found existing process on port 8001 (PID: $EXISTING_PID)"
    echo "Killing process..."
    kill -9 $EXISTING_PID 2>/dev/null
    sleep 2
    echo "Process killed successfully"
else
    echo "No existing process found on port 8001"
fi

# Double-check port is free
if lsof -ti:8001 >/dev/null 2>&1; then
    echo "Warning: Port 8001 still in use. Trying alternative kill method..."
    pkill -f "discovery_service.py" 2>/dev/null
    pkill -f "discovery_api.py" 2>/dev/null
    sleep 2
fi

# Skip virtual environment activation - use base conda environment
echo "Using base conda environment (aiohttp is installed there)..."

echo ""
echo "=== DISCOVERY SERVICE ==="
echo "Running with system Python where aiohttp is installed"
echo ""

# Start the Discovery service
echo "Starting Discovery Service on port 8001..."
echo "Access the API at: http://localhost:8001"
echo "API docs at: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the discovery service with the conda python explicitly
exec /Users/brandoncullum/miniconda3/bin/python discovery_api.py