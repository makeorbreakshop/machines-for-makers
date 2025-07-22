#!/usr/bin/env python3
"""
Test script to verify browser pool functionality works correctly.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.browser_pool import PooledDynamicScraper, get_browser_pool, cleanup_browser_pool

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

async def test_browser_pool():
    """Test browser pool with concurrent workers."""
    
    logger.info("=== BROWSER POOL TEST ===")
    
    # Test URLs that don't require variant selection (safer for testing)
    test_urls = [
        "https://example.com",
        "https://httpbin.org/html",
        "https://httpbin.org/json",
    ]
    
    # Test pool initialization
    logger.info("🚀 Testing browser pool initialization...")
    pool = await get_browser_pool(pool_size=3)
    logger.info("✅ Browser pool initialized successfully")
    
    # Test concurrent scraper instances
    async def test_single_scraper(url, scraper_id):
        """Test a single scraper instance."""
        try:
            logger.info(f"📝 Scraper {scraper_id} starting with URL: {url}")
            
            async with PooledDynamicScraper(pool_size=3) as scraper:
                # Navigate to page
                await scraper.page.goto(url, wait_until="domcontentloaded", timeout=10000)
                
                # Get title
                title = await scraper.page.title()
                content_length = len(await scraper.page.content())
                
                logger.info(f"✅ Scraper {scraper_id} SUCCESS: Title='{title}', Content={content_length} chars")
                return {"success": True, "scraper_id": scraper_id, "title": title, "content_length": content_length}
                
        except Exception as e:
            logger.error(f"❌ Scraper {scraper_id} FAILED: {str(e)}")
            return {"success": False, "scraper_id": scraper_id, "error": str(e)}
    
    # Test concurrent processing
    logger.info("🏃 Testing concurrent browser operations...")
    
    tasks = []
    for i, url in enumerate(test_urls):
        task = test_single_scraper(url, i + 1)
        tasks.append(task)
    
    # Run all tasks concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Analyze results
    successful = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
    failed = len(results) - successful
    
    logger.info(f"🎯 RESULTS: {successful} successful, {failed} failed")
    
    for result in results:
        if isinstance(result, dict):
            if result.get("success"):
                logger.info(f"  ✅ Scraper {result['scraper_id']}: {result['title']}")
            else:
                logger.error(f"  ❌ Scraper {result['scraper_id']}: {result['error']}")
        else:
            logger.error(f"  ❌ Exception: {str(result)}")
    
    # Cleanup
    logger.info("🧹 Cleaning up browser pool...")
    await cleanup_browser_pool()
    logger.info("✅ Browser pool cleanup completed")
    
    # Test results
    if successful == len(test_urls):
        logger.info("🎉 BROWSER POOL TEST PASSED!")
        return True
    else:
        logger.error("💥 BROWSER POOL TEST FAILED!")
        return False

async def test_commarker_extraction():
    """Test ComMarker extraction with browser pool."""
    
    logger.info("=== COMMARKER EXTRACTION TEST ===")
    
    # Test the specific machines that were failing
    test_machines = [
        {
            "name": "ComMarker B6 MOPA 60W",
            "url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
            "expected_price_range": [4000, 5000]
        }
    ]
    
    async def test_machine_extraction(machine):
        """Test extraction for a single machine."""
        try:
            logger.info(f"🎯 Testing extraction for: {machine['name']}")
            
            async with PooledDynamicScraper(pool_size=2) as scraper:
                # Get variant rules (empty for now)
                variant_rules = {}
                
                # Test extraction
                price, method = await scraper.extract_price_with_variants(
                    machine["url"], 
                    machine["name"], 
                    variant_rules
                )
                
                if price:
                    logger.info(f"✅ Extracted price: ${price} using {method}")
                    
                    # Validate price range
                    min_price, max_price = machine["expected_price_range"]
                    if min_price <= price <= max_price:
                        logger.info(f"✅ Price ${price} is within expected range ${min_price}-${max_price}")
                        return {"success": True, "price": price, "method": method}
                    else:
                        logger.warning(f"⚠️ Price ${price} outside expected range ${min_price}-${max_price}")
                        return {"success": False, "price": price, "method": method, "error": "Price out of range"}
                else:
                    logger.error(f"❌ Failed to extract price for {machine['name']}")
                    return {"success": False, "error": "No price extracted"}
                    
        except Exception as e:
            logger.error(f"❌ Extraction failed for {machine['name']}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Test extraction
    results = []
    for machine in test_machines:
        result = await test_machine_extraction(machine)
        results.append(result)
    
    # Analyze results
    successful = sum(1 for r in results if r.get("success"))
    
    logger.info(f"🎯 COMMARKER RESULTS: {successful}/{len(test_machines)} successful")
    
    # Cleanup
    await cleanup_browser_pool()
    
    return successful > 0

if __name__ == "__main__":
    async def main():
        # Test 1: Basic browser pool functionality
        basic_test_passed = await test_browser_pool()
        
        # Test 2: ComMarker extraction (if basic test passed)
        if basic_test_passed:
            logger.info("\n" + "="*50)
            extraction_test_passed = await test_commarker_extraction()
            
            if extraction_test_passed:
                logger.info("🎉 ALL TESTS PASSED!")
                sys.exit(0)
            else:
                logger.error("💥 EXTRACTION TEST FAILED!")
                sys.exit(1)
        else:
            logger.error("💥 BASIC TEST FAILED!")
            sys.exit(1)
    
    asyncio.run(main())