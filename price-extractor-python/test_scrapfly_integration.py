"""
Unit tests for Scrapfly integration
Tests the core functionality without making real API calls
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import os
import sys

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
from services.price_service import PriceService


class TestScrapflyWebScraper:
    """Test the Scrapfly web scraper implementation"""
    
    @pytest.fixture
    def mock_database_service(self):
        """Mock database service for testing"""
        mock_db = Mock()
        mock_db.fetch_query = AsyncMock(return_value=[])
        mock_db.execute_query = AsyncMock(return_value=True)
        return mock_db
    
    @pytest.fixture
    def mock_scrapfly_client(self):
        """Mock Scrapfly client for testing"""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.upstream_status_code = 200
        mock_response.cost = 1
        mock_response.scrape_result = {
            'content': '<html><body>Test HTML</body></html>',
            'url': 'https://example.com'
        }
        mock_client.scrape.return_value = mock_response
        return mock_client
    
    def test_scraper_initialization(self, mock_database_service):
        """Test that scraper initializes correctly"""
        with patch.dict(os.environ, {'SCRAPFLY_API_KEY': 'test-key'}):
            with patch('scrapers.scrapfly_web_scraper.ScrapflyClient') as mock_client_class:
                scraper = ScrapflyWebScraper(api_key='test-key', database_service=mock_database_service)
                assert scraper.api_key == 'test-key'
                assert scraper.db_service == mock_database_service
                mock_client_class.assert_called_once()
    
    def test_scraper_missing_api_key(self, mock_database_service):
        """Test that scraper raises error without API key"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Scrapfly API key not provided"):
                ScrapflyWebScraper(database_service=mock_database_service)
    
    def test_tier_config_generation(self, mock_database_service):
        """Test that tier configurations are generated correctly"""
        with patch.dict(os.environ, {'SCRAPFLY_API_KEY': 'test-key'}):
            with patch('scrapers.scrapfly_web_scraper.ScrapflyClient'):
                scraper = ScrapflyWebScraper(api_key='test-key', database_service=mock_database_service)
                
                # Test Tier 1 config
                config1 = scraper._get_tier_config('https://example.com', 1)
                assert config1.asp == False
                assert config1.render_js == False
                
                # Test Tier 2 config
                config2 = scraper._get_tier_config('https://example.com', 2)
                assert config2.asp == False
                assert config2.render_js == True
                
                # Test Tier 3 config
                config3 = scraper._get_tier_config('https://example.com', 3)
                assert config3.asp == True
                assert config3.render_js == True
    
    def test_domain_extraction(self, mock_database_service):
        """Test domain extraction from URLs"""
        with patch.dict(os.environ, {'SCRAPFLY_API_KEY': 'test-key'}):
            with patch('scrapers.scrapfly_web_scraper.ScrapflyClient'):
                scraper = ScrapflyWebScraper(api_key='test-key', database_service=mock_database_service)
                
                assert scraper._extract_domain('https://www.example.com/path') == 'example.com'
                assert scraper._extract_domain('https://subdomain.example.com') == 'subdomain.example.com'
                assert scraper._extract_domain('http://example.com') == 'example.com'
    
    @pytest.mark.asyncio
    async def test_get_optimal_tier_new_domain(self, mock_database_service):
        """Test optimal tier selection for new domains"""
        mock_database_service.fetch_query.return_value = []  # No history
        
        with patch.dict(os.environ, {'SCRAPFLY_API_KEY': 'test-key'}):
            with patch('scrapers.scrapfly_web_scraper.ScrapflyClient'):
                scraper = ScrapflyWebScraper(api_key='test-key', database_service=mock_database_service)
                
                tier = await scraper._get_optimal_tier('newdomain.com')
                assert tier == 1  # Should start with Tier 1 for new domains
    
    @pytest.mark.asyncio
    async def test_get_optimal_tier_learned_domain(self, mock_database_service):
        """Test optimal tier selection for domains with history"""
        # Mock history showing Tier 2 works with 5 successes
        mock_database_service.fetch_query.return_value = [{
            'successful_tier': 2,
            'success_count': 5,
            'last_success_at': '2024-01-01T00:00:00Z'
        }]
        
        with patch.dict(os.environ, {'SCRAPFLY_API_KEY': 'test-key'}):
            with patch('scrapers.scrapfly_web_scraper.ScrapflyClient'):
                scraper = ScrapflyWebScraper(api_key='test-key', database_service=mock_database_service)
                
                tier = await scraper._get_optimal_tier('learneddomain.com')
                assert tier == 2  # Should start with learned tier


