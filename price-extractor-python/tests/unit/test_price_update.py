import pytest
import asyncio
from decimal import Decimal
from unittest.mock import MagicMock, patch, AsyncMock
import os
import sys
import uuid
from datetime import datetime, timezone

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from services.database_service import DatabaseService
from services.price_service import PriceService
from services.extraction_service import ExtractionService


@pytest.fixture
def mock_db_service():
    """Mock database service for testing."""
    db_service = AsyncMock(spec=DatabaseService)
    
    # Mock the add_price_history method
    db_service.add_price_history.return_value = str(uuid.uuid4())
    
    # Mock the update_machines_latest method
    db_service.update_machines_latest.return_value = True
    
    # Return default stub for get_machine_by_id
    db_service.get_machine_by_id.return_value = {
        "id": "test-machine-1",
        "Machine Name": "Test Laser",
        "Company": "Test Brand",
        "Price": 1999.99,
        "product_link": "https://example.com/test-product"
    }
    
    return db_service


@pytest.fixture
def mock_extraction_service():
    """Mock extraction service for testing."""
    extraction_service = AsyncMock(spec=ExtractionService)
    
    # Mock extract_price method
    extraction_service.extract_price.return_value = {
        "success": True,
        "price": Decimal("1999.99"),
        "method": "STATIC_STRUCTURED_DATA:$.offers.price",
        "extracted_confidence": 0.95,
        "validation_confidence": 0.90,
        "raw_price_text": "$1,999.99",
        "cleaned_price_string": "1999.99",
        "dom_elements_analyzed": 150,
        "price_location_in_dom": "div.product-price",
        "structured_data_type": "JSON-LD",
        "selectors_tried": [".price", ".product-price", "[data-price]"],
        "extraction_duration_seconds": 1.5
    }
    
    return extraction_service


@pytest.mark.asyncio
async def test_price_history_field_population(mock_db_service):
    """Test that all fields in price_history are populated correctly when updating price."""
    
    # Create a PriceService instance with mocked dependencies
    price_service = PriceService()
    price_service.db_service = mock_db_service
    
    # Execute the save_machine_price method
    result = await price_service.save_machine_price(
        machine_id="test-machine-1",
        new_price=Decimal("2499.99"),
        html_content="<html><body><div class='price'>$2,499.99</div></body></html>"
    )
    
    # Verify the add_price_history was called with expected parameters
    mock_db_service.add_price_history.assert_called_once()
    
    # Get the call arguments
    call_args = mock_db_service.add_price_history.call_args[1]
    
    # Verify required fields were set
    assert call_args["machine_id"] == "test-machine-1"
    assert call_args["new_price"] == Decimal("2499.99")
    assert call_args["old_price"] == 1999.99
    assert call_args["success"] is True
    
    # Verify method was set
    assert call_args.get("tier") is not None
    
    # The test passes if add_price_history was called with proper arguments


@pytest.mark.asyncio
async def test_update_machine_price_with_detailed_extraction_data(mock_db_service, mock_extraction_service):
    """Test updating a machine price with detailed extraction data."""
    
    # Create a PriceService instance with mocked dependencies
    price_service = PriceService()
    price_service.db_service = mock_db_service
    price_service.extraction_service = mock_extraction_service
    
    # Execute the update_machine_price method
    result = await price_service.update_machine_price("test-machine-1")
    
    # Verify update was successful
    assert result["success"] is True
    
    # Verify add_price_history was called
    mock_db_service.add_price_history.assert_called_once()
    
    # Get the call arguments
    call_args = mock_db_service.add_price_history.call_args[1]
    
    # Check for detailed extraction fields
    assert "dom_elements_analyzed" in call_args
    assert "price_location_in_dom" in call_args
    assert "structured_data_type" in call_args
    assert "extraction_method" in call_args
    assert "raw_price_text" in call_args
    assert "cleaned_price_string" in call_args
    assert "selectors_tried" in call_args
    assert "extraction_duration_seconds" in call_args


@pytest.mark.asyncio
async def test_price_change_review_flagging(mock_db_service, mock_extraction_service):
    """Test that significant price changes are properly flagged for review."""
    
    # Create a PriceService instance with mocked dependencies
    price_service = PriceService()
    price_service.db_service = mock_db_service
    price_service.extraction_service = mock_extraction_service
    
    # Set a significant price change (50% increase)
    old_price = Decimal("1999.99")
    new_price = Decimal("2999.99")
    
    # Update the mock to return a larger price
    mock_extraction_service.extract_price.return_value.update({
        "price": new_price,
        "validation_confidence": 0.85  # Lower confidence due to large change
    })
    
    # Get previous price from mock
    mock_db_service.get_machine_by_id.return_value["Price"] = float(old_price)
    
    # Set sanity_check_threshold to 25%
    price_service.sanity_check_threshold = 25
    
    # Execute the update_machine_price method with flags_for_review=True
    result = await price_service.update_machine_price(
        machine_id="test-machine-1",
        flags_for_review=True
    )
    
    # Verify update was successful
    assert result["success"] is True
    
    # Verify add_price_history was called with needs_review=True
    call_args = mock_db_service.add_price_history.call_args[1]
    assert call_args.get("needs_review") is True
    assert "price change" in call_args.get("review_reason", "").lower() 