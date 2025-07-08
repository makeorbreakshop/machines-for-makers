#!/usr/bin/env python3
"""
Simple test for ComMarker price extraction through the full pipeline.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.price_extractor import PriceExtractor
from scrapers.web_scraper import WebScraper

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")

# ComMarker test cases
COMMARKER_TEST_CASES = [
    {
        "name": "ComMarker B4 30W",
        "url": "https://www.commarker.com/products/commarker-b4-fiber-laser-engraver",
        "expected_price": 1799.0,
        "old_price": 50.0  # The buggy price
    },
    {
        "name": "ComMarker B6 30W",
        "url": "https://www.commarker.com/products/b6-enclosed-fiber-laser-engraver",
        "expected_price": 2399.0,
        "old_price": 50.0
    }
]


async def test_extraction():
    """Test ComMarker extraction through full pipeline."""
    web_scraper = WebScraper()
    price_extractor = PriceExtractor()
    
    logger.info("TESTING COMMARKER PRICE EXTRACTION")
    logger.info("Testing through full extraction pipeline\n")
    
    for test_case in COMMARKER_TEST_CASES:
        logger.info(f"{'='*60}")
        logger.info(f"Testing: {test_case['name']}")
        logger.info(f"URL: {test_case['url']}")
        logger.info(f"Old price: ${test_case['old_price']}")
        logger.info(f"Expected: ${test_case['expected_price']}")
        
        try:
            # Fetch page
            html_content, soup = await web_scraper.get_page_content(test_case['url'])
            
            if not soup:
                logger.error("Failed to fetch page")
                continue
                
            # Extract price
            price, method = await price_extractor.extract_price(
                soup=soup,
                html_content=html_content,
                url=test_case['url'],
                old_price=test_case['old_price'],
                machine_name=test_case['name'],
                machine_data={}
            )
            
            if price is None:
                logger.error(f"❌ FAILED: No price extracted")
            elif price == 50:
                logger.error(f"❌ BUG STILL EXISTS: Extracted $50!")
            elif abs(price - test_case['expected_price']) < 1:
                logger.success(f"✅ SUCCESS: Extracted ${price} using {method}")
            else:
                logger.error(f"❌ WRONG PRICE: Got ${price}, expected ${test_case['expected_price']}")
                
        except Exception as e:
            logger.error(f"❌ ERROR: {str(e)}")
            
        await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(test_extraction())