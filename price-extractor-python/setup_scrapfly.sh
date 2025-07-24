#!/bin/bash

# Setup script for Scrapfly integration

echo "==================================="
echo "Scrapfly Setup Script"
echo "==================================="
echo ""

# Check if API key is already set
if [ -z "$SCRAPFLY_API_KEY" ]; then
    echo "SCRAPFLY_API_KEY is not set."
    echo ""
    echo "To set it temporarily (current session only):"
    echo "  export SCRAPFLY_API_KEY='your_api_key_here'"
    echo ""
    echo "To set it permanently, add to your shell profile:"
    echo "  echo \"export SCRAPFLY_API_KEY='your_api_key_here'\" >> ~/.zshrc"
    echo "  source ~/.zshrc"
    echo ""
    echo "You can find your API key at: https://scrapfly.io/dashboard"
else
    echo "✅ SCRAPFLY_API_KEY is already set: ${SCRAPFLY_API_KEY:0:10}..."
fi

echo ""
echo "Installing Scrapfly SDK..."
pip install scrapfly-sdk

echo ""
echo "Setup complete!"
echo ""
echo "To test the integration, run:"
echo "  python test_scrapfly.py"
echo ""