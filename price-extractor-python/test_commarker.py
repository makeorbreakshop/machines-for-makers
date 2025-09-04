import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor

async def test_commarker_variants():
    print("🧪 Testing ComMarker B6 MOPA variant selection...")
    
    # This URL should show different variants/power options
    url = 'https://store.commarker.com/products/b6-jpt-mopa-fiber-laser-engraver'
    
    print(f"Testing URL: {url}")
    print("Expected: Should detect different power variants (20W vs 30W vs 60W)")
    
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
                '[data-variant-selector]'
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
            
            # Look for different price displays
            print("\n💰 Looking for price displays...")
            
            price_selectors = [
                '.price',
                '.money',
                '[data-price]',
                '.product-price',
                '.current-price',
                '.sale-price',
                '.regular-price'
            ]
            
            for selector in price_selectors:
                elements = soup.select(selector)
                if elements:
                    print(f"💲 Found prices with {selector}:")
                    for i, element in enumerate(elements[:5]):  # Limit to 5
                        text = element.get_text().strip()
                        if text:
                            print(f"   {i+1}: {text}")
            
            # Extract price using normal method
            print(f"\n🎯 Testing price extraction...")
            result = await extractor.extract_price(
                soup, html, url, 
                old_price=3000.0,  # Rough estimate
                machine_name="ComMarker B6 MOPA 30W"
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
                if 3000 <= price <= 4000:
                    print("✅ Price in expected range for 30W variant")
                elif 2500 <= price <= 3200:
                    print("⚠️  Price suggests 20W variant being selected")
                elif 4000 <= price <= 5000:
                    print("⚠️  Price suggests 60W variant being selected")
                else:
                    print(f"❓ Unexpected price range: ${price}")
        else:
            print("❌ Failed to load page")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_commarker_variants())