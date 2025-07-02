#!/usr/bin/env python3
"""
Test script for the dynamic scraper browser functionality.
"""

import asyncio
import sys
import os
from loguru import logger

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Fix pyee import issue for Playwright
exec(open('fix_pyee_import.py').read())

from scrapers.dynamic_scraper import DynamicScraper


async def test_dynamic_scraper():
    """Test dynamic scraper browser functionality."""
    
    print("🚀 Testing Dynamic Scraper Browser")
    print("=" * 40)
    
    try:
        async with DynamicScraper() as scraper:
            print("✅ Browser started successfully")
            
            # Test navigation
            url = "https://commarker.com/product/commarker-b6-jpt-mopa/?ref=snlyaljc"
            print(f"📡 Navigating to: {url}")
            
            await scraper.page.goto(url, wait_until='domcontentloaded', timeout=30000)
            print("✅ Navigation successful")
            
            # Test variant selection
            machine_name = "ComMarker B6 MOPA 60W"
            print(f"🎯 Selecting variant for: {machine_name}")
            
            await scraper._select_commarker_variant(machine_name)
            print("✅ Variant selection completed")
            
            # Test price extraction
            price, method = await scraper._extract_price_from_page()
            
            if price:
                print(f"✅ Price extracted: ${price} using {method}")
            else:
                print("❌ Failed to extract price")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        logger.exception("Dynamic scraper test failed")


async def main():
    """Main test function."""
    
    # Configure logging
    logger.remove()
    logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | {message}")
    
    await test_dynamic_scraper()


if __name__ == "__main__":
    asyncio.run(main())