import asyncio
from scrapers.price_extractor import PriceExtractor
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger
import json

async def test_cloudray_gm100():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    extractor = PriceExtractor()
    
    # Use the correct URL from the screenshot (without variant)
    url = 'https://www.cloudraylaser.com/products/cloudray-gm-100-100w-fiber-laser-marking-engraver-with-4-3-x-4-3-scan-area'
    machine_name = 'Cloudray GM-100 LiteMarker'
    expected_base = 6999.00  # The price shown on the page
    
    print(f"\n{'='*70}")
    print(f"Testing: {machine_name}")
    print(f"URL: {url}")
    print(f"Expected base price: ${expected_base:,.2f}")
    print(f"{'-'*70}")
    
    # Extract price
    try:
        # Get page content using Scrapfly
        print("Fetching page with Scrapfly...")
        html, soup = await scraper.get_page_content(url)
        
        # First, look at the JSON-LD data
        print("\nChecking JSON-LD data...")
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                if '@type' in data and data['@type'] == 'Product':
                    print(f"Product JSON-LD found:")
                    print(f"  Name: {data.get('name', 'N/A')}")
                    if 'offers' in data:
                        print(f"  Offers price: {data['offers'].get('price', 'N/A')}")
                    if 'hasVariant' in data and data['hasVariant']:
                        print(f"  Has {len(data['hasVariant'])} variants")
                        # Show first variant to understand structure
                        if data['hasVariant']:
                            variant = data['hasVariant'][0]
                            print(f"  First variant: {variant.get('name', 'N/A')}")
                            if 'offers' in variant:
                                print(f"    Price: ${variant['offers'].get('price', 'N/A')}")
            except:
                pass
        
        # Check what price selectors find
        print("\nChecking price selectors...")
        
        # Look for the main price display
        main_price_elem = soup.select_one('.price__container .price-item--regular')
        if main_price_elem:
            print(f"Main price element found: {main_price_elem.get_text(strip=True)}")
        
        # Look for data-price attributes
        data_price_elems = soup.select('[data-price]')
        print(f"Found {len(data_price_elems)} elements with data-price")
        
        # Filter out form elements
        non_form_prices = [e for e in data_price_elems if e.name not in ['option', 'input', 'select']]
        print(f"Non-form elements with data-price: {len(non_form_prices)}")
        
        if non_form_prices:
            for elem in non_form_prices[:3]:
                text = elem.get_text(strip=True)
                data_price = elem.get('data-price')
                parent = elem.parent.name if elem.parent else 'no parent'
                print(f"  {elem.name} (parent: {parent}): text='{text[:50]}', data-price={data_price}")
        
        # Now extract price using the extractor
        print("\nExtracting price with PriceExtractor...")
        result = await extractor.extract_price(
            url, 
            machine_name=machine_name,
            machine_data={'Machine Name': machine_name},
            soup=soup,
            html=html
        )
        
        print(f"\n✅ Extracted price: ${result['price']:,.2f}")
        print(f"   Method: {result['method']}")
        print(f"   Source HTML snippet: {result.get('source_html', 'N/A')[:200]}")
        
        # Check if this matches expected
        if abs(result['price'] - expected_base) < 1:
            print(f"\n✅ SUCCESS: Extracting correct base price!")
        else:
            print(f"\n⚠️  Price ${result['price']} doesn't match expected ${expected_base}")
            
    except Exception as e:
        logger.error(f"Error extracting price: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_gm100())