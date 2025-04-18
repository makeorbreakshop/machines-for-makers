import pytest
from decimal import Decimal
from unittest.mock import patch, Mock, AsyncMock
import json
import sys
import os

# Ensure the service path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.price_validator import PriceValidator
from services.config import Config

@pytest.fixture
def mock_config():
    return Config({
        "extraction": {
            "min_confidence": 0.75,
            "price_change_threshold": 0.3,  # 30% threshold
            "retry_attempts": 3
        },
        "validation": {
            "min_price": 100.0,
            "max_price": 20000.0,
            "suspicious_change_threshold": 0.5,  # 50% change is suspicious
            "currency_validation": ["USD", "EUR", "GBP", "CAD", "AUD"]
        }
    })

@pytest.fixture
def validator(mock_config):
    return PriceValidator(mock_config)

@pytest.mark.unit
class TestPriceValidator:
    
    def test_validate_price_format(self, validator):
        """Test validation of price format."""
        # Valid price
        assert validator.validate_price_format("1999.99") is True
        
        # Invalid prices
        assert validator.validate_price_format("abc") is False
        assert validator.validate_price_format("-100") is False
        assert validator.validate_price_format("0") is False
        
    def test_validate_currency(self, validator):
        """Test validation of currency codes."""
        # Valid currencies
        assert validator.validate_currency("USD") is True
        assert validator.validate_currency("EUR") is True
        
        # Invalid currencies
        assert validator.validate_currency("INVALID") is False
        assert validator.validate_currency("") is False
        
    def test_validate_price_range(self, validator):
        """Test validation of price ranges."""
        # Valid price range
        assert validator.validate_price_range(500.0) is True
        assert validator.validate_price_range(15000.0) is True
        
        # Invalid price range
        assert validator.validate_price_range(50.0) is False  # Below min
        assert validator.validate_price_range(25000.0) is False  # Above max
        
    def test_calculate_confidence_score(self, validator):
        """Test calculation of confidence scores."""
        # High confidence case - good data, small price change
        high_score = validator.calculate_confidence_score({
            "price": 1999.99,
            "currency": "USD",
            "extraction_confidence": 0.9,
            "last_price": 1899.99,  # 5.26% change
            "last_currency": "USD"
        })
        assert high_score >= 0.85
        
        # Medium confidence case - good data, larger price change
        medium_score = validator.calculate_confidence_score({
            "price": 1999.99,
            "currency": "USD",
            "extraction_confidence": 0.85,
            "last_price": 1599.99,  # 25% change
            "last_currency": "USD"
        })
        assert 0.7 <= medium_score < 0.85
        
        # Low confidence case - suspicious price change
        low_score = validator.calculate_confidence_score({
            "price": 3999.99,
            "currency": "USD",
            "extraction_confidence": 0.8,
            "last_price": 1999.99,  # 100% change
            "last_currency": "USD"
        })
        assert low_score < 0.7
        
        # Very low confidence case - currency change
        very_low_score = validator.calculate_confidence_score({
            "price": 1999.99,
            "currency": "EUR",
            "extraction_confidence": 0.8,
            "last_price": 1999.99,
            "last_currency": "USD"  # Currency change is suspicious
        })
        assert very_low_score < 0.6
        
    def test_validate_price_change(self, validator):
        """Test validation of price changes against thresholds."""
        # Valid price change (within threshold)
        assert validator.validate_price_change(1999.99, 1899.99) is True  # ~5.26% change
        assert validator.validate_price_change(1999.99, 1599.99) is True  # 25% change
        
        # Invalid price change (exceeds threshold)
        assert validator.validate_price_change(1999.99, 1399.99) is False  # ~42.86% change
        assert validator.validate_price_change(999.99, 1999.99) is False  # 50% decrease
        
    def test_validate_extraction_result(self, validator):
        """Test full validation of extraction results."""
        # Valid extraction result
        valid_result = {
            "price": 1999.99,
            "currency": "USD",
            "extraction_confidence": 0.9,
            "tier": "STATIC"
        }
        validated = validator.validate(valid_result)
        assert validated["is_valid"] is True
        assert validated["confidence"] >= 0.8
        assert validated["needs_review"] is False
        
        # Valid but with last price for comparison
        valid_with_history = {
            "price": 2099.99,
            "currency": "USD",
            "extraction_confidence": 0.9,
            "tier": "STATIC",
            "last_price": 1999.99,
            "last_currency": "USD"
        }
        validated = validator.validate(valid_with_history)
        assert validated["is_valid"] is True
        assert validated["confidence"] >= 0.8
        assert validated["needs_review"] is False
        
        # Invalid price format
        invalid_price_format = {
            "price": "invalid",
            "currency": "USD",
            "extraction_confidence": 0.9,
            "tier": "STATIC"
        }
        validated = validator.validate(invalid_price_format)
        assert validated["is_valid"] is False
        assert "Invalid price format" in validated["failure_reason"]
        
        # Invalid currency
        invalid_currency = {
            "price": 1999.99,
            "currency": "XYZ",
            "extraction_confidence": 0.9,
            "tier": "STATIC"
        }
        validated = validator.validate(invalid_currency)
        assert validated["is_valid"] is False
        assert "Invalid currency" in validated["failure_reason"]
        
        # Price out of range
        out_of_range = {
            "price": 50.0,
            "currency": "USD",
            "extraction_confidence": 0.9,
            "tier": "STATIC"
        }
        validated = validator.validate(out_of_range)
        assert validated["is_valid"] is False
        assert "Price out of expected range" in validated["failure_reason"]
        
        # Suspicious price change (needs review)
        suspicious_change = {
            "price": 3999.99,
            "currency": "USD",
            "extraction_confidence": 0.9,
            "tier": "STATIC",
            "last_price": 1999.99,
            "last_currency": "USD"
        }
        validated = validator.validate(suspicious_change)
        assert validated["is_valid"] is True  # Still valid but needs review
        assert validated["needs_review"] is True
        assert "Suspicious price change" in validated["review_reason"]
        
        # Currency change (needs review)
        currency_change = {
            "price": 1999.99,
            "currency": "EUR",
            "extraction_confidence": 0.9,
            "tier": "STATIC",
            "last_price": 1999.99,
            "last_currency": "USD"
        }
        validated = validator.validate(currency_change)
        assert validated["is_valid"] is True  # Still valid but needs review
        assert validated["needs_review"] is True
        assert "Currency change" in validated["review_reason"]
        
    @pytest.mark.asyncio
    @patch('services.price_validator.AsyncClient')
    async def test_llm_validation(self, mock_client, validator):
        """Test validation using LLM for confidence scoring."""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "is_valid": True,
                    "confidence": 0.92,
                    "reasoning": "The price change from $1,999.99 to $2,199.99 represents a 10% increase, which is reasonable for a product refresh or annual price adjustment."
                })
            }]
        }
        
        # Set up the mock client
        mock_session = AsyncMock()
        mock_session.post.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_session
        
        # Sample extraction result
        result = {
            "price": 2199.99,
            "currency": "USD",
            "extraction_confidence": 0.9,
            "tier": "SLICE_FAST",
            "last_price": 1999.99,
            "last_currency": "USD"
        }
        
        # Test LLM validation
        with patch.object(validator, 'use_llm_validation', return_value=True):
            validated = await validator.validate_with_llm(result)
            
            # Verify the results
            assert validated["is_valid"] is True
            assert validated["confidence"] >= 0.9
            assert validated["validation_source"] == "LLM" 