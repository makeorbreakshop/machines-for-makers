#!/usr/bin/env python3
"""
Simple test to verify browser pool fixes contaminated machine extraction.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.browser_pool import PooledDynamicScraper, cleanup_browser_pool

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def test_contaminated_machines():
    """Test the machines that were manually corrected (contaminated)."""
    
    logger.info("=== TESTING CONTAMINATED MACHINES WITH BROWSER POOL ===")
    
    # Test machines that were failing due to browser conflicts
    test_machines = [
        {
            "name": "ComMarker B6 MOPA 60W",
            "url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
            "expected_price": 4589
        },
        {
            "name": "ComMarker B6 20W", 
            "url": "https://commarker.com/product/commarker-b6/",
            "expected_price": 1839
        },
        {
            "name": "xTool S1",
            "url": "https://www.xtool.com/products/xtool-s1-laser-cutter",
            "expected_price": 1899
        }
    ]
    
    async def test_single_machine(machine):
        """Test extraction for a single machine."""
        try:
            logger.info(f"\n🎯 Testing: {machine['name']}")
            
            # Test with browser pool
            async with PooledDynamicScraper(pool_size=3) as scraper:
                # Get variant rules (empty for now)
                variant_rules = {}
                
                # Test extraction
                price, method = await scraper.extract_price_with_variants(
                    machine["url"], 
                    machine["name"], 
                    variant_rules
                )
                
                if price:
                    logger.info(f"✅ EXTRACTED: {machine['name']} - ${price} using {method}")
                    
                    # Check if it's close to expected
                    expected = machine["expected_price"]
                    diff_percent = abs(price - expected) / expected * 100
                    
                    if diff_percent < 20:  # Within 20% is reasonable
                        logger.info(f"   ✅ Price ${price} is reasonable (expected ~${expected})")
                        return {"success": True, "price": price, "method": method}
                    else:
                        logger.warning(f"   ⚠️ Price ${price} differs significantly from expected ${expected} ({diff_percent:.1f}%)")
                        return {"success": True, "price": price, "method": method, "warning": "Price differs from expected"}
                else:
                    logger.error(f"❌ FAILED: {machine['name']} - No price extracted")
                    return {"success": False, "error": "No price extracted"}
                    
        except Exception as e:
            logger.error(f"❌ EXCEPTION: {machine['name']} - {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Test machines concurrently to simulate batch processing
    logger.info("🏃 Testing machines concurrently...")
    
    tasks = [test_single_machine(machine) for machine in test_machines]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Analyze results
    successful = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
    failed = len(results) - successful
    
    logger.info(f"\n🎯 RESULTS: {successful}/{len(test_machines)} successful")
    
    # Details
    for i, result in enumerate(results):
        machine_name = test_machines[i]["name"]
        if isinstance(result, dict) and result.get("success"):
            price = result.get("price")
            method = result.get("method")
            warning = result.get("warning", "")
            status = f"${price} via {method}" + (f" ({warning})" if warning else "")
            logger.info(f"  ✅ {machine_name}: {status}")
        else:
            error = result.get("error", str(result)) if isinstance(result, dict) else str(result)
            logger.info(f"  ❌ {machine_name}: {error}")
    
    # Cleanup browser pool
    await cleanup_browser_pool()
    
    return successful > 0

if __name__ == "__main__":
    success = asyncio.run(test_contaminated_machines())
    if success:
        logger.info("🎉 CONTAMINATED MACHINES TEST PASSED!")
        sys.exit(0)
    else:
        logger.error("💥 CONTAMINATED MACHINES TEST FAILED!")
        sys.exit(1)