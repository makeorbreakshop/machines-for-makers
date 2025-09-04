import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.price_extractor import PriceExtractor
from scrapers.site_specific_extractors import SiteSpecificExtractor

async def test_lasermatic_rules():
    print("🧪 Testing LaserMATIC Mk2 site-specific rules loading...")
    
    url = 'https://rolyautomation.com/products/lasermatic-mk2-diode-laser-engraver?bg_ref=rZxaOxidn5'
    machine_name = "LaserMATIC Mk2"
    
    # Test site-specific rules loading
    print(f"\n🔍 Testing site-specific rules...")
    site_extractor = SiteSpecificExtractor()
    
    # Test domain parsing
    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()
    if domain.startswith('www.'):
        domain = domain[4:]
    print(f"Parsed domain: {domain}")
    
    # Test machine-specific rules lookup
    rules = site_extractor.get_machine_specific_rules(domain, machine_name, url)
    print(f"Rules found: {list(rules.keys()) if rules else 'None'}")
    
    if rules:
        print(f"\nRule details:")
        for key, value in rules.items():
            print(f"  {key}: {value}")
            
        if 'variant_detection_rules' in rules:
            print(f"\nVariant detection rules:")
            for variant_key, variant_rule in rules['variant_detection_rules'].items():
                print(f"  {variant_key}: {variant_rule}")
    else:
        print("❌ No rules found - checking base site rules...")
        
        # Check if domain exists in base site_rules
        if domain in site_extractor.site_rules:
            print(f"✅ Domain {domain} exists in site_rules")
            base_rule = site_extractor.site_rules[domain]
            print(f"Base rule keys: {list(base_rule.keys())}")
            
            if 'machine_specific_rules' in base_rule:
                machine_rules = base_rule['machine_specific_rules']
                print(f"Machine-specific rules available: {list(machine_rules.keys())}")
                
                if machine_name in machine_rules:
                    print(f"✅ Rules found for '{machine_name}'")
                    machine_rule = machine_rules[machine_name]
                    print(f"Machine rule: {machine_rule}")
                else:
                    print(f"❌ No rules for machine name '{machine_name}'")
                    print(f"Available machines: {list(machine_rules.keys())}")
            else:
                print("❌ No machine_specific_rules in base rule")
        else:
            print(f"❌ Domain {domain} not found in site_rules")
            print(f"Available domains: {list(site_extractor.site_rules.keys())}")
    
    # Now test actual price extraction
    print(f"\n🎯 Testing price extraction with rules...")
    
    scraper = ScrapflyWebScraper()
    extractor = PriceExtractor()
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if html and soup:
            # Extract price with explicit machine_data
            print(f"\n📊 Testing extraction with machine_data...")
            result = await extractor.extract_price(
                soup, html, url, 
                old_price=1199.0,
                machine_name=machine_name,
                machine_data={"Machine Name": machine_name, "Laser Power A": "30"}
            )
            
            if isinstance(result, tuple) and len(result) >= 2:
                price = result[0]
                method = result[1] 
                print(f"Extracted price: ${price}")
                print(f"Method: {method}")
                
                if price == 1199.0:
                    print("✅ SUCCESS: Correctly extracted 30W variant price!")
                elif price == 899.0:
                    print("❌ STILL BROKEN: Still extracting 20W variant price")
                else:
                    print(f"❓ UNEXPECTED: Got different price ${price}")
        else:
            print("❌ Failed to load page")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_lasermatic_rules())