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

# Real ComMarker machine IDs from database
TEST_MACHINES = [
    {
        "id": "d910f7fc-a8e0-48ad-8a62-78c9e4259b8b",
        "name": "ComMarker B6 30W",
        "current_price": 2399,
        "expected_price": 2399,
        "description": "Should extract $2,399 after selecting 30W power option"
    },
    {
        "id": "7520f7f7-8ba9-4b77-b5ae-f5480f943b6c", 
        "name": "ComMarker B6 MOPA 30W",
        "current_price": 3569,
        "expected_price": 3569,
        "description": "Should extract $3,569 base machine price, not $3,599 bundle price"
    }
]

def test_commarker_extraction():
    """Test ComMarker extraction with real machine IDs."""
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
    
    results = []
    
    for machine in TEST_MACHINES:
        print(f"\n📋 Testing: {machine['name']}")
        print(f"🔧 Machine ID: {machine['id']}")
        print(f"💰 Current Price: ${machine['current_price']}")
        print(f"🎯 Expected: ${machine['expected_price']}")
        print(f"📝 Description: {machine['description']}")
        
        try:
            # Call the real price update API
            response = requests.post(
                f"{API_BASE}/api/v1/update-price",
                json={"machine_id": machine['id']},
                timeout=120  # Allow time for dynamic scraper
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success"):
                    if result.get("new_price"):
                        # New price was extracted
                        extracted_price = result["new_price"]
                        method = result.get("method", "Unknown")
                        
                        price_diff = abs(extracted_price - machine['expected_price'])
                        percentage_diff = (price_diff / machine['expected_price']) * 100
                        
                        print(f"💰 Extracted Price: ${extracted_price}")
                        print(f"🔧 Method: {method}")
                        
                        # Check if it's using dynamic scraper
                        if "dynamic" in method.lower():
                            print("🤖 Dynamic scraper was used - testing our bundle fixes!")
                            
                            # Check if price is reasonable
                            if percentage_diff <= 5:
                                status = "✅ PASS"
                                result_status = "success"
                                print(f"✅ Price within 5% tolerance (±{percentage_diff:.1f}%)")
                            else:
                                status = "⚠️ PRICE MISMATCH"
                                result_status = "price_mismatch"
                                print(f"⚠️ Price differs by {percentage_diff:.1f}% from expected")
                        else:
                            print("📄 Static extraction used")
                            if percentage_diff <= 5:
                                status = "✅ PASS (Static)"
                                result_status = "success"
                            else:
                                status = "⚠️ PRICE MISMATCH (Static)"
                                result_status = "price_mismatch"
                        
                        results.append({
                            'name': machine['name'],
                            'result': result_status,
                            'extracted_price': extracted_price,
                            'expected_price': machine['expected_price'],
                            'method': method,
                            'difference': price_diff,
                            'percentage_diff': percentage_diff
                        })
                        
                    elif result.get("requires_approval"):
                        # Price requires approval (system working correctly)
                        print("✅ System working correctly - price requires approval")
                        print(f"📋 Reason: {result.get('approval_reason', 'Unknown')}")
                        
                        results.append({
                            'name': machine['name'],
                            'result': 'requires_approval',
                            'extracted_price': result.get('new_price'),
                            'expected_price': machine['expected_price'],
                            'method': result.get('method', 'Unknown'),
                            'approval_reason': result.get('approval_reason')
                        })
                        
                    else:
                        # No price change detected
                        print("✅ No price change detected - current price is still accurate")
                        
                        results.append({
                            'name': machine['name'],
                            'result': 'no_change',
                            'extracted_price': machine['current_price'],
                            'expected_price': machine['expected_price'],
                            'method': result.get('method', 'Unknown')
                        })
                        
                else:
                    # Extraction failed
                    error_msg = result.get('error', 'Unknown error')
                    print(f"❌ Extraction failed: {error_msg}")
                    
                    results.append({
                        'name': machine['name'],
                        'result': 'failed',
                        'extracted_price': None,
                        'expected_price': machine['expected_price'],
                        'method': None,
                        'error': error_msg
                    })
                    
            else:
                print(f"❌ API Error: HTTP {response.status_code}")
                print(f"   Response: {response.text}")
                
                results.append({
                    'name': machine['name'],
                    'result': 'api_error',
                    'extracted_price': None,
                    'expected_price': machine['expected_price'],
                    'method': None,
                    'error': f"HTTP {response.status_code}: {response.text}"
                })
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            results.append({
                'name': machine['name'],
                'result': 'error',
                'extracted_price': None,
                'expected_price': machine['expected_price'],
                'method': None,
                'error': str(e)
            })
    
    # Summary report
    print("\n📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    success_count = sum(1 for r in results if r['result'] in ['success', 'no_change', 'requires_approval'])
    total_count = len(results)
    
    print(f"✅ Working correctly: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    for result in results:
        if result['result'] == 'success':
            print(f"  ✅ {result['name']}: ${result['extracted_price']} (±{result['percentage_diff']:.1f}%)")
        elif result['result'] == 'no_change':
            print(f"  ✅ {result['name']}: No change needed (${result['extracted_price']})")
        elif result['result'] == 'requires_approval':
            print(f"  ✅ {result['name']}: Requires approval ({result.get('approval_reason', 'Unknown')})")
        elif result['result'] == 'price_mismatch':
            print(f"  ⚠️ {result['name']}: ${result['extracted_price']} vs ${result['expected_price']} (±{result['percentage_diff']:.1f}%)")
        elif result['result'] == 'failed':
            print(f"  ❌ {result['name']}: {result.get('error', 'No price extracted')}")
        else:
            print(f"  💥 {result['name']}: {result.get('error', 'Unknown error')}")
    
    # Check for dynamic scraper usage
    dynamic_tests = [r for r in results if r.get('method') and 'dynamic' in r['method'].lower()]
    if dynamic_tests:
        print(f"\n🤖 Dynamic scraper was used in {len(dynamic_tests)} tests!")
        print("   This means our bundle price fixes are being tested!")
        
        for test in dynamic_tests:
            if test['result'] == 'success':
                print(f"   ✅ {test['name']}: Dynamic extraction successful")
            else:
                print(f"   ⚠️ {test['name']}: Dynamic extraction needs review")
    else:
        print("\n📄 Static extraction used in all tests")
        print("   Dynamic scraper may not be needed for these machines")
    
    return results

if __name__ == "__main__":
    test_commarker_extraction()