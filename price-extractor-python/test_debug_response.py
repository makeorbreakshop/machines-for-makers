#!/usr/bin/env python3
"""
Debug the exact response structure to see what's causing NoneType errors
"""
import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService


async def debug_response_structure():
    """Debug what's actually in the Scrapfly response"""
    print("=== DEBUGGING SCRAPFLY RESPONSE STRUCTURE ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # URL that's failing in production
    url = "https://commarker.com/product/b4-30w-laser-engraver-machine/"
    
    # Get the config and make the call manually
    config = scraper._get_tier_config(url, 3)  # Tier 3 like production
    
    print(f"Testing URL: {url}")
    print(f"Config: {config}")
    
    try:
        # Make the call with thread pool like our fix
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, scraper.client.scrape, config)
        
        print(f"\n=== RESPONSE ANALYSIS ===")
        print(f"Response type: {type(response)}")
        print(f"Response is None: {response is None}")
        print(f"Response bool: {bool(response)}")
        print(f"Response attributes: {dir(response)}")
        
        if response:
            print(f"\nHas scrape_result attr: {hasattr(response, 'scrape_result')}")
            
            if hasattr(response, 'scrape_result'):
                scrape_result = response.scrape_result
                print(f"scrape_result type: {type(scrape_result)}")
                print(f"scrape_result is None: {scrape_result is None}")
                print(f"scrape_result bool: {bool(scrape_result)}")
                
                if scrape_result is not None:
                    print(f"scrape_result has 'get' method: {hasattr(scrape_result, 'get')}")
                    print(f"scrape_result is dict: {isinstance(scrape_result, dict)}")
                    print(f"scrape_result repr: {repr(scrape_result)}")
                    
                    if hasattr(scrape_result, 'get'):
                        content = scrape_result.get('content', 'NO CONTENT KEY')
                        print(f"Content length: {len(content) if content else 0}")
                    else:
                        print("❌ scrape_result has no 'get' method - this is the problem!")
                else:
                    print("❌ scrape_result is None - this is the problem!")
        else:
            print("❌ Response is falsy")
            
    except Exception as e:
        print(f"❌ Exception during call: {e}")
        import traceback
        print(traceback.format_exc())


async def debug_working_url():
    """Test with a URL we know works"""
    print("\n=== DEBUGGING WORKING URL ===")
    
    db_service = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db_service)
    
    # URL that worked in our tests
    url = "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube"
    
    try:
        html_content, metadata = await scraper._fetch_with_tier(url, 3)
        print(f"Working URL result: {html_content is not None}")
        print(f"Metadata: {metadata}")
    except Exception as e:
        print(f"❌ Working URL failed too: {e}")
        import traceback
        print(traceback.format_exc())


if __name__ == "__main__":
    asyncio.run(debug_response_structure())
    asyncio.run(debug_working_url())