import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger

async def test_cloudray_variant():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test the variant URL from database for GM Neo 100
    url = 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643'
    machine_name = 'Cloudray GM Neo 100'
    expected = 8999.00
    wrong = 12225.00
    
    print(f"Testing: {machine_name}")
    print(f"URL: {url}")
    print(f"Expected: ${expected:,.2f}, Wrong: ${wrong:,.2f}")
    print("-" * 70)
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if soup:
            result = await extractor.extract_price(
                url, 
                machine_name=machine_name,
                machine_data={'Machine Name': machine_name},
                soup=soup,
                html=html
            )
            
            print(f"✅ Extracted price: ${result['price']:,.2f}")
            print(f"   Method: {result['method']}")
            
            if abs(result['price'] - expected) < 1:
                print("✅ CORRECT: Base price!")
            elif abs(result['price'] - wrong) < 1:
                print("❌ WRONG: Bundle price!")
        else:
            print("Failed to fetch")
            
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(test_cloudray_variant())