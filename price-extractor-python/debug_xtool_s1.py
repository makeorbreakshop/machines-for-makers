#!/usr/bin/env python3
"""
Debug script to check what's actually on the xTool S1 page.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.browser_pool import PooledDynamicScraper
from bs4 import BeautifulSoup
import re

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def debug_xtool_s1():
    """Debug what's actually on the xTool S1 page."""
    
    logger.info("=== DEBUGGING xTool S1 PAGE ===")
    
    async with PooledDynamicScraper(pool_size=1) as scraper:
        # Navigate to xTool S1 page
        logger.info("Navigating to xTool S1 page...")
        await scraper.page.goto("https://www.xtool.com/products/xtool-s1", wait_until="domcontentloaded")
        await scraper.page.wait_for_timeout(5000)  # Wait for page to load
        
        # Get page content
        content = await scraper.page.content()
        soup = BeautifulSoup(content, 'lxml')
        
        # Check if page loaded properly
        title = await scraper.page.title()
        logger.info(f"Page title: {title}")
        
        # Check for common price-related elements
        price_patterns = [
            '.money',
            '.price',
            '.product__price',
            '.price__current',
            '.price__sale',
            '[data-price]',
            '*[class*="price"]',
            '*[class*="money"]'
        ]
        
        logger.info("\\n🔍 Checking for price elements:")
        for pattern in price_patterns:
            try:
                elements = soup.select(pattern)
                if elements:
                    logger.info(f"✅ Found {len(elements)} elements matching '{pattern}'")
                    for i, elem in enumerate(elements[:3]):  # Show first 3
                        text = elem.get_text(strip=True)
                        classes = elem.get('class', [])
                        logger.info(f"  Element {i}: text='{text}', classes={classes}")
                else:
                    logger.info(f"❌ No elements found for '{pattern}'")
            except Exception as e:
                logger.error(f"Error checking pattern '{pattern}': {e}")
        
        # Look for any dollar signs in the page
        logger.info("\\n💰 Searching for dollar signs in page content:")
        dollar_matches = re.findall(r'\\$[\\d,]+(?:\\.\\d{2})?', content)
        if dollar_matches:
            logger.info(f"Found {len(dollar_matches)} dollar amounts: {dollar_matches[:10]}")
        else:
            logger.info("No dollar signs found in page content")
        
        # Check if page has any price-related text
        text_content = soup.get_text().lower()
        price_keywords = ['price', 'cost', 'buy', 'purchase', 'add to cart', 'checkout']
        logger.info("\\n🔍 Checking for price-related keywords:")
        for keyword in price_keywords:
            if keyword in text_content:
                logger.info(f"✅ Found '{keyword}' in page text")
            else:
                logger.info(f"❌ '{keyword}' not found in page text")
        
        # Check if this is actually a product page
        logger.info("\\n📄 Page analysis:")
        logger.info(f"Page URL: {scraper.page.url}")
        logger.info(f"Page size: {len(content)} characters")
        
        # Look for specific xTool S1 content
        if "S1" in content:
            logger.info("✅ Page contains 'S1' text")
        else:
            logger.info("❌ Page does NOT contain 'S1' text")
        
        # Check for common e-commerce platform indicators
        platforms = {
            'Shopify': ['shopify', 'shop-js', 'Shopify.theme'],
            'WooCommerce': ['woocommerce', 'wp-content'],
            'Magento': ['magento', 'mage'],
            'Custom': ['xtool', 'x-tool']
        }
        
        logger.info("\\n🏪 E-commerce platform detection:")
        for platform, indicators in platforms.items():
            found = any(indicator in content for indicator in indicators)
            logger.info(f"{'✅' if found else '❌'} {platform}: {found}")
        
        # Save a screenshot for manual inspection
        try:
            await scraper.page.screenshot(path="xtool_s1_debug.png")
            logger.info("📸 Screenshot saved to xtool_s1_debug.png")
        except Exception as e:
            logger.error(f"Failed to save screenshot: {e}")

if __name__ == "__main__":
    asyncio.run(debug_xtool_s1())