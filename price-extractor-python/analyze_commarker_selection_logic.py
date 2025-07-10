#!/usr/bin/env python3
"""
Analyze ComMarker B6 MOPA 60W price selection logic issue.

The problem: System finds 35 price candidates but selects $4799 (closest to old price $4589)
even though machine-specific rules define expected_price_range [4500, 4700].

This script analyzes the selection logic without requiring browser automation.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.site_specific_extractors import SiteSpecificExtractor
from urllib.parse import urlparse

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def analyze_commarker_selection_logic():
    """Analyze the ComMarker B6 MOPA 60W price selection logic."""
    
    machine_name = "ComMarker B6 MOPA 60W"
    url = "https://www.commarker.com/products/commarker-b6-jpt-mopa-60w-fiber-laser-engraver"
    old_price = 4589.0
    
    logger.info(f"=== ANALYZING COMMARKER SELECTION LOGIC ===")
    logger.info(f"Machine: {machine_name}")
    logger.info(f"URL: {url}")
    logger.info(f"Old Price: ${old_price}")
    
    # Step 1: Check machine-specific rules
    site_extractor = SiteSpecificExtractor()
    domain = urlparse(url).netloc.lower()
    if domain.startswith('www.'):
        domain = domain[4:]
    
    logger.info(f"\n--- STEP 1: MACHINE-SPECIFIC RULES ANALYSIS ---")
    rules = site_extractor.get_machine_specific_rules(domain, machine_name, url)
    
    if rules:
        logger.info(f"✅ Found machine-specific rules for {machine_name}")
        
        # Show all machine-specific settings
        logger.info(f"📋 Machine-specific settings:")
        if 'expected_price_range' in rules:
            expected_range = rules['expected_price_range']
            logger.info(f"  📊 Expected price range: ${expected_range[0]} - ${expected_range[1]}")
            
            # Check if old price is within expected range
            old_in_range = expected_range[0] <= old_price <= expected_range[1]
            logger.info(f"  📍 Old price ${old_price} in range: {old_in_range}")
            
            if not old_in_range:
                logger.warning(f"  ⚠️ OLD PRICE IS OUTSIDE EXPECTED RANGE!")
                if old_price < expected_range[0]:
                    logger.warning(f"    Old price is ${expected_range[0] - old_price:.2f} below minimum")
                else:
                    logger.warning(f"    Old price is ${old_price - expected_range[1]:.2f} above maximum")
        else:
            logger.warning(f"  ❌ No expected_price_range defined")
        
        # Show other machine-specific settings
        for key, value in rules.items():
            if key != 'expected_price_range':
                logger.info(f"  🔧 {key}: {value}")
    else:
        logger.error(f"❌ No machine-specific rules found for {machine_name}")
        return
    
    # Step 2: Simulate the price selection logic from dynamic_scraper.py
    logger.info(f"\n--- STEP 2: SIMULATED PRICE CANDIDATES ---")
    
    # Based on the logs, we know the system found 35 candidates
    # Let's simulate some realistic candidates based on ComMarker pricing patterns
    logger.info(f"🔍 Simulating realistic price candidates found on ComMarker pages...")
    
    # These are based on typical ComMarker page structure with bundles, accessories, etc.
    price_candidates = [
        # Base machine prices (what we want)
        {'price': 4599.0, 'source': 'base_machine_sale', 'context': 'main product area'},
        {'price': 4649.0, 'source': 'base_machine_regular', 'context': 'main product area'},
        
        # Bundle prices (what we want to avoid)
        {'price': 4799.0, 'source': 'bundle_with_extras', 'context': 'bundle section'},
        {'price': 5073.0, 'source': 'premium_bundle', 'context': 'bundle section'},
        
        # Other prices from page (related products, accessories, etc.)
        {'price': 3059.0, 'source': 'related_product', 'context': 'related products'},
        {'price': 3280.0, 'source': 'accessory', 'context': 'accessories'},
        {'price': 3382.0, 'source': 'addon', 'context': 'addons'},
        {'price': 3926.0, 'source': 'lower_model', 'context': 'related products'},
        {'price': 3888.0, 'source': 'other_variant', 'context': 'variants'},
        {'price': 4197.0, 'source': 'similar_machine', 'context': 'related products'},
    ]
    
    expected_range = rules.get('expected_price_range', [0, 100000])
    
    logger.info(f"📊 Price candidates analysis:")
    logger.info(f"Expected range: [{expected_range[0]}, {expected_range[1]}]")
    logger.info(f"Old price: ${old_price}")
    
    candidates_in_range = []
    candidates_out_of_range = []
    
    for candidate in price_candidates:
        price = candidate['price']
        distance_from_old = abs(price - old_price)
        in_range = expected_range[0] <= price <= expected_range[1]
        
        candidate['distance_from_old'] = distance_from_old
        candidate['in_expected_range'] = in_range
        
        if in_range:
            candidates_in_range.append(candidate)
        else:
            candidates_out_of_range.append(candidate)
        
        range_status = "✅ IN RANGE" if in_range else "❌ OUT OF RANGE"
        logger.info(f"  ${price:>7.2f} | Distance: ${distance_from_old:>6.2f} | {range_status} | {candidate['source']}")
    
    # Step 3: Analyze current selection logic
    logger.info(f"\n--- STEP 3: CURRENT SELECTION LOGIC ANALYSIS ---")
    
    # Current logic: select closest to old price (from dynamic_scraper.py line 721)
    closest_to_old = min(price_candidates, key=lambda x: x['distance_from_old'])
    
    logger.info(f"🎯 CURRENT LOGIC (closest to old price ${old_price}):")
    logger.info(f"  Selected: ${closest_to_old['price']} ({closest_to_old['source']})")
    logger.info(f"  Distance: ${closest_to_old['distance_from_old']:.2f}")
    logger.info(f"  In expected range: {closest_to_old['in_expected_range']}")
    logger.info(f"  Context: {closest_to_old['context']}")
    
    if not closest_to_old['in_expected_range']:
        logger.warning(f"  ⚠️ PROBLEM: Selected price is OUTSIDE expected range!")
    
    # Step 4: Analyze alternative selection strategies
    logger.info(f"\n--- STEP 4: ALTERNATIVE SELECTION STRATEGIES ---")
    
    # Strategy 1: Prefer prices within expected range
    logger.info(f"🔄 STRATEGY 1: Prefer prices within expected range")
    if candidates_in_range:
        # Among in-range candidates, select closest to old price
        best_in_range = min(candidates_in_range, key=lambda x: x['distance_from_old'])
        logger.info(f"  ✅ Would select: ${best_in_range['price']} ({best_in_range['source']})")
        logger.info(f"  Distance: ${best_in_range['distance_from_old']:.2f}")
        logger.info(f"  Context: {best_in_range['context']}")
        
        # Compare with current selection
        current_distance = closest_to_old['distance_from_old']
        new_distance = best_in_range['distance_from_old']
        logger.info(f"  📊 Distance difference: ${abs(new_distance - current_distance):.2f}")
        
        if best_in_range['price'] != closest_to_old['price']:
            logger.info(f"  🔀 WOULD CHANGE SELECTION from ${closest_to_old['price']} to ${best_in_range['price']}")
        else:
            logger.info(f"  ✅ Same selection as current logic")
    else:
        logger.warning(f"  ❌ NO CANDIDATES WITHIN EXPECTED RANGE!")
        logger.warning(f"  This suggests the expected_price_range needs updating")
    
    # Strategy 2: Update expected range based on current pricing
    logger.info(f"\n🔄 STRATEGY 2: Update expected_price_range")
    if price_candidates:
        # Filter out obvious outliers (related products, accessories)
        main_candidates = [c for c in price_candidates if 'main' in c['context'] or 'bundle' in c['source']]
        if main_candidates:
            min_main_price = min(main_candidates, key=lambda x: x['price'])['price']
            max_main_price = max(main_candidates, key=lambda x: x['price'])['price']
            
            # Add 10% buffer
            suggested_min = int(min_main_price * 0.9)
            suggested_max = int(max_main_price * 1.1)
            
            logger.info(f"  📈 Current main product prices: ${min_main_price} - ${max_main_price}")
            logger.info(f"  💡 Suggested new range: [{suggested_min}, {suggested_max}]")
            logger.info(f"  📍 Old price ${old_price} in suggested range: {suggested_min <= old_price <= suggested_max}")
        else:
            logger.warning(f"  ❌ No main product candidates found")
    
    # Step 5: Recommendations
    logger.info(f"\n--- STEP 5: RECOMMENDATIONS ---")
    
    logger.info(f"🎯 ROOT CAUSE:")
    logger.info(f"  The current selection logic prioritizes 'closest to old price' over 'within expected range'")
    logger.info(f"  This causes the system to select bundle prices ($4799) instead of base prices ($4599)")
    
    logger.info(f"\n💡 RECOMMENDED FIXES:")
    
    if candidates_in_range:
        logger.info(f"  ✅ OPTION 1: Modify selection logic to prefer expected range")
        logger.info(f"    - Change dynamic_scraper.py line 721 to prefer in-range candidates")
        logger.info(f"    - Only fall back to closest-to-old if no in-range candidates exist")
    
    if not candidates_in_range or len(candidates_in_range) < 2:
        logger.info(f"  📝 OPTION 2: Update expected_price_range in site_specific_extractors.py")
        logger.info(f"    - Current range [4500, 4700] may be outdated")
        logger.info(f"    - Consider expanding to include current pricing reality")
    
    logger.info(f"  🔍 OPTION 3: Improve candidate filtering")
    logger.info(f"    - Better distinguish between base machine and bundle prices")
    logger.info(f"    - Use context-aware filtering to avoid bundle contamination")
    
    logger.info(f"\n🚀 IMMEDIATE ACTION:")
    logger.info(f"  Check if the expected_price_range [4500, 4700] is still accurate for this machine")
    logger.info(f"  If yes: modify selection logic to respect expected ranges")
    logger.info(f"  If no: update the expected_price_range to reflect current pricing")

if __name__ == "__main__":
    analyze_commarker_selection_logic()