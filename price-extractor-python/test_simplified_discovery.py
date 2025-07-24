#!/usr/bin/env python3
"""
Test the simplified discovery approach using Scrapfly AI extraction
"""
import sys
import os
import subprocess

# Try to activate virtual environment if it exists
venv_paths = ['venv/bin/python', '.venv/bin/python', 'env/bin/python']
python_executable = None

for venv_path in venv_paths:
    if os.path.exists(venv_path):
        python_executable = os.path.abspath(venv_path)
        break

# If we found a venv python and we're not already in it, re-run with venv python
if python_executable and sys.executable != python_executable:
    print(f"Restarting with virtual environment: {python_executable}")
    subprocess.run([python_executable] + sys.argv)
    sys.exit(0)

# Try to import required modules, install if needed
try:
    import asyncio
    import aiohttp
    import json
except ImportError as e:
    print(f"Missing module: {e}")
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "aiohttp"])
    import asyncio
    import aiohttp
    import json

async def test_simplified_discovery():
    """Test discovering products from xTool category page"""
    
    # xTool laser engraver category page
    request_data = {
        "site_id": "9e02bc06-af64-4aa5-ac07-3474950af5ea",  # Real xTool site ID from database
        "site_name": "xTool",
        "config": {
            "url": "https://www.xtool.com",
            "sitemap_url": "https://www.xtool.com/sitemap.xml",
            "product_url_patterns": ["/products/"],
            "exclude_patterns": ["/blogs/", "/collections/", "/pages/"]
        },
        "max_products": 2,  # Start small to save credits
        "test_mode": False  # Use real discovery with Scrapfly
    }
    
    print("TESTING DISCOVERY SERVICE")
    print("=" * 60)
    print(f"Site: {request_data['site_name']}")
    print(f"Base URL: {request_data['config']['url']}")
    print(f"Test Mode: {request_data.get('test_mode', False)}")
    print(f"Max Products: {request_data.get('max_products', 'unlimited')}")
    print("-" * 60)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Call the discovery endpoint
            async with session.post(
                "http://localhost:8001/api/v1/discover-products",
                json=request_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Discovery started!")
                    print(f"   Scan ID: {result['scan_id']}")
                    print(f"   Status: {result['status']}")
                    print(f"   Message: {result['message']}")
                    
                    # Wait a bit then check status
                    print("\nWaiting 10 seconds before checking status...")
                    await asyncio.sleep(10)
                    
                    # Check scan status
                    async with session.get(
                        f"http://localhost:8001/api/v1/discovery-status/{result['scan_id']}"
                    ) as status_response:
                        if status_response.status == 200:
                            status = await status_response.json()
                            print(f"\n📊 Scan Status:")
                            print(f"   Status: {status['status']}")
                            print(f"   Products Found: {status.get('products_found', 0)}")
                            print(f"   Products Processed: {status.get('products_processed', 0)}")
                            
                            if status['status'] == 'completed':
                                print("\n✅ Discovery completed successfully!")
                                print("Check the admin UI to review discovered products")
                            elif status['status'] == 'failed':
                                print(f"\n❌ Discovery failed: {status.get('error_message', 'Unknown error')}")
                            else:
                                print("\n⏳ Still processing... check again later")
                                
                else:
                    error = await response.text()
                    print(f"❌ Failed to start discovery: {error}")
                    
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            print("Make sure the discovery service is running on port 8001")

async def test_single_product_extraction():
    """Test extracting a single product directly"""
    
    print("\n\nTESTING SINGLE PRODUCT EXTRACTION")
    print("=" * 60)
    
    from services.simplified_discovery import SimplifiedDiscoveryService
    
    discovery = SimplifiedDiscoveryService()
    
    # Test with a known xTool product
    product_url = "https://www.xtool.com/products/xtool-s1-laser-cutter"
    
    print(f"Extracting: {product_url}")
    print("-" * 60)
    
    product_data = await discovery.extract_product(product_url)
    
    if product_data:
        print("✅ Extraction successful!")
        print(f"\nProduct Details:")
        print(f"  Name: {product_data.get('name', 'N/A')}")
        print(f"  Brand: {product_data.get('brand', 'N/A')}")
        print(f"  Price: ${product_data.get('offers', [{}])[0].get('price', 'N/A')}")
        print(f"  Main Category: {product_data.get('main_category', 'N/A')}")
        print(f"  Credits Used: {product_data.get('_credits_used', 'N/A')}")
        
        # Show specifications
        specs = product_data.get('specifications', [])
        if specs:
            print(f"\n  Key Specifications:")
            for spec in specs[:5]:
                if isinstance(spec, dict):
                    print(f"    - {spec.get('name', '')}: {spec.get('value', '')}")
        
        # Save for inspection
        with open('single_product_extraction.json', 'w') as f:
            json.dump(product_data, f, indent=2)
        print(f"\n💾 Full data saved to: single_product_extraction.json")
        
    else:
        print("❌ Extraction failed")

async def main():
    """Run all tests"""
    
    # Test the full discovery workflow
    await test_simplified_discovery()
    
    # Also test single product extraction
    # await test_single_product_extraction()  # Uncomment to test

if __name__ == "__main__":
    print("🚀 Simplified Discovery Test")
    print("This uses Scrapfly's AI product extraction")
    print("No manual parsing needed!\n")
    
    asyncio.run(main())