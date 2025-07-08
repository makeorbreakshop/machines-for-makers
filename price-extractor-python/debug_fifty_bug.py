#!/usr/bin/env python3
"""
Debug the $50 bug by simulating the exact extraction process
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from scrapers.site_specific_extractors import SiteSpecificExtractor

# Configure detailed logging
logger.remove()
logger.add(sys.stdout, level="DEBUG", format="{time:HH:mm:ss} | {level} | {message}")

async def debug_extraction():
    """Debug ComMarker B4 extraction"""
    
    url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"
    machine_name = "ComMarker B4 30W"
    
    logger.info(f"DEBUGGING $50 BUG")
    logger.info(f"URL: {url}")
    logger.info(f"Machine: {machine_name}")
    logger.info("="*60)
    
    # Initialize components
    web_scraper = WebScraper()
    price_extractor = PriceExtractor()
    site_extractor = SiteSpecificExtractor()
    
    # Check site-specific rules
    if 'commarker.com' in site_extractor.site_rules:
        logger.info("ComMarker rules are loaded")
    
    try:
        # Fetch page
        logger.info("Fetching page...")
        html_content, soup = await web_scraper.get_page_content(url)
        
        if not soup:
            logger.error("Failed to fetch page")
            return
            
        logger.info(f"Page fetched, HTML size: {len(html_content)} chars")
        
        # Try extraction
        logger.info("\nAttempting price extraction...")
        price, method = await price_extractor.extract_price(
            soup=soup,
            html_content=html_content,
            url=url,
            old_price=2399.0,  # Previous correct price
            machine_name=machine_name,
            machine_data={}
        )
        
        logger.info(f"\nEXTRACTION RESULT:")
        logger.info(f"Price: ${price}")
        logger.info(f"Method: {method}")
        
        if price == 50:
            logger.error("❌ BUG CONFIRMED: Extracted $50!")
        elif price == 1799:
            logger.success("✅ SUCCESS: Extracted correct price $1799!")
        else:
            logger.warning(f"⚠️  Extracted ${price} (expected $1799)")
            
    except Exception as e:
        logger.error(f"Error during extraction: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(debug_extraction())