#!/usr/bin/env python3
"""
Test the updated dynamic scraper for ComMarker B6 MOPA 60W
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.dynamic_scraper import DynamicScraper

logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def test_updated_scraper():
    """Test ComMarker B6 MOPA 60W with updated button selectors"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    machine_name = "ComMarker B6 MOPA 60W"
    
    logger.info("=== TESTING UPDATED COMMARKER B6 MOPA 60W SCRAPER ===")
    logger.info(f"URL: {url}")
    logger.info(f"Machine: {machine_name}")
    
    try:
        async with DynamicScraper() as scraper:
            # Test the extraction
            price, method = await scraper.extract_price_with_variants(
                url=url,
                machine_name=machine_name,
                variant_rules={}  # Using machine name for variant detection
            )
            
            if price:
                logger.info(f"🎉 SUCCESS: Extracted price ${price} via {method}")
                
                # Check if we got the expected $4,589
                if abs(price - 4589) < 10:
                    logger.info("✅ CORRECT! Found the target price $4,589")
                else:
                    logger.warning(f"⚠️ Got ${price} but expected $4,589")
            else:
                logger.error("❌ FAILED: No price extracted")
    
    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_updated_scraper())