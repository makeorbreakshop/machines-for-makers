import asyncio
from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.database import DatabaseService
from loguru import logger
import json
import re

async def analyze_cloudray_page():
    db = DatabaseService()
    scraper = ScrapflyWebScraper(database_service=db)
    
    # Test URL
    url = 'https://www.cloudraylaser.com/products/cloudray-litemarker-gm-series-neo-100w-autofocus-mopa-fiber-laser-engraver-with-built-in-camera?variant=52126780129643'
    
    print(f"Analyzing CloudRay page: {url}")
    print("=" * 70)
    
    try:
        # Get page content
        html, soup = await scraper.get_page_content(url)
        
        if soup:
            # 1. Look for all data-price elements
            print("\n1. All [data-price] elements:")
            print("-" * 40)
            data_price_elements = soup.select('[data-price]')
            for i, elem in enumerate(data_price_elements):
                price_value = elem.get('data-price')
                text = elem.get_text(strip=True)[:100]
                parent_class = elem.parent.get('class', []) if elem.parent else []
                print(f"  [{i}] data-price='{price_value}' text='{text}' parent_class={parent_class}")
            
            # 2. Look for JSON-LD data
            print("\n2. JSON-LD Product Data:")
            print("-" * 40)
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    if '@type' in data and data['@type'] == 'Product':
                        print(f"  Product Name: {data.get('name', 'N/A')}")
                        if 'offers' in data:
                            print(f"  Direct offers price: ${data['offers'].get('price', 'N/A')}")
                        if 'hasVariant' in data and data['hasVariant']:
                            print(f"  Has {len(data['hasVariant'])} variants:")
                            for j, variant in enumerate(data['hasVariant'][:5]):  # Show first 5
                                variant_name = variant.get('name', 'N/A')
                                variant_price = variant.get('offers', {}).get('price', 'N/A')
                                print(f"    [{j}] {variant_name}: ${variant_price}")
                except:
                    pass
            
            # 3. Look for all price-like text
            print("\n3. All price-like text on page:")
            print("-" * 40)
            price_pattern = re.compile(r'\$[\d,]+(?:\.\d{2})?')
            all_prices = []
            for text in soup.stripped_strings:
                matches = price_pattern.findall(text)
                for match in matches:
                    price_val = float(match.replace('$', '').replace(',', ''))
                    if price_val >= 1000:  # Only show prices > $1000
                        all_prices.append(price_val)
            
            # Sort and deduplicate
            unique_prices = sorted(list(set(all_prices)))
            for price in unique_prices:
                print(f"  ${price:,.2f}")
            
            # 4. Look for specific price elements
            print("\n4. Specific price elements:")
            print("-" * 40)
            
            selectors_to_check = [
                '.price__container .price-item--regular',
                '.price__container .price-item--sale',
                '.product__price .price-item--regular',
                '.product__price',
                '.price',
                'span.money',
                '.product-single__price',
                '.price__current'
            ]
            
            for selector in selectors_to_check:
                elements = soup.select(selector)
                if elements:
                    print(f"  {selector}: Found {len(elements)} elements")
                    for elem in elements[:2]:  # Show first 2
                        text = elem.get_text(strip=True)[:100]
                        print(f"    -> '{text}'")
            
            # 5. Look for form inputs with prices
            print("\n5. Form inputs and options with prices:")
            print("-" * 40)
            inputs = soup.select('input[data-price], option[data-price], select[data-price]')
            for inp in inputs[:10]:  # Show first 10
                tag = inp.name
                value = inp.get('value', 'N/A')
                price = inp.get('data-price', 'N/A')
                text = inp.get_text(strip=True)[:50]
                print(f"  <{tag}> value='{value}' data-price='{price}' text='{text}'")
                
        else:
            print("Failed to fetch page")
            
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(analyze_cloudray_page())