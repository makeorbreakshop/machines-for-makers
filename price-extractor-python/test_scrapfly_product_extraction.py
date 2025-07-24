#!/usr/bin/env python3
"""
Test Scrapfly's AI product extraction - the RIGHT way to use it
"""
import asyncio
import os
from dotenv import load_dotenv
from scrapfly import ScrapflyClient, ScrapeConfig
import json

# Load environment variables
load_dotenv()

async def test_product_extraction():
    """Test Scrapfly's automatic product extraction"""
    
    # Initialize Scrapfly client
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        print("❌ SCRAPFLY_API_KEY not found in .env")
        return
    
    client = ScrapflyClient(key=api_key)
    
    # Test with a real xTool product page
    test_urls = [
        "https://www.xtool.com/products/xtool-s1-laser-cutter",
        "https://www.xtool.com/products/xtool-f1-portable-laser-engraver"
    ]
    
    print("TESTING SCRAPFLY PRODUCT EXTRACTION")
    print("=" * 60)
    print("Using the AI extraction model - no manual parsing needed!\n")
    
    for url in test_urls:
        print(f"\n📦 Testing: {url}")
        print("-" * 60)
        
        try:
            # Configure with product extraction
            config = ScrapeConfig(
                url=url,
                asp=True,           # Anti-bot protection
                render_js=True,     # Render JavaScript
                country='US',       # US proxy
                extraction_model='product'  # 🎯 THE KEY FEATURE!
            )
            
            # Scrape and extract in one call
            result = await client.async_scrape(config)
            
            print(f"✅ Success! Credits used: {result.context.get('cost', {}).get('total', 0)}")
            
            # The extracted product data is in result.scrape_result['extracted_data']
            if 'extracted_data' in result.scrape_result:
                product_data = result.scrape_result['extracted_data']
                
                print("\n🎯 EXTRACTED PRODUCT DATA:")
                print(f"  Name: {product_data.get('name', 'N/A')}")
                print(f"  Brand: {product_data.get('brand', 'N/A')}")
                print(f"  Price: {product_data.get('offers', {}).get('price', 'N/A')}")
                print(f"  Currency: {product_data.get('offers', {}).get('currency', 'N/A')}")
                print(f"  Availability: {product_data.get('offers', {}).get('availability', 'N/A')}")
                print(f"  Main Category: {product_data.get('main_category', 'N/A')}")
                
                # Show specifications if available
                if 'specifications' in product_data:
                    print("\n  Specifications:")
                    for spec in product_data['specifications'][:5]:  # First 5 specs
                        print(f"    - {spec}")
                
                # Show data quality
                if 'data_quality' in product_data:
                    quality = product_data['data_quality']
                    print(f"\n  Data Quality: {quality.get('fulfillment_percent', 0)}% complete")
                
                # Save full result for inspection
                with open(f'extracted_{url.split("/")[-1]}.json', 'w') as f:
                    json.dump(product_data, f, indent=2)
                print(f"\n  💾 Full data saved to: extracted_{url.split('/')[-1]}.json")
                
            else:
                print("❌ No extraction result found - checking raw response...")
                print(f"Keys in result: {list(result.scrape_result.keys())}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")

async def test_category_page():
    """Test extracting product URLs from a category page"""
    
    api_key = os.getenv('SCRAPFLY_API_KEY')
    if not api_key:
        return
    
    client = ScrapflyClient(key=api_key)
    
    print("\n\n📋 TESTING CATEGORY PAGE EXTRACTION")
    print("=" * 60)
    
    # xTool's laser cutter category page
    category_url = "https://www.xtool.com/collections/laser-engravers"
    
    try:
        config = ScrapeConfig(
            url=category_url,
            asp=True,
            render_js=True,
            auto_scroll=True,  # Scroll to load all products
            country='US'
        )
        
        result = await client.async_scrape(config)
        html = result.content
        
        print(f"✅ Scraped category page - Credits: {result.context.get('cost', {}).get('total', 0)}")
        print(f"   HTML length: {len(html)} chars")
        
        # Quick search for product URLs
        import re
        product_urls = re.findall(r'href="(/products/[^"]+)"', html)
        unique_urls = list(set(product_urls))
        
        print(f"\n🔍 Found {len(unique_urls)} unique product URLs:")
        for i, url in enumerate(unique_urls[:10], 1):
            print(f"   {i}. https://www.xtool.com{url}")
        
        if len(unique_urls) > 10:
            print(f"   ... and {len(unique_urls) - 10} more")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

async def main():
    """Run all tests"""
    # Test individual product extraction
    await test_product_extraction()
    
    # Test category page to find products
    await test_category_page()
    
    print("\n\n✨ KEY INSIGHTS:")
    print("1. Use extraction_model='product' for automatic product data extraction")
    print("2. No need to write custom parsers - Scrapfly's AI handles it")
    print("3. Scrape category pages to find product URLs")
    print("4. Then use product extraction on each product page")
    print("5. Each product extraction costs ~5 extra credits but saves hours of work")

if __name__ == "__main__":
    asyncio.run(main())