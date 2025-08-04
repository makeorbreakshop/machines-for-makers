#!/usr/bin/env python3
"""
Test a specific OMTech URL to see what's happening
"""
import requests
import asyncio
from services.simplified_discovery import SimplifiedDiscoveryService

async def test_url():
    # Test one of the URLs from the admin interface
    test_url = "https://omtechlaser.com/products/pronto-75-150w-co2-laser-engraver-and-cutter-upgraded-version"
    
    print(f"🧪 Testing URL: {test_url}")
    
    # First, check if the URL is accessible
    try:
        response = requests.get(test_url, timeout=10)
        print(f"✅ URL is accessible: {response.status_code}")
        if response.status_code != 200:
            print(f"❌ URL returned non-200 status: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot access URL: {e}")
        return
    
    # Now test with SimplifiedDiscoveryService
    service = SimplifiedDiscoveryService()
    
    try:
        print("🔄 Extracting product data...")
        product_data = await service.extract_product_data(test_url)
        
        if product_data:
            print("✅ Product data extracted successfully!")
            print(f"Product keys: {list(product_data.keys())}")
            print(f"Product name: {product_data.get('name', 'NOT FOUND')}")
            print(f"Product price: {product_data.get('price', 'NOT FOUND')}")
        else:
            print("❌ No product data extracted")
            
    except Exception as e:
        print(f"❌ Extraction failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_url())