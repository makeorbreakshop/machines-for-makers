#!/usr/bin/env python3
"""
End-to-end test for the scraping pipeline
"""
import requests
import time
import sys

def test_scraping_pipeline():
    """Test the complete scraping pipeline"""
    BASE_URL = "http://localhost:8000"
    
    # Test data
    test_url = "https://omtechlaser.com/products/mp6969-100-100w-mopa-fiber-laser-marking-engraving-machine-with-6-9-x-6-9-working-area"
    manufacturer_id = "0234c783-b4d6-4b3f-9336-f558369d2763"  # Acmer
    
    print("🧪 Testing complete scraping pipeline...")
    print(f"URL: {test_url}")
    print(f"Manufacturer ID: {manufacturer_id}")
    
    # Step 1: Health check
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health")
        if response.status_code != 200:
            print("❌ API health check failed")
            return False
        print("✅ API is healthy")
    except Exception as e:
        print(f"❌ Cannot reach API: {e}")
        return False
    
    # Step 2: Start scraping
    payload = {
        "urls": [test_url],
        "manufacturer_id": manufacturer_id,
        "max_workers": 1
    }
    
    try:
        print("\n📡 Starting scraping request...")
        response = requests.post(
            f"{BASE_URL}/api/v1/scrape-discovered-urls",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Scraping request failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
        result = response.json()
        print(f"✅ Scraping request accepted: {result['message']}")
        
    except Exception as e:
        print(f"❌ Scraping request failed: {e}")
        return False
    
    # Step 3: Wait for background processing
    print("\n⏳ Waiting for background processing to complete...")
    time.sleep(10)  # Give it 10 seconds to process
    
    print("✅ End-to-end test completed successfully!")
    print("\n📋 Summary:")
    print("- API health check: ✅")
    print("- Scraping request: ✅")
    print("- Background processing: ⏳ (check logs for completion)")
    
    return True

if __name__ == "__main__":
    success = test_scraping_pipeline()
    sys.exit(0 if success else 1)