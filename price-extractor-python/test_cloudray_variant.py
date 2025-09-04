import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test_cloudray_extraction():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test the three CloudRay machines that had issues
    test_cases = [
        {
            'name': 'Cloudray GM Neo 100',
            'url': 'https://www.cloudraylaser.com/products/cloudray-gm-neo-100-industrial-fiber-laser-engraver?variant=43986925256865',
            'expected_base': 8999.00,
            'reported_wrong': 12225.00
        },
        {
            'name': 'Cloudray MP Neo 60',
            'url': 'https://www.cloudraylaser.com/products/cloudray-mp-neo-60-60w-portable-mini-fiber-laser-engraver?variant=52050287518059',
            'expected_base': 5999.00,
            'reported_wrong': 7940.99
        },
        {
            'name': 'Cloudray QS Neo',
            'url': 'https://www.cloudraylaser.com/products/cloudray-qs-neo-50-50w-fiber-laser-engraver-marking-machine?variant=43904199852193',
            'expected_base': 4299.00,
            'reported_wrong': 5636.99
        }
    ]
    
    for test in test_cases:
        print(f"\n{'='*70}")
        print(f"Testing: {test['name']}")
        print(f"URL: {test['url']}")
        print(f"Expected base price: ${test['expected_base']:,.2f}")
        print(f"Currently extracting (wrong): ${test['reported_wrong']:,.2f}")
        print(f"{'-'*70}")
        
        # Extract price
        try:
            # Get page content using Scrapfly
            html, soup = await scraper.get_page_content(test['url'])
            
            result = await extractor.extract_price(
                test['url'], 
                machine_name=test['name'],
                machine_data={'Machine Name': test['name']},
                soup=soup,
                html=html
            )
            
            print(f"✅ Extracted price: ${result['price']:,.2f}")
            print(f"   Method: {result['method']}")
            print(f"   Source HTML: {result.get('source_html', 'N/A')[:200]}")
            
            # Check if this is the bundle price or base price
            if abs(result['price'] - test['reported_wrong']) < 1:
                print(f"❌ PROBLEM: Extracting bundle price instead of base price!")
                print(f"   This matches the reported wrong price: ${test['reported_wrong']}")
            elif abs(result['price'] - test['expected_base']) < 1:
                print(f"✅ SUCCESS: Extracting correct base price!")
            else:
                print(f"⚠️  UNKNOWN: Price ${result['price']} doesn't match expected or bundle")
                
        except Exception as e:
            print(f"❌ Error extracting price: {e}")

if __name__ == '__main__':
    asyncio.run(test_cloudray_extraction())