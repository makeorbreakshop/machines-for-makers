#!/usr/bin/env python3
"""
Test the scrape endpoint with a real OMTech URL
"""
import requests
import time

def test_scrape_endpoint():
    BASE_URL = "http://localhost:8000"
    
    # Use one of the URLs from the admin interface
    test_url = "https://omtechlaser.com/products/pronto-75-150w-co2-laser-engraver-and-cutter-upgraded-version"
    manufacturer_id = "0234c783-b4d6-4b3f-9336-f558369d2763"  # Acmer ID
    
    payload = {
        "urls": [test_url],
        "manufacturer_id": manufacturer_id,
        "max_workers": 1
    }
    
    print(f"🧪 Testing scrape endpoint with URL: {test_url}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/scrape-discovered-urls",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Scraping request accepted")
            print("⏳ Waiting 15 seconds for background processing...")
            time.sleep(15)
            print("✅ Background processing should be complete (check server logs)")
        else:
            print(f"❌ Scraping request failed with status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_scrape_endpoint()