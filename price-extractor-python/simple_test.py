import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor

async def test_mp60_only():
    print("🧪 Testing ONLY Cloudray MP 60 (known working URL)...")
    
    url = 'https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/mp-60-litemarker-60w-split-laser-engraver-fiber-marking-machine-with-11-8-x-11-8-working-area'
    machine_name = 'Cloudray MP 60 LiteMarker Pro'
    expected = 4999.0
    previous_bad = 6859.99
    
    print(f"Machine: {machine_name}")
    print(f"Expected: ${expected}")
    print(f"Previously extracted (wrong): ${previous_bad}")
    
    scraper = ScrapflyWebScraper()
    extractor = PriceExtractor()
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if html and soup:
            result = await extractor.extract_price(
                soup, html, url, 
                old_price=expected, 
                machine_name=machine_name
            )
            
            # Fix: result is tuple (price, method), not dict
            if isinstance(result, tuple) and len(result) >= 2:
                price = result[0]
                method = result[1] 
                success = price is not None
            else:
                # Fallback in case result format is different
                price = None
                method = "Unknown"
                success = False
            
            print(f"\n📊 RESULTS:")
            print(f"Extracted price: ${price}")
            print(f"Method: {method}")
            print(f"Success: {success}")
            
            # Test the fix
            if price and isinstance(price, (int, float)):
                expected_range = (expected * 0.9, expected * 1.1)
                if expected_range[0] <= price <= expected_range[1]:
                    print("✅ SUCCESS: Price in expected range! Fix is working!")
                    return True
                elif abs(price - previous_bad) < 50:
                    print("❌ FAILED: Still getting the old bad price")
                    return False
                else:
                    print(f"⚠️  DIFFERENT: Got ${price} (not expected ${expected} or bad ${previous_bad})")
                    return False
            else:
                print("❌ FAILED: No price extracted")
                return False
        else:
            print("❌ FAILED: Could not fetch page")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_mp60_only())
    if result:
        print("\n🎉 CLOUDRAY FIX CONFIRMED WORKING!")
    else:
        print("\n💥 FIX NEEDS MORE WORK")
