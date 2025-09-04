import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test_cloudray_extraction():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test the actual CloudRay machines from the database
    test_cases = [
        {
            'name': 'Cloudray GM Neo 100',
            'url': 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643',
            'expected_base': 8999.00,
            'shown_in_admin': 12225.00
        },
        {
            'name': 'Cloudray QS Neo', 
            'url': 'https://www.cloudraylaser.com/products/cloudray-qs-series-litemarker-neo-30w-50w-fiber-laser-marking-engraver?variant=52126323147115',
            'expected_base': 4299.00,
            'shown_in_admin': 5636.99
        },
        {
            'name': 'Cloudray MP Neo 60',
            'url': 'https://www.cloudraylaser.com/products/cloudray-litemarker-mp-series-neo-60w-100w-fiber-laser-engraver?variant=52126567039339',
            'expected_base': 5999.00,
            'shown_in_admin': 7940.99
        }
    ]
    
    for test in test_cases:
        print(f"\n{'='*70}")
        print(f"Testing: {test['name']}")
        print(f"URL: {test['url'][:100]}...")
        print(f"Expected base price: ${test['expected_base']:,.2f}")
        print(f"Currently showing in admin: ${test['shown_in_admin']:,.2f}")
        print(f"{'-'*70}")
        
        # Extract price
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
            
            print(f"✅ Extracted price: ${result['price']:,.2f}")
            print(f"   Method: {result['method']}")
            
            # Check if this is the bundle price or base price
            if abs(result['price'] - test['shown_in_admin']) < 1:
                print(f"❌ PROBLEM: Extracting bundle/variant price instead of base price!")
                print(f"   This matches what's shown in admin: ${test['shown_in_admin']}")
            elif abs(result['price'] - test['expected_base']) < 1:
                print(f"✅ SUCCESS: Extracting correct base price!")
            else:
                print(f"⚠️  UNKNOWN: Price ${result['price']} doesn't match expected base or variant")
                
        except Exception as e:
            print(f"❌ Error extracting price: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_extraction())