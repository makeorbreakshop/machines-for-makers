import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test_cloudray_extraction():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test just the MP Neo 60 that we know works
    test_case = {
        'name': 'Cloudray MP Neo 60',
        'url': 'https://www.cloudraylaser.com/products/cloudray-litemarker-mp-series-neo-60w-100w-fiber-laser-engraver?variant=52126567039339',
        'expected_base': 5999.00,
        'shown_in_admin': 7940.99
    }
    
    print(f"\n{'='*70}")
    print(f"Testing: {test_case['name']}")
    print(f"URL: {test_case['url'][:100]}...")
    print(f"Expected base price: ${test_case['expected_base']:,.2f}")
    print(f"Currently showing in admin: ${test_case['shown_in_admin']:,.2f}")
    print(f"{'-'*70}")
    
    try:
        # Get page content using Scrapfly
        html, soup = await scraper.get_page_content(test_case['url'])
        
        result = await extractor.extract_price(
            soup=soup,
            html_content=html,
            url=test_case['url'], 
            machine_name=test_case['name'],
            machine_data={'Machine Name': test_case['name']}
        )
        
        # Result is a tuple (price, method) when successful
        if isinstance(result, tuple) and len(result) == 2:
            price, method = result
            print(f"✅ Extracted price: ${price:,.2f}")
            print(f"   Method: {method}")
            
            # Check if this is the bundle price or base price
            if abs(price - test_case['shown_in_admin']) < 1:
                print(f"✅ SUCCESS: Extracting correct bundle price as expected!")
                print(f"   This matches what's shown in admin: ${test_case['shown_in_admin']}")
            elif abs(price - test_case['expected_base']) < 1:
                print(f"⚠️  ISSUE: Extracting base price instead of bundle price")
            else:
                print(f"⚠️  UNKNOWN: Price ${price} doesn't match expected")
        else:
            print(f"❌ Unexpected result format: {result}")
            
    except Exception as e:
        print(f"❌ Error extracting price: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_extraction())