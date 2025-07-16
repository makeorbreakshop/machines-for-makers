#!/usr/bin/env python3
"""
Debug script to understand xTool S1 price structure and fix selectors.
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

async def debug_xtool_price_structure():
    """Debug the actual price structure on xTool S1 page."""
    
    logger.info("=== DEBUGGING xTool S1 PRICE STRUCTURE ===")
    
    async with PooledDynamicScraper(pool_size=1) as scraper:
        # Navigate to xTool S1 page
        logger.info("Navigating to xTool S1 page...")
        await scraper.page.goto("https://www.xtool.com/products/xtool-s1-laser-cutter", wait_until="domcontentloaded")
        await scraper.page.wait_for_timeout(5000)  # Wait for page to load
        
        # Get page content
        content = await scraper.page.content()
        soup = BeautifulSoup(content, 'lxml')
        
        # Check page title
        title = await scraper.page.title()
        logger.info(f"Page title: {title}")
        
        # Look for price-related elements more systematically
        logger.info("\\n🔍 Searching for price elements systematically:")
        
        # 1. Find all elements containing $ signs
        dollar_elements = soup.find_all(string=re.compile(r'\\$[\\d,]+'))
        logger.info(f"Found {len(dollar_elements)} text nodes containing dollar signs:")
        for i, elem in enumerate(dollar_elements[:10]):  # Show first 10
            text = elem.strip()
            parent = elem.parent
            parent_classes = parent.get('class', []) if parent else []
            parent_id = parent.get('id', '') if parent else ''
            logger.info(f"  {i}: '{text}' - parent: <{parent.name if parent else 'None'}> class='{parent_classes}' id='{parent_id}'")
        
        # 2. Find elements with common price-related classes
        price_class_patterns = [
            'price',
            'money',
            'amount',
            'cost',
            'product-price',
            'current-price',
            'sale-price'
        ]
        
        for pattern in price_class_patterns:
            elements = soup.find_all(class_=re.compile(pattern, re.IGNORECASE))
            if elements:
                logger.info(f"\\n📍 Found {len(elements)} elements with class containing '{pattern}':")
                for i, elem in enumerate(elements[:3]):  # Show first 3
                    text = elem.get_text(strip=True)
                    classes = elem.get('class', [])
                    logger.info(f"  {i}: '{text}' - classes: {classes}")
        
        # 3. Find elements with specific data attributes
        data_attributes = ['data-price', 'data-product-price', 'data-variant-price']
        for attr in data_attributes:
            elements = soup.find_all(attrs={attr: True})
            if elements:
                logger.info(f"\\n📍 Found {len(elements)} elements with {attr}:")
                for i, elem in enumerate(elements[:3]):
                    text = elem.get_text(strip=True)
                    value = elem.get(attr)
                    logger.info(f"  {i}: '{text}' - {attr}='{value}'")
        
        # 4. Check for Shopify-specific price selectors that we tried
        test_selectors = [
            '.product-page-info-price-container',
            '.product-page-info__price',
            '.price--sale',
            '.price__current',
            '.price__sale',
            '.footer-price-bold',
            '.product-badge-price'
        ]
        
        logger.info("\\n🧪 Testing our price selectors:")
        for selector in test_selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    logger.info(f"✅ '{selector}' found {len(elements)} elements:")
                    for i, elem in enumerate(elements[:2]):
                        text = elem.get_text(strip=True)
                        classes = elem.get('class', [])
                        logger.info(f"    {i}: '{text}' - classes: {classes}")
                else:
                    logger.info(f"❌ '{selector}' found no elements")
            except Exception as e:
                logger.error(f"❌ '{selector}' error: {e}")
        
        # 5. Look for any elements that might contain the price we see (around $1899)
        logger.info("\\n💰 Searching for elements containing price values around $1899:")
        
        # Search for various price formats
        price_patterns = [
            r'\\$1,?899',
            r'\\$2,?199',
            r'\\$1,?8\\d{2}',
            r'\\$2,?1\\d{2}',
            r'1,?899',
            r'2,?199'
        ]
        
        for pattern in price_patterns:
            elements = soup.find_all(string=re.compile(pattern))
            if elements:
                logger.info(f"Found elements matching '{pattern}':")
                for elem in elements:
                    text = elem.strip()
                    parent = elem.parent
                    parent_classes = parent.get('class', []) if parent else []
                    parent_id = parent.get('id', '') if parent else ''
                    logger.info(f"  '{text}' - parent: <{parent.name if parent else 'None'}> class='{parent_classes}' id='{parent_id}'")
        
        # 6. Look at the overall page structure for price containers
        logger.info("\\n🏗️  Checking overall page structure:")
        
        # Common e-commerce containers
        containers = soup.find_all(['div', 'section', 'article'], class_=re.compile(r'product|price|info|details', re.IGNORECASE))
        logger.info(f"Found {len(containers)} potential product/price containers")
        
        # Show the first few containers that might contain prices
        for i, container in enumerate(containers[:5]):
            text = container.get_text(strip=True)
            classes = container.get('class', [])
            # Check if this container has any dollar signs
            if '$' in text:
                logger.info(f"Container {i} with prices: classes={classes}")
                # Show first 200 chars of text
                logger.info(f"  Text preview: '{text[:200]}...'")

if __name__ == "__main__":
    asyncio.run(debug_xtool_price_structure())