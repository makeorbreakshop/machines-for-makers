#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import re
import sys
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure basic logging instead of using loguru
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("price_extractor")

class MerchantPriceExtractor:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"
        }
        # Merchant-specific settings
        self.merchant_settings = {
            "commarker.com": {
                "css_selectors": [
                    ".price ins .woocommerce-Price-amount bdi",
                    ".product .price:not(del) .woocommerce-Price-amount",
                    "form.cart .price .woocommerce-Price-amount",
                    "h1 + .woocommerce-product-details__price span.price ins .woocommerce-Price-amount",
                    ".price .woocommerce-Price-amount bdi",
                    ".price .amount",
                    ".woocommerce-Price-amount"
                ],
                "name": "ComMarker"
            },
            "atomstack.net": {
                "css_selectors": [
                    ".product__price .price-item--regular",
                    "span[data-product-price]",
                    ".price .money",
                    ".product-single__price"
                ],
                "name": "Atomstack"
            },
            "aeonlaser.us": {
                "css_selectors": [
                    ".product-single__price",
                    "[data-product-price]",
                    ".price .money",
                    ".product__price"
                ],
                "name": "Aeon Laser"
            },
            "thunder-laser.com": {
                "css_selectors": [
                    ".price-container .price",
                    ".product-info-price .price",
                    ".product-info-main .price"
                ],
                "name": "Thunder Laser"
            }
        }
        
    def get_merchant_from_url(self, url):
        """Extract merchant domain from URL"""
        for merchant_domain in self.merchant_settings:
            if merchant_domain in url:
                return merchant_domain
        return None
    
    def fetch_page(self, url):
        """Fetch product page content"""
        try:
            # Add random delay to avoid anti-scraping measures
            time.sleep(0.5)
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            return response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch product page: {url} - Error: {e}")
            return None
    
    def extract_price(self, html_content, url):
        """Extract price from HTML content using improved selectors"""
        if not html_content:
            return None, "Failed to fetch HTML content"
            
        merchant_domain = self.get_merchant_from_url(url)
        if not merchant_domain or merchant_domain not in self.merchant_settings:
            logger.warning(f"Unknown merchant for URL: {url}")
            # Use generic selectors for unknown merchants
            css_selectors = [
                ".price",
                "[data-product-price]",
                ".product-price",
                ".amount"
            ]
        else:
            css_selectors = self.merchant_settings[merchant_domain]["css_selectors"]
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Try all selectors until we find one that works
        for selector in css_selectors:
            price_elements = soup.select(selector)
            if price_elements:
                price_text = price_elements[0].get_text().strip()
                logger.info(f"Found price element with selector: {selector}")
                logger.info(f"Raw price text: {price_text}")
                
                # Extract the price value
                price_value = self._parse_price(price_text)
                if price_value:
                    return price_value, f"CSS selector: {selector}"
        
        # Look for JSON-LD structured data
        json_ld_price = self._extract_json_ld_price(soup)
        if json_ld_price:
            return json_ld_price, "JSON-LD structured data"
            
        # If no price found, log all potential price elements for debugging
        logger.info("No price found with main selectors. Checking generic price elements:")
        all_price_elements = soup.select(".price, .amount, [data-product-price]")
        for element in all_price_elements:
            logger.info(f"Potential price element: {element.get_text().strip()}")
        
        return None, "Price not found"
    
    def _extract_json_ld_price(self, soup):
        """Extract price from JSON-LD structured data"""
        json_ld_scripts = soup.select('script[type="application/ld+json"]')
        for script in json_ld_scripts:
            try:
                import json
                data = json.loads(script.string)
                
                # Handle different JSON-LD formats
                if "@graph" in data:
                    for item in data["@graph"]:
                        if "offers" in item:
                            if isinstance(item["offers"], dict) and "price" in item["offers"]:
                                price_str = str(item["offers"]["price"])
                                logger.info(f"Found price in JSON-LD @graph: {price_str}")
                                return self._parse_price(price_str)
                            elif isinstance(item["offers"], list):
                                for offer in item["offers"]:
                                    if "price" in offer:
                                        price_str = str(offer["price"])
                                        logger.info(f"Found price in JSON-LD @graph offers array: {price_str}")
                                        return self._parse_price(price_str)
                
                if "offers" in data:
                    if isinstance(data["offers"], dict) and "price" in data["offers"]:
                        price_str = str(data["offers"]["price"])
                        logger.info(f"Found price in JSON-LD: {price_str}")
                        return self._parse_price(price_str)
                    elif isinstance(data["offers"], list):
                        for offer in data["offers"]:
                            if "price" in offer:
                                price_str = str(offer["price"])
                                logger.info(f"Found price in JSON-LD offers array: {price_str}")
                                return self._parse_price(price_str)
                
                if "price" in data:
                    price_str = str(data["price"])
                    logger.info(f"Found price directly in JSON-LD: {price_str}")
                    return self._parse_price(price_str)
                
            except Exception as e:
                logger.error(f"Error parsing JSON-LD data: {e}")
                
        return None
    
    def _parse_price(self, price_text):
        """Parse price from text, handling currency symbols and formatting"""
        # Remove currency symbols, commas, and whitespace
        price_text = re.sub(r'[^\d.\,]', '', price_text)
        
        # Handle comma as decimal separator or thousand separator
        if ',' in price_text and '.' in price_text:
            # Both comma and period present - assume standard format (comma for thousands)
            price_text = price_text.replace(',', '')
        elif ',' in price_text:
            # Only comma present - check position
            parts = price_text.split(',')
            if len(parts) == 2 and len(parts[1]) <= 2:
                # Likely decimal separator
                price_text = price_text.replace(',', '.')
        else:
                # Likely thousands separator
                price_text = price_text.replace(',', '')
        
        try:
            price = float(price_text)
            logger.info(f"Parsed price: {price}")
            return price
        except ValueError:
            logger.error(f"Failed to parse price from: {price_text}")
            return None
    
    def _verify_and_correct_price(self, price, previous_price, url=None):
        """Verify the extracted price and correct if necessary."""
        if previous_price is None:
            return price, False
            
        # Calculate percentage change
        percentage_change = abs((price - previous_price) / previous_price) * 100
        
        logger.info(f"Price change: {percentage_change:.2f}% (Previous: {previous_price}, Current: {price})")
        
        # Check for suspiciously large changes (>50%)
        if percentage_change > 50:
            merchant_domain = self.get_merchant_from_url(url) if url else None
            merchant_name = self.merchant_settings.get(merchant_domain, {}).get("name", "Unknown") if merchant_domain else "Unknown"
            
            # Check for missing leading digit
            if price < previous_price * 0.2:
                # Try adding leading digit(s)
                corrected = price * 10
                while corrected < previous_price * 0.5:
                    corrected *= 10
                    
                if abs((corrected - previous_price) / previous_price) * 100 < 20:
                    logger.info(f"Corrected missing leading digit for {merchant_name}: {price} -> {corrected}")
                    return corrected, True
                    
            # Check for missing trailing digit
            if price * 10 < previous_price * 1.2 and price * 10 > previous_price * 0.8:
                corrected = price * 10
                logger.info(f"Corrected missing trailing digit for {merchant_name}: {price} -> {corrected}")
                return corrected, True
                
        return price, False
    
    def test_merchant(self, url, expected_price):
        """Test a single merchant"""
        merchant_domain = self.get_merchant_from_url(url)
        merchant_name = self.merchant_settings.get(merchant_domain, {}).get("name", "Unknown") if merchant_domain else "Unknown"
        
        logger.info(f"Testing {merchant_name} ({url})")
        
        html_content = self.fetch_page(url)
        if not html_content:
            return {
                "merchant": merchant_name,
                "url": url,
                "success": False,
                "error": "Failed to fetch product page",
                "expected_price": expected_price,
                "extracted_price": None,
                "corrected_price": None,
                "error_percentage": None,
                "extraction_method": None
            }
        
        price, method = self.extract_price(html_content, url)
        
        if not price:
            return {
                "merchant": merchant_name,
                "url": url,
                "success": False,
                "error": method,
                "expected_price": expected_price,
                "extracted_price": None,
                "corrected_price": None,
                "error_percentage": None,
                "extraction_method": None
            }
        
        # Verify and correct if needed
        corrected_price, was_corrected = self._verify_and_correct_price(price, expected_price, url)
        if was_corrected:
            price = corrected_price
            
        # Calculate error percentage
        error_pct = abs((price - expected_price) / expected_price) * 100
        
        return {
            "merchant": merchant_name,
            "url": url,
            "success": error_pct < 5,
            "error": f"Error {error_pct:.2f}%" if error_pct >= 5 else None,
            "expected_price": expected_price,
            "extracted_price": price,
            "corrected_price": corrected_price if was_corrected else None,
            "error_percentage": error_pct,
            "extraction_method": method
        }

