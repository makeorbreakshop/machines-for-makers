#!/usr/bin/env python3
"""
Investigate ComMarker B6 MOPA 60W price extraction issue.

The problem: System finds 35 price candidates but selects $4799 (closest to old price $4589)
even though machine-specific rules define expected_price_range [4500, 4700].

Need to determine:
1. Are machine-specific expected_price_range rules being used during price selection?
2. What are the actual price candidates found?
3. Should we update the expected range or fix the selection logic?
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.site_specific_extractors import SiteSpecificExtractor
from scrapers.dynamic_scraper import DynamicScraper
from urllib.parse import urlparse

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def investigate_commarker_b6_mopa_60w():
    """Investigate the ComMarker B6 MOPA 60W pricing issue."""
    
    machine_name = "ComMarker B6 MOPA 60W"
    url = "https://www.commarker.com/products/commarker-b6-jpt-mopa-60w-fiber-laser-engraver"
    old_price = 4589.0
    
    # Mock machine data
    machine_data = {
        'Machine Name': machine_name,
        'old_price': old_price,
        'learned_selectors': {}
    }
    
    logger.info(f"=== INVESTIGATING COMMARKER B6 MOPA 60W PRICING ===")
    logger.info(f"Machine: {machine_name}")
    logger.info(f"URL: {url}")
    logger.info(f"Old Price: ${old_price}")
    
    # Step 1: Check if machine-specific rules exist
    site_extractor = SiteSpecificExtractor()
    domain = urlparse(url).netloc.lower()
    if domain.startswith('www.'):
        domain = domain[4:]
    
    logger.info(f"\n--- STEP 1: CHECKING MACHINE-SPECIFIC RULES ---")
    rules = site_extractor.get_machine_specific_rules(domain, machine_name, url)
    
    if rules:
        logger.info(f"✅ Found machine-specific rules for {machine_name}")
        if 'expected_price_range' in rules:
            expected_range = rules['expected_price_range']
            logger.info(f"📊 Expected price range: ${expected_range[0]} - ${expected_range[1]}")
            
            # Check if old price is within expected range
            if expected_range[0] <= old_price <= expected_range[1]:
                logger.info(f"✅ Old price ${old_price} is within expected range")
            else:
                logger.warning(f"⚠️ Old price ${old_price} is OUTSIDE expected range!")
        else:
            logger.warning(f"❌ No expected_price_range defined in machine-specific rules")
    else:
        logger.error(f"❌ No machine-specific rules found for {machine_name}")
    
    # Step 2: Test dynamic scraper price extraction
    logger.info(f"\n--- STEP 2: TESTING DYNAMIC SCRAPER ---")
    
    try:
        async with DynamicScraper() as scraper:
            # Navigate to page but don't extract yet - let's see what candidates are found
            await scraper.page.goto(url, wait_until="networkidle", timeout=30000)
            await scraper._select_commarker_variant(machine_name)
            await scraper.page.wait_for_timeout(2000)
            
            # Get all price candidates manually to see what's available
            content = await scraper.page.content()
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'lxml')
            
            # Use the same selectors as dynamic scraper
            price_selectors = [
                '.product-summary .price ins .amount',
                '.entry-summary .price ins .amount', 
                '.single-product-content .price ins .amount',
                '.woocommerce-variation-price .price ins .amount',
                '.woocommerce-variation-price .price .amount:last-child',
                '.product-summary .price .amount:last-child',
                '.entry-summary .price .amount:last-child',
                'form.cart .price ins .amount',
                'form.cart .price .amount:last-child',
                '.product-summary [data-price]',
                '.entry-summary [data-price]'
            ]
            
            all_candidates = []
            expected_range = rules.get('expected_price_range', [0, 100000]) if rules else [0, 100000]
            
            logger.info(f"🔍 Searching for price candidates...")
            
            for selector in price_selectors:
                try:
                    elements = soup.select(selector)
                    logger.info(f"Selector '{selector}': found {len(elements)} elements")
                    
                    for i, element in enumerate(elements):
                        price_text = element.get_text(strip=True)
                        if price_text:
                            price = scraper._parse_price_string(price_text)
                            if price:
                                distance_from_old = abs(price - old_price)
                                in_expected_range = expected_range[0] <= price <= expected_range[1]
                                
                                all_candidates.append({
                                    'price': price,
                                    'selector': selector,
                                    'text': price_text,
                                    'distance_from_old': distance_from_old,
                                    'in_expected_range': in_expected_range
                                })
                                
                                logger.info(f"  💰 Found price: ${price} (text: '{price_text}') - "
                                          f"Distance from old: ${distance_from_old:.2f} - "
                                          f"In range: {in_expected_range}")
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {str(e)}")
            
            # Remove duplicates by price
            unique_candidates = []
            seen_prices = set()
            for candidate in all_candidates:
                if candidate['price'] not in seen_prices:
                    unique_candidates.append(candidate)
                    seen_prices.add(candidate['price'])
            
            logger.info(f"\n📊 FOUND {len(unique_candidates)} UNIQUE PRICE CANDIDATES:")
            
            # Sort candidates for analysis
            candidates_by_distance = sorted(unique_candidates, key=lambda x: x['distance_from_old'])
            candidates_in_range = [c for c in unique_candidates if c['in_expected_range']]
            candidates_out_of_range = [c for c in unique_candidates if not c['in_expected_range']]
            
            logger.info(f"\n🎯 CANDIDATES WITHIN EXPECTED RANGE [{expected_range[0]}, {expected_range[1]}]:")
            if candidates_in_range:
                for candidate in candidates_in_range:
                    logger.info(f"  ${candidate['price']} (distance: ${candidate['distance_from_old']:.2f}) via {candidate['selector']}")
            else:
                logger.warning(f"  ❌ NO CANDIDATES WITHIN EXPECTED RANGE!")
            
            logger.info(f"\n📈 CANDIDATES OUTSIDE EXPECTED RANGE:")
            for candidate in candidates_out_of_range:
                logger.info(f"  ${candidate['price']} (distance: ${candidate['distance_from_old']:.2f}) via {candidate['selector']}")
            
            logger.info(f"\n🎯 CURRENT SELECTION LOGIC (closest to old price):")
            if candidates_by_distance:
                closest = candidates_by_distance[0]
                logger.info(f"  Would select: ${closest['price']} (distance: ${closest['distance_from_old']:.2f})")
                logger.info(f"  In expected range: {closest['in_expected_range']}")
            
            # Step 3: Test the actual extraction
            logger.info(f"\n--- STEP 3: ACTUAL PRICE EXTRACTION ---")
            price, method = await scraper.extract_price_with_variants(url, machine_name, {}, machine_data)
            
            if price:
                in_range = expected_range[0] <= price <= expected_range[1] if rules else True
                logger.info(f"✅ Extracted price: ${price} using {method}")
                logger.info(f"📊 Price in expected range: {in_range}")
                logger.info(f"📏 Distance from old price: ${abs(price - old_price):.2f}")
            else:
                logger.error(f"❌ Failed to extract price")
    
    except Exception as e:
        logger.error(f"❌ Error during investigation: {str(e)}")
    
    # Step 4: Analysis and recommendations
    logger.info(f"\n--- STEP 4: ANALYSIS & RECOMMENDATIONS ---")
    
    if rules and 'expected_price_range' in rules:
        expected_range = rules['expected_price_range']
        
        logger.info(f"🔍 ANALYSIS:")
        logger.info(f"  - Expected range: [{expected_range[0]}, {expected_range[1]}]")
        logger.info(f"  - Old price: ${old_price}")
        logger.info(f"  - Expected range needs update: {old_price < expected_range[0] or old_price > expected_range[1]}")
        
        logger.info(f"\n💡 RECOMMENDATIONS:")
        
        if candidates_in_range:
            logger.info(f"  ✅ OPTION 1: Modify selection logic to prefer prices within expected range")
            logger.info(f"     - Found {len(candidates_in_range)} valid candidates in range")
            closest_in_range = min(candidates_in_range, key=lambda x: x['distance_from_old'])
            logger.info(f"     - Closest in-range candidate: ${closest_in_range['price']}")
        else:
            logger.info(f"  ⚠️ OPTION 1: Update expected_price_range to include valid prices")
            if unique_candidates:
                min_candidate = min(unique_candidates, key=lambda x: x['price'])['price']
                max_candidate = max(unique_candidates, key=lambda x: x['price'])['price']
                logger.info(f"     - Suggested new range: [{int(min_candidate * 0.9)}, {int(max_candidate * 1.1)}]")
        
        logger.info(f"  📝 OPTION 2: Investigate why expected range doesn't match current pricing")
    else:
        logger.info(f"  ❌ No expected_price_range defined - should add one for better validation")

if __name__ == "__main__":
    asyncio.run(investigate_commarker_b6_mopa_60w())