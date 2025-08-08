#!/usr/bin/env python3
"""
Test concurrent Scrapfly execution to find the real issue
"""
import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService


async def test_concurrent_scrapfly():
    """Test multiple concurrent Scrapfly calls like the real batch process"""
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # URLs that failed in the batch
    urls = [
        "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "https://omtechlaser.com/products/mopa-60-60w-integrated-mopa-fiber-laser-marker-engraving-machine-for-metal?sca_ref=2167975.eUaAiFuxut&utm_source=affiliate&utm_medium=kols&utm_campaign=brandon-cullum",
        "https://commarker.com/product/b4-30w-laser-engraver-machine/",
        "https://www.gweikecloud.com/products/g6-split-30w-60w-100w-fiber-laser-marking-engraving-machine-1?ref=NMV3sU0i",
        "https://shop.glowforge.com/collections/printers/products/glowforge-plus"
    ]
    
    async def scrape_single_url(url, index):
        """Scrape a single URL and track results"""
        try:
            print(f"🔄 [{index}] Starting: {url[:50]}...")
            html_content, soup = await scraper.get_page_content(url)
            
            if html_content:
                print(f"✅ [{index}] SUCCESS: {len(html_content)} chars")
                return {"success": True, "url": url, "content_length": len(html_content)}
            else:
                print(f"❌ [{index}] FAILED: No content returned")
                return {"success": False, "url": url, "error": "No content"}
                
        except Exception as e:
            print(f"❌ [{index}] EXCEPTION: {e}")
            return {"success": False, "url": url, "error": str(e)}
    
    # Test concurrent execution like the real batch process
    print(f"=== TESTING {len(urls)} CONCURRENT SCRAPFLY CALLS ===")
    
    # Create tasks for concurrent execution
    tasks = [scrape_single_url(url, i) for i, url in enumerate(urls)]
    
    # Run concurrently (this mimics the real batch process)
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Analyze results
    successes = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
    failures = len(results) - successes
    
    print(f"\n=== CONCURRENT RESULTS ===")
    print(f"✅ Successes: {successes}")
    print(f"❌ Failures: {failures}")
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"❌ [{i}] Exception: {result}")
        elif isinstance(result, dict) and not result.get("success"):
            print(f"❌ [{i}] Failed: {result.get('error')}")
    
    return results


if __name__ == "__main__":
    print("=== CONCURRENT SCRAPFLY DIAGNOSIS ===")
    results = asyncio.run(test_concurrent_scrapfly())
    print("=== DIAGNOSIS COMPLETE ===")