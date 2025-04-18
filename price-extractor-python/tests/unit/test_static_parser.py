import pytest
from decimal import Decimal
from unittest.mock import patch, Mock
from services.static_parser import StaticParser
from services.config import Config

@pytest.fixture
def mock_config():
    return Config({
        "extraction": {
            "min_confidence": 0.8,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        }
    })

@pytest.mark.unit
class TestStaticParser:
    @pytest.mark.asyncio
    async def test_extract_price_from_json_ld(self, mock_config):
        """Test extraction from JSON-LD data."""
        parser = StaticParser(mock_config)
        
        json_ld_html = """
        <html>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Test Laser Cutter",
            "offers": {
                "@type": "Offer",
                "price": "1999.99",
                "priceCurrency": "USD"
            }
        }
        </script>
        </html>
        """
        
        result = await parser._extract_from_json_ld(json_ld_html)
        assert result is not None
        assert result["price"] == "1999.99"
        assert result["currency"] == "USD"

    @pytest.mark.asyncio
    async def test_extract_price_from_microdata(self, mock_config):
        """Test extraction from microdata."""
        parser = StaticParser(mock_config)
        
        microdata_html = """
        <html>
        <div itemscope itemtype="http://schema.org/Product">
            <span itemprop="name">Test Product</span>
            <div itemprop="offers" itemscope itemtype="http://schema.org/Offer">
                <meta itemprop="price" content="999.99">
                <meta itemprop="priceCurrency" content="USD">
            </div>
        </div>
        </html>
        """
        
        result = await parser._extract_from_microdata(microdata_html)
        assert result is not None
        assert result["price"] == "999.99"
        assert result["currency"] == "USD"

    @pytest.mark.asyncio
    async def test_extract_from_regex(self, mock_config):
        """Test extraction using regex patterns."""
        parser = StaticParser(mock_config)
        
        html = """
        <html>
        <div class="product-price">$2,499.99</div>
        </html>
        """
        
        result = await parser._extract_from_regex(html)
        assert result is not None
        assert result["price"] == "2499.99"
        assert result["currency"] == "USD"

    @pytest.mark.asyncio
    async def test_mock_successful_extraction(self, mock_config):
        """Test a full extraction with mocked responses."""
        parser = StaticParser(mock_config)
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Create a proper mock response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = """
            <html>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": "Test Laser Cutter",
                "offers": {
                    "@type": "Offer",
                    "price": "1999.99",
                    "priceCurrency": "USD"
                }
            }
            </script>
            </html>
            """
            mock_get.return_value = mock_response
            
            result = await parser.extract_price("https://example.com/test")
            assert result is not None
            assert result["price"] == 1999.99
            assert result["currency"] == "USD"
            assert result["tier"] == "STATIC"
            assert result["confidence"] >= 0.8 