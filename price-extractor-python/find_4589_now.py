#!/usr/bin/env python3
"""
Find exactly where the $4,589 price appears on the ComMarker B6 MOPA page
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.dynamic_scraper import DynamicScraper
from bs4 import BeautifulSoup
import re

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def find_4589_price():
    """Find exactly where $4,589 appears after selecting B6 MOPA 60W Basic Bundle"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    machine_name = "ComMarker B6 MOPA 60W"
    target_price = "4589"
    
    logger.info(f"=== FINDING $4,589 PRICE LOCATION ===")
    logger.info(f"URL: {url}")
    
    try:
        async with DynamicScraper() as scraper:
            # Navigate to page
            logger.info("📡 Navigating to product page...")
            await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
            await scraper.page.wait_for_timeout(3000)
            
            # Select B6 MOPA 60W variant first
            logger.info("🎯 Selecting B6 MOPA 60W variant...")
            await scraper._select_commarker_variant(machine_name)
            await scraper.page.wait_for_timeout(5000)  # Wait longer for updates
            
            # Get page content after variant selection
            content = await scraper.page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            logger.info(f"\n🔍 SEARCHING FOR ${target_price} IN PAGE CONTENT...")
            
            # Method 1: Find all text containing 4589
            found_locations = []
            
            # Search for various price patterns
            price_patterns = [
                r'\$4,?589',
                r'4,?589\.?0*',
                r'4589'
            ]
            
            for pattern in price_patterns:
                for text_node in soup.find_all(string=re.compile(pattern, re.IGNORECASE)):
                    parent = text_node.parent
                    if not parent:
                        continue
                        
                    # Get detailed parent information
                    parent_info = {
                        'text': text_node.strip(),
                        'parent_tag': parent.name,
                        'parent_classes': parent.get('class', []),
                        'parent_id': parent.get('id', ''),
                        'parent_text': parent.get_text(strip=True)
                    }
                    
                    # Get hierarchy
                    hierarchy = []
                    current = parent
                    for _ in range(5):
                        if current:
                            tag_desc = current.name
                            if current.get('class'):
                                tag_desc += f".{'.'.join(current.get('class'))}"
                            if current.get('id'):
                                tag_desc += f"#{current.get('id')}"
                            hierarchy.append(tag_desc)
                            current = current.parent
                        else:
                            break
                    
                    parent_info['hierarchy'] = ' > '.join(reversed(hierarchy))
                    found_locations.append(parent_info)
            
            # Display all found locations
            if found_locations:
                logger.info(f"\n✅ FOUND ${target_price} IN {len(found_locations)} LOCATIONS:")
                for i, loc in enumerate(found_locations, 1):
                    logger.info(f"\n📍 Location {i}:")
                    logger.info(f"   Text: '{loc['text']}'")
                    logger.info(f"   Parent: <{loc['parent_tag']}> classes={loc['parent_classes']} id='{loc['parent_id']}'")
                    logger.info(f"   Full parent text: {loc['parent_text'][:150]}...")
                    logger.info(f"   Hierarchy: {loc['hierarchy']}")
                    
                    # Generate specific CSS selector
                    if loc['parent_classes']:
                        css_selector = f"{loc['parent_tag']}.{'.'.join(loc['parent_classes'])}"
                    elif loc['parent_id']:
                        css_selector = f"{loc['parent_tag']}#{loc['parent_id']}"
                    else:
                        css_selector = loc['parent_tag']
                    
                    logger.info(f"   🎯 CSS Selector: {css_selector}")
                    
                    # Check if this is in a bundle context
                    bundle_keywords = ['bundle', 'package', 'basic', 'rotary', 'safety']
                    if any(keyword in loc['parent_text'].lower() for keyword in bundle_keywords):
                        logger.info(f"   📦 BUNDLE CONTEXT DETECTED!")
                        
                        # Look for bundle name in nearby text
                        if 'basic' in loc['parent_text'].lower():
                            logger.info(f"   ✅ BASIC BUNDLE PRICE FOUND!")
            else:
                logger.warning(f"❌ Could not find ${target_price} anywhere in the page!")
                
                # Debug: Show all prices found
                all_prices = []
                price_pattern = re.compile(r'\$?([\\d,]+)(?:\.\\d{2})?')
                for match in price_pattern.finditer(str(soup)):
                    price_str = match.group(1).replace(',', '')
                    try:
                        price = int(price_str)
                        if 1000 < price < 10000:  # Reasonable price range
                            all_prices.append(price)
                    except:
                        pass
                
                unique_prices = sorted(set(all_prices))
                logger.info(f"\n📊 All prices found on page: {unique_prices}")
            
            # Method 2: Check specific bundle areas that might contain 4589
            logger.info(f"\n📦 CHECKING BUNDLE-SPECIFIC AREAS...")
            
            bundle_areas = [
                '.package-option',
                '.bundle-option', 
                '.product-bundle',
                '[class*="bundle"]',
                '[class*="package"]',
                '.woocommerce-grouped-product-list',
                '.variations',
                '.variations_form',
                '.single_variation_wrap',
                '.woocommerce-variation-price'
            ]
            
            for area_selector in bundle_areas:
                try:
                    area = soup.select_one(area_selector)
                    if area and target_price in area.get_text():
                        logger.info(f"✅ Found ${target_price} in {area_selector}:")
                        area_text = area.get_text()
                        
                        # Look for Basic Bundle specifically
                        if 'basic' in area_text.lower():
                            logger.info(f"   📦 BASIC BUNDLE AREA: {area_text[:200]}...")
                            
                            # Find all prices in this area
                            prices_in_area = re.findall(r'\$?[\\d,]+(?:\.\\d{2})?', area_text)
                            logger.info(f"   💰 Prices in area: {prices_in_area}")
                except:
                    pass
            
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(find_4589_price())