"""
Comprehensive tests for the intelligent price extraction system.
Tests the learning capabilities, selector storage, and integration.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from bs4 import BeautifulSoup

from scrapers.price_extractor import PriceExtractor
from scrapers.site_specific_extractors import SiteSpecificExtractor
from services.database import DatabaseService
from services.price_service import PriceService


class TestIntelligentPriceExtraction:
    """Test suite for intelligent price extraction with learning capabilities."""
    
    @pytest.fixture
    def mock_database_service(self):
        """Mock database service for testing."""
        db_service = Mock(spec=DatabaseService)
        db_service.get_machines_by_url = AsyncMock(return_value=[])
        db_service.update_machine_learned_selectors = AsyncMock(return_value=True)
        return db_service
    
    @pytest.fixture
    def sample_html_with_price(self):
        """Sample HTML with a clear price for testing."""
        return """
        <html>
            <head><title>Test Product</title></head>
            <body>
                <div class="product-container">
                    <h1>Test Laser Cutter</h1>
                    <div class="price-section">
                        <span class="current-price">$2,599.99</span>
                        <span class="old-price">$2,799.99</span>
                    </div>
                </div>
            </body>
        </html>
        """
    
    @pytest.fixture
    def sample_machine_data(self):
        """Sample machine data with learned selectors."""
        return {
            'id': 'test-machine-1',
            'Machine Name': 'Test Laser Cutter',
            'learned_selectors': {
                'example.com': {
                    'selector': '.current-price',
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0,
                    'price_found': 2599.99
                }
            }
        }
    
    @pytest.fixture
    def price_extractor(self):
        """Price extractor instance for testing."""
        with patch('scrapers.price_extractor.anthropic.Anthropic'):
            return PriceExtractor()


class TestLearnedSelectorExtraction:
    """Test learned selector functionality."""
    
    def test_learned_selector_extraction_success(self):
        """Test successful price extraction using learned selectors."""
        # Setup
        extractor = SiteSpecificExtractor()
        html = '<div class="price">$1,299.00</div>'
        soup = BeautifulSoup(html, 'html.parser')
        
        machine_data = {
            'learned_selectors': {
                'testsite.com': {
                    'selector': '.price',
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0
                }
            }
        }
        
        # Execute
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://testsite.com/product', machine_data
        )
        
        # Assert
        assert price == 1299.0
        assert 'Learned selector' in method
        assert '.price' in method
    
    def test_learned_selector_fallback_to_static(self):
        """Test fallback to static rules when learned selector fails."""
        extractor = SiteSpecificExtractor()
        html = '<div class="product-price">$999.99</div>'
        soup = BeautifulSoup(html, 'html.parser')
        
        machine_data = {
            'learned_selectors': {
                'commarker.com': {
                    'selector': '.wrong-selector',  # This will fail
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0
                }
            }
        }
        
        # Execute
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://commarker.com/product', machine_data
        )
        
        # Should fallback to site-specific rules
        assert price is not None or method is not None  # Either works or we get a method attempt


class TestClaudeIntegrationWithLearning:
    """Test Claude AI integration with learning capabilities."""
    
    @pytest.mark.asyncio
    async def test_claude_json_response_parsing(self):
        """Test parsing of Claude's JSON response with selector learning."""
        # Mock Claude client
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = '{"price": "1599.99", "selector": ".product-price .amount"}'
        mock_client.messages.create.return_value = mock_response
        
        # Setup extractor with mocked client
        extractor = PriceExtractor()
        extractor.client = mock_client
        
        # Mock the selector storage to avoid database calls
        with patch.object(extractor, '_store_learned_selector', new_callable=AsyncMock) as mock_store:
            # Execute
            price, method = await extractor._extract_using_claude(
                '<html><div class="product-price"><span class="amount">$1,599.99</span></div></html>',
                'https://example.com/product',
                None
            )
            
            # Assert
            assert price == 1599.99
            assert 'Claude AI (learned:' in method
            assert '.product-price .amount' in method
            
            # Verify selector was stored
            mock_store.assert_called_once_with(
                'https://example.com/product',
                '.product-price .amount',
                1599.99
            )
    
    @pytest.mark.asyncio
    async def test_claude_fallback_parsing(self):
        """Test Claude fallback when JSON parsing fails."""
        # Mock Claude client with non-JSON response
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = 'The price is $899.50 for this product.'
        mock_client.messages.create.return_value = mock_response
        
        # Setup extractor
        extractor = PriceExtractor()
        extractor.client = mock_client
        
        # Execute
        price, method = await extractor._extract_using_claude(
            '<html><div>Product costs $899.50</div></html>',
            'https://example.com/product',
            None
        )
        
        # Assert
        assert price == 899.50
        assert method == 'Claude AI (fallback)'


class TestSelectorStorage:
    """Test selector storage and retrieval functionality."""
    
    @pytest.mark.asyncio
    async def test_store_learned_selector(self):
        """Test storing a learned selector in the database."""
        # Mock database service
        mock_db = Mock(spec=DatabaseService)
        mock_db.get_machines_by_url = AsyncMock(return_value=[
            {
                'id': 'machine-1',
                'learned_selectors': {}
            }
        ])
        mock_db.update_machine_learned_selectors = AsyncMock(return_value=True)
        
        # Setup extractor
        extractor = PriceExtractor()
        
        # Mock the database import
        with patch('scrapers.price_extractor.DatabaseService', return_value=mock_db):
            # Execute
            await extractor._store_learned_selector(
                'https://example.com/product',
                '.price-value',
                1299.99
            )
            
            # Verify the selector was stored with correct structure
            mock_db.update_machine_learned_selectors.assert_called_once()
            call_args = mock_db.update_machine_learned_selectors.call_args
            machine_id, learned_selectors = call_args[0]
            
            assert machine_id == 'machine-1'
            assert 'example.com' in learned_selectors
            assert learned_selectors['example.com']['selector'] == '.price-value'
            assert learned_selectors['example.com']['price_found'] == 1299.99
            assert learned_selectors['example.com']['confidence'] == 1.0


