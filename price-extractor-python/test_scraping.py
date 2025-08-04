#!/usr/bin/env python3
"""
Test script for scraping discovered URLs functionality
"""
import requests
import json
import time
import asyncio
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test if the API is running"""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/health")
        print(f"✅ Health check: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_scrape_discovered_urls():
    """Test scraping a discovered URL"""
    # Test URL - OMTech product page
    test_url = "https://omtechlaser.com/products/mp6969-100-100w-mopa-fiber-laser-marking-engraving-machine-with-6-9-x-6-9-working-area"
    
    # Use a real manufacturer ID from database
    manufacturer_id = "0234c783-b4d6-4b3f-9336-f558369d2763"  # Acmer
    
    payload = {
        "urls": [test_url],
        "manufacturer_id": manufacturer_id,
        "max_workers": 1
    }
    
    try:
        print(f"🧪 Testing scrape for URL: {test_url}")
        response = requests.post(
            f"{BASE_URL}/api/v1/scrape-discovered-urls",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Scraping started successfully")
            print(f"Message: {result.get('message', 'No message')}")
            return True
        else:
            print(f"❌ Scraping failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Scraping test failed: {e}")
        return False

def test_smart_url_discovery():
    """Test smart URL discovery functionality"""
    payload = {
        "manufacturer_id": "test-manufacturer",
        "base_url": "https://omtechlaser.com",
        "manufacturer_name": "OMTech",
        "max_pages": 2,
        "apply_smart_filtering": True
    }
    
    try:
        print(f"🧪 Testing smart URL discovery for: {payload['base_url']}")
        response = requests.post(
            f"{BASE_URL}/api/v1/smart/smart-discover-urls",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Smart discovery completed")
            print(f"Total URLs found: {result.get('total_urls_found', 0)}")
            print(f"Classification summary: {result.get('classification_summary', {})}")
            return True
        else:
            print(f"❌ Smart discovery failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Smart discovery test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting scraping functionality tests...\n")
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ API is not running. Start it with ./start.sh first")
        return
    
    print()
    
    # Test 2: Smart URL discovery
    test_smart_url_discovery()
    
    print()
    
    # Test 3: Scrape discovered URLs
    test_scrape_discovered_urls()
    
    print("\n✅ Tests completed!")

if __name__ == "__main__":
    main()