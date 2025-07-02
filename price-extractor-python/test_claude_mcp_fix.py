#!/usr/bin/env python3
"""
Test script for the fixed Claude MCP client.
This tests the ComMarker B6 MOPA 60W price extraction using the new Claude MCP approach.
"""

import asyncio
import sys
import os
from loguru import logger

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fix pyee import issue for Playwright
exec(open('fix_pyee_import.py').read())

from scrapers.claude_mcp_client import ClaudeMCPClient


async def test_commarker_extraction():
    """Test ComMarker B6 MOPA 60W price extraction with fixed Claude MCP."""
    
    print("🚀 Testing Fixed Claude MCP Client")
    print("=" * 50)
    
    # Test data
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/?ref=snlyaljc"
    machine_name = "ComMarker B6 MOPA 60W"
    old_price = 4319.0  # Previous price for context
    
    print(f"URL: {url}")
    print(f"Machine: {machine_name}")
    print(f"Expected price: ~$4,589 (was ${old_price})")
    print()
    
    # Initialize Claude MCP client
    client = ClaudeMCPClient()
    
    try:
        print("📡 Starting Claude MCP extraction...")
        price, method = await client.extract_price_with_automation(url, machine_name, old_price)
        
        if price:
            print(f"✅ SUCCESS!")
            print(f"   Price: ${price:,.2f}")
            print(f"   Method: {method}")
            print()
            
            # Validate the result
            if 4500 <= price <= 4700:
                print("✅ Price validation PASSED (within expected range $4,500-$4,700)")
            else:
                print(f"⚠️  Price validation WARNING: ${price} outside expected range")
                
            # Check price change from old price
            if old_price:
                change_percent = abs(price - old_price) / old_price * 100
                print(f"📊 Price change from previous: {change_percent:.1f}%")
                
                if change_percent <= 30:  # ComMarker threshold
                    print("✅ Price change validation PASSED")
                else:
                    print(f"⚠️  Price change validation WARNING: {change_percent:.1f}% > 30% threshold")
            
        else:
            print("❌ FAILED to extract price")
            print(f"   Method attempted: {method}")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        logger.exception("Test failed with exception")
    
    print()
    print("🏁 Test completed")


async def main():
    """Main test function."""
    
    # Configure logging
    logger.remove()
    logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")
    
    print("Testing Fixed Claude MCP Client for Price Extraction")
    print("This test validates the Claude MCP approach that simulates browser automation")
    print()
    
    await test_commarker_extraction()


if __name__ == "__main__":
    asyncio.run(main())