class TestPriceServiceIntegration:
    """Test PriceService integration with Scrapfly"""
    
    @pytest.fixture
    def mock_price_service(self):
        """Mock price service for testing"""
        with patch('services.price_service.get_hybrid_scraper'), \
             patch('services.price_service.DatabaseService'), \
             patch('services.price_service.PriceExtractor'), \
             patch('services.price_service.ScrapflyWebScraper'):
            service = PriceService()
            service.db_service = Mock()
            return service
    
    def test_scrapfly_scraper_initialization(self, mock_price_service):
        """Test that Scrapfly scraper is initialized on demand"""
        with patch('services.price_service.ScrapflyWebScraper') as mock_scraper_class:
            mock_instance = Mock()
            mock_scraper_class.return_value = mock_instance
            
            scraper = mock_price_service._get_scrapfly_scraper()
            assert scraper == mock_instance
            mock_scraper_class.assert_called_once_with(database_service=mock_price_service.db_service)
    
    def test_scrapfly_scraper_singleton(self, mock_price_service):
        """Test that Scrapfly scraper is singleton"""
        with patch('services.price_service.ScrapflyWebScraper') as mock_scraper_class:
            mock_instance = Mock()
            mock_scraper_class.return_value = mock_instance
            
            scraper1 = mock_price_service._get_scrapfly_scraper()
            scraper2 = mock_price_service._get_scrapfly_scraper()
            
            assert scraper1 == scraper2
            mock_scraper_class.assert_called_once()  # Should only be called once


class TestDatabaseIntegration:
    """Test database schema and operations"""
    
    def test_batch_creation_with_pipeline(self):
        """Test that batch creation includes extraction pipeline"""
        from services.database import DatabaseService
        
        with patch('services.database.create_client') as mock_create_client:
            mock_supabase = Mock()
            mock_create_client.return_value = mock_supabase
            
            # Mock successful batch creation
            mock_response = Mock()
            mock_response.data = [{'id': 'test-batch-id'}]
            mock_supabase.table.return_value.insert.return_value.execute.return_value = mock_response
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
            
            db_service = DatabaseService()
            
            # Test standard pipeline
            asyncio.run(db_service.create_batch(
                count=5,
                days_threshold=7,
                extraction_pipeline='standard'
            ))
            
            # Verify the insert was called with correct pipeline
            insert_call = mock_supabase.table.return_value.insert.call_args[0][0]
            assert insert_call['extraction_pipeline'] == 'standard'
            
            # Test scrapfly pipeline  
            asyncio.run(db_service.create_batch(
                count=5,
                days_threshold=7,
                extraction_pipeline='scrapfly'
            ))
            
            # Verify the insert was called with scrapfly pipeline
            insert_call = mock_supabase.table.return_value.insert.call_args[0][0]
            assert insert_call['extraction_pipeline'] == 'scrapfly'


class TestAPIIntegration:
    """Test API endpoint integration"""
    
    def test_batch_update_request_model(self):
        """Test that BatchUpdateRequest includes use_scrapfly parameter"""
        from api.routes import BatchUpdateRequest
        
        # Test default value
        request = BatchUpdateRequest()
        assert request.use_scrapfly == False
        
        # Test explicit value
        request = BatchUpdateRequest(use_scrapfly=True)
        assert request.use_scrapfly == True


def run_basic_integration_test():
    """Run a basic integration test to verify everything is wired up correctly"""
    print("🧪 Running basic integration tests...")
    
    try:
        # Test 1: Import verification
        from scrapers.scrapfly_web_scraper import ScrapflyWebScraper
        from services.price_service import PriceService
        from api.routes import BatchUpdateRequest
        print("✅ All imports successful")
        
        # Test 2: API model includes new parameter
        request = BatchUpdateRequest(use_scrapfly=True)
        assert request.use_scrapfly == True
        print("✅ API model includes use_scrapfly parameter")
        
        # Test 3: Database service method signature
        from services.database import DatabaseService
        import inspect
        sig = inspect.signature(DatabaseService.create_batch)
        assert 'extraction_pipeline' in sig.parameters
        print("✅ Database service includes extraction_pipeline parameter")
        
        print("🎉 Basic integration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {str(e)}")
        return False


if __name__ == "__main__":
    # Run basic integration test
    success = run_basic_integration_test()
    
    # If basic test passes, run pytest if available
    if success:
        try:
            import pytest
            print("\n🧪 Running pytest suite...")
            pytest.main([__file__, "-v"])
        except ImportError:
            print("⚠️ pytest not available, skipping detailed tests")
            print("Install with: pip install pytest pytest-asyncio")