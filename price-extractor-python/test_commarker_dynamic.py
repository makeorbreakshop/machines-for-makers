#!/usr/bin/env python3
"""
Test the dynamic scraper to see what happens when we select 60W + Basic Bundle.
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

async def test_commarker_selection():
    """Test selecting 60W + Basic Bundle and see what prices appear."""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    machine_name = "ComMarker B6 MOPA 60W"
    
    logger.info("=== TESTING COMMARKER B6 MOPA 60W DYNAMIC SELECTION ===")
    
    try:
        async with DynamicScraper() as scraper:
            # Navigate to the page
            await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
            logger.info("✅ Page loaded")
            
            # Wait for variations to load
            await scraper.page.wait_for_timeout(3000)
            
            # Step 1: Select Effect Power = B6 MOPA 60W
            logger.info("\n--- STEP 1: SELECT EFFECT POWER ---")
            
            # Find and select from the Effect Power dropdown
            effect_power_select = await scraper.page.query_selector('select#pa_effect-power')
            if effect_power_select:
                logger.info("Found Effect Power dropdown")
                await effect_power_select.select_option(value='b6-mopa-60w')
                logger.info("✅ Selected B6 MOPA 60W")
                await scraper.page.wait_for_timeout(2000)
            else:
                logger.error("❌ Effect Power dropdown not found")
                return
            
            # Step 2: Select Package = B6 Mopa Basic Bundle
            logger.info("\n--- STEP 2: SELECT PACKAGE ---")
            
            package_select = await scraper.page.query_selector('select#pa_package')
            if package_select:
                logger.info("Found Package dropdown")
                await package_select.select_option(value='b6-mopa-basic-bundle')
                logger.info("✅ Selected B6 Mopa Basic Bundle")
                await scraper.page.wait_for_timeout(3000)  # Wait for price update
            else:
                logger.error("❌ Package dropdown not found")
                return
            
            # Step 3: Find all prices on the page after selection
            logger.info("\n--- STEP 3: FIND PRICES AFTER SELECTION ---")
            
            # Get the page content
            content = await scraper.page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find all elements containing prices
            price_pattern = re.compile(r'\$[\d,]+\.?\d*')
            price_elements = []
            
            # Method 1: Look for price in variation area
            variation_price_selectors = [
                '.woocommerce-variation-price .price',
                '.single_variation .price',
                '.variation-price .price',
                '.variations_form .price',
                'p.price',
                '.price .amount'
            ]
            
            for selector in variation_price_selectors:
                elements = await scraper.page.query_selector_all(selector)
                for elem in elements:
                    try:
                        text = await elem.text_content()
                        if text and '$' in text:
                            logger.info(f"🎯 Found price via {selector}: {text.strip()}")
                            
                            # Also get the exact value
                            matches = price_pattern.findall(text)
                            for match in matches:
                                value = float(match.replace('$', '').replace(',', ''))
                                if 4500 <= value <= 4700:  # Looking for ~$4,589
                                    logger.info(f"  ✅ POTENTIAL MATCH: ${value}")
                    except:
                        pass
            
            # Method 2: Look for all text containing dollar amounts
            all_text_elements = await scraper.page.query_selector_all('*')
            found_prices = set()
            
            for elem in all_text_elements[:200]:  # Check first 200 elements
                try:
                    text = await elem.text_content()
                    if text and '$' in text:
                        matches = price_pattern.findall(text)
                        for match in matches:
                            value = float(match.replace('$', '').replace(',', ''))
                            if value not in found_prices and value > 1000:  # Avoid small prices
                                found_prices.add(value)
                except:
                    pass
            
            logger.info(f"\n📊 All unique prices found > $1000: {sorted(found_prices)}")
            
            # Method 3: Check specific areas where bundle prices might appear
            logger.info("\n--- CHECKING BUNDLE-SPECIFIC AREAS ---")
            
            # Look near the package dropdown
            package_area = await scraper.page.query_selector('.variations')
            if package_area:
                # Find all text within the variations area
                area_text = await package_area.text_content()
                logger.info(f"Variations area text: {area_text[:200]}...")
                
                # Look for prices in this area
                matches = price_pattern.findall(area_text)
                for match in matches:
                    value = float(match.replace('$', '').replace(',', ''))
                    logger.info(f"  Price in variations area: ${value}")
            
            # Method 4: Check JavaScript console for price data
            logger.info("\n--- CHECKING JAVASCRIPT DATA ---")
            
            # Execute JavaScript to get variation data
            variation_data = await scraper.page.evaluate('''
                () => {
                    // Try to get WooCommerce variation data
                    if (typeof wc_add_to_cart_variation_params !== 'undefined' && 
                        wc_add_to_cart_variation_params.variations) {
                        return JSON.stringify(wc_add_to_cart_variation_params.variations);
                    }
                    
                    // Try to find variation form data
                    const form = document.querySelector('.variations_form');
                    if (form && form.dataset.product_variations) {
                        return form.dataset.product_variations;
                    }
                    
                    return null;
                }
            ''')
            
            if variation_data:
                logger.info("Found variation data in JavaScript!")
                # Look for 4589 in the data
                if '4589' in str(variation_data):
                    logger.info("✅ FOUND $4,589 in variation data!")
                    
                    # Try to parse and find the exact variation
                    import json
                    try:
                        variations = json.loads(variation_data)
                        for var in variations:
                            if var.get('display_price') == 4589 or var.get('price') == 4589:
                                logger.info(f"  Variation with $4,589: {var.get('attributes', {})}")
                    except:
                        pass
            
            # Method 5: Take a screenshot for debugging
            await scraper.page.screenshot(path='commarker_after_selection.png')
            logger.info("\n📸 Screenshot saved as 'commarker_after_selection.png'")
            
    except Exception as e:
        logger.error(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_commarker_selection())