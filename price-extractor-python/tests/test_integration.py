"""
Integration tests for the discovery system
Tests the complete flow from crawling to normalization
"""
import pytest
import asyncio
import sys
import os
from unittest.mock import Mock, patch

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.discovery_service import DiscoveryService, DiscoveryRequest
from crawlers.site_crawler import SiteCrawler, CrawlConfig


class TestDiscoveryIntegration:
    """Integration tests for the discovery system"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.discovery_service = DiscoveryService()
    
    @pytest.mark.asyncio
    async def test_discovery_request_validation(self):
        """Test discovery request validation"""
        # Valid request
        valid_request = DiscoveryRequest(
            scan_log_id="test-scan-123",
            site_id="test-site-123",
            base_url="https://example.com",
            sitemap_url="https://example.com/sitemap.xml",
            scraping_config={"crawl_delay": 2.0},
            scan_type="discovery"
        )
        
        assert valid_request.base_url == "https://example.com"
        assert valid_request.crawl_delay == 2.0
    
    @pytest.mark.asyncio
    async def test_url_discovery_mock(self):
        """Test URL discovery with mocked responses"""
        config = CrawlConfig(
            crawl_delay=1.0,
            user_agent="TestBot/1.0",
            product_url_patterns=['/products/*'],
            max_pages=10
        )
        
        # Mock the crawler to return test URLs
        with patch.object(SiteCrawler, 'discover_product_urls') as mock_discover:
            mock_discover.return_value = ([
                "https://example.com/products/laser-1",
                "https://example.com/products/printer-2"
            ], {"pages_crawled": 2, "products_found": 2})
            
            async with SiteCrawler("https://example.com", config) as crawler:
                urls, stats = await crawler.discover_product_urls()
                
                assert len(urls) == 2
                assert "laser-1" in urls[0]
                assert stats["products_found"] == 2
    
    @pytest.mark.asyncio
    async def test_product_extraction_mock(self):
        """Test product data extraction with mocked scraper"""
        test_url = "https://example.com/products/test-laser"
        
        # Mock the dynamic scraper
        with patch.object(self.discovery_service, 'dynamic_scraper') as mock_scraper:
            # Create mock scraper instance
            mock_instance = Mock()
            mock_instance.extract_full_product_data.return_value = {
                "name": "Test Laser Engraver",
                "price": 1299.99,
                "brand": "TestBrand",
                "power": "40W",
                "working_area": "400x300mm",
                "description": "A test laser engraver for testing"
            }
            mock_scraper.return_value = mock_instance
            
            # Mock cost tracker
            with patch.object(self.discovery_service.cost_tracker, 'check_budget_limits') as mock_budget:
                mock_budget.return_value = {"within_budget": True}
                
                with patch.object(self.discovery_service.cost_tracker, 'track_discovery_cost') as mock_cost:
                    mock_cost.return_value = 0.05
                    
                    # Test extraction
                    result = await self.discovery_service._extract_product_data(test_url)
                    
                    assert result["success"] == True
                    assert result["data"]["name"] == "Test Laser Engraver"
                    assert result["data"]["price"] == 1299.99
                    assert result["cost"] == 0.05
    
    @pytest.mark.asyncio
    async def test_normalization_integration(self):
        """Test integration between extraction and normalization"""
        raw_data = {
            "name": "ComMarker B4 MOPA 100W",
            "price": "$6,666.00",
            "power": "100W",
            "laser_type": "MOPA",
            "working_area": "175x175mm",
            "brand": "commarker",
            "connectivity": "USB, Ethernet",
            "software": "EZCAD2"
        }
        
        # Normalize the data
        normalized, validation = self.discovery_service.normalizer.normalize(raw_data, "laser-cutter")
        
        # Verify normalization results
        assert normalized["Machine Name"] == "ComMarker B4 MOPA 100W"
        assert normalized["Brand"] == "ComMarker"  # Should be corrected
        assert normalized["Laser Power (W)"] == 100.0
        assert normalized["Price ($)"] == 6666.0
        assert validation.is_valid
        
        # Test machine type inference
        inferred_type = self.discovery_service._infer_machine_type(raw_data)
        assert inferred_type == "laser-cutter"
    
    @pytest.mark.asyncio
    async def test_validation_pipeline(self):
        """Test the validation pipeline with different data qualities"""
        # High quality data
        high_quality_data = {
            "name": "Bambu Lab A1 3D Printer",
            "brand": "Bambu Lab",
            "price": "$299",
            "build_volume": "256 x 256 x 256mm",
            "layer_height": "0.08-0.35mm",
            "nozzle_diameter": "0.4mm",
            "print_speed": "500mm/s",
            "connectivity": "WiFi, LAN"
        }
        
        normalized, validation = self.discovery_service.normalizer.normalize(high_quality_data, "3d-printer")
        assert validation.is_valid
        assert len(validation.errors) == 0
        assert len(validation.warnings) <= 1  # May have minor warnings
        
        # Low quality data
        low_quality_data = {
            "name": "Cheap Printer",
            "price": "$50",  # Suspiciously low
            "build_volume": "10x10x10mm"  # Suspiciously small
        }
        
        normalized, validation = self.discovery_service.normalizer.normalize(low_quality_data, "3d-printer")
        assert not validation.is_valid or len(validation.warnings) > 0
        assert any("price" in error.lower() or "price" in warning.lower() 
                  for error in validation.errors 
                  for warning in validation.warnings)
    
    @pytest.mark.asyncio
    async def test_cost_tracking_integration(self):
        """Test cost tracking integration"""
        # Mock cost tracker methods
        with patch.object(self.discovery_service.cost_tracker, 'check_budget_limits') as mock_budget:
            mock_budget.return_value = {"within_budget": True}
            
            with patch.object(self.discovery_service.cost_tracker, 'track_discovery_cost') as mock_track:
                mock_track.return_value = 0.025
                
                with patch.object(self.discovery_service.cost_tracker, 'calculate_cost') as mock_calc:
                    mock_calc.return_value = 0.025
                    
                    # Test cost tracking during extraction
                    test_url = "https://example.com/test-product"
                    
                    # Mock the extraction to fail (to test error cost tracking)
                    result = await self.discovery_service._extract_product_data(test_url)
                    
                    # Verify cost tracking was called
                    mock_track.assert_called()
                    assert "cost" in result
    
    @pytest.mark.asyncio
    async def test_budget_limit_enforcement(self):
        """Test budget limit enforcement"""
        # Mock budget exceeded scenario
        with patch.object(self.discovery_service.cost_tracker, 'check_budget_limits') as mock_budget:
            mock_budget.return_value = {
                "within_budget": False,
                "operation_cost": 60.0,
                "operation_limit": 50.0
            }
            
            with patch.object(self.discovery_service.cost_tracker, 'create_budget_alert') as mock_alert:
                mock_alert.return_value = True
                
                # Test that extraction is blocked when budget exceeded
                result = await self.discovery_service._extract_product_data("https://example.com/test")
                
                assert result["success"] == False
                assert "budget" in result["error"].lower()
                assert result["cost"] == 0.0
                mock_alert.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_duplicate_detection_workflow(self):
        """Test duplicate detection in the discovery workflow"""
        # Mock existing URL check
        with patch.object(self.discovery_service, '_check_existing_url') as mock_check:
            mock_check.return_value = True  # URL already exists
            
            # Mock the single URL processing
            result = await self.discovery_service._process_single_url(
                DiscoveryRequest(
                    scan_log_id="test",
                    site_id="test",
                    base_url="https://example.com",
                    sitemap_url=None,
                    scraping_config={}
                ),
                "https://example.com/existing-product"
            )
            
            assert result["success"] == False
            assert "already exists" in result["error"]
    
    @pytest.mark.asyncio
    async def test_machine_type_inference(self):
        """Test machine type inference from product data"""
        test_cases = [
            ({
                "name": "Laser Cutting Machine",
                "power": "150W",
                "description": "CO2 laser cutter for acrylic and wood"
            }, "laser-cutter"),
            ({
                "name": "Bambu Lab X1 Carbon",
                "build_volume": "256x256x256",
                "description": "High speed 3D printer with AMS"
            }, "3d-printer"),
            ({
                "name": "Shapeoko 4",
                "spindle_power": "1.25HP",
                "description": "CNC router for wood and aluminum"
            }, "cnc-machine"),
            ({
                "name": "UV Printer Pro",
                "description": "DTF and vinyl printing solution"
            }, "uv-dtf-printer")
        ]
        
        for product_data, expected_type in test_cases:
            inferred_type = self.discovery_service._infer_machine_type(product_data)
            assert inferred_type == expected_type, f"Expected {expected_type}, got {inferred_type}"
    
    @pytest.mark.asyncio
    async def test_error_handling_robustness(self):
        """Test error handling throughout the discovery pipeline"""
        # Test with malformed URLs
        malformed_urls = [
            "not-a-url",
            "http://",
            "https://",
            "",
            None
        ]
        
        for bad_url in malformed_urls:
            if bad_url is not None:
                result = await self.discovery_service._extract_product_data(bad_url)
                # Should not crash, should return error result
                assert "success" in result
                assert "error" in result or "cost" in result
    
    def test_cleanup_resources(self):
        """Test resource cleanup"""
        # Mock the dynamic scraper
        mock_scraper = Mock()
        mock_scraper.close_browser = Mock(return_value=asyncio.create_future())
        mock_scraper.close_browser.return_value.set_result(None)
        
        self.discovery_service.dynamic_scraper = mock_scraper
        
        # Test cleanup
        asyncio.run(self.discovery_service.cleanup())
        mock_scraper.close_browser.assert_called_once()
    
    @pytest.mark.asyncio 
    async def test_batch_processing_simulation(self):
        """Test batch processing of multiple URLs"""
        test_urls = [
            "https://example.com/product1",
            "https://example.com/product2", 
            "https://example.com/product3"
        ]
        
        request = DiscoveryRequest(
            scan_log_id="batch-test",
            site_id="test-site",
            base_url="https://example.com",
            sitemap_url=None,
            scraping_config={}
        )
        
        # Mock the batch processing method
        with patch.object(self.discovery_service, '_process_single_url') as mock_process:
            mock_process.side_effect = [
                {"success": True, "cost": 0.02, "warnings": []},
                {"success": False, "cost": 0.01, "error": "No data found", "warnings": []},
                {"success": True, "cost": 0.03, "warnings": ["Price seems high"]}
            ]
            
            # Test batch processing
            result = await self.discovery_service._process_batch(request, test_urls)
            
            assert result["processed"] == 2  # 2 successful
            assert result["errors"] == 1     # 1 failed
            assert result["cost"] == 0.06    # Total cost
            assert len(result["warnings"]) == 1
            assert mock_process.call_count == 3


if __name__ == "__main__":
    # Run tests if script is executed directly
    pytest.main([__file__, "-v"])