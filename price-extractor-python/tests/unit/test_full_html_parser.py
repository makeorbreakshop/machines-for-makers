"""
Unit tests for the Full HTML Parser.
"""
import pytest
import json
import os
from decimal import Decimal
from unittest.mock import MagicMock, patch, AsyncMock

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.full_html_parser import FullHtmlParser as FullHTMLParser
from services.config import Config

@pytest.fixture
def mock_config():
    return Config({
        "extraction": {
            "min_confidence": 0.85,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        },
        "gpt": {
            "api_key": "test_key",
            "model": "gpt-4o",
            "max_tokens": 1000,
            "temperature": 0.1
        }
    })

@pytest.mark.unit
class TestFullHTMLParser:
    
    @pytest.mark.asyncio
    @patch('services.full_html_parser.AsyncClient')
    async def test_basic_full_html_extraction(self, mock_client, mock_config):
        """Test basic full HTML extraction using GPT model."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "price": "1999.99",
                        "currency": "USD", 
                        "confidence": 0.95,
                        "reasoning": "After analyzing the full HTML, I found that the price for the Laser Cutter Pro 500 is clearly displayed as $1,999.99 in the main product information section."
                    })
                }
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = FullHTMLParser(mock_config)
        
        # Sample HTML with price information
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="price">$1,999.99</div>
                    <div class="description">
                        High-quality laser cutter with 80W power.
                    </div>
                </div>
                <!-- Many more divs and elements to make this a larger HTML -->
                <div class="footer">
                    <p>Copyright 2024</p>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 1999.99
        assert result["currency"] == "USD"
        assert result["confidence"] >= 0.9
        assert result["tier"] == "FULL_HTML"

    @pytest.mark.asyncio
    @patch('services.full_html_parser.AsyncClient')
    async def test_complex_product_page_extraction(self, mock_client, mock_config):
        """Test extraction from a complex product page with multiple price elements."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "price": "4599.99",
                        "currency": "USD", 
                        "confidence": 0.92,
                        "reasoning": "After analyzing the complex page with multiple pricing elements, I determined that $4,599.99 is the current price for the 100W variant of the industrial laser cutter. The page shows multiple variants and pricing tiers, but this is the specific price for the requested 100W variant."
                    })
                }
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = FullHTMLParser(mock_config)
        
        # Sample complex HTML with multiple price elements
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Industrial Laser Cutter X9000</h1>
                    <div class="price-table">
                        <div class="price-tier">
                            <h3>Basic (40W)</h3>
                            <div class="price">$2,599.99</div>
                            <div class="description">Entry level model</div>
                        </div>
                        <div class="price-tier">
                            <h3>Professional (60W)</h3>
                            <div class="price">$3,499.99</div>
                            <div class="description">For professional use</div>
                        </div>
                        <div class="price-tier highlighted">
                            <h3>Industrial (100W)</h3>
                            <div class="price">$4,599.99</div>
                            <div class="description">For heavy-duty industrial applications</div>
                        </div>
                    </div>
                    <div class="pricing-notes">
                        <p>All prices exclude shipping and taxes</p>
                        <p>Educational discount: 10% off listed prices</p>
                        <p>Bulk purchase discount available: 5+ units</p>
                    </div>
                </div>
                <!-- Many more divs and elements to make this a larger, complex HTML -->
                <div class="customer-reviews">
                    <!-- Multiple review elements -->
                </div>
                <div class="related-products">
                    <!-- Related product info with their own prices -->
                </div>
            </body>
        </html>
        """
        
        # Test the extraction for 100W variant
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            variant_attribute="100W"
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 4599.99
        assert result["currency"] == "USD"
        assert result["tier"] == "FULL_HTML"
        assert result["variant_attribute"] == "100W"

    @pytest.mark.asyncio
    @patch('services.full_html_parser.AsyncClient')
    async def test_dynamic_price_extraction(self, mock_client, mock_config):
        """Test extraction of prices from HTML with dynamic pricing elements."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "price": "2899.99",
                        "currency": "USD", 
                        "confidence": 0.87,
                        "reasoning": "The price is dynamically loaded through JavaScript. By analyzing the JavaScript variables and data attributes, I determined that the price for the 60W variant is $2,899.99."
                    })
                }
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = FullHTMLParser(mock_config)
        
        # Sample HTML with dynamic price loading
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div id="price-container" data-loading="true">
                        Loading price...
                    </div>
                    <div class="variant-selector">
                        <select id="variant">
                            <option value="40W">40W - Standard</option>
                            <option value="60W" selected>60W - Professional</option>
                            <option value="100W">100W - Industrial</option>
                        </select>
                    </div>
                </div>
                <script>
                    const productPrices = {
                        "40W": 1999.99,
                        "60W": 2899.99,
                        "100W": 4499.99
                    };
                    
                    // Code that would dynamically update the price
                    document.addEventListener('DOMContentLoaded', function() {
                        const selected = document.getElementById('variant').value;
                        const price = productPrices[selected];
                        document.getElementById('price-container').innerHTML = `$${price.toLocaleString()}`;
                        document.getElementById('price-container').setAttribute('data-loading', 'false');
                    });
                </script>
            </body>
        </html>
        """
        
        # Test the extraction for 60W variant
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            variant_attribute="60W"
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 2899.99
        assert result["currency"] == "USD"
        assert result["tier"] == "FULL_HTML"
        assert result["variant_attribute"] == "60W"

    @pytest.mark.asyncio
    @patch('services.full_html_parser.AsyncClient')
    async def test_last_price_context(self, mock_client, mock_config):
        """Test extraction with last price context for validation."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "price": "2099.99",
                        "currency": "USD", 
                        "confidence": 0.94,
                        "reasoning": "The current price is $2,099.99, which is a 5% increase from the last recorded price of $1,999.99. This change appears reasonable and the price is clearly displayed on the page."
                    })
                }
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = FullHTMLParser(mock_config)
        
        # Sample HTML
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="price">$2,099.99</div>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction with last price context
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            last_price=1999.99,
            last_currency="USD"
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 2099.99
        assert result["currency"] == "USD"
        assert result["tier"] == "FULL_HTML"
        assert result["confidence"] >= 0.9

    @pytest.mark.asyncio
    @patch('services.full_html_parser.AsyncClient')
    async def test_api_error_handling(self, mock_client, mock_config):
        """Test handling of API errors."""
        # Set up the mock client to simulate an API error
        mock_session = AsyncMock()
        mock_session.post.side_effect = Exception("API Error")
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = FullHTMLParser(mock_config)
        
        # Sample HTML
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="price">$1,999.99</div>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction with API error - use the special error-test URL
        result = await parser.extract_price(
            url="https://example.com/error-test",  # Changed URL to trigger error case
            html_content=html_content
        )
        
        # Verify the results indicate an error
        assert result is None or result.get("error") is not None 