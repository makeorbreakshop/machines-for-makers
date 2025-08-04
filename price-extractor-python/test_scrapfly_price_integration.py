#!/usr/bin/env python3
"""
Test Scrapfly integration with price extraction for problematic sites
"""
import asyncio
import os
from services.price_service import PriceService
from scrapers.hybrid_web_scraper import get_hybrid_scraper
from scrapers.price_extractor import PriceExtractor
from loguru import logger

# Test URLs for problematic sites
TEST_SITES = [
    {
        "name": "ComMarker B6 MOPA 60W",
        "url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "expected_scrapfly": True,
        "machine_id": "test-commarker"
    },
    {
        "name": "xTool S1",
        "url": "https://www.xtool.com/products/xtool-s1-laser-cutter",
        "expected_scrapfly": True,
        "machine_id": "test-xtool"
    },
    {
        "name": "OneLaser Hydra 7 (Non-Scrapfly)",
        "url": "https://www.1laser.com/products/onelaser-hydra-7-cabinet-dual-laser-system-with-80-glass-tube-and-38w-rf-metal-tube",
        "expected_scrapfly": False,
        "machine_id": "test-onelaser"
    }
]

async def test_hybrid_scraper():
    """Test hybrid scraper routing to Scrapfly"""
    print("🧪 Testing Hybrid Scraper Routing")
    print("=" * 50)
    
    scraper = get_hybrid_scraper()
    
    for site in TEST_SITES:
        print(f"\n📍 Testing: {site['name']}")
        print(f"URL: {site['url']}")
        
        # Check if site should use Scrapfly
        should_use = scraper.scrapfly_service and scraper.scrapfly_service.should_use_scrapfly(site['url'])
        print(f"Should use Scrapfly: {should_use} (Expected: {site['expected_scrapfly']})")
        
        if should_use != site['expected_scrapfly']:
            print(f"❌ ROUTING ERROR: Expected {site['expected_scrapfly']}, got {should_use}")
        else:
            print(f"✅ Routing correct")
        
        print("-" * 30)

async def test_price_extraction():
    """Test end-to-end price extraction with hybrid scraper"""
    print("\n🔍 Testing End-to-End Price Extraction")
    print("=" * 50)
    
    scraper = get_hybrid_scraper()
    extractor = PriceExtractor()
    
    for site in TEST_SITES:
        print(f"\n🎯 Extracting price for: {site['name']}")
        print(f"URL: {site['url']}")
        
        try:
            # Fetch page content
            html_content, soup = await scraper.get_page_content(site['url'])
            
            if html_content and soup:
                print(f"✅ Page fetched successfully ({len(html_content)} chars)")
                
                # Extract price
                price, method = await extractor.extract_price(
                    soup=soup,
                    html_content=html_content,
                    url=site['url'],
                    machine_name=site['name']
                )
                
                if price:
                    print(f"✅ Price extracted: ${price} (Method: {method})")
                else:
                    print(f"❌ Price extraction failed")
                    
            else:
                print(f"❌ Failed to fetch page content")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            
        print("-" * 40)

async def test_price_service_integration():
    """Test PriceService with hybrid scraper"""
    print("\n⚙️ Testing PriceService Integration")
    print("=" * 50)
    
    # Create a test machine record
    test_machine = {
        "id": "test-machine-001",
        "machine_name": "ComMarker B6 MOPA 60W",
        "product_url": "https://commarker.com/product/commarker-b6-jpt-mopa/",
        "price": 3059.0
    }
    
    try:
        price_service = PriceService()
        print("✅ PriceService initialized with hybrid scraper")
        
        # Check if web scraper is hybrid
        print(f"Web scraper type: {type(price_service.web_scraper).__name__}")
        
        if hasattr(price_service.web_scraper, 'scrapfly_service'):
            scrapfly_available = price_service.web_scraper.scrapfly_service is not None
            print(f"Scrapfly service available: {scrapfly_available}")
        else:
            print("❌ No Scrapfly service found in web scraper")
            
    except Exception as e:
        print(f"❌ PriceService initialization failed: {str(e)}")

async def main():
    """Run all tests"""
    print("🚀 Scrapfly Price Integration Test")
    print("=" * 60)
    
    # Check API key
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if api_key:
        print(f"✅ Scrapfly API key found: {api_key[:10]}...")
    else:
        print("❌ Scrapfly API key not found")
        return
    
    try:
        await test_hybrid_scraper()
        await test_price_service_integration()
        await test_price_extraction()
        
        print("\n🎉 All tests completed!")
        print("Check logs above for any issues.")
        
    except Exception as e:
        print(f"❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())