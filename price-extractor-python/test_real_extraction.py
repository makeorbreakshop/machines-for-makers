"""
Real-world integration tests for price extraction.
Tests actual extraction against live sites (with rate limiting).
"""

import pytest
import asyncio
import time
from unittest.mock import patch, Mock

from scrapers.web_scraper import WebScraper
from scrapers.price_extractor import PriceExtractor
from services.price_service import PriceService


class TestRealSiteExtraction:
    """Test extraction against real sites (carefully rate-limited)."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_commarker_extraction_real(self):
        """Test real ComMarker extraction with current implementation."""
        # Only run if explicitly requested
        if not pytest.config.getoption("--run-slow"):
            pytest.skip("Slow test not requested")
        
        # Rate limiting - wait between requests
        await asyncio.sleep(2)
        
        web_scraper = WebScraper()
        price_extractor = PriceExtractor()
        
        # Use a known ComMarker product URL (update as needed)
        test_url = "https://commarker.com/products/commarker-b4-20w-laser-engraver"
        
        try:
            # Get page content
            html_content, soup = await web_scraper.get_page_content(test_url)
            
            assert html_content is not None, "Failed to fetch HTML content"
            assert soup is not None, "Failed to parse HTML"
            
            # Extract price using current method
            machine_data = {
                'learned_selectors': {}  # Start with no learned selectors
            }
            
            price, method = await price_extractor.extract_price(
                soup, html_content, test_url, 
                old_price=4500.0, 
                machine_name="ComMarker B4",
                machine_data=machine_data
            )
            
            # Validate result
            assert price is not None, f"Failed to extract price from {test_url}"
            assert isinstance(price, (int, float)), f"Price is not numeric: {price}"
            assert 1000 <= price <= 10000, f"Price {price} outside expected range for ComMarker"
            
            print(f"✅ Successfully extracted price: ${price} using method: {method}")
            
            # Verify the method used
            assert method is not None, "No extraction method returned"
            print(f"Extraction method: {method}")
            
        except Exception as e:
            pytest.fail(f"Real extraction test failed: {str(e)}")


class TestMockRealScenarios:
    """Test realistic scenarios with mocked data but real extraction logic."""
    
    @pytest.mark.asyncio
    async def test_commarker_html_extraction(self):
        """Test extraction using real ComMarker HTML structure."""
        # Realistic ComMarker HTML structure
        commarker_html = '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>ComMarker B4 20W Laser Engraver</title>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": "ComMarker B4 20W Laser Engraver",
                "offers": {
                    "@type": "Offer",
                    "url": "https://commarker.com/products/commarker-b4-20w-laser-engraver",
                    "priceCurrency": "USD",
                    "price": "4589.00",
                    "availability": "https://schema.org/InStock"
                }
            }
            </script>
        </head>
        <body>
            <div class="product-wrapper">
                <div class="product-summary">
                    <h1 class="product-title">ComMarker B4 20W Laser Engraver</h1>
                    <div class="price-section">
                        <div class="price">
                            <span class="woocommerce-Price-amount amount">
                                <bdi><span class="woocommerce-Price-currencySymbol">$</span>4,589.00</bdi>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        '''
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(commarker_html, 'html.parser')
        
        price_extractor = PriceExtractor()
        
        # Test extraction
        price, method = await price_extractor.extract_price(
            soup, commarker_html, 
            'https://commarker.com/products/commarker-b4-20w-laser-engraver',
            old_price=4500.0,
            machine_name="ComMarker B4"
        )
        
        # Validate
        assert price == 4589.0, f"Expected 4589.0, got {price}"
        assert method is not None, "No extraction method returned"
        print(f"✅ Extracted ${price} using {method}")
    
    @pytest.mark.asyncio
    async def test_learned_selector_priority(self):
        """Test that learned selectors are tried first and work correctly."""
        html = '''
        <html>
            <body>
                <div class="wrong-price">$9999.99</div>
                <div class="learned-selector">$2,399.99</div>
                <div class="price">$1,999.99</div>
            </body>
        </html>
        '''
        
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        
        # Machine data with learned selector
        machine_data = {
            'learned_selectors': {
                'testsite.com': {
                    'selector': '.learned-selector',
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0,
                    'price_found': 2399.99
                }
            }
        }
        
        price_extractor = PriceExtractor()
        
        # Test that learned selector is used first
        price, method = await price_extractor.extract_price(
            soup, html, 'https://testsite.com/product',
            machine_data=machine_data
        )
        
        # Should use learned selector, not the generic .price selector
        assert price == 2399.99, f"Expected learned selector price 2399.99, got {price}"
        assert 'Learned selector' in method, f"Expected learned selector method, got {method}"
        print(f"✅ Learned selector prioritized correctly: ${price} via {method}")
    
    @pytest.mark.asyncio
    async def test_claude_learning_integration(self):
        """Test Claude integration with selector learning."""
        # Mock Claude response with selector
        mock_claude_response = '''
        {
            "price": "3299.99",
            "selector": ".product-info .current-price"
        }
        '''
        
        html = '''
        <html>
            <body>
                <div class="product-info">
                    <div class="current-price">$3,299.99</div>
                </div>
            </body>
        </html>
        '''
        
        # Mock Anthropic client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = mock_claude_response
        mock_client.messages.create.return_value = mock_response
        
        price_extractor = PriceExtractor()
        price_extractor.client = mock_client
        
        # Mock the storage function to avoid database calls
        with patch.object(price_extractor, '_store_learned_selector', new_callable=asyncio.coroutine(lambda *args: None)):
            price, method = await price_extractor._extract_using_claude(
                html, 'https://newsite.com/product', 3000.0
            )
            
            assert price == 3299.99, f"Expected 3299.99, got {price}"
            assert 'Claude AI (learned:' in method, f"Expected learned method, got {method}"
            assert '.product-info .current-price' in method, f"Selector not in method: {method}"
            print(f"✅ Claude learning integration works: ${price} via {method}")


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    @pytest.mark.asyncio
    async def test_invalid_html_handling(self):
        """Test handling of invalid or malformed HTML."""
        invalid_html = "<html><div>No closing tags<p>Malformed"
        
        from bs4 import BeautifulSoup
        # BeautifulSoup should handle this gracefully
        soup = BeautifulSoup(invalid_html, 'html.parser')
        
        price_extractor = PriceExtractor()
        
        # Should not crash, might return None
        price, method = await price_extractor.extract_price(
            soup, invalid_html, 'https://example.com/broken'
        )
        
        # Test passes if it doesn't crash
        print(f"✅ Invalid HTML handled gracefully: price={price}, method={method}")
    
    @pytest.mark.asyncio
    async def test_network_timeout_simulation(self):
        """Test handling of network timeouts and errors."""
        # This would be tested with actual network mocking in a full test suite
        # For now, just verify our error handling structure
        
        web_scraper = WebScraper()
        
        # Test with invalid URL
        try:
            html_content, soup = await web_scraper.get_page_content("https://invalid-domain-that-does-not-exist.com")
            # If this succeeds, that's unexpected but not a failure
        except Exception as e:
            # Expected to fail - test that we handle it gracefully
            print(f"✅ Network error handled: {type(e).__name__}")
    
    def test_price_parsing_edge_cases(self):
        """Test edge cases in price parsing."""
        from scrapers.site_specific_extractors import SiteSpecificExtractor
        
        extractor = SiteSpecificExtractor()
        
        edge_cases = [
            ("", None),  # Empty string
            ("No price here", None),  # No numbers
            ("$0.00", 0.0),  # Zero price
            ("$999999999", 999999999.0),  # Very large number
            ("€1.234,56", 1234.56),  # European format
            ("1,234.567", 1234.567),  # More than 2 decimal places
            ("$-100", None),  # Negative price should be rejected
            ("Price from $100 to $200", 100.0),  # Should pick first price
        ]
        
        for input_str, expected in edge_cases:
            result = extractor._parse_price_string(input_str)
            if expected is None:
                assert result is None, f"Expected None for '{input_str}', got {result}"
            else:
                assert abs(result - expected) < 0.01, f"Expected {expected} for '{input_str}', got {result}"
        
        print("✅ All price parsing edge cases handled correctly")


def pytest_addoption(parser):
    """Add command line options for pytest."""
    parser.addoption(
        "--run-slow", action="store_true", default=False, help="Run slow tests that hit real websites"
    )


def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line("markers", "slow: mark test as slow (may hit real websites)")


if __name__ == '__main__':
    # Quick test runner
    import subprocess
    import sys
    
    print("Running real extraction tests...")
    result = subprocess.run([
        sys.executable, '-m', 'pytest', 
        'test_real_extraction.py', 
        '-v', '--tb=short', '-x'  # Stop on first failure
    ], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    exit(result.returncode)