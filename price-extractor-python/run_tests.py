#!/usr/bin/env python3
"""
Test runner for intelligent price extraction system.
Runs all tests and provides a summary of results.
"""

import subprocess
import sys
import os
from pathlib import Path

def run_tests():
    """Run all tests and return results."""
    print("🧪 Running Intelligent Price Extraction Tests")
    print("=" * 50)
    
    # Change to the correct directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Test files to run
    test_files = [
        'test_intelligent_extraction.py',
        'test_real_extraction.py'
    ]
    
    results = {}
    overall_success = True
    
    for test_file in test_files:
        if not Path(test_file).exists():
            print(f"❌ Test file {test_file} not found")
            continue
            
        print(f"\n📋 Running {test_file}...")
        print("-" * 30)
        
        # Run pytest
        result = subprocess.run([
            sys.executable, '-m', 'pytest', 
            test_file, 
            '-v',  # Verbose
            '--tb=short',  # Short traceback
            '--no-header',  # No pytest header
            '--disable-warnings'  # Disable warnings for cleaner output
        ], capture_output=True, text=True)
        
        # Store result
        results[test_file] = {
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
        
        # Print output
        if result.stdout:
            print(result.stdout)
        
        if result.stderr and result.stderr.strip():
            print("STDERR:")
            print(result.stderr)
        
        # Check if tests passed
        if result.returncode == 0:
            print(f"✅ {test_file}: ALL TESTS PASSED")
        else:
            print(f"❌ {test_file}: SOME TESTS FAILED")
            overall_success = False
    
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    for test_file, result in results.items():
        status = "✅ PASSED" if result['returncode'] == 0 else "❌ FAILED"
        print(f"{test_file}: {status}")
    
    if overall_success:
        print("\n🎉 ALL TESTS PASSED! Intelligent extraction system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
    
    return overall_success

def test_specific_functionality():
    """Test specific functionality manually."""
    print("\n🔧 Testing Core Functionality")
    print("-" * 30)
    
    try:
        # Test imports
        from scrapers.price_extractor import PriceExtractor
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        from services.database import DatabaseService
        print("✅ All imports successful")
        
        # Test basic price parsing
        extractor = SiteSpecificExtractor()
        test_prices = [
            "$1,299.99",
            "€2.599,50", 
            "4589.00",
            "Price: $3,999"
        ]
        
        print("\n💰 Testing price parsing:")
        for price_text in test_prices:
            parsed = extractor._parse_price_string(price_text)
            print(f"  '{price_text}' → ${parsed}")
        
        # Test learned selector extraction
        from bs4 import BeautifulSoup
        html = '<div class="test-price">$1,599.99</div>'
        soup = BeautifulSoup(html, 'html.parser')
        
        machine_data = {
            'learned_selectors': {
                'testsite.com': {
                    'selector': '.test-price',
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0
                }
            }
        }
        
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://testsite.com/product', machine_data
        )
        
        print(f"\n🧠 Learned selector test: ${price} via {method}")
        
        if price == 1599.99 and 'Learned selector' in method:
            print("✅ Learned selector functionality working correctly")
        else:
            print("❌ Learned selector functionality failed")
            return False
        
        print("\n✅ All core functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Core functionality test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Starting Intelligent Price Extraction Test Suite")
    print("=" * 60)
    
    # Test core functionality first
    core_success = test_specific_functionality()
    
    if not core_success:
        print("\n❌ Core functionality tests failed. Skipping full test suite.")
        sys.exit(1)
    
    # Run full test suite
    test_success = run_tests()
    
    # Exit with appropriate code
    sys.exit(0 if test_success else 1)