"""
Pytest tests for the Price Extractor API
"""
import pytest
import requests
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

class TestPriceExtractorAPI:
    """Test suite for Price Extractor API"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_smart_url_discovery(self):
        """Test smart URL discovery functionality"""
        payload = {
            "manufacturer_id": "test-manufacturer",
            "base_url": "https://omtechlaser.com",
            "manufacturer_name": "OMTech",
            "max_pages": 2,
            "apply_smart_filtering": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/smart/smart-discover-urls",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_urls_found"] > 0
        assert "classified_urls" in data
        assert "classification_summary" in data
    
    def test_scrape_discovered_urls(self):
        """Test scraping discovered URLs"""
        test_url = "https://omtechlaser.com/products/mp6969-100-100w-mopa-fiber-laser-marking-engraving-machine-with-6-9-x-6-9-working-area"
        manufacturer_id = "0234c783-b4d6-4b3f-9336-f558369d2763"  # Acmer
        
        payload = {
            "urls": [test_url],
            "manufacturer_id": manufacturer_id,
            "max_workers": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/v1/scrape-discovered-urls",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["url_count"] == 1
        assert "message" in data
    
    def test_classification_stats(self):
        """Test classification statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/v1/smart/classification-stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "common_skip_patterns" in data
        assert "product_indicators" in data
        assert "category_detection" in data
        assert isinstance(data["common_skip_patterns"], list)
        assert len(data["common_skip_patterns"]) > 0

    @pytest.mark.parametrize("urls", [
        ["https://omtechlaser.com/products/test-product"],
        ["https://omtechlaser.com/collections/laser-cutters"],
        ["https://omtechlaser.com/blog/some-article"],
        ["https://omtechlaser.com/images/photo.jpg"],
    ])
    def test_classify_urls(self, urls):
        """Test URL classification endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/v1/smart/classify-urls",
            json=urls,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_urls"] == len(urls)
        assert "classified_urls" in data
        assert "classification_summary" in data

if __name__ == "__main__":
    pytest.main([__file__, "-v"])