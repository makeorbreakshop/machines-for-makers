#!/usr/bin/env python3
"""
TEST REAL EXTRACTION - Using actual machine IDs from database
"""

import requests
import json
import time

# Test with real ComMarker machine IDs
BASE_URL = "http://localhost:8000/api/v1"

test_machines = [
    {
        "id": "839e1b00-8496-478a-96c4-6248ce74ce74",
        "name": "ComMarker B4 30W",
        "expected_price": 1799.0
    },
    {
        "id": "d910f7fc-a8e0-48ad-8a62-78c9e4259b8b",
        "name": "ComMarker B6 30W",
        "expected_price": 2399.0
    }
]

def test_real_extraction():
    """Test extraction on real machines"""
    print("TESTING REAL PRICE EXTRACTION ON COMMARKER MACHINES")
    print("="*60)
    print("This will call the actual API that updates the database\n")
    
    # First check if API is running
    try:
        health = requests.get(f"{BASE_URL}/health")
        if health.status_code != 200:
            print("❌ API health check failed")
            return
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to API on port 8000")
        print("Please run: cd price-extractor-python && python main.py")
        return
    
    results = []
    
    for machine in test_machines:
        print(f"\nTesting: {machine['name']}")
        print(f"Machine ID: {machine['id']}")
        print(f"Expected price: ${machine['expected_price']}")
        
        try:
            # Call the update-price endpoint
            response = requests.post(
                f"{BASE_URL}/update-price",
                json={"machine_id": machine['id']}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    new_price = data.get('new_price')
                    old_price = data.get('old_price')
                    method = data.get('method')
                    
                    print(f"Old price: ${old_price}")
                    print(f"New price: ${new_price}")
                    print(f"Method: {method}")
                    
                    if new_price == 50:
                        print("❌ BUG DETECTED: Still extracting $50!")
                        results.append(("FAIL", machine['name'], "$50 bug"))
                    elif new_price and abs(new_price - machine['expected_price']) < 100:
                        print(f"✅ SUCCESS: Extracted correct price!")
                        results.append(("PASS", machine['name'], f"${new_price}"))
                    else:
                        print(f"❌ WRONG PRICE: Expected ${machine['expected_price']}")
                        results.append(("FAIL", machine['name'], f"Wrong price ${new_price}"))
                else:
                    error = data.get('error', 'Unknown error')
                    print(f"❌ EXTRACTION FAILED: {error}")
                    results.append(("FAIL", machine['name'], error))
                    
            else:
                print(f"❌ API ERROR: Status {response.status_code}")
                print(f"Response: {response.text}")
                results.append(("ERROR", machine['name'], f"Status {response.status_code}"))
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            results.append(("ERROR", machine['name'], str(e)))
        
        # Brief pause between requests
        time.sleep(2)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    errors = sum(1 for r in results if r[0] == "ERROR")
    
    print(f"Total tested: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Errors: {errors}")
    
    print("\nDetails:")
    for status, name, detail in results:
        emoji = "✅" if status == "PASS" else "❌"
        print(f"{emoji} {name}: {detail}")
    
    # Check for $50 bug specifically
    fifty_bug_count = sum(1 for r in results if "$50" in r[2])
    if fifty_bug_count > 0:
        print(f"\n⚠️  WARNING: $50 BUG DETECTED IN {fifty_bug_count} MACHINES!")


if __name__ == "__main__":
    test_real_extraction()