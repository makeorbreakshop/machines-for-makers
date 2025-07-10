#!/usr/bin/env python3
"""
Test ComMarker extraction fixes using real machine IDs from database.
"""

import requests
import json
import sys
import os

# API endpoint
API_BASE = "http://localhost:8000"

# Test with manual price update using machine ID
def test_commarker_with_machine_id():
    """Test ComMarker extraction with actual machine ID."""
    print("🚀 Testing ComMarker extraction fixes with real machine IDs")
    print("=" * 60)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code != 200:
            print("❌ API is not running or not healthy")
            print("   Start the API with: python main.py")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API at http://localhost:8000")
        print("   Start the API with: python main.py")
        return
    
    print("✅ API is running and healthy")
    
    # Test with a known ComMarker B6 30W machine
    # We'll use a test machine ID - you can replace this with actual ID from database
    test_machine_id = "test-commarker-b6-30w"
    
    print(f"\n📋 Testing ComMarker B6 30W extraction")
    print(f"🔧 Machine ID: {test_machine_id}")
    
    try:
        # Call the real price update API
        response = requests.post(
            f"{API_BASE}/api/v1/update-price",
            json={"machine_id": test_machine_id},
            timeout=120  # Allow time for dynamic scraper
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Response: {json.dumps(result, indent=2)}")
            
            if result.get("success") and result.get("new_price"):
                price = result["new_price"]
                method = result.get("method", "Unknown")
                
                print(f"💰 Extracted Price: ${price}")
                print(f"🔧 Method: {method}")
                
                # Check if it's using dynamic scraper
                if "dynamic" in method.lower():
                    print("🤖 Dynamic scraper was used - testing our bundle fixes!")
                    
                    # Check if price is reasonable for B6 30W
                    if 2200 <= price <= 2600:
                        print("✅ Price is in expected range for B6 30W ($2,200-$2,600)")
                    else:
                        print(f"⚠️ Price ${price} may be outside expected range")
                else:
                    print("📄 Static extraction used")
                    
            else:
                print(f"❌ Extraction failed: {result.get('error', 'Unknown error')}")
                
        else:
            print(f"❌ API Error: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    print("\n🔍 To test with real machine IDs:")
    print("1. Find ComMarker machine IDs in the database")
    print("2. Replace the test_machine_id with actual UUID")
    print("3. Run this test again")

if __name__ == "__main__":
    test_commarker_with_machine_id()