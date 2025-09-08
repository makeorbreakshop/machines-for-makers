import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService

async def test_price_extraction():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Test M1 Ultra
    print('=== Testing xTool M1 Ultra ===')
    url = 'https://www.xtool.com/products/xtool-m1-ultra-the-worlds-first-4-in-1-craft-machine'
    html, soup = await scraper.get_page_content(url)
    
    price = await extractor.extract_price(soup, url, 'xTool M1 Ultra')
    print(f'Extracted Price: ${price}')
    
    # Check anniversary/sale prices specifically
    print('\n=== Checking for Sale/Anniversary Prices ===')
    
    # Look for elements with 'Final Price' text
    final_price_elems = soup.find_all(string=lambda t: 'Final Price' in str(t))
    for elem in final_price_elems:
        parent = elem.parent if hasattr(elem, 'parent') else elem
        print(f'Final Price element: {parent.get_text(strip=True)[:100]}')
    
    # Look for $1,149 specifically
    price_1149 = soup.find_all(string=lambda t: '1,149' in str(t) or '1149' in str(t))
    print(f'\nFound {len(price_1149)} elements with 1,149')
    for elem in price_1149[:3]:
        parent = elem.parent if hasattr(elem, 'parent') else elem
        print(f'  - Context: {parent.get_text(strip=True)[:100]}')
    
    # Check what structured data says
    print('\n=== Checking Structured Data ===')
    scripts = soup.find_all('script', type='application/ld+json')
    for script in scripts:
        if 'price' in script.string.lower():
            import json
            try:
                data = json.loads(script.string)
                if 'offers' in data:
                    print(f"Structured data price: {data['offers']}")
            except:
                pass
    
    # Test P2S
    print('\n\n=== Testing xTool P2S ===')
    url2 = 'https://www.xtool.com/products/xtool-p2-55w-co2-laser-cutter?variant=45865559359727'
    html2, soup2 = await scraper.get_page_content(url2)
    
    price2 = await extractor.extract_price(soup2, url2, 'xTool P2S')
    print(f'Extracted Price: ${price2}')
    
    # Look for $3,599 specifically
    if soup2:
        price_3599 = soup2.find_all(string=lambda t: '3,599' in str(t) or '3599' in str(t))
        print(f'\nFound {len(price_3599)} elements with 3,599')
        for elem in price_3599[:3]:
            parent = elem.parent if hasattr(elem, 'parent') else elem
            print(f'  - Context: {parent.get_text(strip=True)[:100]}')
    else:
        print('\nCould not fetch P2 page')

if __name__ == "__main__":
    asyncio.run(test_price_extraction())