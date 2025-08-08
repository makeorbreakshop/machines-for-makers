#!/usr/bin/env python3
"""Test the ComMarker B6 30W fix."""

import asyncio
from loguru import logger
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.site_specific_extractors import SiteSpecificExtractor
from services.database import DatabaseService
from bs4 import BeautifulSoup

async def test_commarker_fix():
    """Test ComMarker B6 30W with fixed rules."""
    db_service = DatabaseService()
    
    # URL that's failing
    url = "https://commarker.com/product/commarker-b6"
    machine_name = "ComMarker B6 30W"
    
    # Initialize scraper
    scraper = ScrapflyWebScraper(database_service=db_service)
    extractor = SiteSpecificExtractor()
    
    try:
        logger.info(f"Testing URL: {url}")
        
        # Get page content
        html_content, soup = await scraper.get_page_content(url)
        
        logger.info(f"Page fetched successfully, size: {len(html_content)} chars")
        
        # Test site-specific extraction
        machine_data = {
            'name': machine_name,
            'Machine Name': machine_name,
            'old_price': 2299.00
        }
        
        price, method = extractor.extract_price_with_rules(
            soup,
            html_content,
            url,
            machine_data
        )
        
        if price:
            logger.success(f"✅ Extracted price: ${price} using method: {method}")
        else:
            logger.error("❌ Failed to extract price")
            
            # Debug: show what prices we're finding with the new selectors
            new_selectors = [
                '.summary .price ins .woocommerce-Price-amount.amount bdi',
                '.summary .price .woocommerce-Price-amount.amount bdi',
                '.wd-swatch-tooltip .price ins bdi',
                '.wd-swatch-tooltip .price bdi'
            ]
            
            logger.info("\n=== Testing new selectors ===")
            for selector in new_selectors:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"Selector '{selector}' found {len(elements)} elements:")
                    for elem in elements[:3]:
                        logger.info(f"  - {elem.get_text(strip=True)}")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_commarker_fix())