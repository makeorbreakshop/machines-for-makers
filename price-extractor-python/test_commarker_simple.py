#!/usr/bin/env python3
"""
Simple test to verify ComMarker variants get different prices.
"""
import asyncio
import sys
from loguru import logger

sys.path.append('.')

from scrapers.dynamic_scraper import DynamicScraper

async def test_simple():
    """Test extraction of ComMarker variants."""
    logger.info("Testing ComMarker variant selection...")
    
    machines = [
        ("ComMarker B6 MOPA 20W", "https://commarker.com/product/commarker-b6-jpt-mopa/", 3500),  # Expected around $3599
        ("ComMarker B6 MOPA 30W", "https://commarker.com/product/commarker-b6-jpt-mopa/", 4000),  # Expected around $3999
        ("ComMarker B6 MOPA 60W", "https://commarker.com/product/commarker-b6-jpt-mopa/", 4600),  # Expected around $4589
    ]
    
    prices = {}
    
    async with DynamicScraper() as scraper:
        for name, url, baseline_price in machines:
            logger.info(f"\nTesting: {name} (baseline: ${baseline_price})")
            
            variant_rules = {'commarker.com': {'requires_selection': True}}
            
            try:
                price, method = await scraper.extract_price_with_variants(
                    url, name, variant_rules,
                    machine_data={'Machine Name': name, 'old_price': baseline_price}
                )
                
                if price:
                    logger.success(f"✅ {name}: ${price}")
                    prices[name] = price
                else:
                    logger.error(f"❌ {name}: Failed to extract price")
                    prices[name] = None
                    
            except Exception as e:
                logger.error(f"❌ {name}: Error - {str(e)}")
                prices[name] = None
    
    # Check results
    logger.info("\n=== RESULTS ===")
    unique_prices = set(p for p in prices.values() if p is not None)
    
    for name, price in prices.items():
        logger.info(f"{name}: ${price if price else 'FAILED'}")
    
    if len(unique_prices) == len([p for p in prices.values() if p is not None]):
        logger.success("\n✅ SUCCESS: All variants have DIFFERENT prices!")
        return True
    else:
        logger.error("\n❌ FAILURE: Some variants have the SAME price!")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_simple())
    sys.exit(0 if success else 1)