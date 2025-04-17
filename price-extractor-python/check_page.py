import requests
from bs4 import BeautifulSoup
import json
from loguru import logger

# Configure logger
logger.add("debug.log", level="DEBUG")

def check_page():
    url = 'https://acmerlaser.com/products/acmer-p3-ir-diode-laser-engraver'
    
    # Fetch page
    logger.info(f"Fetching {url}")
    resp = requests.get(url)
    
    # Parse HTML
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # Look for sale price in the page text
    sale_price_elements = soup.select('[class*="sale"]')
    logger.info(f"Found {len(sale_price_elements)} sale price elements")
    for i, el in enumerate(sale_price_elements):
        logger.info(f"Sale price element {i}: {el.text}")
    
    # Find JSON-LD scripts
    scripts = soup.find_all('script', type='application/ld+json')
    logger.info(f"Found {len(scripts)} JSON-LD scripts")
    
    # Extract and analyze price data
    for i, script in enumerate(scripts):
        logger.info(f"Analyzing script {i}")
        try:
            data = json.loads(script.string)
            # Pretty print for debugging
            logger.debug(f"JSON-LD data:\n{json.dumps(data, indent=2)}")
            
            # Look for price fields
            if isinstance(data, dict):
                if 'offers' in data:
                    logger.info("Found offers section")
                    if isinstance(data['offers'], dict):
                        if 'price' in data['offers']:
                            price = data['offers']['price']
                            logger.info(f"Found price in offers: {price}")
                    elif isinstance(data['offers'], list):
                        for j, offer in enumerate(data['offers']):
                            if 'price' in offer:
                                price = offer['price']
                                logger.info(f"Found price in offer {j}: {price}")
                
                # Look for direct price
                if 'price' in data:
                    price = data['price']
                    logger.info(f"Found direct price: {price}")
            
        except Exception as e:
            logger.error(f"Error processing script {i}: {e}")
    
    # Also check common CSS selectors for prices
    selectors = [
        '.price', '#price', '.product-price', '.offer-price', 
        '.current-price', '.sale-price', '.product__price',
        '[data-price]', '[data-product-price]', '.price-box',
        '.price__current', '.price-group', '.product-info-price'
    ]
    
    for selector in selectors:
        elements = soup.select(selector)
        if elements:
            logger.info(f"Found {len(elements)} elements with selector '{selector}'")
            for j, el in enumerate(elements):
                logger.info(f"  Element {j} text: {el.text.strip()}")

if __name__ == "__main__":
    check_page() 