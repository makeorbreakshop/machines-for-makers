#!/usr/bin/env python3
"""
Check ALL bundle options and their prices for ComMarker B6 MOPA 60W
Maybe $4,589 is for a different bundle than Basic Bundle
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.dynamic_scraper import DynamicScraper
from bs4 import BeautifulSoup
import re

logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def check_all_bundles():
    """Check ALL bundle options and their prices"""
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    machine_name = "ComMarker B6 MOPA 60W"
    
    logger.info("=== CHECKING ALL BUNDLE OPTIONS FOR B6 MOPA 60W ===")
    
    try:
        async with DynamicScraper() as scraper:
            # Navigate and select B6 MOPA 60W variant
            logger.info("📡 Navigating and selecting B6 MOPA 60W...")
            await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
            await scraper.page.wait_for_timeout(3000)
            
            # Select B6 MOPA 60W variant first
            await scraper._select_commarker_variant(machine_name)
            await scraper.page.wait_for_timeout(5000)
            
            # Find ALL bundle/package options
            logger.info("\n🔍 FINDING ALL BUNDLE OPTIONS...")
            
            # Look for package selection dropdown
            package_selects = await scraper.page.query_selector_all('select[name*="package"], select[name*="bundle"], select[id*="package"], select[id*="bundle"]')
            
            if package_selects:
                for i, select in enumerate(package_selects):
                    logger.info(f"\n📦 PACKAGE SELECT {i+1}:")
                    
                    # Get all options
                    options = await select.query_selector_all('option')
                    for j, option in enumerate(options):
                        try:
                            value = await option.get_attribute('value')
                            text = await option.inner_text()
                            logger.info(f"   Option {j+1}: value='{value}' text='{text}'")
                        except:
                            pass
                    
                    # Try selecting each option and checking price
                    for j, option in enumerate(options):
                        try:
                            value = await option.get_attribute('value')
                            text = await option.inner_text()
                            
                            if value and text and text.strip():
                                logger.info(f"\n🎯 TESTING OPTION: {text}")
                                
                                # Select this option
                                await select.select_option(value)
                                await scraper.page.wait_for_timeout(3000)
                                
                                # Get current price
                                price_element = await scraper.page.query_selector('.woocommerce-variation-price, .single_variation_wrap, .entry-summary .price')
                                if price_element:
                                    price_text = await price_element.inner_text()
                                    logger.info(f"   💰 Price after selecting '{text}': {price_text}")
                                    
                                    # Check if this contains $4,589
                                    if '4589' in price_text or '4,589' in price_text:
                                        logger.info(f"   🎉 FOUND $4,589 WITH BUNDLE: {text}")
                                        logger.info(f"   📍 Full price text: {price_text}")
                                else:
                                    logger.info(f"   ❌ No price element found for '{text}'")
                                    
                        except Exception as e:
                            logger.error(f"   Error testing option {j}: {str(e)}")
            
            # Also check for radio buttons or other selection methods
            logger.info("\n🔍 CHECKING FOR RADIO BUTTON BUNDLES...")
            radio_inputs = await scraper.page.query_selector_all('input[type="radio"][name*="package"], input[type="radio"][name*="bundle"]')
            
            for i, radio in enumerate(radio_inputs):
                try:
                    value = await radio.get_attribute('value')
                    # Find associated label
                    label = await scraper.page.query_selector(f'label[for="{await radio.get_attribute("id")}"]')
                    if not label:
                        # Try finding parent label
                        label = await radio.evaluate('el => el.closest("label")')
                    
                    if label:
                        text = await label.inner_text()
                        logger.info(f"\n🎯 TESTING RADIO OPTION: {text}")
                        
                        # Click this radio button
                        await radio.click()
                        await scraper.page.wait_for_timeout(3000)
                        
                        # Get current price
                        price_element = await scraper.page.query_selector('.woocommerce-variation-price, .single_variation_wrap, .entry-summary .price')
                        if price_element:
                            price_text = await price_element.inner_text()
                            logger.info(f"   💰 Price after selecting '{text}': {price_text}")
                            
                            # Check if this contains $4,589
                            if '4589' in price_text or '4,589' in price_text:
                                logger.info(f"   🎉 FOUND $4,589 WITH BUNDLE: {text}")
                                logger.info(f"   📍 Full price text: {price_text}")
                        else:
                            logger.info(f"   ❌ No price element found for '{text}'")
                            
                except Exception as e:
                    logger.error(f"   Error testing radio {i}: {str(e)}")
            
            # Final check - get ALL text on page and search for 4589
            logger.info("\n🔍 SEARCHING ENTIRE PAGE FOR 4589...")
            page_content = await scraper.page.content()
            if '4589' in page_content:
                logger.info("✅ 4589 found in page content")
                
                # Find context around 4589
                soup = BeautifulSoup(page_content, 'html.parser')
                for text_node in soup.find_all(string=re.compile(r'4,?589')):
                    parent = text_node.parent
                    if parent:
                        logger.info(f"📍 Found 4589 in: <{parent.name}> classes={parent.get('class', [])} text='{parent.get_text().strip()[:100]}...'")
            else:
                logger.info("❌ 4589 NOT found in page content at all")
                
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_all_bundles())