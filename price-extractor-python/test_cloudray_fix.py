import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger
import json
from bs4 import BeautifulSoup

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
    print(f"Expected: ${expected:,.2f}, Wrong bundle price: ${wrong:,.2f}")
    print("-" * 70)
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if soup:
            # Check JSON-LD data first
            print("\nAnalyzing JSON-LD data...")
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    if '@type' in data and data['@type'] == 'Product':
                        print(f"Product: {data.get('name', 'N/A')}")
                        if 'offers' in data:
                            print(f"  Direct offers price: ${data['offers'].get('price', 'N/A')}")
                        if 'hasVariant' in data and data['hasVariant']:
                            print(f"  Has {len(data['hasVariant'])} variants")
                            # Find the first variant's price
                            if data['hasVariant']:
                                first_variant = data['hasVariant'][0]
                                if 'offers' in first_variant:
                                    print(f"  First variant price: ${first_variant['offers'].get('price', 'N/A')}")
                except:
                    pass
            
            # Check price elements
            print("\nAnalyzing price elements...")
            
            # Main price display
            price_elem = soup.select_one('.price__container .price-item--regular')
            if price_elem:
                print(f"Main price display: {price_elem.get_text(strip=True)}")
            
            # Look for data-price elements
            data_prices = soup.select('[data-price]')
            non_form_prices = [e for e in data_prices if e.name not in ['option', 'input', 'select']]
            print(f"Found {len(non_form_prices)} non-form elements with data-price")
            
            # Get the last data-price element (often the total)
            if non_form_prices:
                last_price = non_form_prices[-1]
                print(f"Last data-price element: {last_price.get('data-price')} (text: {last_price.get_text(strip=True)[:50]})")
            
            # Now call the extractor with correct parameters
            result = extractor.extract_price_from_soup(
                soup=soup,
                url=url,
                machine_name=machine_name
            )
            
            print(f"\n✅ Extracted price: ${result['price']:,.2f}")
            print(f"   Method: {result['method']}")
            
            if abs(result['price'] - expected) < 1:
                print("✅ CORRECT: Base price extracted!")
            elif abs(result['price'] - wrong) < 1:
                print("❌ PROBLEM: Extracting bundle price instead of base price!")
                print("\nNeed to fix the extractor to get the base price, not the bundle total.")
        else:
            print("Failed to fetch page")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_variant())