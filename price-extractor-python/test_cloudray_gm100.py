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
    
    # Test the specific URL from the screenshot
    url = 'https://www.cloudraylaser.com/products/cloudray-gm-100-100w-fiber-laser-marking-engraver-with-4-3-x-4-3-scan-area?variant=43544778830945'
    machine_name = 'Cloudray GM-100 LiteMarker'
    expected_base = 6999.00  # The price shown on the page
    reported_wrong = 10225.00  # The bundle price being extracted
    
    print(f"\n{'='*70}")
    print(f"Testing: {machine_name}")
    print(f"URL: {url}")
    print(f"Expected base price: ${expected_base:,.2f}")
    print(f"Currently extracting (wrong): ${reported_wrong:,.2f}")
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
                        for i, variant in enumerate(data['hasVariant'][:3]):  # Show first 3
                            print(f"    Variant {i}: {variant.get('name', 'N/A')} - ${variant.get('offers', {}).get('price', 'N/A')}")
            except:
                pass
        
        # Check what price selectors find
        print("\nChecking price selectors...")
        price_selectors = [
            '.price__container .price__regular .price-item--regular',
            '.price__container .price-item--sale',
            '.product__price .price-item--regular',
            '[data-price]:not(option):not(input):not(select)',
            '.product-bundle-total [data-price]',
            '.total-price [data-price]',
        ]
        
        for selector in price_selectors:
            elements = soup.select(selector)
            if elements:
                print(f"  {selector}: Found {len(elements)} elements")
                for elem in elements[:2]:  # Show first 2
                    text = elem.get_text(strip=True)
                    data_price = elem.get('data-price')
                    print(f"    Text: {text}, data-price: {data_price}")
        
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
        print(f"   Source HTML: {result.get('source_html', 'N/A')[:300]}")
        
        # Check if this is the bundle price or base price
        if abs(result['price'] - reported_wrong) < 1:
            print(f"\n❌ PROBLEM: Extracting bundle price instead of base price!")
            print(f"   This matches the reported wrong price: ${reported_wrong}")
        elif abs(result['price'] - expected_base) < 1:
            print(f"\n✅ SUCCESS: Extracting correct base price!")
        else:
            print(f"\n⚠️  UNKNOWN: Price ${result['price']} doesn't match expected or bundle")
            
    except Exception as e:
        logger.error(f"Error extracting price: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_gm100())