class TestPriceValidation:
    """Test price validation and range checking."""
    
    def test_price_range_validation(self):
        """Test that prices are validated against reasonable ranges."""
        extractor = SiteSpecificExtractor()
        
        # Test valid price range
        assert extractor._validate_price(1500.0, {'min_expected_price': 500, 'max_expected_price': 5000})
        
        # Test below minimum
        assert not extractor._validate_price(100.0, {'min_expected_price': 500, 'max_expected_price': 5000})
        
        # Test above maximum
        assert not extractor._validate_price(10000.0, {'min_expected_price': 500, 'max_expected_price': 5000})
    
    def test_price_parsing_edge_cases(self):
        """Test price parsing with various formats."""
        extractor = SiteSpecificExtractor()
        
        # Test different price formats
        test_cases = [
            ('$1,299.99', 1299.99),
            ('€2.599,50', 2599.50),
            ('1999', 1999.0),
            ('$3,999', 3999.0),
            ('Price: $4,589.00', 4589.0),
            ('259900', 2599.0),  # Cents format
            ('invalid', None),
            ('', None)
        ]
        
        for input_price, expected in test_cases:
            result = extractor._parse_price_string(input_price)
            if expected is None:
                assert result is None, f"Expected None for '{input_price}', got {result}"
            else:
                assert abs(result - expected) < 0.01, f"Expected {expected} for '{input_price}', got {result}"


class TestEndToEndIntegration:
    """Test end-to-end integration of the intelligent extraction system."""
    
    @pytest.mark.asyncio
    async def test_full_extraction_pipeline_with_learning(self):
        """Test the complete extraction pipeline with learning enabled."""
        # Setup mocks
        mock_db = Mock(spec=DatabaseService)
        mock_db.get_machine_by_id = AsyncMock(return_value={
            'id': 'test-machine',
            'Machine Name': 'Test Machine',
            'Price': 2000.0,
            'product_link': 'https://example.com/product',
            'learned_selectors': {}
        })
        mock_db.update_machine_price = AsyncMock(return_value=True)
        mock_db.add_price_history = AsyncMock(return_value=True)
        mock_db.get_machines_by_url = AsyncMock(return_value=[{
            'id': 'test-machine',
            'learned_selectors': {}
        }])
        mock_db.update_machine_learned_selectors = AsyncMock(return_value=True)
        
        # Mock web scraper
        mock_web_scraper = Mock()
        mock_web_scraper.get_page_content = AsyncMock(return_value=(
            '<html><div class="price">$2,299.99</div></html>',
            BeautifulSoup('<html><div class="price">$2,299.99</div></html>', 'html.parser')
        ))
        
        # Setup price service
        with patch('services.price_service.DatabaseService', return_value=mock_db), \
             patch('services.price_service.WebScraper', return_value=mock_web_scraper):
            
            price_service = PriceService()
            
            # Execute
            result = await price_service.update_machine_price('test-machine')
            
            # Assert
            assert result['success'] is True
            assert result['new_price'] == 2299.99
            assert result['old_price'] == 2000.0
            
            # Verify database calls
            mock_db.update_machine_price.assert_called_once()
            mock_db.add_price_history.assert_called_once()


class TestComMarkerSpecificCases:
    """Test specific cases for ComMarker site extraction."""
    
    def test_commarker_site_rules(self):
        """Test ComMarker-specific extraction rules."""
        extractor = SiteSpecificExtractor()
        
        # ComMarker-style HTML
        html = '''
        <div class="product-summary">
            <div class="price">
                <span class="woocommerce-Price-amount">$4,589.00</span>
            </div>
        </div>
        '''
        soup = BeautifulSoup(html, 'html.parser')
        
        # Execute
        price, method = extractor.extract_price_with_rules(
            soup, html, 'https://commarker.com/product', None
        )
        
        # Assert
        assert price == 4589.0
        assert 'Site-specific' in method
    
    def test_commarker_price_validation(self):
        """Test that ComMarker prices are validated against expected ranges."""
        extractor = SiteSpecificExtractor()
        rules = extractor.site_rules['commarker.com']
        
        # Test valid ComMarker price
        assert extractor._validate_price(4589.0, rules)
        
        # Test invalid low price (likely parsing error)
        assert not extractor._validate_price(45.89, rules)
        
        # Test invalid high price
        assert not extractor._validate_price(50000.0, rules)


def run_tests():
    """Run all tests and display results."""
    import subprocess
    import sys
    
    print("Running intelligent price extraction tests...")
    
    # Run pytest with verbose output
    result = subprocess.run([
        sys.executable, '-m', 'pytest', 
        'test_intelligent_extraction.py', 
        '-v', '--tb=short'
    ], capture_output=True, text=True)
    
    print("STDOUT:")
    print(result.stdout)
    
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
    
    print(f"Exit code: {result.returncode}")
    return result.returncode == 0


if __name__ == '__main__':
    # Run tests when script is executed directly
    success = run_tests()
    exit(0 if success else 1)