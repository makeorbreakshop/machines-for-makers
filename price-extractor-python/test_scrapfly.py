"""
Test Scrapfly Integration
Tests the Scrapfly service with a real xTool product page
"""
import asyncio
import os
from datetime import datetime
from bs4 import BeautifulSoup

# Add parent directory to path
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.scrapfly_service import get_scrapfly_service
from scrapers.price_extractor import PriceExtractor


async def test_scrapfly():
    """Test Scrapfly with xTool S1 product page"""
    
    # Test URL - xTool S1 (known difficult site)
    test_url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
    
    print("=" * 60)
    print("SCRAPFLY INTEGRATION TEST")
    print("=" * 60)
    print(f"Target URL: {test_url}")
    print(f"Time: {datetime.now().isoformat()}")
    print()
    
    # Check if API key is set
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        print("❌ ERROR: SCRAPFLY_API_KEY environment variable not set!")
        print("Please set it with: export SCRAPFLY_API_KEY='your_api_key_here'")
        return
    
    print(f"✅ API Key found: {api_key[:10]}...")
    print()
    
    try:
        # Initialize Scrapfly service
        print("Initializing Scrapfly service...")
        scrapfly = get_scrapfly_service()
        
        # Test connection first
        print("Testing Scrapfly connection...")
        if await scrapfly.test_connection():
            print("✅ Connection test successful")
        else:
            print("❌ Connection test failed")
            return
        
        print()
        print("-" * 60)
        print(f"Scraping {test_url}...")
        print("-" * 60)
        
        # Scrape the page
        start_time = datetime.now()
        html_content, metadata = await scrapfly.scrape_page(test_url, render_js=True)
        duration = (datetime.now() - start_time).total_seconds()
        
        print(f"⏱️  Duration: {duration:.2f} seconds")
        
        if html_content:
            print(f"✅ Successfully scraped page")
            print(f"📊 Metadata:")
            print(f"   - Status Code: {metadata.get('status_code')}")
            print(f"   - Credits Used: {metadata.get('cost')}")
            print(f"   - ASP Used: {metadata.get('asp_used')}")
            print(f"   - JS Rendered: {metadata.get('js_rendered')}")
            print(f"   - Country: {metadata.get('country')}")
            print(f"   - IP Used: {metadata.get('ip_used')}")
            print(f"   - HTML Size: {len(html_content)} bytes")
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Try to extract product title
            title = soup.find('h1')
            if title:
                print(f"   - Product Title: {title.text.strip()}")
            
            # Try to extract price using our PriceExtractor
            print()
            print("-" * 60)
            print("Testing price extraction...")
            print("-" * 60)
            
            price_extractor = PriceExtractor()
            
            # Extract price from the scraped content  
            price, method = await price_extractor.extract_price(
                soup,
                html_content,
                test_url,
                None,  # current_price
                "xTool S1"  # machine_name
            )
            
            if price:
                print(f"✅ Price extracted: ${price}")
                print(f"   Method: {method}")
            else:
                print("❌ Failed to extract price")
                
                # Try to find price manually for debugging
                print()
                print("Debugging - Looking for price patterns...")
                
                # Look for common price patterns
                price_patterns = [
                    'sale-price',
                    'product-price',
                    'price',
                    'cost',
                    'amount'
                ]
                
                for pattern in price_patterns:
                    elements = soup.find_all(class_=lambda x: x and pattern in x.lower())
                    if elements:
                        print(f"Found {len(elements)} elements with '{pattern}' in class:")
                        for elem in elements[:3]:
                            text = elem.text.strip()
                            if '$' in text:
                                print(f"  - {elem.name}.{elem.get('class')}: {text[:50]}")
                
                # Look for JSON-LD
                json_ld = soup.find('script', type='application/ld+json')
                if json_ld:
                    print()
                    print("Found JSON-LD data - checking for price...")
                    import json
                    try:
                        data = json.loads(json_ld.string)
                        print(f"JSON-LD type: {data.get('@type')}")
                        if 'offers' in data:
                            print(f"Offers found: {data['offers']}")
                    except:
                        pass
            
            # Save HTML for debugging
            debug_file = f"scrapfly_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            with open(debug_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print()
            print(f"📄 HTML saved to: {debug_file}")
            
        else:
            print(f"❌ Failed to scrape page")
            print(f"   Error: {metadata.get('error')}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Set up event loop and run test
    asyncio.run(test_scrapfly())