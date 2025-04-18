import pytest
from decimal import Decimal
from unittest.mock import patch, Mock, AsyncMock
import json
import sys
import os

# Ensure the service path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.slice_parser import SliceParser
from services.config import Config

@pytest.fixture
def mock_config():
    return Config({
        "extraction": {
            "min_confidence": 0.8,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        },
        "claude": {
            "api_key": "test_key",
            "haiku_model": "claude-3-haiku-20240307",
            "sonnet_model": "claude-3-sonnet-20240229",
            "max_tokens": 1000,
            "temperature": 0.1
        }
    })

@pytest.mark.unit
class TestSliceBalancedParser:
    
    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_basic_price_extraction_balanced(self, mock_client, mock_config):
        """Test basic price extraction using Claude Sonnet."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "1999.99",
                    "currency": "USD", 
                    "confidence": 0.95,
                    "reasoning": "The price is clearly displayed on the page as $1,999.99 in the main product information section."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
        # Sample HTML with price information
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
        
        # Test the extraction with Sonnet model
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            use_fast_model=False  # Use balanced model (Sonnet)
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 1999.99
        assert result["currency"] == "USD"
        assert result["confidence"] >= 0.9
        assert result["tier"] == "SLICE_BALANCED"

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_ambiguous_price_extraction(self, mock_client, mock_config):
        """Test extraction when prices are ambiguous and require more analysis."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "3499.99",
                    "currency": "USD", 
                    "confidence": 0.89,
                    "reasoning": "After analyzing the page, I determined that $3,499.99 is the current price for the base model, while $4,299.99 is for the premium version."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
        # Sample HTML with ambiguous pricing
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="pricing-table">
                        <div class="model">
                            <h3>Base Model</h3>
                            <div class="price">$3,499.99</div>
                        </div>
                        <div class="model">
                            <h3>Premium Version</h3>
                            <div class="price">$4,299.99</div>
                        </div>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction with Sonnet model
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            use_fast_model=False
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 3499.99
        assert result["currency"] == "USD"
        assert result["confidence"] >= 0.85
        assert result["tier"] == "SLICE_BALANCED"

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_complex_variant_extraction(self, mock_client, mock_config):
        """Test extraction of variant prices from complex HTML."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "5799.99",
                    "currency": "USD", 
                    "confidence": 0.93,
                    "reasoning": "The 100W variant price is $5,799.99 according to the variant selection dropdown and pricing information in the data attributes."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
        # Sample HTML with complex variant pricing
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Industrial Laser Cutter X9000</h1>
                    <div class="product-options">
                        <select id="variant-selector">
                            <option value="40W" data-price="3299.99">40W - $3,299.99</option>
                            <option value="60W" data-price="4499.99">60W - $4,499.99</option>
                            <option value="100W" data-price="5799.99">100W - $5,799.99</option>
                        </select>
                    </div>
                    <div class="price-display">
                        Starting at $3,299.99
                    </div>
                    <script>
                        const variants = {
                            "40W": {"price": 3299.99},
                            "60W": {"price": 4499.99},
                            "100W": {"price": 5799.99}
                        };
                    </script>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction with Sonnet model for 100W variant
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            variant_attribute="100W",
            use_fast_model=False
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 5799.99
        assert result["currency"] == "USD"
        assert result["tier"] == "SLICE_BALANCED"
        assert result["variant_attribute"] == "100W"

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_international_price_formatting(self, mock_client, mock_config):
        """Test handling of international price formats."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "2499.99",
                    "currency": "EUR", 
                    "confidence": 0.91,
                    "reasoning": "The price is displayed as 2.499,99€ in European format which converts to 2499.99 EUR."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
        # Sample HTML with European price format
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="price">2.499,99€</div>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction with Sonnet model
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            use_fast_model=False
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 2499.99
        assert result["currency"] == "EUR"
        assert result["tier"] == "SLICE_BALANCED"

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_fallback_mechanism(self, mock_client, mock_config):
        """Test that SliceParser handles errors and returns appropriate result for fallback."""
        # Set up the mock client to simulate an API error
        mock_session = AsyncMock()
        mock_session.post.side_effect = Exception("API Error")
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
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
        
        # Test the extraction with API error
        result = await parser.extract_price(
            url="https://example.com/fallback-test",
            html_content=html_content,
            use_fast_model=False
        )
        
        # Verify the results indicate an error and support fallback
        assert result is None or result.get("error") is not None 