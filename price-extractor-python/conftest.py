"""
Pytest configuration file for price extraction tests.
Sets up common fixtures and test configuration.
"""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, AsyncMock

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client for testing Claude integration."""
    client = Mock()
    
    # Mock successful JSON response
    mock_response = Mock()
    mock_response.content = [Mock()]
    mock_response.content[0].text = '{"price": "1599.99", "selector": ".product-price"}'
    client.messages.create.return_value = mock_response
    
    return client


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for database testing."""
    client = Mock()
    
    # Mock table operations
    table_mock = Mock()
    table_mock.select.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.single.return_value = table_mock
    table_mock.execute.return_value = Mock(data={'id': 'test-machine'})
    
    client.table.return_value = table_mock
    
    return client


@pytest.fixture
def sample_html_pages():
    """Collection of sample HTML pages for testing different scenarios."""
    return {
        'simple_price': '''
            <html>
                <body>
                    <div class="price">$1,299.99</div>
                </body>
            </html>
        ''',
        
        'commarker_style': '''
            <html>
                <body>
                    <div class="product-summary">
                        <div class="price">
                            <span class="woocommerce-Price-amount">$4,589.00</span>
                        </div>
                    </div>
                </body>
            </html>
        ''',
        
        'json_ld_price': '''
            <html>
                <head>
                    <script type="application/ld+json">
                    {
                        "@type": "Product",
                        "offers": {
                            "price": "2599.99",
                            "priceCurrency": "USD"
                        }
                    }
                    </script>
                </head>
                <body>
                    <div>Product page</div>
                </body>
            </html>
        ''',
        
        'multiple_prices': '''
            <html>
                <body>
                    <div class="old-price">$2,999.99</div>
                    <div class="current-price">$2,599.99</div>
                    <div class="addon-price">$199.99</div>
                </body>
            </html>
        ''',
        
        'no_price': '''
            <html>
                <body>
                    <div>Product information without price</div>
                </body>
            </html>
        '''
    }


@pytest.fixture
def sample_machine_data():
    """Sample machine data for testing."""
    return {
        'basic_machine': {
            'id': 'test-machine-1',
            'Machine Name': 'Test Laser Cutter',
            'Price': 2000.0,
            'product_link': 'https://example.com/product',
            'learned_selectors': {}
        },
        
        'machine_with_learned_selectors': {
            'id': 'test-machine-2',
            'Machine Name': 'ComMarker B4',
            'Price': 4500.0,
            'product_link': 'https://commarker.com/products/b4',
            'learned_selectors': {
                'commarker.com': {
                    'selector': '.product-summary .price .woocommerce-Price-amount',
                    'last_success': '2025-07-02T10:00:00',
                    'confidence': 1.0,
                    'price_found': 4589.0
                }
            }
        }
    }


# Test configuration
pytest_plugins = []

# Async test configuration
def pytest_configure(config):
    """Configure pytest for async testing."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )