import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from scrapers.site_specific_extractors import SiteSpecificExtractor
import json

async def debug_commarker_json_ld():
    print("🧪 Debugging ComMarker JSON-LD variant extraction...")
    
    url = 'https://store.commarker.com/products/b6-jpt-mopa-fiber-laser-engraver'
    machine_name = 'ComMarker B6 MOPA 30W'
    
    scraper = ScrapflyWebScraper()
    extractor = SiteSpecificExtractor()
    
    try:
        html, soup = await scraper.get_page_content(url)
        
        if html and soup:
            print(f"📄 Page loaded successfully")
            
            # Find JSON-LD scripts
            json_scripts = soup.find_all('script', {'type': 'application/ld+json'})
            print(f"Found {len(json_scripts)} JSON-LD scripts")
            
            for i, script in enumerate(json_scripts):
                try:
                    data = json.loads(script.string)
                    print(f"\n--- JSON-LD Script {i+1} ---")
                    
                    if isinstance(data, dict) and 'hasVariant' in data:
                        variants = data['hasVariant']
                        print(f"🎯 Found product with {len(variants)} variants")
                        
                        for j, variant in enumerate(variants):
                            variant_name = variant.get('name', '')
                            offers = variant.get('offers', {})
                            price = float(offers.get('price', 0))
                            
                            print(f"\n  Variant {j+1}: {variant_name}")
                            print(f"  Price: ${price}")
                            
                            # Test the matching logic directly
                            match = extractor._variant_matches_machine(variant_name, machine_name)
                            print(f"  Matches '{machine_name}': {match}")
                            
                            if match:
                                print(f"  🎯 THIS SHOULD BE SELECTED!")
                    else:
                        print(f"  Structure: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                        
                except json.JSONDecodeError as e:
                    print(f"  JSON parsing failed: {e}")
                except Exception as e:
                    print(f"  Other error: {e}")
        else:
            print("❌ Failed to load page")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(debug_commarker_json_ld())