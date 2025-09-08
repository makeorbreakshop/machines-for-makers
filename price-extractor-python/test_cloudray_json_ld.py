import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger
import json

async def test_cloudray_json_ld():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    
    url = 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643'
    
    print(f"Testing CloudRay JSON-LD extraction")
    print(f"URL: {url}")
    print("=" * 70)
    
    try:
        # Get page content
        html, soup = await scraper.get_page_content(url)
        
        if soup:
            # Look for JSON-LD data
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            print(f"Found {len(json_ld_scripts)} JSON-LD scripts")
            
            for i, script in enumerate(json_ld_scripts):
                try:
                    data = json.loads(script.string)
                    if '@type' in data and data['@type'] == 'Product':
                        print(f"\nScript {i}: Product JSON-LD found")
                        print(f"  Product name: {data.get('name', 'N/A')}")
                        
                        # Check direct offers
                        if 'offers' in data:
                            offers = data['offers']
                            print(f"  Direct offers: {type(offers)}")
                            if isinstance(offers, dict):
                                print(f"    Price: {offers.get('price', 'N/A')}")
                        
                        # Check hasVariant structure
                        if 'hasVariant' in data:
                            variants = data['hasVariant']
                            print(f"  Has {len(variants)} variants")
                            
                            # Show first variant details
                            if variants:
                                first_variant = variants[0]
                                print(f"\n  First variant details:")
                                print(f"    Name: {first_variant.get('name', 'N/A')}")
                                if 'offers' in first_variant:
                                    variant_offers = first_variant['offers']
                                    variant_price = variant_offers.get('price', 'N/A')
                                    print(f"    Price value: {variant_price}")
                                    print(f"    Price type: {type(variant_price)}")
                                    
                                    # Check if it's in cents
                                    if isinstance(variant_price, (int, float)) and variant_price > 10000:
                                        print(f"    Price in cents: {variant_price} = ${variant_price/100:.2f}")
                                    
                                    # Try using the nested path access
                                    def get_nested_value(obj, path):
                                        keys = path.split('.')
                                        value = obj
                                        for key in keys:
                                            if key.isdigit():
                                                value = value[int(key)]
                                            else:
                                                value = value.get(key)
                                            if value is None:
                                                return None
                                        return value
                                    
                                    # Test the path used by the extractor
                                    test_path = 'hasVariant.0.offers.price'
                                    nested_value = get_nested_value(data, test_path)
                                    print(f"\n  Path '{test_path}' returns: {nested_value}")
                                    print(f"    Type: {type(nested_value)}")
                                    
                except Exception as e:
                    print(f"Error parsing script {i}: {e}")
                    
        else:
            print("Failed to fetch page")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_json_ld())