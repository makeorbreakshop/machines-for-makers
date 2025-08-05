#!/usr/bin/env python3
"""
Simple test of smart discovery endpoint
"""
import requests
import json

def test_smart_discovery():
    print("Testing smart discovery endpoint...\n")
    
    url = "http://localhost:8000/api/v1/smart/smart-discover-urls"
    payload = {
        "manufacturer_id": "test-simple",
        "base_url": "https://www.creality.com",
        "manufacturer_name": "Creality",
        "max_pages": 1,
        "apply_smart_filtering": True,
        "apply_machine_filtering": True
    }
    
    print(f"POST {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        print(f"\nStatus: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"\nResponse:")
            print(f"- Success: {data.get('success')}")
            print(f"- Total URLs: {data.get('total_urls_found')}")
            print(f"- Classification Summary: {data.get('classification_summary')}")
            print(f"- Discovery Method: {data.get('discovery_method')}")
            
            # Debug: show all keys
            print(f"\nAll response keys: {list(data.keys())}")
            
            # Check if machine filtering was applied
            if data.get('classification_summary', {}).get('machine_filter_applied'):
                print(f"- Machine Filter Applied: YES")
                print(f"- Non-machines filtered: {data.get('classification_summary', {}).get('urls_filtered_as_non_machines', 0)}")
            else:
                print(f"- Machine Filter Applied: NO")
                
            # Show sample classified URLs
            classified = data.get('classified_urls', {})
            print(f"\nClassified URLs structure: {type(classified)}")
            print(f"Classified URLs keys: {list(classified.keys()) if isinstance(classified, dict) else 'Not a dict'}")
            
            if classified and isinstance(classified, dict):
                for category, urls in classified.items():
                    print(f"\n{category}: {len(urls) if isinstance(urls, list) else 'Not a list'} URLs")
                    if isinstance(urls, list) and len(urls) > 0:
                        sample = urls[0]
                        print(f"  Sample: {sample.get('url') if isinstance(sample, dict) else sample}")
                        if isinstance(sample, dict) and 'ml_classification' in sample:
                            print(f"  ML: {sample.get('ml_classification')}")
        else:
            print(f"\nError: {response.text}")
            
    except Exception as e:
        print(f"\nException: {e}")

if __name__ == "__main__":
    test_smart_discovery()