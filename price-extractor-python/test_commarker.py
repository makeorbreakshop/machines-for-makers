#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import re
import sys
import logging

# Configure basic logging instead of using loguru
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("price_extractor")

class ComMarkerExtractor:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"
        }
        
    def fetch_page(self, url):
        """Fetch product page content"""
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch product page: {url} - Error: {e}")
            return None
    
    def extract_price(self, html_content, url):
        """Extract price from HTML content using improved selectors"""
        if not html_content:
            return None, "Failed to fetch HTML content"
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Improved CSS selectors for ComMarker
        css_selectors = [
            ".price ins .woocommerce-Price-amount bdi",
            ".product .price:not(del) .woocommerce-Price-amount",
            "form.cart .price .woocommerce-Price-amount",
            "h1 + .woocommerce-product-details__price span.price ins .woocommerce-Price-amount",
            # Fallback to more generic selectors
            ".price .woocommerce-Price-amount bdi",
            ".price .amount",
            ".woocommerce-Price-amount"
        ]
        
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
        
        # If no price found, log all potential price elements for debugging
        logger.info("No price found with main selectors. Checking generic price elements:")
        all_price_elements = soup.select(".price, .amount, [data-product-price]")
        for element in all_price_elements:
            logger.info(f"Potential price element: {element.get_text().strip()}")
        
        return None, "Price not found"
    
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
    
    def _verify_and_correct_price(self, price, previous_price):
        """Verify the extracted price and correct if necessary."""
        if previous_price is None:
            return price, False
            
        # Calculate percentage change
        percentage_change = abs((price - previous_price) / previous_price) * 100
        
        logger.info(f"Price change: {percentage_change:.2f}% (Previous: {previous_price}, Current: {price})")
        
        # Check for suspiciously large changes (>50%)
        if percentage_change > 50:
            # Check for missing leading digit
            if price < previous_price * 0.2:
                # Try adding leading digit(s)
                corrected = price * 10
                while corrected < previous_price * 0.5:
                    corrected *= 10
                    
                if abs((corrected - previous_price) / previous_price) * 100 < 20:
                    logger.info(f"Corrected missing leading digit: {price} -> {corrected}")
                    return corrected, True
                    
            # Check for missing trailing digit
            if price * 10 < previous_price * 1.2 and price * 10 > previous_price * 0.8:
                corrected = price * 10
                logger.info(f"Corrected missing trailing digit: {price} -> {corrected}")
                return corrected, True
                
        return price, False

def main():
    # Updated ComMarker product URL for testing
    url = "https://commarker.com/product/b4-100w-jpt-mopa/"
    
    # Known previous price for verification
    previous_price = 6666.00
    
    extractor = ComMarkerExtractor()
    
    # Fetch and extract price
    html_content = extractor.fetch_page(url)
    if html_content:
        price, method = extractor.extract_price(html_content, url)
        
        if price:
            logger.info(f"Extracted price: ${price:.2f} (Method: {method})")
            
            # Verify and correct if needed
            corrected_price, was_corrected = extractor._verify_and_correct_price(price, previous_price)
            if was_corrected:
                logger.info(f"Price corrected to: ${corrected_price:.2f}")
                price = corrected_price
            
            # Compare with known price
            if previous_price:
                error_pct = abs((price - previous_price) / previous_price) * 100
                logger.info(f"Error percentage: {error_pct:.2f}%")
                
                if error_pct < 5:
                    logger.info("✅ Extraction successful with acceptable error margin")
                else:
                    logger.warning(f"❌ Extraction error too high: {error_pct:.2f}%")
        else:
            logger.error(f"Failed to extract price: {method}")
    
if __name__ == "__main__":
    main() 