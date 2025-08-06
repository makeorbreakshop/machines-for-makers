#!/usr/bin/env python3
"""
Test edge cases that might cause ThreadPoolExecutor to return None responses
"""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService


async def test_high_concurrency_edge_case():
    """Test what happens under high concurrency like production"""
    print("=== TESTING HIGH CONCURRENCY EDGE CASES ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # Test URLs that might cause issues
    urls = [
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
        "https://shop.glowforge.com/collections/printers/products/glowforge-plus",
        "https://www.gweikecloud.com/products/g6-split-30w-60w-100w-fiber-laser-marking-engraving-machine-1?ref=NMV3sU0i",
        # Add some potentially problematic URLs
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",  # Duplicate
        "https://invalid-url-that-might-cause-issues.com/test",  # Will fail
    ] * 3  # Triple the load to simulate production
    
    async def test_single_url(url, index):
        """Test a single URL with detailed logging"""
        try:
            print(f"[{index}] Testing: {url[:50]}...")
            
            # Test our _fetch_with_tier method directly
            html_content, metadata = await scraper._fetch_with_tier(url, 1)
            
            if html_content is None:
                print(f"❌ [{index}] NULL RESPONSE: {metadata}")
                return {"success": False, "error": "NULL_RESPONSE", "metadata": metadata}
            else:
                print(f"✅ [{index}] SUCCESS: {len(html_content)} chars")
                return {"success": True, "content_length": len(html_content)}
                
        except Exception as e:
            print(f"❌ [{index}] EXCEPTION: {e}")
            return {"success": False, "error": str(e)}
    
    # Run all URLs concurrently
    print(f"Running {len(urls)} concurrent requests...")
    start_time = time.time()
    
    tasks = [test_single_url(url, i) for i, url in enumerate(urls)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    total_time = time.time() - start_time
    
    # Analyze results
    successes = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
    null_responses = sum(1 for r in results if isinstance(r, dict) and r.get("error") == "NULL_RESPONSE")
    exceptions = sum(1 for r in results if not isinstance(r, dict))
    
    print(f"\n=== HIGH CONCURRENCY RESULTS ===")
    print(f"Total requests: {len(urls)}")
    print(f"✅ Successes: {successes}")
    print(f"❌ Null responses: {null_responses}")
    print(f"💥 Exceptions: {exceptions}")
    print(f"⏱️ Total time: {total_time:.1f}s")
    
    # Show any null response metadata
    if null_responses > 0:
        print(f"\n=== NULL RESPONSE DETAILS ===")
        for i, r in enumerate(results):
            if isinstance(r, dict) and r.get("error") == "NULL_RESPONSE":
                print(f"URL {i}: {r.get('metadata', {})}")
    
    return null_responses == 0


async def test_thread_pool_executor_limits():
    """Test ThreadPoolExecutor behavior under stress"""
    print("\n=== TESTING THREAD POOL LIMITS ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # Test direct thread pool executor usage
    url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"
    config = scraper._get_tier_config(url, 1)
    
    # Test multiple concurrent calls to same URL
    async def test_thread_call(index):
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, scraper.client.scrape, config)
            
            if response is None:
                print(f"❌ Thread {index}: Got None response")
                return False
            elif not hasattr(response, 'scrape_result'):
                print(f"❌ Thread {index}: No scrape_result attribute")
                return False
            elif response.scrape_result is None:
                print(f"❌ Thread {index}: scrape_result is None")
                return False
            else:
                print(f"✅ Thread {index}: Valid response")
                return True
        except Exception as e:
            print(f"❌ Thread {index}: Exception - {e}")
            return False
    
    # Run 10 concurrent thread pool calls
    tasks = [test_thread_call(i) for i in range(10)]
    thread_results = await asyncio.gather(*tasks)
    
    success_count = sum(thread_results)
    print(f"Thread pool test: {success_count}/10 successful")
    
    return success_count == 10


async def test_production_simulation():
    """Simulate production conditions more closely"""
    print("\n=== PRODUCTION SIMULATION ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # URLs that have been problematic in production
    production_urls = [
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
    ]
    
    # Run like production - full page content fetch
    async def production_fetch(url, index):
        try:
            print(f"[{index}] Production fetch: {url[:40]}...")
            html_content, soup = await scraper.get_page_content(url)
            
            if html_content is None:
                print(f"❌ [{index}] PRODUCTION FAILURE: None response")
                return False
            else:
                print(f"✅ [{index}] Production success: {len(html_content)} chars")
                return True
        except Exception as e:
            print(f"❌ [{index}] Production exception: {e}")
            return False
    
    # Simulate production batch
    tasks = []
    for i in range(20):  # 20 concurrent requests like production
        url = production_urls[i % len(production_urls)]
        tasks.append(production_fetch(url, i))
    
    start_time = time.time()
    prod_results = await asyncio.gather(*tasks)
    total_time = time.time() - start_time
    
    success_rate = sum(prod_results) / len(prod_results)
    print(f"Production simulation: {sum(prod_results)}/{len(prod_results)} success ({success_rate:.1%})")
    print(f"Time: {total_time:.1f}s ({total_time/len(prod_results):.1f}s per request)")
    
    return success_rate >= 0.95  # 95% success rate acceptable


if __name__ == "__main__":
    async def run_all_tests():
        print("=== THREAD POOL EDGE CASE TESTING ===")
        print("Testing for conditions that might cause None responses in production\n")
        
        test1 = await test_high_concurrency_edge_case()
        test2 = await test_thread_pool_executor_limits() 
        test3 = await test_production_simulation()
        
        print(f"\n=== FINAL RESULTS ===")
        print(f"High concurrency test: {'PASS' if test1 else 'FAIL'}")
        print(f"Thread pool limits test: {'PASS' if test2 else 'FAIL'}")
        print(f"Production simulation: {'PASS' if test3 else 'FAIL'}")
        
        if all([test1, test2, test3]):
            print("✅ ALL TESTS PASSED - Fix should work in production!")
        else:
            print("❌ SOME TESTS FAILED - Need to investigate further")
    
    asyncio.run(run_all_tests())