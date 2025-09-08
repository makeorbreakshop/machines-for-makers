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
            print(f"Found {len(json_ld_scripts)} JSON-LD scripts\n")
            
            for i, script in enumerate(json_ld_scripts):
                print(f"Script {i}:")
                print("-" * 40)
                try:
                    data = json.loads(script.string)
                    # Pretty print the JSON
                    print(json.dumps(data, indent=2)[:1000])  # First 1000 chars
                    if len(json.dumps(data)) > 1000:
                        print("... (truncated)")
                    print()
                except Exception as e:
                    print(f"Error parsing: {e}")
                    print(f"Raw content: {script.string[:500]}")
                    print()
                    
        else:
            print("Failed to fetch page")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_cloudray_json_ld())