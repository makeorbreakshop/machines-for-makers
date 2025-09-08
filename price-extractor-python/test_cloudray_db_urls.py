import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger
import json

async def test_cloudray_urls():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test URLs from the database that were showing incorrect prices
    test_cases = [
        {
            'name': 'Cloudray GM-100 LiteMarker',
            'url': 'https://www.cloudraylaser.com/products/cloudray-gm-100-100w-fiber-laser-marking-engraver-with-4-3-x-4-3-scan-area',
            'variant_url': 'https://www.cloudraylaser.com/products/cloudray-gm-100-100w-fiber-laser-marking-engraver-with-4-3-x-4-3-scan-area?variant=43544778830945',
            'expected': 6999.00,
            'wrong_price': 10225.00
        },
        {
            'name': 'Cloudray GM Neo 100',
            'url': 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera',
            'variant_url': 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643',
            'expected': 8999.00,
            'wrong_price': 12225.00
        }
    ]
    
    for test in test_cases:
        print(f"\n{'='*70}")
        print(f"Testing: {test['name']}")
        print(f"Expected: ${test['expected']:,.2f}, Currently extracting: ${test['wrong_price']:,.2f}")
        print(f"{'-'*70}")
        
        # Try both URLs
        for url_type, url in [('Base URL', test['url']), ('Variant URL', test['variant_url'])]:
            print(f"\nTrying {url_type}: {url}")
            
            try:
                # Get page content using Scrapfly
                html, soup = await scraper.get_page_content(url)
                
                if soup:
                    # Extract price
                    result = await extractor.extract_price(
                        url, 
                        machine_name=test['name'],
                        machine_data={'Machine Name': test['name']},
                        soup=soup,
                        html=html
                    )
                    
                    print(f"✅ Extracted price: ${result['price']:,.2f} (method: {result['method']})")
                    
                    if abs(result['price'] - test['expected']) < 1:
                        print(f"  ✅ CORRECT: Matches expected base price!")
                    elif abs(result['price'] - test['wrong_price']) < 1:
                        print(f"  ❌ WRONG: This is the bundle price!")
                    else:
                        print(f"  ⚠️  Unknown price")
                else:
                    print(f"❌ Failed to fetch page (404 or other error)")
                    
            except Exception as e:
                print(f"❌ Error: {e}")

if __name__ == '__main__':
    asyncio.run(test_cloudray_urls())