#!/usr/bin/env python3
"""
Test the discovery API endpoint to verify our sitemap parsing fixes work end-to-end
"""

import requests
import json
from loguru import logger

def test_discovery_api():
    """Test the /discover-config endpoint with Creality"""
    
    # API endpoint
    api_url = "http://localhost:8000/api/v1/discover-config"
    
    # Test with Creality (has sitemap index)
    payload = {
        "base_url": "https://www.crealityfalcon.com/",
        "site_name": "Creality Falcon"
    }
    
    logger.info(f"Testing discovery API at {api_url}")
    logger.info(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(api_url, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ API call successful!")
            logger.info(f"Success: {result.get('success', False)}")
            logger.info(f"Message: {result.get('message', 'No message')}")
            
            # Check the report
            report = result.get('report', {})
            if report:
                logger.info(f"Sitemap found: {report.get('sitemap_found', False)}")
                logger.info(f"Category count: {report.get('category_count', 0)}")
                logger.info(f"Suggested delay: {report.get('suggested_delay', 0)}ms")
                
                category_urls = report.get('category_urls', [])
                logger.info(f"Category URLs found: {len(category_urls)}")
                for i, url in enumerate(category_urls[:5], 1):
                    logger.info(f"  {i}. {url}")
                
                if len(category_urls) > 5:
                    logger.info(f"  ... and {len(category_urls) - 5} more")
                    
            # Check configuration
            config = result.get('configuration')
            if config:
                logger.info("Generated Configuration:")
                logger.info(config)
                
        else:
            logger.error(f"❌ API call failed with status {response.status_code}")
            logger.error(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        logger.error("❌ Could not connect to API. Make sure the Python server is running on port 8000")
        logger.info("To start the server: cd price-extractor-python && python main.py")
    except Exception as e:
        logger.error(f"❌ Error testing API: {e}")

if __name__ == "__main__":
    test_discovery_api()