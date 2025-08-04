#!/usr/bin/env python3
"""
Test complete price extraction with Scrapfly for ComMarker
"""
import asyncio
import os
from services.price_service import PriceService
from scrapers.hybrid_web_scraper import get_hybrid_scraper
from scrapers.price_extractor import PriceExtractor
from loguru import logger

async def test_commarker_extraction():
    """Test full price extraction for ComMarker B6 MOPA"""
    print("🎯 Testing ComMarker B6 MOPA Price Extraction with Scrapfly")
    print("=" * 60)
    
    # Test data
    machine_name = "ComMarker B6 MOPA 60W"
    url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
    
    try:
        # Initialize components
        scraper = get_hybrid_scraper()
        extractor = PriceExtractor()
        
        print(f"🔍 Machine: {machine_name}")
        print(f"🔗 URL: {url}")
        
        # Verify Scrapfly routing
        should_use_scrapfly = scraper.scrapfly_service and scraper.scrapfly_service.should_use_scrapfly(url)
        print(f"📡 Using Scrapfly: {should_use_scrapfly}")
        
        # Check if extractor recognizes it as Scrapfly site
        is_scrapfly_site = extractor._is_scrapfly_site(url)
        print(f"🤖 PriceExtractor recognizes as Scrapfly site: {is_scrapfly_site}")
        
        print(f"\n🚀 Fetching page content...")
        
        # Fetch content with hybrid scraper
        html_content, soup = await scraper.get_page_content(url)
        
        if html_content and soup:
            print(f"✅ Page fetched: {len(html_content):,} characters")
            print(f"📄 Title: {soup.title.string if soup.title else 'No title'}")
            
            print(f"\n💰 Extracting price...")
            
            # Extract price (should skip browser pool for Scrapfly sites)
            price, method = await extractor.extract_price(
                soup=soup,
                html_content=html_content, 
                url=url,
                machine_name=machine_name,
                old_price=3059.0
            )
            
            if price:
                print(f"✅ SUCCESS: Price extracted: ${price}")
                print(f"🔧 Method used: {method}")
                
                # Validate result
                if price > 1000 and price < 10000:
                    print(f"✅ Price seems reasonable for this machine")
                else:
                    print(f"⚠️ Price seems unusual: ${price}")
                    
            else:
                print(f"❌ FAILED: No price extracted")
                
        else:
            print(f"❌ Failed to fetch page content")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

async def test_xtool_extraction():
    """Test xTool S1 extraction with Scrapfly"""
    print(f"\n🎯 Testing xTool S1 Price Extraction with Scrapfly")
    print("=" * 60)
    
    machine_name = "xTool S1"
    url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
    
    try:
        scraper = get_hybrid_scraper()
        extractor = PriceExtractor()
        
        print(f"🔍 Machine: {machine_name}")
        print(f"🔗 URL: {url}")
        
        # Check routing
        should_use_scrapfly = scraper.scrapfly_service and scraper.scrapfly_service.should_use_scrapfly(url)
        is_scrapfly_site = extractor._is_scrapfly_site(url)
        
        print(f"📡 Using Scrapfly: {should_use_scrapfly}")
        print(f"🤖 PriceExtractor recognizes as Scrapfly site: {is_scrapfly_site}")
        
        print(f"\n🚀 Fetching page content...")
        
        html_content, soup = await scraper.get_page_content(url)
        
        if html_content and soup:
            print(f"✅ Page fetched: {len(html_content):,} characters")
            
            print(f"\n💰 Extracting price...")
            
            price, method = await extractor.extract_price(
                soup=soup,
                html_content=html_content,
                url=url, 
                machine_name=machine_name,
                old_price=1999.0
            )
            
            if price:
                print(f"✅ SUCCESS: Price extracted: ${price}")
                print(f"🔧 Method used: {method}")
            else:
                print(f"❌ FAILED: No price extracted")
                
        else:
            print(f"❌ Failed to fetch page content")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

async def main():
    """Run extraction tests"""
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        print("❌ Scrapfly API key not found")
        return
    
    print(f"✅ Scrapfly API key: {api_key[:10]}...")
    
    await test_commarker_extraction()
    await test_xtool_extraction()
    
    print(f"\n🎉 Tests completed!")
    print(f"🔍 Check logs above - should see 'METHOD 1 SKIPPED: Scrapfly site' for both tests")

if __name__ == "__main__":
    asyncio.run(main())