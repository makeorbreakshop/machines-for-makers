#!/usr/bin/env python3
"""
Test script for the full price extraction pipeline including validation and fallback to Claude MCP.
This simulates a real machine price update.
"""

import asyncio
import sys
import os
from loguru import logger

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fix pyee import issue for Playwright
exec(open('fix_pyee_import.py').read())

from scrapers.price_extractor import PriceExtractor
from bs4 import BeautifulSoup
import aiohttp


async def test_full_pipeline():
    """Test the full price extraction pipeline with ComMarker B6 MOPA 60W."""
    
    print("🚀 Testing Full Price Extraction Pipeline")
    print("=" * 50)
    
    # Test data - this represents a machine update scenario
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/?ref=snlyaljc"
    machine_name = "ComMarker B6 MOPA 60W"
    old_price = 4319.0  # Previous price that should trigger validation
    
    # Simulate machine data with learned selectors
    machine_data = {
        'id': 'test-machine-123',
        'learned_selectors': {
            'commarker.com': {
                'selector': '.old-selector',  # This will fail and trigger Claude MCP
                'last_success': '2025-07-01T10:00:00Z',
                'confidence': 0.8,
                'price_found': 4319.0
            }
        }
    }
    
    print(f"URL: {url}")
    print(f"Machine: {machine_name}")
    print(f"Old Price: ${old_price:,.2f}")
    print(f"Expected: ~$4,589 (should trigger validation and Claude MCP fallback)")
    print()
    
    # Initialize the price extractor
    extractor = PriceExtractor()
    
    try:
        # Step 1: Get HTML content
        print("📡 Fetching HTML content...")
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                html_content = await response.text()
                soup = BeautifulSoup(html_content, 'lxml')
        
        print("✅ HTML content fetched")
        print()
        
        # Step 2: Run the full extraction pipeline
        print("🔍 Running full extraction pipeline...")
        print("   This will test:")
        print("   1. Learned selectors (should fail)")
        print("   2. Site-specific extraction (should find wrong price)")
        print("   3. Price validation (should fail due to old price)")
        print("   4. Claude MCP fallback (should find correct price)")
        print()
        
        price, method = await extractor.extract_price(
            soup=soup,
            html_content=html_content,
            url=url,
            old_price=old_price,
            machine_name=machine_name,
            machine_data=machine_data
        )
        
        if price:
            print(f"✅ SUCCESS!")
            print(f"   Final Price: ${price:,.2f}")
            print(f"   Method Used: {method}")
            print()
            
            # Validate the result
            if 4500 <= price <= 4700:
                print("✅ Price validation PASSED (within expected range $4,500-$4,700)")
            else:
                print(f"⚠️  Price validation WARNING: ${price} outside expected range")
                
            # Check price change from old price
            change_percent = abs(price - old_price) / old_price * 100
            print(f"📊 Price change from previous: {change_percent:.1f}%")
            
            if change_percent <= 30:  # ComMarker threshold
                print("✅ Price change validation PASSED")
            else:
                print(f"⚠️  Price change validation WARNING: {change_percent:.1f}% > 30% threshold")
                
            # Check if Claude MCP was used
            if "Claude MCP" in method:
                print("✅ Claude MCP fallback was successfully used")
                print("✅ Selector learning should have occurred")
            else:
                print(f"ℹ️  Method used was: {method}")
                
        else:
            print("❌ FAILED to extract price")
            print(f"   Method attempted: {method}")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        logger.exception("Full pipeline test failed")
    
    print()
    print("🏁 Full pipeline test completed")


async def main():
    """Main test function."""
    
    # Configure logging
    logger.remove()
    logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")
    
    print("Testing Full Price Extraction Pipeline")
    print("This test validates the complete intelligent price extraction system")
    print("including validation, fallbacks, and Claude MCP integration")
    print()
    
    await test_full_pipeline()


if __name__ == "__main__":
    asyncio.run(main())