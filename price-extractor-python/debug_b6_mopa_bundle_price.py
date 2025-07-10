#!/usr/bin/env python3
"""
Debug script to find where the $4,589 price appears after selecting B6 MOPA 60W Basic Bundle.
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

async def debug_b6_mopa_bundle_price():
    """Debug where the $4,589 price appears after bundle selection."""
    
    machine_name = "ComMarker B6 MOPA 60W"
    url = "https://www.commarker.com/products/commarker-b6-jpt-mopa-60w-fiber-laser-engraver"
    target_price = 4589
    
    logger.info(f"=== DEBUGGING B6 MOPA 60W BUNDLE PRICE LOCATION ===")
    logger.info(f"Looking for: ${target_price}")
    
    try:
        async with DynamicScraper() as scraper:
            # Navigate to page
            logger.info("Navigating to product page...")
            await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
            await scraper.page.wait_for_timeout(2000)
            
            # First, select the power (60W) - use the dynamic scraper's method
            logger.info("Using dynamic scraper to select ComMarker variant...")
            await scraper._select_commarker_variant(machine_name)
            logger.info("✅ Variant selection completed")
            
            # Then select the Basic Bundle
            logger.info("Selecting B6 Mopa Basic Bundle...")
            
            # First try to find the package dropdown
            select_elem = await scraper.page.query_selector('select[name*="package"]')
            if select_elem:
                # Get all options
                options = await scraper.page.query_selector_all('select[name*="package"] option')
                logger.info(f"Found package dropdown with {len(options)} options")
                
                for option in options:
                    text = await option.text_content()
                    value = await option.get_attribute('value')
                    logger.info(f"  Option: '{text}' (value: {value})")
                    
                    if 'basic bundle' in text.lower():
                        await select_elem.select_option(value=value)
                        logger.info(f"✅ Selected Basic Bundle option")
                        await scraper.page.wait_for_timeout(3000)
                        break
            else:
                # Try clicking bundle elements
                bundle_selectors = [
                    'label:has-text("B6 Mopa Basic Bundle")',
                    'button:has-text("B6 Mopa Basic Bundle")',
                    'input[value*="basic-bundle"] + label',
                    '[data-value*="basic-bundle"]'
                ]
                
                for selector in bundle_selectors:
                    try:
                        element = await scraper.page.query_selector(selector)
                        if element:
                            await element.click()
                            logger.info(f"✅ Clicked bundle using: {selector}")
                            await scraper.page.wait_for_timeout(3000)
                            break
                    except:
                        continue
            
            # Now search for $4,589 in the page
            logger.info(f"\n🔍 SEARCHING FOR ${target_price} IN PAGE...")
            
            content = await scraper.page.content()
            soup = BeautifulSoup(content, 'lxml')
            
            # Method 1: Search all text nodes for 4589
            found_locations = []
            
            # Search for exact price patterns
            price_patterns = [
                r'\$4,?589',
                r'4,?589\.00',
                r'4589'
            ]
            
            for pattern in price_patterns:
                # Find all text containing this pattern
                for element in soup.find_all(string=re.compile(pattern, re.IGNORECASE)):
                    parent = element.parent
                    
                    # Get element hierarchy
                    hierarchy = []
                    current = parent
                    for _ in range(5):  # Get up to 5 levels
                        if current:
                            tag_info = current.name
                            if current.get('class'):
                                tag_info += f".{'.'.join(current.get('class'))}"
                            if current.get('id'):
                                tag_info += f"#{current.get('id')}"
                            hierarchy.append(tag_info)
                            current = current.parent
                    
                    location_info = {
                        'text': element.strip(),
                        'parent_tag': parent.name,
                        'parent_classes': parent.get('class', []),
                        'parent_id': parent.get('id'),
                        'hierarchy': ' > '.join(reversed(hierarchy)),
                        'full_parent_text': parent.get_text(strip=True)[:200]
                    }
                    
                    found_locations.append(location_info)
            
            # Method 2: Check specific areas where bundle prices typically appear
            bundle_price_areas = [
                '.woocommerce-variation-price',
                '.single_variation',
                '.variations_form',
                '.package-option',
                '.bundle-option',
                'form.cart',
                '.product-summary',
                '.entry-summary'
            ]
            
            logger.info(f"\n📍 CHECKING SPECIFIC BUNDLE PRICE AREAS...")
            for area_selector in bundle_price_areas:
                area = soup.select_one(area_selector)
                if area:
                    area_text = area.get_text()
                    if '4589' in area_text or '4,589' in area_text:
                        logger.info(f"✅ Found in {area_selector}: {area_text[:100]}...")
                        
                        # Find specific price elements within this area
                        price_elems = area.find_all(string=re.compile(r'4,?589'))
                        for elem in price_elems:
                            logger.info(f"   - Exact element: <{elem.parent.name}> '{elem.strip()}'")
            
            # Display results
            if found_locations:
                logger.info(f"\n✅ FOUND ${target_price} IN {len(found_locations)} LOCATIONS:")
                for i, loc in enumerate(found_locations, 1):
                    logger.info(f"\n📍 Location {i}:")
                    logger.info(f"   Text: '{loc['text']}'")
                    logger.info(f"   Parent: <{loc['parent_tag']}> classes={loc['parent_classes']}")
                    logger.info(f"   Hierarchy: {loc['hierarchy']}")
                    logger.info(f"   Context: {loc['full_parent_text']}")
                    
                    # Generate CSS selector for this location
                    if loc['parent_classes']:
                        css_selector = f"{loc['parent_tag']}.{'.'.join(loc['parent_classes'])}"
                    else:
                        css_selector = loc['parent_tag']
                    logger.info(f"   🎯 Suggested selector: '{css_selector}'")
            else:
                logger.warning(f"❌ Could not find ${target_price} anywhere in the page!")
                
                # Debug: Show all prices found
                all_prices = []
                price_pattern = re.compile(r'\$?([\d,]+)(?:\.\d{2})?')
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
            
            # Method 3: Use Playwright to search for the price
            logger.info(f"\n🔍 USING PLAYWRIGHT TO LOCATE ${target_price}...")
            
            # Get all elements containing the price
            elements_with_price = await scraper.page.query_selector_all(f'*:has-text("4,589"), *:has-text("4589")')
            logger.info(f"Found {len(elements_with_price)} elements containing the price")
            
            for elem in elements_with_price[:5]:  # Check first 5
                tag_name = await elem.evaluate('el => el.tagName')
                class_name = await elem.evaluate('el => el.className')
                text_content = await elem.text_content()
                logger.info(f"   - <{tag_name}> class='{class_name}' text='{text_content[:100]}...'")
            
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_b6_mopa_bundle_price())