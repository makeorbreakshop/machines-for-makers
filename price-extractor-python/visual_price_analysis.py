#!/usr/bin/env python3
"""
Visual Screenshot Analysis to Locate $4,589 Price on ComMarker Page
Uses Playwright to capture screenshots at each step and analyze DOM elements
"""

import asyncio
import sys
import os
import re
from datetime import datetime
from pathlib import Path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.dynamic_scraper import DynamicScraper
from bs4 import BeautifulSoup
import json

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

# Create screenshots directory
SCREENSHOTS_DIR = Path("screenshots")
SCREENSHOTS_DIR.mkdir(exist_ok=True)

async def visual_price_analysis():
    """
    Step-by-step visual analysis to locate the $4,589 price with screenshots
    """
    
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    machine_name = "ComMarker B6 MOPA 60W"
    target_price = "4589"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    logger.info(f"=== VISUAL PRICE LOCATION ANALYSIS ===")
    logger.info(f"URL: {url}")
    logger.info(f"Target Price: ${target_price}")
    logger.info(f"Screenshots will be saved to: {SCREENSHOTS_DIR}")
    
    analysis_results = {
        "timestamp": timestamp,
        "url": url,
        "target_price": target_price,
        "steps": [],
        "dom_analysis": {},
        "final_results": {}
    }
    
    try:
        async with DynamicScraper() as scraper:
            # Step 1: Navigate to page and take initial screenshot
            logger.info("📡 Step 1: Navigating to product page...")
            await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
            await scraper.page.wait_for_timeout(3000)
            
            # Screenshot 1: Initial page load
            screenshot_1 = f"01_initial_load_{timestamp}.png"
            await scraper.page.screenshot(path=SCREENSHOTS_DIR / screenshot_1, full_page=True)
            logger.info(f"📸 Screenshot saved: {screenshot_1}")
            
            step_1_data = {
                "step": 1,
                "description": "Initial page load",
                "screenshot": screenshot_1,
                "actions": ["Navigated to product page"],
                "price_found": False
            }
            
            # Check for price in initial load
            content = await scraper.page.content()
            if target_price in content:
                step_1_data["price_found"] = True
                logger.info(f"✅ Price ${target_price} found in initial page load!")
            
            analysis_results["steps"].append(step_1_data)
            
            # Step 2: Select B6 MOPA 60W power variant
            logger.info("🎯 Step 2: Selecting B6 MOPA 60W power variant...")
            
            # Look for power selection options
            power_selectors = [
                'input[value*="60W"]',
                'label:has-text("60W")',
                '*:has-text("60W")',
                '.power-option',
                '[data-power*="60"]'
            ]
            
            power_selected = False
            for selector in power_selectors:
                try:
                    element = await scraper.page.query_selector(selector)
                    if element:
                        logger.info(f"Found power option with selector: {selector}")
                        await element.click()
                        await scraper.page.wait_for_timeout(2000)
                        power_selected = True
                        break
                except:
                    continue
            
            if not power_selected:
                # Try the ComMarker-specific variant selection
                await scraper._select_commarker_variant(machine_name)
                await scraper.page.wait_for_timeout(3000)
                power_selected = True
            
            # Screenshot 2: After power selection
            screenshot_2 = f"02_power_selected_{timestamp}.png"
            await scraper.page.screenshot(path=SCREENSHOTS_DIR / screenshot_2, full_page=True)
            logger.info(f"📸 Screenshot saved: {screenshot_2}")
            
            step_2_data = {
                "step": 2,
                "description": "After power variant selection",
                "screenshot": screenshot_2,
                "actions": ["Selected 60W power option"],
                "price_found": False
            }
            
            # Check for price after power selection
            content = await scraper.page.content()
            if target_price in content:
                step_2_data["price_found"] = True
                logger.info(f"✅ Price ${target_price} found after power selection!")
            
            analysis_results["steps"].append(step_2_data)
            
            # Step 3: Look for and select bundle options
            logger.info("📦 Step 3: Looking for bundle options...")
            
            # Look for bundle/package selectors
            bundle_selectors = [
                'input[value*="Basic"]',
                'label:has-text("Basic")',
                '*:has-text("Basic Bundle")',
                '.bundle-option',
                '.package-option',
                '[data-bundle]'
            ]
            
            bundle_selected = False
            for selector in bundle_selectors:
                try:
                    elements = await scraper.page.query_selector_all(selector)
                    for element in elements:
                        text = await element.text_content()
                        if text and 'basic' in text.lower():
                            logger.info(f"Found Basic Bundle option: {text}")
                            await element.click()
                            await scraper.page.wait_for_timeout(3000)
                            bundle_selected = True
                            break
                    if bundle_selected:
                        break
                except:
                    continue
            
            # Screenshot 3: After bundle selection
            screenshot_3 = f"03_bundle_selected_{timestamp}.png"
            await scraper.page.screenshot(path=SCREENSHOTS_DIR / screenshot_3, full_page=True)
            logger.info(f"📸 Screenshot saved: {screenshot_3}")
            
            step_3_data = {
                "step": 3,
                "description": "After bundle selection",
                "screenshot": screenshot_3,
                "actions": ["Selected Basic Bundle option"] if bundle_selected else ["Attempted bundle selection"],
                "price_found": False
            }
            
            # Check for price after bundle selection
            content = await scraper.page.content()
            if target_price in content:
                step_3_data["price_found"] = True
                logger.info(f"✅ Price ${target_price} found after bundle selection!")
            
            analysis_results["steps"].append(step_3_data)
            
            # Step 4: Wait for dynamic updates
            logger.info("⏳ Step 4: Waiting for dynamic price updates...")
            await scraper.page.wait_for_timeout(5000)
            
            # Screenshot 4: Final state after waiting
            screenshot_4 = f"04_final_state_{timestamp}.png"
            await scraper.page.screenshot(path=SCREENSHOTS_DIR / screenshot_4, full_page=True)
            logger.info(f"📸 Screenshot saved: {screenshot_4}")
            
            step_4_data = {
                "step": 4,
                "description": "Final state after waiting",
                "screenshot": screenshot_4,
                "actions": ["Waited for dynamic updates"],
                "price_found": False
            }
            
            # Final content check
            final_content = await scraper.page.content()
            if target_price in final_content:
                step_4_data["price_found"] = True
                logger.info(f"✅ Price ${target_price} found in final state!")
            
            analysis_results["steps"].append(step_4_data)
            
            # Step 5: Comprehensive DOM analysis
            logger.info("🔍 Step 5: Comprehensive DOM analysis...")
            
            soup = BeautifulSoup(final_content, 'html.parser')
            
            # Find all instances of the target price
            price_locations = []
            price_patterns = [r'\$4,?589', r'4,?589\.?0*', r'4589']
            
            for pattern in price_patterns:
                for text_node in soup.find_all(string=re.compile(pattern, re.IGNORECASE)):
                    parent = text_node.parent
                    if not parent:
                        continue
                    
                    # Build element hierarchy
                    hierarchy = []
                    current = parent
                    for _ in range(8):
                        if current and current.name:
                            tag_desc = current.name
                            if current.get('class'):
                                tag_desc += f".{'.'.join(current.get('class'))}"
                            if current.get('id'):
                                tag_desc += f"#{current.get('id')}"
                            hierarchy.append(tag_desc)
                            current = current.parent
                        else:
                            break
                    
                    # Get surrounding context
                    parent_text = parent.get_text(strip=True)
                    
                    location_info = {
                        'matched_text': text_node.strip(),
                        'pattern': pattern,
                        'parent_tag': parent.name,
                        'parent_classes': parent.get('class', []),
                        'parent_id': parent.get('id', ''),
                        'parent_text': parent_text[:300],
                        'hierarchy': ' > '.join(reversed(hierarchy)),
                        'is_bundle_context': any(keyword in parent_text.lower() for keyword in ['bundle', 'package', 'basic'])
                    }
                    
                    # Generate CSS selector
                    if parent.get('class'):
                        css_selector = f"{parent.name}.{'.'.join(parent.get('class'))}"
                    elif parent.get('id'):
                        css_selector = f"{parent.name}#{parent.get('id')}"
                    else:
                        css_selector = parent.name
                    
                    location_info['css_selector'] = css_selector
                    price_locations.append(location_info)
            
            analysis_results["dom_analysis"] = {
                "total_price_instances": len(price_locations),
                "price_locations": price_locations
            }
            
            # Step 6: Use Playwright to find visible elements
            logger.info("🎭 Step 6: Using Playwright to find visible elements...")
            
            playwright_results = []
            price_selectors = [
                f'text="{target_price}"',
                f'text="$4,{target_price[-3:]}"',
                f'text="${target_price}"',
                '*:has-text("4,589")',
                '*:has-text("4589")'
            ]
            
            for selector in price_selectors:
                try:
                    elements = await scraper.page.query_selector_all(selector)
                    for i, elem in enumerate(elements):
                        is_visible = await elem.is_visible()
                        bounding_box = await elem.bounding_box()
                        tag_name = await elem.evaluate('el => el.tagName')
                        class_name = await elem.evaluate('el => el.className')
                        text_content = await elem.text_content()
                        
                        playwright_results.append({
                            'selector': selector,
                            'element_index': i,
                            'is_visible': is_visible,
                            'bounding_box': bounding_box,
                            'tag_name': tag_name,
                            'class_name': class_name,
                            'text_content': text_content[:100]
                        })
                except Exception as e:
                    logger.warning(f"Error with selector {selector}: {e}")
            
            analysis_results["playwright_analysis"] = playwright_results
            
            # Final Results Summary
            logger.info("📊 ANALYSIS COMPLETE - GENERATING SUMMARY...")
            
            total_dom_instances = len(price_locations)
            visible_instances = len([r for r in playwright_results if r['is_visible']])
            bundle_contexts = len([loc for loc in price_locations if loc['is_bundle_context']])
            
            analysis_results["final_results"] = {
                "total_dom_instances": total_dom_instances,
                "visible_instances": visible_instances,
                "bundle_contexts": bundle_contexts,
                "screenshots_captured": 4,
                "analysis_timestamp": timestamp
            }
            
            # Save analysis to JSON
            results_file = f"visual_analysis_results_{timestamp}.json"
            with open(results_file, 'w') as f:
                json.dump(analysis_results, f, indent=2, default=str)
            
            logger.info(f"💾 Analysis results saved to: {results_file}")
            
            # Print summary
            logger.info(f"\n🎯 VISUAL ANALYSIS SUMMARY:")
            logger.info(f"   Total DOM instances of ${target_price}: {total_dom_instances}")
            logger.info(f"   Visible instances: {visible_instances}")
            logger.info(f"   Bundle context instances: {bundle_contexts}")
            logger.info(f"   Screenshots captured: 4")
            logger.info(f"   Results file: {results_file}")
            
            if price_locations:
                logger.info(f"\n📍 FOUND PRICE LOCATIONS:")
                for i, loc in enumerate(price_locations, 1):
                    logger.info(f"   Location {i}:")
                    logger.info(f"     Text: '{loc['matched_text']}'")
                    logger.info(f"     CSS Selector: {loc['css_selector']}")
                    logger.info(f"     Bundle Context: {'Yes' if loc['is_bundle_context'] else 'No'}")
                    logger.info(f"     Hierarchy: {loc['hierarchy']}")
                    
                    if loc['is_bundle_context']:
                        logger.info(f"     🎯 BUNDLE CONTEXT FOUND!")
            else:
                logger.warning(f"❌ No instances of ${target_price} found in DOM!")
            
            if playwright_results:
                logger.info(f"\n🎭 PLAYWRIGHT VISIBLE ELEMENTS:")
                for result in playwright_results:
                    if result['is_visible']:
                        logger.info(f"   ✅ Visible: {result['tag_name']}.{result['class_name']}")
                        logger.info(f"      Text: {result['text_content']}")
                        if result['bounding_box']:
                            bbox = result['bounding_box']
                            logger.info(f"      Position: x={bbox['x']:.0f}, y={bbox['y']:.0f}, w={bbox['width']:.0f}, h={bbox['height']:.0f}")
                        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Save error info
        analysis_results["error"] = {
            "message": str(e),
            "traceback": traceback.format_exc()
        }
        
        # Still save what we have
        error_file = f"visual_analysis_error_{timestamp}.json"
        with open(error_file, 'w') as f:
            json.dump(analysis_results, f, indent=2, default=str)
        logger.info(f"💾 Error data saved to: {error_file}")

if __name__ == "__main__":
    asyncio.run(visual_price_analysis())