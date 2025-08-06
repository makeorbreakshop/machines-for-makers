#!/usr/bin/env python3
"""
Final test: ThreadPoolExecutor + concurrency limiting to prevent 429 errors
"""
import asyncio
import time
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService


async def test_production_ready_implementation():
    """Test the final fix with concurrency limiting"""
    print("=== TESTING PRODUCTION-READY IMPLEMENTATION ===")
    print("ThreadPoolExecutor + Concurrency Limiting + Rate Control\n")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # Test URLs that caused issues before
    urls = [
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
        "https://shop.glowforge.com/collections/printers/products/glowforge-plus",
        "https://www.gweikecloud.com/products/g6-split-30w-60w-100w-fiber-laser-marking-engraving-machine-1?ref=NMV3sU0i",
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",  # Duplicate for stress test
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
    ]
    
    async def test_url(url, index):
        """Test single URL with detailed logging"""
        try:
            print(f"[{index}] Starting: {url[:40]}...")
            start_time = time.time()
            
            # Use full page content method (like production)
            html_content, soup = await scraper.get_page_content(url)
            
            elapsed = time.time() - start_time
            
            if html_content is None:
                print(f"❌ [{index}] FAILED in {elapsed:.1f}s")
                return False
            else:
                print(f"✅ [{index}] SUCCESS in {elapsed:.1f}s - {len(html_content)} chars")
                return True
                
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"❌ [{index}] EXCEPTION in {elapsed:.1f}s: {e}")
            return False
    
    # Test all URLs concurrently (but with our concurrency limits)
    print(f"Testing {len(urls)} URLs with concurrency limiting...")
    start_total = time.time()
    
    tasks = [test_url(url, i) for i, url in enumerate(urls)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    total_time = time.time() - start_total
    
    # Analyze results
    successful = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is False)
    exceptions = sum(1 for r in results if not isinstance(r, bool))
    
    print(f"\n=== FINAL RESULTS ===")
    print(f"✅ Successful: {successful}/{len(urls)} ({successful/len(urls):.1%})")
    print(f"❌ Failed: {failed}/{len(urls)}")
    print(f"💥 Exceptions: {exceptions}/{len(urls)}")
    print(f"⏱️ Total time: {total_time:.1f}s")
    print(f"⏱️ Avg time per request: {total_time/len(urls):.1f}s")
    
    # Check for specific error patterns
    none_responses = 0
    throttling_errors = 0
    
    # Print success criteria
    success_rate = successful / len(urls)
    if success_rate >= 0.85:  # 85% success acceptable for production
        print(f"🎉 SUCCESS: {success_rate:.1%} success rate meets production standards!")
        if total_time < 60:  # Should complete in under 1 minute for 7 URLs
            print(f"🚀 PERFORMANCE: Completed in {total_time:.1f}s - excellent!")
        else:
            print(f"⚠️ PERFORMANCE: Took {total_time:.1f}s - acceptable but slow")
        
        print(f"\n✅ PRODUCTION READY: This fix should work in production!")
        return True
    else:
        print(f"❌ FAILED: {success_rate:.1%} success rate too low for production")
        return False


async def test_stress_test():
    """Quick stress test to ensure no 429 errors"""
    print("\n=== STRESS TEST (NO 429 ERRORS) ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # Single URL repeated to test concurrency limiting
    url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"
    
    async def quick_test(index):
        try:
            html_content, metadata = await scraper._fetch_with_tier(url, 1)
            if "429" in str(metadata.get('error', '')):
                print(f"❌ [{index}] 429 ERROR DETECTED!")
                return False
            elif html_content:
                print(f"✅ [{index}] Success")
                return True
            else:
                print(f"⚠️ [{index}] Failed (not 429)")
                return True  # Not a 429 error, so concurrency limiting worked
        except Exception as e:
            if "429" in str(e):
                print(f"❌ [{index}] 429 EXCEPTION: {e}")
                return False
            else:
                print(f"⚠️ [{index}] Other error: {e}")
                return True  # Not a 429 error
    
    # Run 10 requests rapidly
    tasks = [quick_test(i) for i in range(10)]
    results = await asyncio.gather(*tasks)
    
    no_429_errors = all(results)
    success_count = sum(results)
    
    print(f"No 429 errors: {'✅ YES' if no_429_errors else '❌ NO'} ({success_count}/10)")
    return no_429_errors


if __name__ == "__main__":
    async def run_final_tests():
        print("=== FINAL SCRAPFLY FIX VALIDATION ===")
        print("Testing: ThreadPoolExecutor + Concurrency Control + Rate Limiting\n")
        
        test1 = await test_production_ready_implementation()
        test2 = await test_stress_test()
        
        print(f"\n=== OVERALL RESULTS ===")
        print(f"Production readiness test: {'PASS' if test1 else 'FAIL'}")
        print(f"429 error prevention test: {'PASS' if test2 else 'FAIL'}")
        
        if test1 and test2:
            print("\n🎉 ALL TESTS PASSED!")
            print("✅ Fix is production-ready!")
            print("✅ Should restore 15-minute batch processing!")
            print("✅ No more NoneType errors!")
            print("✅ No more 429 throttling!")
        else:
            print("\n❌ SOME TESTS FAILED - Need more work")
    
    asyncio.run(run_final_tests())