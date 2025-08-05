#!/usr/bin/env python3
"""
Direct test of MachineFilterService
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'price-extractor-python'))

from services.machine_filter_service import MachineFilterService

def test_machine_filter():
    print("Testing MachineFilterService directly...\n")
    
    # Test URLs
    test_urls = [
        "https://www.creality.com/products/k1-max-3d-printer",
        "https://www.creality.com/products/ender-3-v3-ke-3d-printer", 
        "https://www.creality.com/products/hyper-pla-filament",
        "https://www.creality.com/products/laser-protective-glasses",
        "https://www.creality.com/products/3d-printer-bundle-package"
    ]
    
    try:
        # Initialize service
        service = MachineFilterService()
        print("✓ MachineFilterService initialized")
        
        # Test classification
        results = service.classify_urls_batch(test_urls, "Creality")
        
        print(f"\nClassified {len(results)} URLs:")
        for url, classification in results.items():
            print(f"\n{url}")
            print(f"  Classification: {classification['classification']}")
            print(f"  Should Skip: {classification['should_skip']}")
            print(f"  Confidence: {classification['confidence']}")
            print(f"  Reason: {classification['reason']}")
            if 'machine_type' in classification:
                print(f"  Machine Type: {classification['machine_type']}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_machine_filter()