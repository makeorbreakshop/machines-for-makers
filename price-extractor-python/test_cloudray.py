import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor

async def test_cloudray_machines():
    print("🧪 Testing CloudRay machine price extraction...")
    
    # Test the machines that are showing wrong prices
    test_machines = [
        {
            "name": "Cloudray GM Neo 100",
            "expected_price": 8999,
            "current_wrong": 12225,  # From screenshot
            "url": "https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643"
        },
        {
            "name": "Cloudray MP Neo 60", 
            "expected_price": 5999,
            "current_wrong": 7940,  # From screenshot
            "url": "https://www.cloudraylaser.com/products/cloudray-litemarker-mp-series-neo-60w-100w-fiber-laser-engraver?variant=52126567039339"
        },
        {
            "name": "Cloudray QS Neo",
            "expected_price": 4299,
            "current_wrong": 5636,  # From screenshot
            "url": "https://www.cloudraylaser.com/products/cloudray-qs-series-litemarker-neo-30w-50w-fiber-laser-marking-engraver?variant=52126323147115"
        }
    ]
    
    scraper = ScrapflyWebScraper()
    extractor = PriceExtractor()
    
    for machine in test_machines:
        print(f"\n{'='*60}")
        print(f"🧪 Testing: {machine['name']}")
        print(f"Expected Price: ${machine['expected_price']}")
        print(f"Currently Wrong: ${machine['current_wrong']}")
        print(f"URL: {machine['url']}")
        
        try:
            html, soup = await scraper.get_page_content(machine['url'])
            
            if html and soup:
                print(f"\n📄 Page loaded successfully ({len(html)} chars)")
                
                # Look for different price displays
                print("\n💰 Looking for price displays...")
                
                price_selectors = [
                    '.price',
                    '.money',
                    '[data-price]',
                    '.product-price',
                    '.current-price',
                    '.sale-price',
                    '.regular-price',
                    '.price__current',
                    'span[class*="price"]',
                    'div[class*="price"]',
                    '.price-item',
                    '.price-now'
                ]
                
                all_prices_found = []
                for selector in price_selectors:
                    elements = soup.select(selector)
                    if elements:
                        print(f"💲 Found prices with {selector}:")
                        for i, element in enumerate(elements[:5]):  # Limit to 5
                            text = element.get_text().strip()
                            if text and '$' in text:
                                print(f"   {i+1}: {text}")
                                # Try to extract numeric value
                                import re
                                numbers = re.findall(r'[\d,]+\.?\d*', text.replace(',', ''))
                                for num in numbers:
                                    try:
                                        price_val = float(num)
                                        if 100 <= price_val <= 50000:  # Reasonable price range
                                            all_prices_found.append(price_val)
                                    except:
                                        pass
                
                print(f"\n🔍 All numeric prices found: {sorted(set(all_prices_found))}")
                
                # Check for variant information in URL
                print(f"\n🔗 URL Analysis:")
                if 'variant=' in machine['url']:
                    variant_id = machine['url'].split('variant=')[1].split('&')[0]
                    print(f"   Variant ID in URL: {variant_id}")
                
                # Extract price using normal method
                print(f"\n🎯 Testing price extraction...")
                result = await extractor.extract_price(
                    soup, html, machine['url'], 
                    old_price=machine['expected_price'],
                    machine_name=machine['name']
                )
                
                # Handle result format
                if isinstance(result, tuple) and len(result) >= 2:
                    price = result[0]
                    method = result[1] 
                    success = price is not None
                else:
                    price = None
                    method = "Unknown"
                    success = False
                
                print(f"\n📊 EXTRACTION RESULTS:")
                print(f"Extracted price: ${price}")
                print(f"Method: {method}")
                print(f"Success: {success}")
                
                if price:
                    diff_from_expected = abs(price - machine['expected_price'])
                    diff_from_wrong = abs(price - machine['current_wrong'])
                    
                    if diff_from_expected <= 50:
                        print("✅ Price matches expected (correct extraction)")
                    elif diff_from_wrong <= 50:
                        print("❌ Price matches currently wrong price (extraction broken)")
                    else:
                        print(f"❓ Price doesn't match expected or wrong ({diff_from_expected} off expected, {diff_from_wrong} off wrong)")
                
                # Test without machine_name to see if that affects results
                print(f"\n🎯 Testing without machine_name parameter...")
                result3 = await extractor.extract_price(
                    soup, html, machine['url'], 
                    old_price=machine['expected_price']
                )
                
                if isinstance(result3, tuple) and len(result3) >= 2:
                    price3 = result3[0]
                    method3 = result3[1] 
                    print(f"Without machine_name - Price: ${price3}, Method: {method3}")
            else:
                print("❌ Failed to load page")
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_cloudray_machines())