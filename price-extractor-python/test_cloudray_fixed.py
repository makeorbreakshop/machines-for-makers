import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger
import json

async def test_cloudray_fixed():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test the CloudRay GM Neo 100 with fixed configuration
    url = 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643'
    machine_name = 'Cloudray GM Neo 100'
    expected_base = 8999.00
    wrong_bundle = 12225.00
    
    print(f"Testing: {machine_name}")
    print(f"URL: {url}")
    print(f"Expected base price: ${expected_base:,.2f}")
    print(f"Wrong bundle price: ${wrong_bundle:,.2f}")
    print("-" * 70)
    
    try:
        # Get page content
        html, soup = await scraper.get_page_content(url)
        
        if soup:
            # Use the normal extraction flow with site-specific rules
            result = await extractor.extract_price(
                soup=soup,
                html_content=html,
                url=url,
                machine_name=machine_name,
                machine_data={'Machine Name': machine_name}
            )
            
            if result and result[0]:
                price, method = result
                print(f"\n✅ Extracted price: ${price:,.2f}")
                print(f"   Method: {method}")
                
                if abs(price - expected_base) < 1:
                    print("✅ SUCCESS: Extracting correct base price now!")
                elif abs(price - wrong_bundle) < 1:
                    print("❌ STILL WRONG: Still extracting bundle price")
                    print("The configuration fix may not be working correctly")
                else:
                    print(f"⚠️  Different price: ${price}")
            else:
                print("❌ No price extracted")
        else:
            print("Failed to fetch page")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_fixed())