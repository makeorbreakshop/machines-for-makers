import pytest
from typing import Generator
from unittest.mock import MagicMock
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Configure asyncio mode for tests
def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as an asyncio test")

@pytest.fixture
def mock_supabase() -> Generator[MagicMock, None, None]:
    """Mock Supabase client for database operations."""
    mock = MagicMock()
    yield mock

@pytest.fixture
def mock_claude() -> Generator[MagicMock, None, None]:
    """Mock Claude client for AI operations."""
    mock = MagicMock()
    yield mock

@pytest.fixture
def mock_playwright() -> Generator[MagicMock, None, None]:
    """Mock Playwright for browser automation."""
    mock = MagicMock()
    yield mock

@pytest.fixture
def sample_html() -> str:
    """Sample HTML content for testing parsers."""
    return """
    <html>
        <body>
            <div class="price">$1,999.99</div>
            <div class="variant">60W</div>
        </body>
    </html>
    """

@pytest.fixture
def sample_machine_config() -> dict:
    """Sample machine configuration for testing."""
    return {
        "machine_id": "test-machine-1",
        "variant_attribute": "60W",
        "requires_js_interaction": False,
        "min_extraction_confidence": 0.85,
        "min_validation_confidence": 0.90,
        "sanity_check_threshold": 0.25
    } 