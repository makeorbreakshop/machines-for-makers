#!/usr/bin/env python3
"""Test script to investigate ComMarker B6 30W price extraction issue."""

import asyncio
from loguru import logger
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor
from services.database import DatabaseService
import config
from bs4 import BeautifulSoup

async def test_commarker_b6():
    """Test ComMarker B6 30W extraction directly."""
    db_service = DatabaseService()
    
    # URL that's failing
    url = "https://commarker.com/product/commarker-b6"
    machine_name = "ComMarker B6 30W"
    
    # Initialize scraper
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    try:
        logger.info(f"Testing URL: {url}")
        
        # Get page content
        html_content, soup = await scraper.get_page_content(url)
        
        logger.info(f"Page fetched successfully, size: {len(html_content)} chars")
        
        # Check page title
        title = soup.find('title')
        if title:
            logger.info(f"Page title: {title.get_text()}")
        
        # Look for prices with common selectors
        price_selectors = [
            '.price',
            '.woocommerce-Price-amount',
            '[class*="price"]',
            'span[class*="amount"]',
            'bdi',
            '.single_variation_wrap .price',
            'form.variations_form',
            '.product-info-main .price',
            '.summary .price'
        ]
        
        logger.info("\n=== Searching for prices ===")
        found_prices = []
        
        for selector in price_selectors:
            elements = soup.select(selector)
            if elements:
                logger.info(f"\nSelector '{selector}' found {len(elements)} elements:")
                for i, elem in enumerate(elements[:5]):  # Show first 5
                    text = elem.get_text(strip=True)
                    if '$' in text or any(c.isdigit() for c in text):
                        logger.info(f"  [{i}] {text}")
                        found_prices.append((selector, text))
        
        # Check for JSON-LD structured data
        logger.info("\n=== Checking structured data ===")
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                import json
                data = json.loads(script.string)
                if 'offers' in str(data):
                    logger.info(f"Found JSON-LD with offers: {json.dumps(data, indent=2)[:500]}...")
            except:
                pass
        
        # Check meta tags
        logger.info("\n=== Checking meta tags ===")
        meta_tags = soup.find_all('meta', property=lambda x: x and 'price' in x.lower())
        for tag in meta_tags:
            logger.info(f"Meta tag: {tag}")
        
        # Now test with PriceExtractor
        logger.info("\n=== Testing PriceExtractor ===")
        extractor = PriceExtractor(db_service)
        
        machine_data = {
            'name': machine_name,
            'Machine Name': machine_name,
            'old_price': 2299.00  # Expected price
        }
        
        price, method = await extractor.extract_price(
            html_content,
            url,
            machine_name,
            2299.00,
            soup=soup,
            machine_data=machine_data
        )
        
        if price:
            logger.success(f"✅ Extracted price: ${price} using method: {method}")
        else:
            logger.error("❌ Failed to extract price")
            
            # Show what the extractor saw
            logger.info("\n=== Page sample for debugging ===")
            # Find product summary area
            summary = soup.find(class_='summary') or soup.find(class_='product-summary')
            if summary:
                logger.info(f"Product summary HTML:\n{summary.prettify()[:1000]}...")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_commarker_b6())