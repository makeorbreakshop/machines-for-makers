#!/usr/bin/env python3
"""
Test script to verify ComMarker variant selection is working correctly.
This will test that different variants extract different prices.
"""
import asyncio
import sys
from loguru import logger

# Add parent directory to path
sys.path.append('.')

from scrapers.dynamic_scraper import DynamicScraper

# Test machines - ComMarker B6 MOPA variants
TEST_MACHINES = [
    {
        "name": "ComMarker B6 MOPA 20W",
        "url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "expected_price_range": (3000, 3600),  # Basic Bundle price range
        "power": "20W"
    },
    {
        "name": "ComMarker B6 MOPA 30W", 
        "url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "expected_price_range": (3300, 3900),  # Basic Bundle price range
        "power": "30W"
    },
    {
        "name": "ComMarker B6 MOPA 60W",
        "url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "expected_price_range": (4200, 4800),  # Basic Bundle price range  
        "power": "60W"
    }
]

async def test_variant_extraction():
    """Test extraction of ComMarker variants to ensure they get different prices."""
    logger.info("="*80)
    logger.info("ComMarker Variant Selection Test")
    logger.info("="*80)
    
    results = {}
    all_prices = []
    
    async with DynamicScraper() as scraper:
        for machine in TEST_MACHINES:
            logger.info(f"\nTesting: {machine['name']}")
            logger.info(f"URL: {machine['url']}")
            
            # Extract price using dynamic scraper
            # Need to provide variant_rules for ComMarker
            variant_rules = {
                'commarker.com': {
                    'requires_selection': True
                }
            }
            price, method = await scraper.extract_price_with_variants(
                machine['url'],
                machine['name'],
                variant_rules,
                machine_data={'Machine Name': machine['name'], 'old_price': 4000}
            )
            
            if price:
                logger.success(f"✅ Extracted price: ${price} (method: {method})")
                
                # Check if price is in expected range
                min_price, max_price = machine['expected_price_range']
                if min_price <= price <= max_price:
                    logger.success(f"✅ Price ${price} is within expected range ${min_price}-${max_price}")
                else:
                    logger.warning(f"⚠️ Price ${price} is OUTSIDE expected range ${min_price}-${max_price}")
                
                results[machine['power']] = price
                all_prices.append(price)
            else:
                logger.error(f"❌ Failed to extract price!")
                results[machine['power']] = None
    
    # Analyze results
    logger.info("\n" + "="*80)
    logger.info("VARIANT PRICE ANALYSIS")
    logger.info("="*80)
    
    for power, price in results.items():
        if price:
            logger.info(f"{power}: ${price}")
        else:
            logger.error(f"{power}: FAILED")
    
    # Check if all prices are the same
    unique_prices = set(p for p in all_prices if p is not None)
    
    if len(unique_prices) == 1 and len(all_prices) > 1:
        logger.error("\n🚨 CRITICAL ISSUE: All variants extracted the SAME price!")
        logger.error(f"All variants returned: ${list(unique_prices)[0]}")
        logger.error("This indicates variant selection is BROKEN!")
        return False
    elif len(unique_prices) == len([p for p in all_prices if p is not None]):
        logger.success("\n✅ SUCCESS: All variants extracted DIFFERENT prices!")
        logger.success("Variant selection is working correctly!")
        return True
    else:
        logger.warning("\n⚠️ PARTIAL SUCCESS: Some variants have same prices")
        return False

async def main():
    """Run the test."""
    success = await test_variant_extraction()
    
    if success:
        logger.success("\n✅ ComMarker variant selection test PASSED!")
        sys.exit(0)
    else:
        logger.error("\n❌ ComMarker variant selection test FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())