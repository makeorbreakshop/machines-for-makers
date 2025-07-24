#!/bin/bash
# Test runner that handles environment setup

echo "🚀 Running Simplified Discovery Test"
echo "=================================="

# Check if discovery service is running
if ! curl -s http://localhost:8001/health > /dev/null; then
    echo "❌ Discovery service is not running!"
    echo "Please start it in another terminal with:"
    echo "cd price-extractor-python && ./start-discovery"
    exit 1
fi

echo "✅ Discovery service is running"

# Find python executable
if [ -f "venv/bin/python" ]; then
    PYTHON="venv/bin/python"
elif [ -f ".venv/bin/python" ]; then
    PYTHON=".venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON="python3"
else
    PYTHON="python"
fi

echo "Using Python: $PYTHON"
echo ""

# Run the test
$PYTHON test_simplified_discovery.py