import pytest
import json
import os
from unittest.mock import Mock, patch
from vcr import VCR

# Add the project root to the Python path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services import StaticParser, PriceValidator, Config

# Configure VCR for recording HTTP interactions
vcr = VCR(
    cassette_library_dir='tests/sample_sets/cassettes',
    record_mode='once',
    match_on=['uri', 'method'],
)

@pytest.fixture
def config():
    return Config({
        "extraction": {
            "min_confidence": 0.8,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        }
    })

@pytest.mark.sample_sets
@pytest.mark.asyncio  # Add asyncio marker to the entire class
class TestExtractionScenarios:
    """Tests for different real-world extraction scenarios."""

    @pytest.fixture(autouse=True)
    def setup(self, config):
        self.static_parser = StaticParser(config)
        self.price_validator = PriceValidator(config)

    @pytest.mark.asyncio
    @vcr.use_cassette()
    async def test_structured_data_extraction(self):
        """Test extraction from a page with structured JSON-LD data."""
        url = "https://example.com/product-with-json-ld"
        
        # Sample response with JSON-LD
        mock_response = """
        <html>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Professional Laser Cutter",
            "offers": {
                "@type": "Offer",
                "price": "2999.99",
                "priceCurrency": "USD"
            }
        }
        </script>
        </html>
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                text=mock_response
            )
            
            result = await self.static_parser.extract_price(url)
            assert result["price"] == 2999.99
            assert result["currency"] == "USD"
            assert result["tier"] == "STATIC"

    @pytest.mark.asyncio
    @vcr.use_cassette()
    async def test_microdata_extraction(self):
        """Test extraction from a page with microdata format."""
        url = "https://example.com/product-with-microdata"
        
        # Sample response with microdata
        mock_response = """
        <html>
        <div itemscope itemtype="https://schema.org/Product">
            <span itemprop="name">Industrial Laser System</span>
            <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
                <meta itemprop="price" content="5499.99">
                <meta itemprop="priceCurrency" content="USD">
            </div>
        </div>
        </html>
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                text=mock_response
            )
            
            result = await self.static_parser.extract_price(url)
            assert result["price"] == 5499.99
            assert result["currency"] == "USD"
            assert result["tier"] == "STATIC"

    @pytest.mark.asyncio
    @vcr.use_cassette()
    async def test_regex_extraction(self):
        """Test extraction using regex patterns for common price formats."""
        url = "https://example.com/product-with-simple-price"
        
        # Sample response with simple price format
        mock_response = """
        <html>
        <div class="product-price">
            Price: $1,299.99
        </div>
        </html>
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                text=mock_response
            )
            
            result = await self.static_parser.extract_price(url)
            assert result["price"] == 1299.99
            assert result["currency"] == "USD"
            assert result["tier"] == "STATIC"

    @pytest.mark.asyncio
    @vcr.use_cassette()
    async def test_multiple_price_variants(self):
        """Test extraction when multiple price variants are present."""
        url = "https://example.com/product-with-variants"
        
        # Sample response with multiple variants
        mock_response = """
        <html>
        <div class="product-variants">
            <div class="variant" data-power="40W">
                <span class="price">$999.99</span>
            </div>
            <div class="variant" data-power="60W">
                <span class="price">$1,499.99</span>
            </div>
            <div class="variant" data-power="100W">
                <span class="price">$2,499.99</span>
            </div>
        </div>
        </html>
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(
                status_code=200,
                text=mock_response
            )
            
            # Test extraction for 60W variant
            result = await self.static_parser.extract_price(
                url,
                variant_attribute="60W"
            )
            assert result["price"] == 1499.99
            assert result["currency"] == "USD"
            assert result["tier"] == "STATIC"

    @pytest.mark.asyncio
    @vcr.use_cassette()
    async def test_international_price_format(self):
        """Test extraction with international price formats."""
        url = "https://example.com/product-international"
        
        # Sample response with European price format
        mock_response = """
        <html>
        <div itemscope itemtype="https://schema.org/Product">
            <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
                <meta itemprop="price" content="1999.99">
                <meta itemprop="priceCurrency" content="EUR">
            </div>
        </div>
        </html>
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response_obj = Mock()
            mock_response_obj.status_code = 200
            mock_response_obj.text = mock_response
            mock_get.return_value = mock_response_obj
            
            result = await self.static_parser.extract_price(url)
            assert result["price"] == 1999.99
            assert result["currency"] == "EUR"
            assert result["tier"] == "STATIC"

    @pytest.mark.asyncio
    @vcr.use_cassette()
    async def test_dynamic_price_element(self):
        """Test extraction when price is loaded dynamically."""
        url = "https://example.com/product-dynamic-price"
        
        # Sample response with dynamic price element that will be detectable
        mock_response = """
        <html>
        <div id="price-container">
            <span class="price">$3,999.99</span>
            <meta property="og:price:amount" content="3999.99">
            <meta property="og:price:currency" content="USD">
        </div>
        </html>
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_response_obj = Mock()
            mock_response_obj.status_code = 200
            mock_response_obj.text = mock_response
            mock_get.return_value = mock_response_obj
            
            result = await self.static_parser.extract_price(url)
            assert result is not None
            assert result["price"] == 3999.99
            assert result["currency"] == "USD"
            assert result["tier"] == "STATIC" 