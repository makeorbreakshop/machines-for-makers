import pytest
import asyncio
from decimal import Decimal
from unittest.mock import MagicMock, patch, AsyncMock
from bs4 import BeautifulSoup
from services.extraction_service import ExtractionService
from services.database_service import DatabaseService
from scrapers.web_scraper import WebScraper

@pytest.fixture
def extraction_service():
    return ExtractionService()

@pytest.mark.asyncio
async def test_price_extraction_with_validation_basis():
    # Create mock services
    service = MagicMock()
    service.web_scraper = AsyncMock()
    service.db_service = AsyncMock()
    service.price_validator = AsyncMock()
    service.static_parser = AsyncMock()
    service.slice_parser = AsyncMock()
    service.js_parser = AsyncMock()
    service.full_html_parser = AsyncMock()

    # Mock HTML content and BeautifulSoup
    html_content = "<html><body><div class='price'>$1000</div></body></html>"
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Mock web scraper responses
    service.web_scraper.get_page_content.return_value = (html_content, 200)
    service.web_scraper.parse_html.return_value = soup

    # Mock database responses
    service.db_service.get_previous_price.return_value = Decimal('900.00')
    service.db_service.get_machine_by_id.return_value = {
        "Machine Category": "CNC",
        "Price": "900.00"
    }
    service.db_service.add_price_history.return_value = True
    service.db_service.save_price_extraction_results.return_value = True

    # Mock extraction tier responses
    extracted_price = Decimal('1000.00')
    service._extract_static = AsyncMock(return_value=(extracted_price, "STATIC_PARSER", 0.95, {}))
    service._extract_slice_fast = AsyncMock(return_value=(None, None, 0.0, {}))
    service._extract_slice_balanced = AsyncMock(return_value=(None, None, 0.0, {}))
    service._extract_js = AsyncMock(return_value=(None, None, 0.0, None))
    service._extract_full_html = AsyncMock(return_value=(None, None, 0.0, {}))

    # Mock price validation
    service.price_validator.validate_price = AsyncMock(return_value={
        "is_valid": True,
        "confidence": 0.9,
        "validation_steps": []
    })

    # Test parameters
    machine_id = "test-machine-123"
    variant_attribute = "DEFAULT"
    product_url = "https://example.com/product"

    # Execute the extraction
    result = await service.extract_price(
        machine_id=machine_id,
        variant_attribute=variant_attribute,
        url=product_url,
        dry_run=False,
        save_to_db=True
    )

    # Verify the result
    assert result["success"] is True
    assert result["price"] == extracted_price
    assert result["extraction_method"] == "STATIC_PARSER"
    assert result["extraction_confidence"] >= 0.95
    assert result["validation_confidence"] >= 0.9

    # Verify that save_price_extraction_results was called with the correct previous_price
    service.db_service.save_price_extraction_results.assert_called_once()
    call_kwargs = service.db_service.save_price_extraction_results.call_args[1]
    assert call_kwargs["previous_price"] == Decimal('900.00')

if __name__ == "__main__":
    asyncio.run(test_price_extraction_with_validation_basis()) 