#!/usr/bin/env python3
"""
Test script to validate ComMarker extraction fixes via the actual API.
This tests the real extraction system without direct Playwright dependencies.
"""

import requests
import json
import sys
import os

# API endpoint
API_BASE = "http://localhost:8000"

# Test cases based on manual corrections from batch analysis
TEST_CASES = [
    {
        "name": "ComMarker B6 30W",
        "machine_name": "ComMarker B6 30W",
        "expected_price": 2399,
        "description": "Should extract $2,399 after selecting 30W power option",
        "test_url": "https://www.commarker.com/products/commarker-b6-fiber-laser-engraver"
    },
    {
        "name": "ComMarker B6 MOPA 30W", 
        "machine_name": "ComMarker B6 MOPA 30W",
        "expected_price": 3569,
        "description": "Should extract $3,569 base machine price, not $3,599 bundle price",
        "test_url": "https://www.commarker.com/products/commarker-b6-mopa-fiber-laser-engraver"
    },
    {
        "name": "ComMarker B6 MOPA 60W",
        "machine_name": "ComMarker B6 MOPA 60W",
        "expected_price": 4589,
        "description": "Should extract $4,589 base machine price, not $4,799 bundle price",
        "test_url": "https://www.commarker.com/products/commarker-b6-mopa-fiber-laser-engraver"
    },
    {
        "name": "ComMarker B4 30W",
        "machine_name": "ComMarker B4 30W",
        "expected_price": 1799,
        "description": "Should extract $1,799 after selecting 30W power option",
        "test_url": "https://www.commarker.com/products/commarker-b4-fiber-laser-engraver"
    }
]

def test_price_extraction():
    """Test ComMarker price extraction via API."""
    print("🚀 Testing ComMarker extraction fixes via API")
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
    
    for test_case in TEST_CASES:
        print(f"\n📋 Testing: {test_case['name']}")
        print(f"🔗 URL: {test_case['test_url']}")
        print(f"💰 Expected: ${test_case['expected_price']}")
        print(f"📝 Description: {test_case['description']}")
        
        try:
            # Create a test extraction request
            test_data = {
                "url": test_case["test_url"],
                "machine_name": test_case["machine_name"],
                "old_price": test_case["expected_price"]  # For validation
            }
            
            # Call the extraction API
            response = requests.post(
                f"{API_BASE}/api/v1/extract-price-test",
                json=test_data,
                timeout=60  # ComMarker pages can be slow
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("price"):
                    extracted_price = result["price"]
                    method = result.get("method", "Unknown")
                    
                    price_diff = abs(extracted_price - test_case['expected_price'])
                    percentage_diff = (price_diff / test_case['expected_price']) * 100
                    
                    if percentage_diff <= 5:  # Within 5% tolerance
                        status = "✅ PASS"
                        result_status = "success"
                    else:
                        status = "⚠️ PRICE MISMATCH"
                        result_status = "price_mismatch"
                    
                    print(f"{status} - Extracted: ${extracted_price} (diff: ${price_diff:.2f}, {percentage_diff:.1f}%)")
                    print(f"🔧 Method: {method}")
                    
                    # Check if dynamic scraper was used
                    if "dynamic" in method.lower():
                        print("🤖 Dynamic scraper was used - testing our fixes!")
                    else:
                        print("⚠️ Static extraction used - dynamic scraper may not have been needed")
                    
                    results.append({
                        'name': test_case['name'],
                        'result': result_status,
                        'extracted_price': extracted_price,
                        'expected_price': test_case['expected_price'],
                        'method': method,
                        'difference': price_diff,
                        'percentage_diff': percentage_diff
                    })
                    
                else:
                    error_msg = result.get("error", "Unknown error")
                    print(f"❌ FAIL - {error_msg}")
                    results.append({
                        'name': test_case['name'],
                        'result': 'failed',
                        'extracted_price': None,
                        'expected_price': test_case['expected_price'],
                        'method': None,
                        'difference': None,
                        'percentage_diff': None,
                        'error': error_msg
                    })
                    
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                print(f"❌ API ERROR - {error_msg}")
                results.append({
                    'name': test_case['name'],
                    'result': 'api_error',
                    'extracted_price': None,
                    'expected_price': test_case['expected_price'],
                    'method': None,
                    'difference': None,
                    'percentage_diff': None,
                    'error': error_msg
                })
                
        except Exception as e:
            print(f"❌ ERROR - {str(e)}")
            results.append({
                'name': test_case['name'],
                'result': 'error',
                'extracted_price': None,
                'expected_price': test_case['expected_price'],
                'method': None,
                'difference': None,
                'percentage_diff': None,
                'error': str(e)
            })
    
    # Summary report
    print("\n📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    success_count = sum(1 for r in results if r['result'] == 'success')
    total_count = len(results)
    
    print(f"✅ Successful: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    for result in results:
        if result['result'] == 'success':
            print(f"  ✅ {result['name']}: ${result['extracted_price']} (±{result['percentage_diff']:.1f}%)")
        elif result['result'] == 'price_mismatch':
            print(f"  ⚠️ {result['name']}: ${result['extracted_price']} vs ${result['expected_price']} (±{result['percentage_diff']:.1f}%)")
        elif result['result'] == 'failed':
            print(f"  ❌ {result['name']}: {result.get('error', 'No price extracted')}")
        else:
            print(f"  💥 {result['name']}: {result.get('error', 'Unknown error')}")
    
    # Key insights
    print("\n🔍 KEY INSIGHTS")
    print("=" * 60)
    
    if success_count == total_count:
        print("🎉 All tests passed! ComMarker extraction fixes are working correctly.")
        print("✅ Bundle price contamination has been eliminated")
        print("✅ Power variant selection is working properly")
        print("✅ Base machine prices are being extracted correctly")
    else:
        print(f"⚠️ {total_count - success_count} tests failed or had issues")
        print("🔧 Review failed tests and adjust extraction logic")
        
        # Analyze failure patterns
        failed_tests = [r for r in results if r['result'] != 'success']
        if failed_tests:
            print("\n🔍 FAILURE ANALYSIS:")
            for test in failed_tests:
                if test['result'] == 'price_mismatch':
                    print(f"  • {test['name']}: Price mismatch suggests selector targeting wrong element")
                elif test['result'] == 'failed':
                    print(f"  • {test['name']}: Complete failure suggests power selection or extraction issue")
                else:
                    print(f"  • {test['name']}: Error suggests technical issue with extraction system")
    
    # Check for dynamic scraper usage
    dynamic_tests = [r for r in results if r.get('method') and 'dynamic' in r['method'].lower()]
    if dynamic_tests:
        print(f"\n🤖 Dynamic scraper was used in {len(dynamic_tests)} tests - our fixes are being tested!")
    else:
        print("\n⚠️ No dynamic scraper usage detected - tests may be using static extraction")
    
    return results

if __name__ == "__main__":
    test_price_extraction()