import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper

async def analyze_cloudray_bundle_pricing():
    print("🔍 Analyzing CloudRay bundle pricing structure...")
    
    # GM Neo 100: Base $8,999 vs Total $12,225
    url = "https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643"
    
    scraper = ScrapflyWebScraper()
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if html and soup:
            print(f"📄 Page loaded successfully ({len(html)} chars)")
            
            # Look for bundle/total price indicators
            print("\n💰 Analyzing price structure...")
            
            # Look for all prices
            all_prices = []
            
            # Search for specific price patterns
            price_patterns = [
                ('Regular total price', soup.select('*:-soup-contains("Regular total price")')),
                ('Sale total price', soup.select('*:-soup-contains("Sale total price")')),
                ('Total price', soup.select('*:-soup-contains("Total price")')),
                ('Unit price', soup.select('*:-soup-contains("Unit price")')),
                ('Regular price', soup.select('*:-soup-contains("Regular price")')),
                ('Sale price', soup.select('*:-soup-contains("Sale price")')),
            ]
            
            for pattern_name, elements in price_patterns:
                if elements:
                    print(f"\n🔍 Found {pattern_name} elements:")
                    for i, elem in enumerate(elements[:3]):  # Limit to 3
                        text = elem.get_text(strip=True)
                        if '$' in text and len(text) < 200:  # Reasonable length
                            print(f"   {i+1}: {text}")
            
            # Look for bundle selection UI
            print("\n📦 Looking for bundle/add-on selection...")
            
            bundle_selectors = [
                'input[type="checkbox"]',
                '.product-options input',
                '.product-form__options input',
                '[data-product-option]',
                'select[name*="option"]',
                'input[name*="option"]',
            ]
            
            for selector in bundle_selectors:
                elements = soup.select(selector)
                if elements:
                    print(f"✅ Found bundle selector: {selector}")
                    for i, elem in enumerate(elements[:5]):
                        label_text = ""
                        # Try to find associated label
                        label_id = elem.get('id')
                        if label_id:
                            label = soup.find('label', {'for': label_id})
                            if label:
                                label_text = label.get_text(strip=True)
                        
                        value = elem.get('value', '')
                        checked = elem.has_attr('checked')
                        
                        print(f"   Option {i+1}: {label_text} (value: {value}, checked: {checked})")
            
            # Check if URL has pre-selected variant
            print(f"\n🔗 URL Analysis:")
            if 'variant=' in url:
                variant_id = url.split('variant=')[1].split('&')[0]
                print(f"   Pre-selected variant ID: {variant_id}")
                print("   This suggests the URL is already pointing to a specific configuration")
        else:
            print("❌ Failed to load page")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(analyze_cloudray_bundle_pricing())