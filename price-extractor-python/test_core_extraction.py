#!/usr/bin/env python3
"""
Core extraction functionality tests.
Tests the intelligent learning system without external dependencies.
"""

import asyncio
import json
import sys
from unittest.mock import Mock, AsyncMock, patch
from bs4 import BeautifulSoup
from datetime import datetime

# Add current directory to path
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_site_specific_extractor():
    """Test site-specific extractor without dependencies."""
    print("🧪 Testing SiteSpecificExtractor...")
    
    try:
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        
        extractor = SiteSpecificExtractor()
        
        # Test 1: Basic price parsing
        print("  ✓ Testing price parsing...")
        test_cases = [
            ("$1,299.99", 1299.99),
            ("€2.599,50", 2599.50), 
            ("4589.00", 4589.0),
            ("Price: $3,999", 3999.0),
            ("259900", 2599.0),  # Cents format
            ("", None),
            ("no price", None)
        ]
        
        for input_price, expected in test_cases:
            result = extractor._parse_price_string(input_price)
            if expected is None:
                assert result is None, f"Expected None for '{input_price}', got {result}"
            else:
                assert abs(result - expected) < 0.01, f"Expected {expected} for '{input_price}', got {result}"
        
        print("  ✅ Price parsing tests passed")
        
        # Test 2: Learned selector extraction
        print("  ✓ Testing learned selector extraction...")
        html = '<div class="learned-price">$2,399.99</div><div class="price">$1,999.99</div>'
        soup = BeautifulSoup(html, 'html.parser')
        
        machine_data = {
            'learned_selectors': {
                'testsite.com': {
                    'selector': '.learned-price',
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0,
                    'price_found': 2399.99
                }
            }
        }
        
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://testsite.com/product', machine_data
        )
        
        assert price == 2399.99, f"Expected 2399.99, got {price}"
        assert 'Learned selector' in method, f"Expected learned selector method, got {method}"
        
        print("  ✅ Learned selector extraction passed")
        
        # Test 3: ComMarker site-specific rules
        print("  ✓ Testing ComMarker site-specific rules...")
        commarker_html = '''
        <div class="product-summary">
            <div class="price">
                <span class="woocommerce-Price-amount">$4,589.00</span>
            </div>
        </div>
        '''
        soup = BeautifulSoup(commarker_html, 'html.parser')
        
        price, method = extractor.extract_price_with_rules(
            soup, commarker_html, 'https://commarker.com/products/test', None
        )
        
        assert price == 4589.0, f"Expected 4589.0, got {price}"
        assert 'Site-specific' in method, f"Expected site-specific method, got {method}"
        
        print("  ✅ ComMarker extraction passed")
        
        return True
        
    except Exception as e:
        print(f"  ❌ SiteSpecificExtractor test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_price_extractor_core():
    """Test PriceExtractor core functionality without external dependencies."""
    print("🧪 Testing PriceExtractor core functionality...")
    
    try:
        # Mock the problematic import
        with patch.dict('sys.modules', {'scrapers.dynamic_scraper': Mock()}):
            from scrapers.price_extractor import PriceExtractor
            
            # Create extractor with mocked Anthropic client
            extractor = PriceExtractor()
            extractor.client = Mock()
            
            # Test 1: JSON-LD extraction
            print("  ✓ Testing JSON-LD extraction...")
            json_ld_html = '''
            <html>
                <head>
                    <script type="application/ld+json">
                    {
                        "@type": "Product",
                        "offers": {
                            "price": "2599.99",
                            "priceCurrency": "USD"
                        }
                    }
                    </script>
                </head>
                <body><div>Product</div></body>
            </html>
            '''
            soup = BeautifulSoup(json_ld_html, 'html.parser')
            price, method = extractor._extract_from_structured_data(soup)
            
            assert price == 2599.99, f"Expected 2599.99, got {price}"
            assert 'JSON-LD' in method, f"Expected JSON-LD method, got {method}"
            
            print("  ✅ JSON-LD extraction passed")
            
            # Test 2: Common selectors extraction
            print("  ✓ Testing common selectors...")
            common_html = '<div class="price">$1,799.99</div>'
            soup = BeautifulSoup(common_html, 'html.parser')
            price, method = extractor._extract_from_common_selectors(soup)
            
            assert price == 1799.99, f"Expected 1799.99, got {price}"
            assert 'CSS Selector' in method, f"Expected CSS Selector method, got {method}"
            
            print("  ✅ Common selectors extraction passed")
            
            return True
            
    except Exception as e:
        print(f"  ❌ PriceExtractor test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_claude_learning_mock():
    """Test Claude learning functionality with mocked responses."""
    print("🧪 Testing Claude learning functionality...")
    
    try:
        # Mock the problematic import
        with patch.dict('sys.modules', {'scrapers.dynamic_scraper': Mock()}):
            from scrapers.price_extractor import PriceExtractor
            
            extractor = PriceExtractor()
            
            # Mock Claude client
            mock_client = Mock()
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = '{"price": "3299.99", "selector": ".product-price .amount"}'
            mock_client.messages.create.return_value = mock_response
            extractor.client = mock_client
            
            # Mock the storage function
            with patch.object(extractor, '_store_learned_selector', new_callable=AsyncMock) as mock_store:
                price, method = await extractor._extract_using_claude(
                    '<html><div class="product-price"><span class="amount">$3,299.99</span></div></html>',
                    'https://example.com/product',
                    None
                )
                
                assert price == 3299.99, f"Expected 3299.99, got {price}"
                assert 'Claude AI (learned:' in method, f"Expected learned method, got {method}"
                assert '.product-price .amount' in method, f"Selector not in method: {method}"
                
                # Verify storage was called
                mock_store.assert_called_once_with(
                    'https://example.com/product',
                    '.product-price .amount', 
                    3299.99
                )
                
                print("  ✅ Claude learning integration passed")
                return True
                
    except Exception as e:
        print(f"  ❌ Claude learning test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_database_service_mock():
    """Test database service functionality with mocks."""
    print("🧪 Testing DatabaseService learned selector methods...")
    
    try:
        # Mock Supabase
        with patch('services.database.create_client') as mock_create_client:
            mock_supabase = Mock()
            mock_create_client.return_value = mock_supabase
            
            # Mock successful responses
            mock_table = Mock()
            mock_table.select.return_value = mock_table
            mock_table.or_.return_value = mock_table
            mock_table.eq.return_value = mock_table
            mock_table.execute.return_value = Mock(data=[
                {'id': 'test-machine', 'learned_selectors': {}}
            ])
            mock_supabase.table.return_value = mock_table
            
            from services.database import DatabaseService
            
            db_service = DatabaseService()
            
            # Test get_machines_by_url
            result = asyncio.run(db_service.get_machines_by_url('https://example.com/product'))
            assert isinstance(result, list), "Expected list result"
            
            print("  ✅ Database service methods working")
            return True
            
    except Exception as e:
        print(f"  ❌ Database service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_end_to_end_learning():
    """Test end-to-end learning workflow."""
    print("🧪 Testing end-to-end learning workflow...")
    
    try:
        # This tests the complete workflow without external dependencies
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        
        extractor = SiteSpecificExtractor()
        
        # Step 1: Start with no learned selectors
        html = '<div class="new-price-selector">$1,899.99</div>'
        soup = BeautifulSoup(html, 'html.parser')
        
        machine_data = {'learned_selectors': {}}
        
        # This should fail to find price (no site-specific rules for test domain)
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://newsite.com/product', machine_data
        )
        
        # Now simulate that Claude learned the selector
        machine_data_with_learning = {
            'learned_selectors': {
                'newsite.com': {
                    'selector': '.new-price-selector',
                    'last_success': datetime.utcnow().isoformat(),
                    'confidence': 1.0,
                    'price_found': 1899.99
                }
            }
        }
        
        # Step 2: Try extraction with learned selector
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://newsite.com/product', machine_data_with_learning
        )
        
        assert price == 1899.99, f"Expected 1899.99 with learned selector, got {price}"
        assert 'Learned selector' in method, f"Expected learned selector method, got {method}"
        
        print("  ✅ End-to-end learning workflow passed")
        return True
        
    except Exception as e:
        print(f"  ❌ End-to-end learning test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all core functionality tests."""
    print("🚀 Running Core Intelligent Extraction Tests")
    print("=" * 55)
    
    tests = [
        ("Site-Specific Extractor", test_site_specific_extractor),
        ("Price Extractor Core", test_price_extractor_core),
        ("Claude Learning (Mock)", lambda: asyncio.run(test_claude_learning_mock())),
        ("Database Service (Mock)", test_database_service_mock),
        ("End-to-End Learning", test_end_to_end_learning),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 30)
        
        try:
            success = test_func()
            results.append((test_name, success))
            
            if success:
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
                
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 55)
    print("📊 TEST SUMMARY")
    print("=" * 55)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL CORE TESTS PASSED!")
        print("The intelligent price extraction system is working correctly!")
        return True
    else:
        print(f"\n⚠️  {total - passed} tests failed. Check output above for details.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)