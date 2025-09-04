import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor

async def test_lasermatic_variants():
    print("🧪 Testing LaserMATIC Mk2 variant selection...")
    
    # LaserMATIC Mk2 should be 30W but extracting $899 (20W price)
    url = 'https://rolyautomation.com/products/lasermatic-mk2-diode-laser-engraver?bg_ref=rZxaOxidn5'
    
    print(f"Testing URL: {url}")
    print("Expected: 30W variant (~$1199), but extracting $899 (20W variant)")
    
    scraper = ScrapflyWebScraper()
    extractor = PriceExtractor()
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if html and soup:
            print(f"\n📄 Page loaded successfully ({len(html)} chars)")
            
            # Look for variant/option selectors
            print("\n🔍 Looking for variant selectors...")
            
            # Common Shopify variant selectors
            variant_selectors = [
                'select[data-index="option1"]',
                'select[name="id"]',
                '.product-variants select',
                '.product-options select',
                'input[name="option1"]',
                'input[type="radio"][name*="option"]',
                '.variant-selector',
                '[data-variant-selector]',
                'fieldset[data-product-option]',
                '.product-form__options',
                '.variant-input',
                'input[name="id"]'
            ]
            
            found_variants = False
            for selector in variant_selectors:
                elements = soup.select(selector)
                if elements:
                    print(f"✅ Found variant selector: {selector}")
                    for element in elements:
                        if element.name == 'select':
                            options = element.find_all('option')
                            print(f"   Options: {[opt.get_text().strip() for opt in options if opt.get_text().strip()]}")
                        elif element.name == 'input':
                            print(f"   Input value: {element.get('value', '')}")
                    found_variants = True
            
            if not found_variants:
                print("❌ No variant selectors found with common patterns")
                
            # Look for power/wattage mentions in text
            print("\n⚡ Looking for power/wattage indicators...")
            text_content = soup.get_text().lower()
            power_indicators = ['20w', '30w', '40w', '20 w', '30 w', '40 w', 'watt', 'watts']
            for indicator in power_indicators:
                if indicator in text_content:
                    print(f"   Found power indicator: '{indicator}' in page text")
            
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
                'div[class*="price"]'
            ]
            
            for selector in price_selectors:
                elements = soup.select(selector)
                if elements:
                    print(f"💲 Found prices with {selector}:")
                    for i, element in enumerate(elements[:5]):  # Limit to 5
                        text = element.get_text().strip()
                        if text:
                            print(f"   {i+1}: {text}")
            
            # Check for JSON-LD structured data
            print("\n📄 Looking for JSON-LD structured data...")
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            print(f"Found {len(json_ld_scripts)} JSON-LD script(s)")
            
            for i, script in enumerate(json_ld_scripts):
                if script.string:
                    try:
                        import json
                        data = json.loads(script.string)
                        if '@type' in data:
                            print(f"   Script {i+1}: @type = {data.get('@type')}")
                            if data.get('@type') == 'Product':
                                if 'hasVariant' in data:
                                    print(f"   Has variants: {len(data['hasVariant'])} variants")
                                    for j, variant in enumerate(data['hasVariant'][:3]):  # Show first 3
                                        name = variant.get('name', 'Unknown')
                                        price = variant.get('offers', {}).get('price', 'Unknown')
                                        print(f"     Variant {j+1}: {name} - ${price}")
                    except:
                        print(f"   Script {i+1}: Could not parse JSON")
            
            # Extract price using normal method
            print(f"\n🎯 Testing price extraction...")
            result = await extractor.extract_price(
                soup, html, url, 
                old_price=1199.0,  # Expected 30W price
                machine_name="LaserMATIC Mk2"
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
                if 1100 <= price <= 1300:
                    print("✅ Price in expected range for 30W LaserMATIC Mk2")
                elif 800 <= price <= 1000:
                    print("⚠️  Price suggests 20W variant being selected")
                else:
                    print(f"❓ Unexpected price range: ${price}")
                    
            # Test with explicit machine_name parameter
            print(f"\n🎯 Testing with explicit machine name parameter...")
            result2 = await extractor.extract_price(
                soup, html, url, 
                old_price=1199.0,
                machine_name="LaserMATIC Mk2",
                machine_data={"Machine Name": "LaserMATIC Mk2", "Laser Power A": "30"}
            )
            
            if isinstance(result2, tuple) and len(result2) >= 2:
                price2 = result2[0]
                method2 = result2[1] 
                print(f"With machine_data - Price: ${price2}, Method: {method2}")
        else:
            print("❌ Failed to load page")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_lasermatic_variants())