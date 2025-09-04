import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor

async def test_cloudray_machines():
    print("🧪 Testing Cloudray price extraction fix...")
    
    # Test the three problematic machines
    test_machines = [
        {
            'name': 'Cloudray MP 60 LiteMarker Pro',
            'url': 'https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/mp-60-litemarker-60w-split-laser-engraver-fiber-marking-machine-with-11-8-x-11-8-working-area',
            'expected': 4999.0,
            'previous_bad': 6859.99
        },
        {
            'name': 'Cloudray MP Neo 60', 
            'url': 'https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/mp-neo-60w-mopa-fiber-laser-engraving-machine',
            'expected': 5999.0,
            'previous_bad': 7940.99
        },
        {
            'name': 'Cloudray QS Neo',
            'url': 'https://www.cloudraylaser.com/collections/cloudray-engraver-machine/products/qs-neo-20w-mopa-fiber-laser-engraving-machine',
            'expected': 4299.0, 
            'previous_bad': 5636.99
        }
    ]
    
    scraper = ScrapflyWebScraper()
    extractor = PriceExtractor()
    
    results = []
    
    for machine in test_machines:
        print(f"\n=== Testing {machine['name']} ===")
        print(f"Expected: ${machine['expected']}")
        print(f"Previously extracted (wrong): ${machine['previous_bad']}")
        
        try:
            # Get page content
            html, soup = await scraper.get_page_content(machine['url'])
            
            if html and soup:
                # Extract price
                result = await extractor.extract_price(
                    soup, html, machine['url'], 
                    old_price=machine['expected'], 
                    machine_name=machine['name']
                )
                
                price = result['price']
                method = result['extraction_method']
                success = result['success']
                
                print(f"Extracted: ${price}")
                print(f"Method: {method}")
                print(f"Success: {success}")
                
                # Check if fix worked
                if price and isinstance(price, (int, float)):
                    expected_range = (machine['expected'] * 0.9, machine['expected'] * 1.1)
                    if expected_range[0] <= price <= expected_range[1]:
                        print("✅ SUCCESS: Price in expected range!")
                        status = "FIXED"
                    elif abs(price - machine['previous_bad']) < 50:
                        print("❌ FAILED: Still getting bad price")
                        status = "STILL_BROKEN"
                    else:
                        print(f"⚠️  DIFFERENT: New price ${price} (not expected or previous bad)")
                        status = "DIFFERENT"
                else:
                    print("❌ FAILED: No price extracted")
                    status = "NO_PRICE"
                    
                results.append({
                    'machine': machine['name'],
                    'status': status,
                    'price': price,
                    'method': method,
                    'expected': machine['expected'],
                    'previous_bad': machine['previous_bad']
                })
            else:
                print("❌ FAILED: Could not fetch page")
                results.append({
                    'machine': machine['name'], 
                    'status': 'FETCH_FAILED',
                    'price': None,
                    'method': None,
                    'expected': machine['expected'],
                    'previous_bad': machine['previous_bad']
                })
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            results.append({
                'machine': machine['name'],
                'status': 'ERROR', 
                'price': None,
                'method': None,
                'expected': machine['expected'],
                'previous_bad': machine['previous_bad']
            })
    
    # Summary
    print(f"\n{'='*60}")
    print("🏁 CLOUDRAY FIX TEST RESULTS")
    print(f"{'='*60}")
    
    fixed_count = 0
    total_count = len(results)
    
    for result in results:
        status_emoji = {
            'FIXED': '✅',
            'STILL_BROKEN': '❌', 
            'DIFFERENT': '⚠️',
            'NO_PRICE': '❌',
            'FETCH_FAILED': '❌',
            'ERROR': '❌'
        }.get(result['status'], '❓')
        
        print(f"{status_emoji} {result['machine']}")
        print(f"   Expected: ${result['expected']}")
        print(f"   Got: ${result['price']} via {result['method']}")
        print(f"   Status: {result['status']}")
        
        if result['status'] == 'FIXED':
            fixed_count += 1
    
    print(f"\n📊 SUMMARY: {fixed_count}/{total_count} machines fixed")
    
    if fixed_count == total_count:
        print("🎉 ALL TESTS PASSED - Fix is working!")
    elif fixed_count > 0:
        print("⚠️  PARTIAL SUCCESS - Some machines fixed")
    else:
        print("💥 ALL TESTS FAILED - Fix needs more work")
    
    return results

if __name__ == "__main__":
    results = asyncio.run(test_cloudray_machines())
