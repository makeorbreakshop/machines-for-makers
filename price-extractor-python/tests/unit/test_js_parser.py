import pytest
from decimal import Decimal
from unittest.mock import patch, Mock, AsyncMock, MagicMock
import json
import sys
import os

# Ensure the service path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.js_parser import JSParser
from services.config import Config

@pytest.fixture
def mock_config():
    return Config({
        "extraction": {
            "min_confidence": 0.8,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        },
        "api": {
            "request_timeout": 30,
            "max_retries": 2,
            "retry_delay": 1
        },
        "playwright": {
            "headless": True,
            "timeout": 30000,
            "navigation_timeout": 60000
        }
    })

@pytest.mark.unit
class TestJSParser:
    
    @pytest.mark.asyncio
    @patch('services.js_parser.async_playwright')
    async def test_basic_js_extraction(self, mock_playwright, mock_config):
        """Test basic JS-enabled page extraction."""
        # Mock the Playwright browser instance
        mock_browser = AsyncMock()
        mock_page = AsyncMock()
        mock_context = AsyncMock()
        
        # Set up the page content after JS execution
        mock_page.content.return_value = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div id="dynamic-price" class="price">$2,199.99</div>
                </div>
            </body>
        </html>
        """
        
        # Set up function to extract text from the price element
        mock_page.eval_on_selector.return_value = "$2,199.99"
        
        # Set up the mock browser context
        mock_context.new_page.return_value = mock_page
        mock_browser.chromium.launch.return_value = mock_browser
        mock_browser.new_context.return_value = mock_context
        
        # Set up the mock playwright
        mock_playwright_instance = AsyncMock()
        mock_playwright_instance.__aenter__.return_value = mock_browser
        mock_playwright.return_value = mock_playwright_instance
        
        # Create the parser
        parser = JSParser(mock_config)
        
        # Test extraction
        result = await parser.extract_price(
            url="https://example.com/product",
            selector=".price"
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 2199.99
        assert result["currency"] == "USD"
        assert result["tier"] == "JS_INTERACTION"
        assert result["confidence"] >= 0.8  # Default confidence for JS extraction

    @pytest.mark.asyncio
    @patch('services.js_parser.async_playwright')
    async def test_api_endpoint_extraction(self, mock_playwright, mock_config):
        """Test extraction via API endpoint."""
        # Mock HTTP client for API endpoint request
        with patch('httpx.AsyncClient.get') as mock_get:
            # Create a mock response
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "product": {
                    "name": "Laser Cutter Pro 500",
                    "price": 3499.99,
                    "currency": "USD"
                }
            }
            mock_get.return_value = mock_response
            
            # Create the parser
            parser = JSParser(mock_config)
            
            # Test extraction using API endpoint
            result = await parser.extract_price_from_api(
                api_endpoint="https://example.com/api/products/123"
            )
            
            # Verify the results
            assert result is not None
            assert result["price"] == 3499.99
            assert result["currency"] == "USD"
            assert result["tier"] == "JS_INTERACTION"
            assert result["api_endpoint"] == "https://example.com/api/products/123"

    @pytest.mark.asyncio
    @patch('services.js_parser.async_playwright')
    async def test_click_sequence_extraction(self, mock_playwright, mock_config):
        """Test extraction that requires click sequence."""
        # Mock the Playwright browser instance
        mock_browser = AsyncMock()
        mock_page = AsyncMock()
        mock_context = AsyncMock()
        
        # Set up the page content after clicking
        mock_page.content.side_effect = [
            # Initial content
            """
            <html>
                <body>
                    <div class="product-info">
                        <h1>Laser Cutter Pro 500</h1>
                        <div class="variants">
                            <button id="variant-80w">80W</button>
                            <button id="variant-100w">100W</button>
                        </div>
                        <div class="price">$2,199.99</div>
                    </div>
                </body>
            </html>
            """,
            # Content after clicking on 100W variant
            """
            <html>
                <body>
                    <div class="product-info">
                        <h1>Laser Cutter Pro 500</h1>
                        <div class="variants">
                            <button id="variant-80w">80W</button>
                            <button id="variant-100w" class="selected">100W</button>
                        </div>
                        <div class="price">$3,499.99</div>
                    </div>
                </body>
            </html>
            """
        ]
        
        # Set up function to extract text from the price element after clicking
        mock_page.eval_on_selector.return_value = "$3,499.99"
        
        # Set up the mock browser context
        mock_context.new_page.return_value = mock_page
        mock_browser.chromium.launch.return_value = mock_browser
        mock_browser.new_context.return_value = mock_context
        
        # Set up the mock playwright
        mock_playwright_instance = AsyncMock()
        mock_playwright_instance.__aenter__.return_value = mock_browser
        mock_playwright.return_value = mock_playwright_instance
        
        # Create the parser
        parser = JSParser(mock_config)
        
        # Define the click sequence
        click_sequence = [
            {"action": "click", "selector": "#variant-100w"}
        ]
        
        # Test extraction with click sequence
        result = await parser.extract_price(
            url="https://example.com/product",
            selector=".price",
            js_click_sequence=click_sequence,
            variant_attribute="100W"
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 3499.99
        assert result["currency"] == "USD"
        assert result["tier"] == "JS_INTERACTION"
        assert result["variant_attribute"] == "100W"

    @pytest.mark.asyncio
    @patch('services.js_parser.async_playwright')
    async def test_har_analysis(self, mock_playwright, mock_config):
        """Test extraction via HAR scanning."""
        # Mock the Playwright browser instance
        mock_browser = AsyncMock()
        mock_page = AsyncMock()
        mock_context = AsyncMock()
        
        # Set up HAR entries with pricing data
        mock_har_entries = [
            {
                "request": {
                    "url": "https://example.com/api/product/price"
                },
                "response": {
                    "content": {
                        "text": json.dumps({
                            "price": 2799.99,
                            "currency": "USD",
                            "sku": "LC500-80W"
                        })
                    }
                }
            }
        ]
        
        # Mock the HAR recording
        mock_context.har = MagicMock()
        mock_context.har.entries = mock_har_entries
        
        # Set up the mock browser context
        mock_context.new_page.return_value = mock_page
        mock_browser.chromium.launch.return_value = mock_browser
        mock_browser.new_context.return_value = mock_context
        
        # Set up the mock playwright
        mock_playwright_instance = AsyncMock()
        mock_playwright_instance.__aenter__.return_value = mock_browser
        mock_playwright.return_value = mock_playwright_instance
        
        # Create the parser
        parser = JSParser(mock_config)
        
        # Test extraction with HAR analysis
        result = await parser.scan_network_requests(
            url="https://example.com/product",
            variant_attribute="80W"
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 2799.99
        assert result["currency"] == "USD"
        assert result["tier"] == "JS_INTERACTION"
        assert result["variant_attribute"] == "80W"
        assert "discovered_endpoint" in result

    @pytest.mark.asyncio
    @patch('services.js_parser.async_playwright')
    async def test_error_handling(self, mock_playwright, mock_config):
        """Test handling of Playwright errors."""
        # Mock the Playwright to raise an error
        mock_playwright_instance = AsyncMock()
        mock_playwright_instance.__aenter__.side_effect = Exception("Browser error")
        mock_playwright.return_value = mock_playwright_instance
        
        # Create the parser
        parser = JSParser(mock_config)
        
        # Test extraction with error
        result = await parser.extract_price(
            url="https://example.com/product",
            selector=".price"
        )
        
        # Verify the error is handled appropriately
        assert result is None or result.get("error") is not None 