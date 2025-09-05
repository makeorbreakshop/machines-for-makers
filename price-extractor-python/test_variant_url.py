import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test with VARIANT URL (the one actually being used in production)
    url = 'https://www.cloudraylaser.com/products/cloudray-litemarker-mp-series-neo-60w-100w-fiber-laser-engraver?variant=52126567039339'
    
    print(f'Testing with variant URL: {url[:100]}...')
    
    html, soup = await scraper.get_page_content(url)
    result = await extractor.extract_price(
        soup=soup,
        html_content=html,
        url=url, 
        machine_name='Cloudray MP Neo 60',
        machine_data={'Machine Name': 'Cloudray MP Neo 60'}
    )
    
    if isinstance(result, tuple):
        print(f'Result: ${result[0]:,.2f}')
        if result[0] == 1064.0:
            print('ERROR: Still getting 1064 wavelength!')
    else:
        print(f'Result: {result}')

asyncio.run(test())