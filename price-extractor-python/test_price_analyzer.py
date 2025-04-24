#!/usr/bin/env python3
import logging
import json
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_extraction_with_analyzer():
    """Test the extraction service with the new PriceStructureAnalyzer integration."""
    # Use a known URL with sale/discount pricing structure
    test_url = "https://www.atomstack.net/products/atomstack-a5-m50-laser-engraver-machine"
    
    # API endpoint for extraction
    extraction_endpoint = "http://localhost:8000/api/extract"
    
    # Request payload
    payload = {
        "url": test_url,
        "force_refresh": True,
        "debug": True
    }
    
    logger.info(f"Sending extraction request for URL: {test_url}")
    
    try:
        response = requests.post(extraction_endpoint, json=payload)
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"Extraction completed with status: {result.get('status')}")
        
        # Print the full response for debugging
        logger.info(f"Full response: {json.dumps(result, indent=2)}")
        
        # Check if price was extracted correctly
        if "price" in result and result["price"]:
            logger.info(f"✅ Price extracted successfully: {result['price']}")
        else:
            logger.error("❌ Price extraction failed!")
            
        # Check for debug information about price structure analysis
        if "debug_info" in result and "price_structure_analysis" in result["debug_info"]:
            logger.info("✅ Price structure analysis was performed")
            logger.info(f"Analysis result: {result['debug_info']['price_structure_analysis']}")
        else:
            logger.warning("⚠️ No price structure analysis found in debug info")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")

if __name__ == "__main__":
    test_extraction_with_analyzer() 