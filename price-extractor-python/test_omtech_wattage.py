#!/usr/bin/env python3
"""Debug script to find wattage info on OMTech page."""

import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from bs4 import BeautifulSoup
import re
from loguru import logger

async def find_wattage_info():
    """Find wattage information on OMTech page."""
    
    # Initialize services
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # OMTech URL
    url = "https://omtechlaser.com/products/omtech-pro-2440-80w-and-100w-co2-laser-engraver-cutting-machine-with-autofocus-and-built-in-water-chiller"
    
    logger.info("Fetching OMTech page...")
    html_content, soup = await scraper.get_page_content(url)
    
    if not soup:
        logger.error("Failed to fetch page")
        return
    
    # Look for variant selectors or options
    logger.info("\n=== Looking for variant/option elements ===")
    
    # Common WooCommerce variant selectors
    selectors = [
        'select.variations',
        'input[name="variation_id"]',
        'input[name="attribute_power"]',
        'input[name="attribute_wattage"]',
        '.variations_form',
        '.variation',
        'input[type="radio"]',
        'label.wd-swatch'
    ]
    
    for selector in selectors:
        elements = soup.select(selector)
        if elements:
            logger.info(f"\nFound {len(elements)} elements for selector: {selector}")
            for elem in elements[:3]:  # Show first 3
                logger.info(f"  {elem.name}: {elem.get('value', elem.text[:50])}")
    
    # Look for any text mentioning the SKUs with wattage
    logger.info("\n=== Looking for SKU-wattage mapping ===")
    
    # Search for USB-2440-US (80W) and USB-2440-U1 (100W)
    text_with_sku1 = soup.find_all(text=re.compile(r'USB-2440-US'))
    text_with_sku2 = soup.find_all(text=re.compile(r'USB-2440-U1'))
    
    logger.info(f"Found {len(text_with_sku1)} mentions of USB-2440-US")
    logger.info(f"Found {len(text_with_sku2)} mentions of USB-2440-U1")
    
    # Look for wattage options in any form elements
    forms = soup.find_all('form', class_='variations_form')
    for form in forms:
        logger.info("\n=== Found variations form ===")
        # Look for data attributes
        for attr, value in form.attrs.items():
            if 'data' in attr and 'variation' in attr:
                logger.info(f"  {attr}: {str(value)[:100]}...")

if __name__ == "__main__":
    asyncio.run(find_wattage_info())