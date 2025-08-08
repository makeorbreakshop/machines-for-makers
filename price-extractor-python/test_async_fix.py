#!/usr/bin/env python3
"""
Test the real fix for async Scrapfly integration
The issue: asyncio.gather() with blocking sync calls = sequential execution
"""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService


async def test_blocking_sync_calls():
    """Demonstrate the problem: sync calls block the event loop"""
    print("=== TESTING BLOCKING SYNC CALLS (THE PROBLEM) ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    urls = [
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
    ]
    
    async def scrape_sync_blocking(url, index):
        """This is what's happening now - sync call blocks event loop"""
        start = time.time()
        print(f"[{index}] Starting sync scrape...")
        
        # This blocks the event loop!
        config = scraper._get_tier_config(url, 1)
        response = scraper.client.scrape(config)  # BLOCKING!
        
        elapsed = time.time() - start
        print(f"[{index}] Finished in {elapsed:.1f}s")
        return elapsed
    
    start_total = time.time()
    tasks = [scrape_sync_blocking(url, i) for i, url in enumerate(urls)]
    times = await asyncio.gather(*tasks)
    total_time = time.time() - start_total
    
    print(f"\nTotal time: {total_time:.1f}s (should be ~sequential: {sum(times):.1f}s)")
    print("❌ This is why batches take 6 hours!")


async def test_proper_async_fix():
    """The fix: run sync calls in thread pool"""
    print("\n=== TESTING PROPER ASYNC FIX (THE SOLUTION) ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    urls = [
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
    ]
    
    # Create thread pool executor
    executor = ThreadPoolExecutor(max_workers=3)
    
    async def scrape_async_proper(url, index):
        """Proper async handling of sync Scrapfly calls"""
        start = time.time()
        print(f"[{index}] Starting async scrape...")
        
        # Run sync call in thread pool - doesn't block event loop!
        config = scraper._get_tier_config(url, 1)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(executor, scraper.client.scrape, config)
        
        elapsed = time.time() - start
        print(f"[{index}] Finished in {elapsed:.1f}s")
        
        # Verify response is valid
        if response and hasattr(response, 'scrape_result'):
            print(f"[{index}] ✅ Valid response received")
        else:
            print(f"[{index}] ❌ Invalid response")
        
        return elapsed
    
    start_total = time.time()
    tasks = [scrape_async_proper(url, i) for i, url in enumerate(urls)]
    times = await asyncio.gather(*tasks)
    total_time = time.time() - start_total
    
    print(f"\nTotal time: {total_time:.1f}s (should be ~parallel: {max(times):.1f}s)")
    print("✅ This is how we get back to 15-minute batches!")
    
    executor.shutdown()


async def test_response_integrity():
    """Verify responses maintain integrity when using thread pool"""
    print("\n=== TESTING RESPONSE INTEGRITY WITH THREAD POOL ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    executor = ThreadPoolExecutor(max_workers=1)
    
    url = "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube"
    
    # Test sync call
    config = scraper._get_tier_config(url, 1)
    sync_response = scraper.client.scrape(config)
    
    # Test async call with thread pool
    loop = asyncio.get_event_loop()
    async_response = await loop.run_in_executor(executor, scraper.client.scrape, config)
    
    # Compare responses
    print(f"Sync response type: {type(sync_response)}")
    print(f"Async response type: {type(async_response)}")
    print(f"Sync has scrape_result: {hasattr(sync_response, 'scrape_result')}")
    print(f"Async has scrape_result: {hasattr(async_response, 'scrape_result')}")
    
    if sync_response.scrape_result and async_response.scrape_result:
        sync_content = sync_response.scrape_result.get('content', '')
        async_content = async_response.scrape_result.get('content', '')
        print(f"Sync content length: {len(sync_content)}")
        print(f"Async content length: {len(async_content)}")
        print(f"✅ Response integrity maintained!" if len(sync_content) == len(async_content) else "❌ Response corrupted!")
    
    executor.shutdown()


if __name__ == "__main__":
    print("=== SCRAPFLY ASYNC FIX DIAGNOSIS ===")
    print("This test demonstrates why batches take 6 hours and how to fix it\n")
    
    # Run tests
    asyncio.run(test_blocking_sync_calls())
    asyncio.run(test_proper_async_fix())
    asyncio.run(test_response_integrity())
    
    print("\n=== DIAGNOSIS COMPLETE ===")
    print("The fix: Use ThreadPoolExecutor for sync Scrapfly calls!")