import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test_single_cloudray():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test just MP Neo 60 to debug the 1064 issue
    test = {
        'name': 'Cloudray MP Neo 60',
        'url': 'https://www.cloudraylaser.com/products/cloudray-litemarker-mp-series-neo-60w-100w-fiber-laser-engraver',  # Base URL without variant
        'expected_base': 5999.00
    }
    
    print(f"\n{'='*70}")
    print(f"Testing: {test['name']}")
    print(f"URL (base, no variant): {test['url']}")
    print(f"Expected base price: ${test['expected_base']:,.2f}")
    print(f"{'-'*70}")
    
    try:
        # Get page content using Scrapfly
        html, soup = await scraper.get_page_content(test['url'])
        
        result = await extractor.extract_price(
            soup=soup,
            html_content=html,
            url=test['url'], 
            machine_name=test['name'],
            machine_data={'Machine Name': test['name']}
        )
        
        # Result is a tuple (price, method) when successful
        if isinstance(result, tuple) and len(result) == 2:
            price, method = result
            print(f"\n✅ Extracted price: ${price:,.2f}")
            print(f"   Method: {method}")
            
            if price == 1064 or price == 1064.0:
                print(f"\n❌ ERROR: Still extracting wavelength value 1064!")
                print("   The fix is not working properly")
            elif abs(price - test['expected_base']) < 100:
                print(f"\n✅ SUCCESS: Got base price as expected!")
            else:
                print(f"\n⚠️  Price ${price} doesn't match expected base of ${test['expected_base']}")
        else:
            print(f"❌ Unexpected result format: {result}")
            
    except Exception as e:
        print(f"❌ Error extracting price: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_single_cloudray())