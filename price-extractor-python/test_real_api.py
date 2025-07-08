#!/usr/bin/env python3
"""
REAL API TEST - Actually call the price extraction endpoint
"""

import requests
import json

# Test the actual API endpoint
BASE_URL = "http://localhost:8000"

# ComMarker machines that were getting $50
test_machines = [
    {
        "machine_id": "test-commarker-b4",
        "name": "ComMarker B4 30W",
        "url": "https://www.commarker.com/products/commarker-b4-fiber-laser-engraver",
        "expected_price": 1799.0,
        "old_price": 50.0
    },
    {
        "machine_id": "test-commarker-b6",
        "name": "ComMarker B6 30W", 
        "url": "https://www.commarker.com/products/b6-enclosed-fiber-laser-engraver",
        "expected_price": 2399.0,
        "old_price": 50.0
    }
]

def test_price_extraction():
    """Test the actual price extraction API"""
    print("TESTING REAL PRICE EXTRACTION API")
    print("="*60)
    
    for machine in test_machines:
        print(f"\nTesting: {machine['name']}")
        print(f"URL: {machine['url']}")
        print(f"Expected: ${machine['expected_price']}")
        
        # Call the actual API endpoint
        try:
            response = requests.post(
                f"{BASE_URL}/update-price",
                json={
                    "machine_id": machine['machine_id']
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                price = data.get('price')
                method = data.get('method')
                
                if price == 50:
                    print(f"❌ BUG STILL EXISTS: Got $50!")
                elif price and abs(price - machine['expected_price']) < 1:
                    print(f"✅ SUCCESS: Got ${price} using {method}")
                else:
                    print(f"❌ WRONG PRICE: Got ${price}, expected ${machine['expected_price']}")
                    
                print(f"Full response: {json.dumps(data, indent=2)}")
            else:
                print(f"❌ API ERROR: Status {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ ERROR: Cannot connect to API. Is the server running on port 8000?")
            print("Run: cd price-extractor-python && python main.py")
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")


if __name__ == "__main__":
    test_price_extraction()