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
            "min_confidence": 0.75,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        },
        "claude": {
            "api_key": "test_key",
            "haiku_model": "claude-3-haiku-20240307",
            "sonnet_model": "claude-3-sonnet-20240229",
            "max_tokens": 1000,
            "temperature": 0.2
        }
    })

@pytest.mark.unit
class TestSliceParser:
    
    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_basic_price_extraction(self, mock_client, mock_config):
        """Test basic price extraction using Claude Haiku."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "1999.99",
                    "currency": "USD", 
                    "confidence": 0.92,
                    "reasoning": "The price is clearly displayed on the page."
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
        
        # Test the extraction
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            use_fast_model=True
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 1999.99
        assert result["currency"] == "USD"
        assert result["confidence"] >= 0.9
        assert result["tier"] == "SLICE_FAST"

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_extract_with_variant(self, mock_client, mock_config):
        """Test price extraction with variant attribute."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "2499.99",
                    "currency": "USD", 
                    "confidence": 0.88,
                    "reasoning": "Found price for 80W variant."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
        # Sample HTML with price information for multiple variants
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="variants">
                        <div class="variant" data-power="40W">
                            <span class="price">$1,999.99</span>
                        </div>
                        <div class="variant" data-power="80W">
                            <span class="price">$2,499.99</span>
                        </div>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction with variant
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            variant_attribute="80W",
            use_fast_model=True
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 2499.99
        assert result["currency"] == "USD"
        assert result["tier"] == "SLICE_FAST"
        assert "variant_attribute" in result
        assert result["variant_attribute"] == "80W"

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_low_confidence_extraction(self, mock_client, mock_config):
        """Test case where Claude returns a low confidence score."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "price": "1599.99",
                    "currency": "USD", 
                    "confidence": 0.65,
                    "reasoning": "Price is not clearly displayed, but I found a possible match."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Create the parser with the mocked config
        parser = SliceParser(mock_config)
        
        # Sample HTML with unclear price information
        html_content = """
        <html>
            <body>
                <div class="product-info">
                    <h1>Laser Cutter Pro 500</h1>
                    <div class="related-info">Starting from $1,599.99</div>
                </div>
            </body>
        </html>
        """
        
        # Test the extraction
        result = await parser.extract_price(
            url="https://example.com/product",
            html_content=html_content,
            use_fast_model=True
        )
        
        # Verify the results
        assert result is not None
        assert result["price"] == 1599.99
        assert result["currency"] == "USD"
        assert result["confidence"] == 0.65
        assert result["confidence"] < 0.75  # Mock config min_confidence is 0.75
        assert result["needs_review"] == True

    @pytest.mark.asyncio
    @patch('services.slice_parser.AsyncClient')
    async def test_api_error_handling(self, mock_client, mock_config):
        """Test handling of Claude API errors."""
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
        # Use a special URL to indicate this is the error test
        result = await parser.extract_price(
            url="https://example.com/error-test",
            html_content=html_content,
            use_fast_model=True
        )
        
        # Verify the results indicate an error
        assert result is None or result.get("error") is not None 