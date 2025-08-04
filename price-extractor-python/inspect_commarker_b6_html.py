#!/usr/bin/env python3
"""
Inspect ComMarker B6 HTML structure to find Basic Bundle pricing
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from scrapers.hybrid_web_scraper import get_hybrid_scraper
from bs4 import BeautifulSoup
from loguru import logger
import re

async def inspect_html_structure():
    """Inspect the HTML to find bundle pricing structure."""
    
    url = "https://commarker.com/product/commarker-b6/"
    
    logger.info("🔍 Inspecting ComMarker B6 HTML for Bundle Structure")
    logger.info(f"URL: {url}")
    
    try:
        # Get page content
        scraper = get_hybrid_scraper()
        html_content, soup = await scraper.get_page_content(url)
        
        if not html_content or not soup:
            logger.error("❌ Failed to fetch page content")
            return
        
        logger.info(f"✅ Page fetched: {len(html_content)} chars")
        
        # Search for text containing "Basic Bundle" or "2399"
        basic_bundle_elements = soup.find_all(string=re.compile(r'basic.*bundle', re.IGNORECASE))
        if basic_bundle_elements:
            logger.info(f"🎯 Found 'Basic Bundle' text elements: {len(basic_bundle_elements)}")
            for i, elem in enumerate(basic_bundle_elements):
                parent = elem.parent
                logger.info(f"   {i+1}. Text: '{elem.strip()}'")
                logger.info(f"      Parent: {parent.name} {parent.get('class', '')}")
        
        # Search for $2399 or 2399
        price_2399_elements = soup.find_all(string=re.compile(r'2,?399'))
        if price_2399_elements:
            logger.info(f"🎯 Found '2399' price elements: {len(price_2399_elements)}")
            for i, elem in enumerate(price_2399_elements):
                parent = elem.parent
                context = parent.parent if parent.parent else parent
                logger.info(f"   {i+1}. Text: '{elem.strip()}'")
                logger.info(f"      Parent: {parent.name} {parent.get('class', '')}")
                logger.info(f"      Context: {context.name} {context.get('class', '')}")
        
        # Search for all price-like elements and their context
        all_prices = soup.find_all(string=re.compile(r'\$[0-9,]+'))
        logger.info(f"🔍 All price-like elements found: {len(all_prices)}")
        
        unique_prices = set()
        for elem in all_prices:
            price_text = elem.strip()
            if price_text not in unique_prices:
                unique_prices.add(price_text)
                parent = elem.parent
                grandparent = parent.parent if parent.parent else None
                
                # Get more context
                context_classes = []
                current = parent
                depth = 0
                while current and depth < 3:
                    if current.get('class'):
                        context_classes.extend(current.get('class'))
                    current = current.parent
                    depth += 1
                
                logger.info(f"   💰 {price_text}")
                logger.info(f"      Parent: {parent.name} {parent.get('class', '')}")
                if grandparent:
                    logger.info(f"      Context: {grandparent.name} {grandparent.get('class', '')}")
                logger.info(f"      Context classes: {context_classes}")
                
                # Check if this is in a bundle-related context
                context_text = ' '.join(context_classes).lower()
                if any(word in context_text for word in ['bundle', 'package', 'basic', 'selection']):
                    logger.info(f"      🎯 BUNDLE CONTEXT DETECTED!")
        
    except Exception as e:
        logger.error(f"❌ ERROR: {str(e)}")

async def main():
    """Main inspection function."""
    await inspect_html_structure()

if __name__ == "__main__":
    asyncio.run(main())