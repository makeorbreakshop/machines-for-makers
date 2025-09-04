import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor

async def test_lasermatic_production_scenario():
    print("🧪 Testing LaserMATIC Mk2 in production scenario (machine_name only)...")
    
    url = 'https://rolyautomation.com/products/lasermatic-mk2-diode-laser-engraver?bg_ref=rZxaOxidn5'
    machine_name = "LaserMATIC Mk2"
    
    scraper = ScrapflyWebScraper()
    extractor = PriceExtractor()
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if html and soup:
            print(f"📄 Page loaded successfully ({len(html)} chars)")
            
            # Test 1: Only machine_name (production scenario)
            print(f"\n🎯 Test 1: Production scenario (machine_name only)...")
            result1 = await extractor.extract_price(
                soup, html, url, 
                old_price=1199.0,
                machine_name=machine_name
                # No machine_data parameter
            )
            
            if isinstance(result1, tuple) and len(result1) >= 2:
                price1 = result1[0]
                method1 = result1[1]
                print(f"Result: ${price1} via {method1}")
                
                if price1 == 1199.0:
                    print("✅ PERFECT: Production scenario works correctly!")
                elif price1 == 899.0:
                    print("❌ STILL BROKEN: Still getting 20W price in production scenario")
                else:
                    print(f"❓ UNEXPECTED: Got ${price1}")
            else:
                print("❌ EXTRACTION FAILED")
                
            # Test 2: With explicit machine_data (development scenario)  
            print(f"\n🎯 Test 2: Development scenario (with machine_data)...")
            result2 = await extractor.extract_price(
                soup, html, url, 
                old_price=1199.0,
                machine_name=machine_name,
                machine_data={"Machine Name": machine_name, "Laser Power A": "30"}
            )
            
            if isinstance(result2, tuple) and len(result2) >= 2:
                price2 = result2[0]
                method2 = result2[1]
                print(f"Result: ${price2} via {method2}")
                
                if price2 == 1199.0:
                    print("✅ PERFECT: Development scenario works correctly!")
                else:
                    print(f"❌ ISSUE: Expected $1199, got ${price2}")
            
            # Test 3: No machine_name at all (basic scenario)
            print(f"\n🎯 Test 3: Basic scenario (no machine info)...")
            result3 = await extractor.extract_price(
                soup, html, url, 
                old_price=1199.0
                # No machine_name or machine_data
            )
            
            if isinstance(result3, tuple) and len(result3) >= 2:
                price3 = result3[0]
                method3 = result3[1]
                print(f"Result: ${price3} via {method3}")
                print("Note: Without machine info, system should fall back to basic extraction")
                
        else:
            print("❌ Failed to load page")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_lasermatic_production_scenario())