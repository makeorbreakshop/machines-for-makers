#!/usr/bin/env python3
"""
Quick test of Scrapfly integration for ComMarker
"""
import asyncio
import os
from services.price_service import PriceService
from scrapers.hybrid_web_scraper import get_hybrid_scraper

async def test_commarker():
    """Quick test of ComMarker with Scrapfly"""
    print("🧪 Testing ComMarker with Scrapfly Integration")
    print("=" * 50)
    
    # Check API key
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        print("❌ Scrapfly API key not found")
        return
    
    print(f"✅ Scrapfly API key found: {api_key[:10]}...")
    
    try:
        # Test hybrid scraper
        scraper = get_hybrid_scraper()
        print(f"✅ Hybrid scraper initialized")
        
        # Check if ComMarker should use Scrapfly
        url = "https://commarker.com/product/commarker-b6-jpt-mopa/"
        should_use = scraper.scrapfly_service and scraper.scrapfly_service.should_use_scrapfly(url)
        print(f"ComMarker should use Scrapfly: {should_use}")
        
        if should_use:
            print("🚀 Fetching ComMarker page with Scrapfly...")
            html_content, soup = await scraper.get_page_content(url)
            
            if html_content and soup:
                page_size = len(html_content)
                print(f"✅ Page fetched successfully ({page_size:,} chars)")
                print(f"Page title: {soup.title.string if soup.title else 'No title'}")
                
                # Check for price indicators
                import re
                price_elements = soup.find_all(string=re.compile(r'\$[\d,]+'))
                print(f"Price-like elements found: {len(price_elements)}")
                
                if len(price_elements) > 0:
                    print(f"Sample prices: {price_elements[:3]}")
                    
            else:
                print("❌ Failed to fetch page content")
        
        # Test PriceService integration
        print(f"\n⚙️ Testing PriceService...")
        price_service = PriceService() 
        print(f"✅ PriceService initialized")
        print(f"Web scraper type: {type(price_service.web_scraper).__name__}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_commarker())