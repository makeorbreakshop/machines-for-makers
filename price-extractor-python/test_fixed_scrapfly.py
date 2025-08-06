#!/usr/bin/env python3
"""
Test the fixed Scrapfly implementation with proper async handling
"""
import asyncio
import time
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService


async def test_fixed_concurrent_execution():
    """Test that our fix enables true concurrent execution"""
    print("=== TESTING FIXED SCRAPFLY CONCURRENT EXECUTION ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # Test URLs
    urls = [
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
        "https://www.gweikecloud.com/products/g6-split-30w-60w-100w-fiber-laser-marking-engraving-machine-1?ref=NMV3sU0i",
        "https://shop.glowforge.com/collections/printers/products/glowforge-plus"
    ]
    
    async def scrape_with_timing(url, index):
        """Scrape a URL and measure timing"""
        start = time.time()
        print(f"[{index}] Starting: {url[:50]}...")
        
        try:
            html_content, soup = await scraper.get_page_content(url)
            elapsed = time.time() - start
            
            if html_content:
                print(f"✅ [{index}] SUCCESS in {elapsed:.1f}s - {len(html_content)} chars")
                return {"success": True, "time": elapsed, "url": url}
            else:
                print(f"❌ [{index}] FAILED in {elapsed:.1f}s")
                return {"success": False, "time": elapsed, "url": url}
                
        except Exception as e:
            elapsed = time.time() - start
            print(f"❌ [{index}] EXCEPTION in {elapsed:.1f}s: {e}")
            return {"success": False, "time": elapsed, "url": url, "error": str(e)}
    
    # Test concurrent execution
    start_total = time.time()
    tasks = [scrape_with_timing(url, i) for i, url in enumerate(urls)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.time() - start_total
    
    # Analyze results
    successes = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
    max_time = max(r.get("time", 0) for r in results if isinstance(r, dict))
    sum_time = sum(r.get("time", 0) for r in results if isinstance(r, dict))
    
    print(f"\n=== RESULTS ===")
    print(f"✅ Successes: {successes}/{len(urls)}")
    print(f"⏱️ Total time: {total_time:.1f}s")
    print(f"⏱️ Max individual time: {max_time:.1f}s")
    print(f"⏱️ Sum of individual times: {sum_time:.1f}s")
    print(f"🚀 Speedup: {sum_time/total_time:.1f}x")
    
    # Check for NoneType errors
    none_type_errors = sum(1 for r in results if isinstance(r, dict) and "'NoneType' object has no attribute 'get'" in str(r.get("error", "")))
    if none_type_errors > 0:
        print(f"❌ NoneType errors: {none_type_errors}")
    else:
        print(f"✅ No NoneType errors!")
    
    return results


async def test_response_integrity():
    """Verify responses maintain proper structure after fix"""
    print("\n=== TESTING RESPONSE INTEGRITY ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"
    
    # Test the internal fetch method directly
    html_content, metadata = await scraper._fetch_with_tier(url, 1)
    
    print(f"HTML content received: {html_content is not None}")
    print(f"HTML length: {len(html_content) if html_content else 0}")
    print(f"Metadata: {metadata}")
    
    if html_content:
        print("✅ Response integrity maintained after fix!")
    else:
        print("❌ Response failed - check error:", metadata.get('error'))


if __name__ == "__main__":
    print("=== TESTING FIXED SCRAPFLY IMPLEMENTATION ===")
    print("This should show concurrent execution with no NoneType errors\n")
    
    asyncio.run(test_fixed_concurrent_execution())
    asyncio.run(test_response_integrity())
    
    print("\n=== TEST COMPLETE ===")
    print("If successful, batch processing should return to ~15 minute duration!")