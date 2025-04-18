#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import re
import sys
import logging
import time
import json
import sqlite3
from datetime import datetime

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("price_extractor")

class PriceExtractor:
    def __init__(self, db_path="machines.db"):
        self.db_path = db_path
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"
        }
        
        # Initialize merchant-specific settings - can be expanded as needed
        self.merchant_settings = {
            "commarker.com": {
                "css_selectors": [
                    ".price ins .woocommerce-Price-amount bdi",
                    ".product .price:not(del) .woocommerce-Price-amount",
                    "form.cart .price .woocommerce-Price-amount",
                    ".price .woocommerce-Price-amount bdi",
                    ".price .amount",
                    ".woocommerce-Price-amount"
                ]
            },
            "atomstack.com": {
                "css_selectors": [
                    ".product-price .money",
                    ".product__price .price-item--regular",
                    "span[data-product-price]",
                    ".price .money",
                    ".product-single__price"
                ]
            },
            "aeonlaser.us": {
                "css_selectors": [
                    ".product-single__price",
                    "[data-product-price]",
                    ".price .money",
                    ".product__price"
                ]
            },
            "thunder-laser.com": {
                "css_selectors": [
                    ".price-container .price",
                    ".product-info-price .price",
                    ".product-info-main .price"
                ]
            },
        }
    
    def get_machines_from_db(self):
        """Get machine data from SQLite database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Adjust this query to match your actual database schema
            query = """
            SELECT 
                id, name, merchant, url, last_price, 
                last_update_date
            FROM machines
            WHERE active = 1
            LIMIT 10  -- For testing, limit to 10 machines
            """
            
            cursor.execute(query)
            machines = cursor.fetchall()
            
            # Convert to list of dictionaries for easier handling
            machine_list = []
            for machine in machines:
                machine_list.append({
                    "id": machine[0],
                    "name": machine[1],
                    "merchant": machine[2],
                    "url": machine[3],
                    "previous_price": machine[4],
                    "last_update": machine[5]
                })
                
            conn.close()
            return machine_list
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            # For testing, return some sample data if DB connection fails
            return [
                {
                    "id": 1,
                    "name": "ComMarker B4 100W MOPA",
                    "merchant": "ComMarker",
                    "url": "https://commarker.com/product/b4-100w-jpt-mopa/",
                    "previous_price": 6666.00,
                    "last_update": "2025-03-01"
                },
                {
                    "id": 2,
                    "name": "ComMarker B4 20W",
                    "merchant": "ComMarker",
                    "url": "https://commarker.com/product/b4-laser-engraver/",
                    "previous_price": 1399.00,
                    "last_update": "2025-03-01"
                },
                {
                    "id": 3,
                    "name": "Atomstack X70 Max",
                    "merchant": "Atomstack",
                    "url": "https://www.atomstack.com/products/atomstack-x70-max-laser-engraver-cutter",
                    "previous_price": 1849.00,
                    "last_update": "2025-03-01"
                },
                {
                    "id": 4,
                    "name": "Aeon MIRA 7 Pro S",
                    "merchant": "Aeon Laser",
                    "url": "https://aeonlaser.us/products/aeon-mira-7-pro-s",
                    "previous_price": 6995.00,
                    "last_update": "2025-03-01"
                }
            ]
    
    def get_merchant_domain(self, url):
        """Extract merchant domain from URL"""
        if not url:
            return None
            
        for domain in self.merchant_settings:
            if domain in url:
                return domain
        return None
    
    def fetch_page(self, url):
        """Fetch product page content with anti-blocking measures"""
        if not url:
            return None
            
        try:
            # Add random delay between requests
            time.sleep(0.5)
            
            # Use rotating user agents to avoid detection
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            return response.text
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch product page: {url} - Error: {e}")
            return None
    
    def extract_price(self, html_content, url):
        """Extract price from HTML content"""
        if not html_content:
            return None, "Failed to fetch HTML content"
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Determine which selectors to use based on the merchant
        domain = self.get_merchant_domain(url)
        selectors = []
        
        if domain and domain in self.merchant_settings:
            selectors = self.merchant_settings[domain]["css_selectors"]
        
        # Add fallback generic selectors
        selectors.extend([
            ".price",
            "[data-product-price]",
            ".product-price",
            ".amount"
        ])
        
        # Try all selectors until we find a match
        for selector in selectors:
            price_elements = soup.select(selector)
            if price_elements:
                price_text = price_elements[0].get_text().strip()
                logger.info(f"Found price element with selector: {selector}")
                logger.info(f"Raw price text: {price_text}")
                
                # Extract the price value
                price_value = self._parse_price(price_text)
                if price_value:
                    return price_value, f"CSS selector: {selector}"
        
        # Try JSON-LD structured data as a backup
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
        if not price_text:
            return None
            
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
    
    def verify_price(self, extracted_price, previous_price, machine_name, url):
        """
        Robust verification system to catch and correct suspicious price changes.
        Returns: (corrected_price, verification_status, confidence_score)
        """
        if not extracted_price:
            return None, "Failed", 0.0
            
        if not previous_price:
            return extracted_price, "No previous price to verify against", 0.5
        
        # Calculate price change percentage
        price_change_pct = abs((extracted_price - previous_price) / previous_price) * 100
        
        # Set initial confidence score based on price change
        confidence_score = 1.0
        status = "Verified"
        corrected_price = extracted_price
        
        logger.info(f"Price change for {machine_name}: {price_change_pct:.2f}% (Previous: ${previous_price:.2f}, Current: ${extracted_price:.2f})")
        
        # Detect suspiciously large changes - implement thresholds from TROUBLESHOOTING.md
        if price_change_pct > 90:
            logger.error(f"❌ CRITICAL: Price change >90% detected for {machine_name}. Flagging for manual review!")
            confidence_score = 0.0
            status = "Manual review required - Critical price change"
            
            # Attempt corrections for known error patterns
            if extracted_price < previous_price * 0.2:
                # Try adding leading digit(s) - for case like $600 instead of $6,000
                corrected = extracted_price * 10
                while corrected < previous_price * 0.5:
                    corrected *= 10
                    
                if abs((corrected - previous_price) / previous_price) * 100 < 20:
                    logger.info(f"✅ Corrected missing leading digit(s): ${extracted_price:.2f} -> ${corrected:.2f}")
                    corrected_price = corrected
                    confidence_score = 0.6
                    status = "Auto-corrected missing leading digit(s)"
                    
            # Check for missing trailing digit - for case like $184 instead of $1,849
            elif extracted_price * 10 < previous_price * 1.2 and extracted_price * 10 > previous_price * 0.8:
                corrected = extracted_price * 10
                logger.info(f"✅ Corrected missing trailing digit: ${extracted_price:.2f} -> ${corrected:.2f}")
                corrected_price = corrected
                confidence_score = 0.7
                status = "Auto-corrected missing trailing digit"
                
            # More complex corrections could be added here
                
        elif price_change_pct > 50:
            # Large but not critical change - lower confidence but still auto-correctable
            logger.warning(f"⚠️ Large price change (>50%) detected for {machine_name}.")
            confidence_score = 0.3
            status = "Suspicious price change"
            
            # Apply same correction logic as above
            if extracted_price < previous_price * 0.3:
                corrected = extracted_price * 10
                while corrected < previous_price * 0.7:
                    corrected *= 10
                    
                if abs((corrected - previous_price) / previous_price) * 100 < 25:
                    logger.info(f"✅ Corrected missing digit(s): ${extracted_price:.2f} -> ${corrected:.2f}")
                    corrected_price = corrected
                    confidence_score = 0.6
                    status = "Auto-corrected missing digit(s)"
                    
        elif price_change_pct > 25:
            # Moderate change - reduced confidence
            logger.warning(f"⚠️ Notable price change (>25%) detected for {machine_name}.")
            confidence_score = 0.7
            status = "Price change requires attention"
            
        else:
            # Small change - high confidence
            logger.info(f"✅ Acceptable price change ({price_change_pct:.2f}%) for {machine_name}")
            confidence_score = 0.9
            status = "Verified - within normal range"
            
        return corrected_price, status, confidence_score
    
    def process_machine(self, machine):
        """Process a single machine to extract and verify its price"""
        machine_id = machine.get("id")
        name = machine.get("name")
        url = machine.get("url")
        previous_price = machine.get("previous_price")
        
        logger.info(f"Processing {name} (ID: {machine_id})")
        
        result = {
            "id": machine_id,
            "name": name,
            "url": url,
            "previous_price": previous_price,
            "timestamp": datetime.now().isoformat(),
            "success": False
        }
        
        # Fetch the product page
        html_content = self.fetch_page(url)
        
        if not html_content:
            logger.error(f"❌ Failed to fetch content for {name}")
            result["status"] = "Failed to fetch page"
            return result
            
        # Extract the price
        extracted_price, method = self.extract_price(html_content, url)
        
        if not extracted_price:
            logger.error(f"❌ Failed to extract price for {name}")
            result["status"] = f"Failed to extract price: {method}"
            return result
            
        result["extracted_price"] = extracted_price
        result["extraction_method"] = method
        
        # Verify the price
        corrected_price, status, confidence = self.verify_price(
            extracted_price, 
            previous_price,
            name,
            url
        )
        
        result["corrected_price"] = corrected_price
        result["verification_status"] = status
        result["confidence_score"] = confidence
        result["price_change_pct"] = abs((corrected_price - previous_price) / previous_price) * 100 if previous_price else 0
        
        # Determine if the process was successful
        result["success"] = corrected_price is not None and confidence >= 0.5
        
        return result

def main():
    # Initialize the price extractor
    extractor = PriceExtractor()
    
    # Get machines from the database (or sample data if DB connection fails)
    machines = extractor.get_machines_from_db()
    
    logger.info(f"Processing {len(machines)} machines...")
    
    results = []
    success_count = 0
    failure_count = 0
    manual_review_count = 0
    
    for machine in machines:
        result = extractor.process_machine(machine)
        results.append(result)
        
        if result["success"]:
            success_count += 1
            if "Manual review" in result.get("verification_status", ""):
                manual_review_count += 1
        else:
            failure_count += 1
    
    # Generate and display a summary report
    logger.info("\n===== PRICE EXTRACTION REPORT =====")
    logger.info(f"Total machines processed: {len(machines)}")
    logger.info(f"Successful extractions: {success_count}")
    logger.info(f"Failed extractions: {failure_count}")
    logger.info(f"Requiring manual review: {manual_review_count}")
    logger.info("\nDetailed results:")
    
    for result in results:
        name = result["name"]
        previous_price = result.get("previous_price")
        extracted_price = result.get("extracted_price")
        corrected_price = result.get("corrected_price")
        status = result.get("verification_status")
        confidence = result.get("confidence_score", 0)
        
        if result["success"]:
            if confidence > 0.7:
                logger.info(f"✅ {name}: ${corrected_price:.2f} ({status})")
            else:
                logger.warning(f"⚠️ {name}: ${corrected_price:.2f} ({status})")
        else:
            logger.error(f"❌ {name}: {status}")
        
        if extracted_price and extracted_price != corrected_price:
            logger.info(f"   Original extracted: ${extracted_price:.2f} -> Corrected: ${corrected_price:.2f}")
        
        if previous_price and corrected_price:
            price_change = result.get("price_change_pct", 0)
            logger.info(f"   Price change: {price_change:.2f}% (Previous: ${previous_price:.2f})")
            
        logger.info(f"   Confidence score: {confidence:.2f}")
        logger.info("")
    
    # Output would be saved to database in real implementation
    logger.info("Price extraction test completed.")

if __name__ == "__main__":
    main() 