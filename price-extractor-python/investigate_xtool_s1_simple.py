#!/usr/bin/env python3
"""
Investigate xTool S1 pricing extraction failure using existing tools
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.dynamic_scraper import DynamicScraper
from loguru import logger
import re

async def investigate_xtool_s1_pricing():
    """Investigate xTool S1 pricing extraction failure"""
    url = 'https://www.xtool.com/products/xtool-s1-laser-cutter'
    machine_name = 'xTool S1'
    
    logger.info(f"🔍 Investigating xTool S1 pricing at: {url}")
    logger.info(f"Expected correct price: $999")
    logger.info(f"Problematic extracted price: $4589")
    
    async with DynamicScraper() as scraper:
        try:
            # Navigate to the page
            logger.info("📄 Loading page...")
            await scraper.page.goto(url, wait_until='networkidle', timeout=30000)
            await scraper.page.wait_for_timeout(3000)
            
            # Get page title
            title = await scraper.page.title()
            logger.info(f"Page title: {title}")
            
            # Step 1: Search for all dollar amounts on the page
            logger.info("\n💰 STEP 1: Finding all dollar amounts on page...")
            page_content = await scraper.page.content()
            dollar_matches = re.findall(r'\$[\d,]+(?:\.?\d{2})?', page_content)
            unique_prices = sorted(set(dollar_matches), key=lambda x: float(x.replace('$', '').replace(',', '')))
            
            logger.info(f"Found unique dollar amounts: {unique_prices}")
            
            # Step 2: Look for specific problematic prices
            logger.info("\n🎯 STEP 2: Analyzing specific prices...")
            target_prices = ['999', '4589', '4,589']
            
            price_analysis = {}
            for price in target_prices:
                price_analysis[price] = {
                    'found': f'${price}' in page_content,
                    'elements': []
                }
                
                if price_analysis[price]['found']:
                    logger.info(f"✅ Found ${price} in page content")
                    
                    # Find elements containing this price
                    try:
                        xpath_expr = f'//*[contains(text(), "${price}")]'
                        elements = await scraper.page.query_selector_all(f'xpath={xpath_expr}')
                        
                        logger.info(f"Found {len(elements)} elements containing ${price}")
                        
                        for i, elem in enumerate(elements[:5]):  # Limit to 5 elements
                            try:
                                text = await elem.text_content()
                                tag_name = await elem.evaluate('el => el.tagName')
                                class_name = await elem.get_attribute('class') or 'no-class'
                                id_attr = await elem.get_attribute('id') or 'no-id'
                                
                                element_info = {
                                    'index': i + 1,
                                    'tag': tag_name,
                                    'class': class_name,
                                    'id': id_attr,
                                    'text': text.strip()[:200],
                                    'selector': f'{tag_name.lower()}.{class_name.replace(" ", ".")}' if class_name != 'no-class' else tag_name.lower()
                                }
                                
                                price_analysis[price]['elements'].append(element_info)
                                
                                logger.info(f"  {i+1}. <{tag_name}> class=\"{class_name}\" id=\"{id_attr}\"")
                                logger.info(f"     Text: {text.strip()[:100]}...")
                                
                                # Get parent context
                                try:
                                    parent = await elem.query_selector('xpath=..')
                                    if parent:
                                        parent_text = await parent.text_content()
                                        parent_tag = await parent.evaluate('el => el.tagName')
                                        parent_class = await parent.get_attribute('class') or 'no-class'
                                        
                                        logger.info(f"     Parent: <{parent_tag}> class=\"{parent_class}\"")
                                        logger.info(f"     Parent text: {parent_text.strip()[:150]}...")
                                except:
                                    pass
                                    
                            except Exception as e:
                                logger.error(f"Error analyzing element {i+1}: {e}")
                                
                    except Exception as e:
                        logger.error(f"Error finding elements with ${price}: {e}")
                else:
                    logger.info(f"❌ ${price} not found in page content")
            
            # Step 3: Look for bundle/configuration context
            logger.info("\n📦 STEP 3: Analyzing bundle/configuration context...")
            bundle_keywords = ['bundle', 'kit', 'package', 'set', 'configuration', 'option']
            
            for keyword in bundle_keywords:
                if keyword.lower() in page_content.lower():
                    logger.info(f"✅ Found '{keyword}' in page content")
                    
                    # Find elements containing this keyword near prices
                    try:
                        xpath_expr = f'//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "{keyword.lower()}")]'
                        elements = await scraper.page.query_selector_all(f'xpath={xpath_expr}')
                        
                        for elem in elements[:3]:  # Check first 3
                            try:
                                text = await elem.text_content()
                                if any(price in text for price in ['$999', '$4589', '$4,589']):
                                    logger.info(f"  🎯 Bundle element with price: {text.strip()[:200]}")
                            except:
                                pass
                    except:
                        pass
            
            # Step 4: Analyze CSS selectors and structure
            logger.info("\n🏗️ STEP 4: Analyzing CSS structure for price elements...")
            
            # Look for common price-related CSS classes
            price_css_patterns = [
                '[class*="price"]',
                '[class*="Price"]', 
                '[class*="cost"]',
                '[class*="amount"]',
                '[class*="money"]',
                '[data-price]',
                '[data-cost]'
            ]
            
            recommended_selectors = []
            
            for pattern in price_css_patterns:
                try:
                    elements = await scraper.page.query_selector_all(pattern)
                    if elements:
                        logger.info(f"Found {len(elements)} elements matching {pattern}")
                        
                        for elem in elements[:3]:  # Check first 3
                            try:
                                text = await elem.text_content()
                                if '$' in text:
                                    class_name = await elem.get_attribute('class')
                                    tag_name = await elem.evaluate('el => el.tagName')
                                    
                                    # Check if this contains the correct $999 price
                                    if '$999' in text:
                                        specific_selector = f'{tag_name.lower()}.{class_name.replace(" ", ".")}' if class_name else tag_name.lower()
                                        recommended_selectors.append({
                                            'selector': specific_selector,
                                            'price': '$999',
                                            'text': text.strip()[:100],
                                            'confidence': 'HIGH'
                                        })
                                        logger.info(f"  🎯 CORRECT PRICE FOUND: {specific_selector} -> {text.strip()}")
                                    elif '$4589' in text or '$4,589' in text:
                                        logger.info(f"  ⚠️ PROBLEMATIC PRICE: {pattern} -> {text.strip()}")
                                        
                            except:
                                pass
                                
                except:
                    pass
            
            # Step 5: Generate recommendations
            logger.info("\n🎯 STEP 5: Generating CSS selector recommendations...")
            
            if recommended_selectors:
                logger.info("✅ FOUND CORRECT PRICE SELECTORS:")
                for rec in recommended_selectors:
                    logger.info(f"  Selector: {rec['selector']}")
                    logger.info(f"  Price: {rec['price']}")
                    logger.info(f"  Text: {rec['text']}")
                    logger.info(f"  Confidence: {rec['confidence']}")
            else:
                logger.warning("❌ No specific selectors found for $999 price")
            
            # Step 6: Final analysis and summary
            logger.info("\n📊 FINAL ANALYSIS:")
            logger.info("=" * 60)
            
            if '$999' in page_content and '$4589' in page_content:
                logger.info("✅ Both prices ($999 and $4589) found on page")
                logger.info("🔍 Issue: Extraction is picking up bundle/kit price instead of base price")
                logger.info("💡 Solution: Need more specific CSS selector for base product price")
            elif '$999' in page_content:
                logger.info("✅ Correct price ($999) found on page")
                logger.info("❌ Problematic price ($4589) not found")
            else:
                logger.info("❌ Correct price ($999) not found on page")
                logger.info("⚠️ May need to investigate page changes or region-specific pricing")
            
            return {
                'url': url,
                'price_analysis': price_analysis,
                'recommended_selectors': recommended_selectors,
                'unique_prices': unique_prices
            }
            
        except Exception as e:
            logger.error(f"Error during investigation: {str(e)}")
            return None

async def main():
    """Run the investigation"""
    result = await investigate_xtool_s1_pricing()
    
    if result:
        logger.info("\n🎉 Investigation completed successfully!")
        
        # Generate specific recommendation for xTool domain
        if result['recommended_selectors']:
            best_selector = result['recommended_selectors'][0]
            logger.info(f"\n🎯 RECOMMENDED CSS SELECTOR FOR XTOOL.COM:")
            logger.info(f"   {best_selector['selector']}")
            logger.info(f"\n💾 This should be stored as a learned selector for xtool.com domain")
    else:
        logger.error("❌ Investigation failed")

if __name__ == "__main__":
    asyncio.run(main())