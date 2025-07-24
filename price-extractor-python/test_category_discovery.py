#!/usr/bin/env python3
"""
Test the NEW category-based discovery with Scrapfly AI extraction
"""
import asyncio
import aiohttp
import json

async def test_category_discovery():
    """Test discovering products from xTool category page"""
    
    # xTool laser engraver category page
    request_data = {
        "site_id": "9e02bc06-af64-4aa5-ac07-3474950af5ea",  # Real xTool site ID
        "site_name": "xTool",
        "config": {
            "category_url": "https://www.xtool.com/collections/all",  # All products collection
            "url": "https://www.xtool.com"
        },
        "max_products": 2,  # Just 2 products to test
        "test_mode": False  # Real discovery with Scrapfly
    }
    
    print("🎯 CATEGORY-BASED DISCOVERY TEST")
    print("=" * 60)
    print(f"Site: {request_data['site_name']}")
    print(f"Category URL: {request_data['config']['category_url']}")
    print(f"Max Products: {request_data['max_products']}")
    print(f"Mode: {'TEST' if request_data.get('test_mode') else 'REAL (uses Scrapfly credits)'}")
    print("-" * 60)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Call the NEW category discovery endpoint
            async with session.post(
                "http://localhost:8001/api/v1/discover-from-category",
                json=request_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Discovery started!")
                    print(f"   Scan ID: {result['scan_id']}")
                    print(f"   Status: {result['status']}")
                    print(f"   Message: {result['message']}")
                    
                    # Wait for discovery to process
                    print("\n⏳ Waiting 20 seconds for discovery to process...")
                    await asyncio.sleep(20)
                    
                    # Check scan status
                    async with session.get(
                        f"http://localhost:8001/api/v1/discovery-status/{result['scan_id']}"
                    ) as status_response:
                        if status_response.status == 200:
                            status = await status_response.json()
                            print(f"\n📊 Final Status:")
                            print(f"   Status: {status['status']}")
                            print(f"   Products Found: {status.get('products_found', 0)}")
                            print(f"   Products Processed: {status.get('products_processed', 0)}")
                            
                            if status['status'] == 'completed':
                                print("\n✅ Discovery completed successfully!")
                                print("\n🔍 Check discovered products:")
                                print(f"   http://localhost:3000/admin/manufacturer-sites/{request_data['site_id']}/review")
                            elif status['status'] == 'running':
                                print("\n⏳ Still processing... check status later")
                            else:
                                print(f"\n❌ Discovery failed: {status.get('error_message', 'Unknown error')}")
                                
                else:
                    error = await response.text()
                    print(f"❌ Failed to start discovery: {error}")
                    
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            print("Make sure the discovery service is running on port 8001")

if __name__ == "__main__":
    print("🚀 Category-Based Discovery Test")
    print("This uses Scrapfly's AI product extraction on category pages")
    print("Much simpler than sitemap crawling!\n")
    
    asyncio.run(test_category_discovery())