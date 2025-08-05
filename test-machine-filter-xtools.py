#!/usr/bin/env python3
"""
Test machine filtering with a site that has materials/accessories
"""
import requests
import json

def test_machine_filter_xtools():
    print("Testing machine filtering with mixed product types...\n")
    
    # Test with a hypothetical URL that might have accessories
    url = "http://localhost:8000/api/v1/smart/smart-discover-urls"
    payload = {
        "manufacturer_id": "test-xtools",
        "base_url": "https://www.xtool.com",
        "manufacturer_name": "xTool",
        "max_pages": 2,
        "apply_smart_filtering": True,
        "apply_machine_filtering": True
    }
    
    print(f"Testing with {payload['manufacturer_name']} - likely to have materials and accessories")
    
    try:
        response = requests.post(url, json=payload)
        if response.ok:
            data = response.json()
            
            print(f"\nResults:")
            print(f"- Total URLs found: {data.get('total_urls_found')}")
            print(f"- Machine filter applied: {data.get('classification_summary', {}).get('machine_filter_applied')}")
            print(f"- Non-machines filtered: {data.get('classification_summary', {}).get('urls_filtered_as_non_machines', 0)}")
            
            # Show ML classification breakdown
            classified = data.get('classified_urls', {})
            if classified:
                print(f"\nClassification breakdown:")
                ml_counts = {}
                for category, urls in classified.items():
                    for item in urls:
                        if 'ml_classification' in item:
                            ml_class = item['ml_classification']
                            ml_counts[ml_class] = ml_counts.get(ml_class, 0) + 1
                
                for ml_class, count in sorted(ml_counts.items()):
                    print(f"  {ml_class}: {count}")
                
                # Show examples of non-machines
                print(f"\nNon-machine examples:")
                non_machines = []
                for category, urls in classified.items():
                    for item in urls:
                        if item.get('ml_classification') in ['MATERIAL', 'ACCESSORY', 'SERVICE']:
                            non_machines.append(item)
                
                for item in non_machines[:5]:
                    print(f"- {item['url']}")
                    print(f"  Classification: {item.get('ml_classification')} | Reason: {item.get('reason', 'N/A')}")
                
                if not non_machines:
                    print("  No non-machine products found in this sample")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_machine_filter_xtools()