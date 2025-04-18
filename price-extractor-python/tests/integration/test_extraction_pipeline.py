import pytest
from unittest.mock import Mock, patch
import json
from datetime import datetime, timezone
import sys
import os
import httpx

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services import StaticParser, PriceValidator, Database, Config

@pytest.fixture
def mock_config():
    return {
        "extraction": {
            "min_confidence": 0.8,
            "price_change_threshold": 0.5,
            "retry_attempts": 3
        },
        "database": {
            "connection_string": "mock_connection"
        }
    }

@pytest.fixture
def mock_machine_data():
    return {
        "machine_id": "test-machine-1",
        "variant_attribute": "60W",
        "url": "https://example.com/laser-60w",
        "last_price": 1000.00,
        "currency": "USD"
    }

@pytest.mark.integration
@pytest.mark.asyncio  # Add asyncio marker to the entire class
class TestExtractionPipeline:
    """Integration tests for the complete extraction pipeline."""
    
    @pytest.fixture(autouse=True)
    def setup(self, mock_config, mock_machine_data):
        """Setup test environment before each test."""
        self.config = Config(mock_config)
        self.static_parser = StaticParser(self.config)
        self.price_validator = PriceValidator(self.config)
        self.db = Database(self.config)
        self.machine_data = mock_machine_data

    @pytest.mark.asyncio
    async def test_basic_extraction_flow(self):
        """Test the basic extraction pipeline from static parse through validation."""
        
        # Mock HTTP response with structured data
        mock_html_content = """
        {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Test Laser 60W",
            "offers": {
                "@type": "Offer",
                "price": "1050.00",
                "priceCurrency": "USD"
            }
        }
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Create a proper response mock with text attribute
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = mock_html_content
            mock_get.return_value = mock_response
            
            # Step 1: Static Parse
            extraction_result = await self.static_parser.extract_price(
                self.machine_data["url"]
            )
            
            assert extraction_result is not None
            assert extraction_result["price"] == 1050.00
            assert extraction_result["currency"] == "USD"
            assert extraction_result["confidence"] >= self.config.min_confidence
            assert extraction_result["tier"] == "STATIC"

            # Step 2: Validation
            validation_result = await self.price_validator.validate_price(
                extraction_result,
                self.machine_data
            )
            
            assert validation_result["is_valid"] is True
            assert validation_result["confidence"] >= self.config.min_confidence
            
            # Step 3: Database Write
            with patch.object(self.db, 'write_price_history') as mock_write_history:
                with patch.object(self.db, 'update_latest_price') as mock_update_latest:
                    await self.db.save_price(
                        machine_id=self.machine_data["machine_id"],
                        variant_attribute=self.machine_data["variant_attribute"],
                        price=extraction_result["price"],
                        currency=extraction_result["currency"],
                        tier=extraction_result["tier"],
                        extraction_confidence=extraction_result["confidence"],
                        validation_confidence=validation_result["confidence"]
                    )
                    
                    mock_write_history.assert_called_once()
                    mock_update_latest.assert_called_once()

    @pytest.mark.asyncio
    async def test_extraction_with_price_change_threshold(self):
        """Test extraction when price change exceeds threshold."""
        
        # Mock a significant price change
        mock_html_content = """
        {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Test Laser 60W",
            "offers": {
                "@type": "Offer",
                "price": "2000.00",
                "priceCurrency": "USD"
            }
        }
        """
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Create a proper response mock with text attribute
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.text = mock_html_content
            mock_get.return_value = mock_response
            
            # Extract price
            extraction_result = await self.static_parser.extract_price(
                self.machine_data["url"]
            )
            
            # Validate price - should flag for review due to large change
            validation_result = await self.price_validator.validate_price(
                extraction_result,
                self.machine_data
            )
            
            assert validation_result["is_valid"] is False
            assert validation_result["requires_review"] is True
            assert "price_change_threshold_exceeded" in validation_result["failure_reason"]

    @pytest.mark.asyncio
    async def test_extraction_retry_logic(self):
        """Test retry logic for failed extractions."""
        
        with patch('httpx.AsyncClient.get') as mock_get:
            # Simulate first two failures and then success
            # Instead of using Mock objects for failures, use actual exceptions
            mock_get.side_effect = [
                httpx.HTTPStatusError(message="Server error", request=None, response=Mock(status_code=500)),
                httpx.HTTPStatusError(message="Server error", request=None, response=Mock(status_code=500)),
                Mock(status_code=200, text='{"@type": "Product", "offers": {"price": "1050.00", "priceCurrency": "USD"}}')
            ]
            
            extraction_result = await self.static_parser.extract_price(
                self.machine_data["url"]
            )
            
            assert extraction_result is not None
            assert extraction_result["price"] == 1050.00
            assert mock_get.call_count == 3  # Verify retry attempts 