def main():
    # Test data for problematic merchants
    test_cases = [
        {
            "url": "https://commarker.com/product/b4-100w-jpt-mopa/",
            "expected_price": 6666.00,
            "note": "ComMarker B4 100W MOPA"
        },
        {
            "url": "https://commarker.com/product/b4-laser-engraver/",
            "expected_price": 1399.00,
            "note": "ComMarker B4 20W"
        },
        {
            "url": "https://www.atomstack.com/collections/laser-engraver-cutter/products/atomstack-x70-max-laser-engraver-cutter",
            "expected_price": 1849.00,
            "note": "Atomstack X70 Max"
        },
        {
            "url": "https://aeonlaser.us/collections/co2-laser-machine/products/aeon-mira-7-pro-s",
            "expected_price": 6995.00,
            "note": "Aeon MIRA 7 Pro S"
        },
        {
            "url": "https://www.thunder-laser.com/co2-laser-machines/mid-size-co2-laser-machine/nova-51.html",
            "expected_price": 13999.00,
            "note": "Thunder Laser Nova 51"
        }
    ]
    
    extractor = MerchantPriceExtractor()
    
    results = []
    success_count = 0
    failure_count = 0
    
    # Use thread pool to run tests in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_to_case = {executor.submit(extractor.test_merchant, case["url"], case["expected_price"]): case for case in test_cases}
        
        for future in as_completed(future_to_case):
            case = future_to_case[future]
            try:
                result = future.result()
                result["note"] = case["note"]
        results.append(result)
                
                if result["success"]:
                    success_count += 1
                    logger.info(f"✅ {result['merchant']} ({result['note']}): Extraction successful")
                else:
                    failure_count += 1
                    logger.error(f"❌ {result['merchant']} ({result['note']}): {result['error']}")
            except Exception as e:
                logger.error(f"Test case {case['note']} raised an exception: {e}")
                failure_count += 1
    
    # Print summary
    logger.info("\n===== Test Results =====")
    logger.info(f"Total tests: {len(test_cases)}")
    logger.info(f"Successful: {success_count}")
    logger.info(f"Failed: {failure_count}")
    logger.info("\nDetailed results:")
    
    for result in results:
        status = "✅" if result["success"] else "❌"
        logger.info(f"{status} {result['merchant']} ({result['note']})")
        logger.info(f"  Expected price: ${result['expected_price']:.2f}")
        
        if result["extracted_price"]:
            logger.info(f"  Extracted price: ${result['extracted_price']:.2f} (Method: {result['extraction_method']})")
            
            if result["corrected_price"]:
                logger.info(f"  Price corrected from: ${result['extracted_price']:.2f} to ${result['corrected_price']:.2f}")
            
            logger.info(f"  Error percentage: {result['error_percentage']:.2f}%")
        else:
            logger.info(f"  Error: {result['error']}")
        
        logger.info("")

if __name__ == "__main__":
    main() 