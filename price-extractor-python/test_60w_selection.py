#!/usr/bin/env python3
"""
Test specifically selecting B6 MOPA 60W + Basic Bundle to see if $4,589 appears
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def test_60w_selection():
    """Test selecting B6 MOPA 60W specifically"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    logger.info("=== TESTING B6 MOPA 60W SELECTION ===")
    
    try:
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to page
        logger.info("📡 Navigating to product page...")
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Step 1: Select B6 MOPA 60W power using ComMarker's wd-swatch button structure
        logger.info("🔋 Selecting B6 MOPA 60W power...")
        power_selected = False
        power_selectors = [
            'div.wd-swatch[data-value="b6-mopa-60w"]',
            '.wd-swatch[data-value="b6-mopa-60w"]',
            '[data-value="b6-mopa-60w"]',
            'div.wd-swatch[data-title="B6 MOPA 60W"]',
            '.wd-swatch[data-title="B6 MOPA 60W"]'
        ]
        
        for selector in power_selectors:
            try:
                element = await page.query_selector(selector)
                if element:
                    await element.click()
                    await page.wait_for_timeout(3000)
                    logger.info(f"✅ Selected B6 MOPA 60W power via {selector}")
                    power_selected = True
                    break
            except Exception as e:
                logger.debug(f"Power selector {selector} failed: {e}")
        
        if not power_selected:
            logger.error("❌ Could not select B6 MOPA 60W power")
            return
        
        # Step 2: Select Basic Bundle using wd-swatch button structure
        logger.info("📦 Selecting B6 Mopa Basic Bundle...")
        bundle_selected = False
        bundle_selectors = [
            'div.wd-swatch[data-value="b6-mopa-basic-bundle"]',
            '.wd-swatch[data-value="b6-mopa-basic-bundle"]',
            '[data-value="b6-mopa-basic-bundle"]',
            'div.wd-swatch[data-title*="Basic Bundle"]',
            '.wd-swatch[data-title*="Basic Bundle"]'
        ]
        
        for selector in bundle_selectors:
            try:
                element = await page.query_selector(selector)
                if element:
                    await element.click()
                    await page.wait_for_timeout(5000)  # Wait longer for price update
                    logger.info(f"✅ Selected B6 Mopa Basic Bundle via {selector}")
                    bundle_selected = True
                    break
            except Exception as e:
                logger.debug(f"Bundle selector {selector} failed: {e}")
        
        if not bundle_selected:
            logger.error("❌ Could not select B6 Mopa Basic Bundle")
            return
        
        # Step 3: Check what price appears
        logger.info("💰 Checking price after selections...")
        
        # Get current page content
        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # Look for price elements
        price_areas = [
            '.woocommerce-variation-price',
            '.single_variation_wrap',
            '.entry-summary .price',
            '.product-summary .price',
            '.summary .price'
        ]
        
        found_4589 = False
        
        for area_selector in price_areas:
            try:
                area_element = await page.query_selector(area_selector)
                if area_element:
                    area_text = await area_element.inner_text()
                    logger.info(f"📍 Price area '{area_selector}': {area_text}")
                    
                    if '4589' in area_text or '4,589' in area_text:
                        logger.info(f"🎉 FOUND $4,589 in '{area_selector}'!")
                        logger.info(f"   Full text: {area_text}")
                        found_4589 = True
            except:
                pass
        
        # Search entire page for 4589
        if '4589' in content:
            logger.info("🔍 Found 4589 in page content after selection")
            
            # Find context
            for text_node in soup.find_all(string=re.compile(r'4,?589')):
                parent = text_node.parent
                if parent:
                    logger.info(f"📍 Found 4589 in: <{parent.name}> classes={parent.get('class', [])} text='{parent.get_text().strip()[:100]}...'")
                    found_4589 = True
        
        if not found_4589:
            logger.warning("❌ $4,589 still not found after selecting B6 MOPA 60W + Basic Bundle")
            
            # Show what prices ARE available
            logger.info("💰 Available prices after selection:")
            price_pattern = re.compile(r'\$?([1-9]\d{3,4})')
            prices_found = set()
            
            for match in price_pattern.finditer(content):
                price = match.group(1)
                if len(price) >= 4:
                    prices_found.add(price)
            
            sorted_prices = sorted(prices_found, key=lambda x: int(x.replace(',', '')))
            for price in sorted_prices:
                logger.info(f"   ${price}")
        
        # Also check if there are other variant combinations to try
        logger.info("\n🔍 Checking other power options...")
        power_select = await page.query_selector('select[name="attribute_pa_effect-power"]')
        if power_select:
            options = await power_select.query_selector_all('option')
            for option in options:
                value = await option.get_attribute('value')
                text = await option.inner_text()
                if value and '60w' not in value.lower():
                    logger.info(f"   Available power option: {text} (value: {value})")
        
        await browser.close()
        await playwright.stop()
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_60w_selection())