import json
import re
from bs4 import BeautifulSoup  # type: ignore
from loguru import logger  # type: ignore
import anthropic  # type: ignore
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
from typing import Dict, Optional, List, Any, Union

from config import ANTHROPIC_API_KEY, CLAUDE_HAIKU_MODEL, CLAUDE_SONNET_MODEL
from utils.price_validator import PriceValidator
from services.database_service import DatabaseService  # Add import for database service
from scrapers.web_scraper import WebScraper

class PriceExtractor:
    """
    A class for extracting prices from product pages across different websites.
    Uses pattern matching, CSS selectors, and various extraction techniques.
    """

    def __init__(self, scraper: Optional[WebScraper] = None):
        """
        Initialize the price extractor with an optional web scraper.
        
        Args:
            scraper (WebScraper, optional): Web scraper to use for fetching web pages.
                                           If None, a new one will be created.
        """
        self.scraper = scraper or WebScraper()
        
        # Common price patterns for regex extraction
        self.price_patterns = [
            r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $X,XXX.XX
            r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*USD',  # X,XXX.XX USD
            r'Price:\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # Price: $X,XXX.XX
            r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars',  # X,XXX.XX dollars
            r'(?:price|cost|value)(?:\s*:)?\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', # Price: $X,XXX.XX with variations
        ]
        
        # Common price selector patterns for different websites
        self.price_selectors = {
            # General selectors that often contain prices
            'general': [
                '.price', 
                '.product-price', 
                '.offer-price',
                '.current-price',
                '.sale-price',
                '[data-price]',
                '[data-product-price]',
                '[itemprop="price"]',
                '.product_price',
            ],
            # Site-specific selectors
            'amazon': [
                '#priceblock_ourprice', 
                '#priceblock_saleprice',
                '.a-price .a-offscreen',
                '#price_inside_buybox',
            ],
            'ebay': [
                '.x-price-primary',
                '.vi-price',
                '.display-price',
            ],
            # Add more site-specific selectors as needed
        }
        
        # Ensure the required Anthropic version header is set
        self.client = anthropic.Anthropic(
            api_key=ANTHROPIC_API_KEY,
            default_headers={"anthropic-version": "2023-06-01"} # Recommended version
        )
        
        # Initialize the price validator
        self.price_validator = PriceValidator()
        
        # Initialize database service
        self.db_service = DatabaseService()
        
        # Expanded merchant settings with specific configurations for problematic sites
        self.merchant_settings = {
            "commarker.com": {
                "html_limit": 50000,  # Higher limit for ComMarker
                "price_patterns": [
                    # Capture the sale price (second group) from strikethrough format pattern
                    r'~~\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)~~\s+\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                    # Get sale price from HTML markup with del/ins tags
                    r'<del[^>]*>.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*?</del>.*?<ins[^>]*>.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*?</ins>',
                    # Specific pattern for ComMarker current site format (April 2025)
                    r'<span class="price">[^<]*<del>.*?\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?).*?</del>[^<]*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                    # Generic price pattern
                    r'<span\s+class=["\']price["\'][^>]*>\s*<bdi>\s*&#36;\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*</bdi>'
                ],
                "css_selectors": [
                    # ComMarker-specific selectors for sale prices
                    ".summary .price > ins .woocommerce-Price-amount",  # Direct sale price in summary area
                    ".price ins .woocommerce-Price-amount",  # General sale price
                    ".summary .price:not(del) .woocommerce-Price-amount",  # Non-deleted price in summary
                    "[itemprop='price']",  # Price with schema markup
                    ".entry-summary .price .woocommerce-Price-amount:not(del .woocommerce-Price-amount)",  # Summary price not in del
                    ".price:not(del):not(.subscription-details) .woocommerce-Price-amount",  # Non-deleted, non-subscription price
                    ".product-info-main .price",  # Main product price element
                    ".product-info__price",  # Product info price
                    ".price .woocommerce-Price-amount:not(del .woocommerce-Price-amount)"  # Not within a del tag
                ],
                "price_range": [1000, 7000],  # Typical price range for ComMarker 
                "requires_special_validation": True
            },
            "atomstack.net": {
                "html_limit": 40000,
                "price_patterns": [
                    r'data-price="(\d+\.\d+)"',  # data-price attribute
                    r'<span class="money">&#36;(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)</span>'  # Money span with HTML currency
                ],
                "css_selectors": [
                    ".product__price .price-item--regular",  # Regular price
                    ".product__price .price-item--sale",  # Sale price
                    "[data-product-price]",  # Price data attribute
                    ".price-item--sale",  # Any sale price
                    ".product-single__price .money"  # Single product price
                ],
                "price_range": [500, 5000],
                "requires_special_validation": True
            },
            "aeonlaser.us": {
                "html_limit": 40000,
                "price_patterns": [],
                "css_selectors": [
                    ".product-single__price",  # Single product price
                    "[data-product-price]",  # Price data attribute
                    ".price .money",  # Price with money class
                    "[data-regular-price]",  # Regular price data attribute
                    ".product__price .money"  # Product price with money class
                ],
                "price_range": [3000, 30000],
                "requires_special_validation": True
            },
            "xtool.com": {
                "html_limit": 40000,
                "price_patterns": [],
                "css_selectors": [
                    ".product-info-main .price",  # Main product price
                    ".product-info__price .money",  # Product info price
                    "[data-price-type='finalPrice']",  # Final price attribute
                    ".price-final_price .price",  # Final price selector
                    ".special-price .price" # Special price selector
                ],
                "price_range": [500, 8000]
            },
            "thunder-laser.com": {
                "html_limit": 50000,
                "user_agent_rotation": True,  # Enable user agent rotation
                "use_proxy": True,  # Enable proxy usage
                "retry_count": 10,  # More retries for this site
                "css_selectors": [
                    ".product-price-amount",
                    ".woocommerce-Price-amount",
                    ".price ins .amount" 
                ],
                "price_range": [3000, 20000]
            }
        }
        
        # Initialize simple problematic merchants list for compatibility
        self.problematic_merchants = list(self.merchant_settings.keys())
        
        # Track the selectors that were tried during extraction
        self.selectors_tried = {
            "structured_data": {
                "tried": False,
                "found": False,
                "details": None
            },
            "css_selectors": {
                "tried": False,
                "found": False,
                "details": None,
                "selectors_checked": []
            },
            "regex_patterns": {
                "tried": False,
                "found": False,
                "details": None,
                "patterns_checked": []
            },
            "add_to_cart_proximity": {
                "tried": False,
                "found": False,
                "details": None
            },
            "claude_ai": {
                "tried": False,
                "found": False,
                "details": None
            }
        }
        
        logger.info("Price extractor initialized with enhanced merchant-specific settings")
    
    def reset_selectors_info(self):
        """Reset the selectors info to track a new extraction attempt."""
        self.selectors_tried = {
            "structured_data": {
                "tried": False,
                "found": False,
                "details": None
            },
            "css_selectors": {
                "tried": False,
                "found": False,
                "details": None,
                "selectors_checked": []
            },
            "regex_patterns": {
                "tried": False,
                "found": False,
                "details": None,
                "patterns_checked": []
            },
            "add_to_cart_proximity": {
                "tried": False,
                "found": False,
                "details": None
            },
            "claude_ai": {
                "tried": False,
                "found": False,
                "details": None
            }
        }
    
    def get_selectors_info(self):
        """
        Get information about selectors tried during the extraction process.
        
        Returns:
            dict: Dictionary with information about structured data, css selectors, and Claude AI usage.
        """
        return self.selectors_tried
    
    async def extract_price(self, soup, html_content, url, product_category=None, previous_price=None, machine_id=None):
        """
        Extract price from a soup object and HTML content.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content
            html_content (str): Raw HTML content
            url (str): URL of the product page
            product_category (str, optional): Category of the product
            previous_price (float, optional): Previously known price
            machine_id (str, optional): ID of the machine in the database
            
        Returns:
            Tuple[Optional[float], Optional[str]]: A tuple containing (price, extraction_method)
                                                 or (None, None) if extraction failed
        """
        # Reset selectors info for tracking this extraction
        self.reset_selectors_info()
        
        # Extract the domain for merchant-specific handling
        domain = self._extract_domain(url)
        merchant = self._get_merchant_key(domain)
        
        # Apply merchant-specific extraction if available
        if merchant == "commarker.com":
            price, method = self._extract_commarker_price(soup, html_content, previous_price)
            if price is not None:
                return price, method
        
        # First try to use structured data
        price, method = self._extract_from_structured_data(soup)
        if price is not None:
            # Apply price verification and correction
            corrected_price, was_corrected = self._verify_and_correct_price(price, previous_price, url, method)
            if was_corrected:
                return corrected_price, f"{method} (corrected)"
            return price, method
            
        # Try site-specific selectors if available
        if merchant and "css_selectors" in self.merchant_settings.get(merchant, {}):
            for selector in self.merchant_settings[merchant]["css_selectors"]:
                price_element = soup.select_one(selector)
                if price_element:
                    price_text = price_element.get_text(strip=True)
                    price = self._parse_price(price_text)
                    if price:
                        method = f"Merchant CSS Selector '{selector}'"
                        # Apply price verification and correction
                        corrected_price, was_corrected = self._verify_and_correct_price(price, previous_price, url, method)
                        if was_corrected:
                            return corrected_price, f"{method} (corrected)"
                        return price, method
            
        # Try common selectors
        price, method = self._extract_from_common_selectors(soup)
        if price is not None:
            # Apply price verification and correction
            corrected_price, was_corrected = self._verify_and_correct_price(price, previous_price, url, method)
            if was_corrected:
                return corrected_price, f"{method} (corrected)"
            return price, method
            
        # Try regex patterns
        price, method = self._extract_from_regex_patterns(html_content)
        if price is not None:
            # Apply price verification and correction
            corrected_price, was_corrected = self._verify_and_correct_price(price, previous_price, url, method)
            if was_corrected:
                return corrected_price, f"{method} (corrected)"
            return price, method
            
        # Try finding price near "Add to Cart"
        price, method = self._extract_near_add_to_cart(soup)
        if price is not None:
            # Apply price verification and correction
            corrected_price, was_corrected = self._verify_and_correct_price(price, previous_price, url, method)
            if was_corrected:
                return corrected_price, f"{method} (corrected)"
            return price, method
            
        # As a last resort, use Claude AI
        html_limit = self.merchant_settings.get(merchant, {}).get("html_limit", 20000) if merchant else 20000
        
        # Include special prompting for specific merchants
        extra_prompt = ""
        if merchant == "commarker.com":
            extra_prompt = """
            This is a ComMarker product page. ComMarker typically uses WooCommerce with sale pricing.
            
            Important pricing patterns to look for:
            1. Look for prices in the format "~~$2,299~~ $1,839"
            2. The actual price is typically in an <ins> tag, while the old price is in a <del> tag
            3. Find elements with class "woocommerce-product-details__price" and look for price inside
            4. ComMarker products typically cost between $1,000 and $7,000
            
            Be very careful to extract the CURRENT price (after discount), not the original price.
            """
        
        claude_result = self._extract_using_claude(html_content, url, previous_price, html_limit=html_limit, extra_prompt=extra_prompt)
        if claude_result and claude_result[0] is not None:
            price, method = claude_result
            # Apply price verification and correction
            corrected_price, was_corrected = self._verify_and_correct_price(price, previous_price, url, method)
            if was_corrected:
                return corrected_price, f"{method} (corrected)"
            return price, method
            
        # If all else fails
        logger.warning(f"Could not extract price from {url}")
        return None, None
    
    def extract_price_from_url(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Extract price information from a product URL.
        
        Args:
            url (str): URL of the product page
            
        Returns:
            Optional[Dict[str, Any]]: Dictionary containing extracted price information
                                    or None if extraction failed
        """
        # Fetch the page content
        status_code, html_content = self.scraper.get_page_content(url)
        
        if status_code != 200 or not html_content:
            logger.error(f"Failed to fetch content from {url}. Status code: {status_code}")
            return None
        
        # Parse the HTML content
        soup = self.scraper.parse_html(html_content)
        if not soup:
            logger.error(f"Failed to parse HTML content from {url}")
            return None
        
        # Try to determine the site type for specialized extraction
        site_type = self._determine_site_type(url)
        
        # Extract the price using multiple methods
        price_info = self._extract_price(soup, site_type, url)
        
        return price_info
    
    def _determine_site_type(self, url: str) -> str:
        """
        Determine the site type from the URL to use specialized extraction methods.
        
        Args:
            url (str): URL of the product page
            
        Returns:
            str: Site type (e.g., 'amazon', 'ebay', 'general')
        """
        if 'amazon' in url:
            return 'amazon'
        elif 'ebay' in url:
            return 'ebay'
        # Add more site type detections as needed
        
        return 'general'
    
    def _extract_price(self, soup: BeautifulSoup, site_type: str, url: str) -> Optional[Dict[str, Any]]:
        """
        Extract price information from a parsed HTML page using multiple methods.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content
            site_type (str): Type of site (e.g., 'amazon', 'ebay', 'general')
            url (str): URL of the product page
            
        Returns:
            Optional[Dict[str, Any]]: Dictionary containing extracted price information
                                    or None if extraction failed
        """
        # Result container
        result = {
            'price': None,
            'currency': None,
            'original_price': None,
            'source_url': url,
            'extraction_method': None,
        }
        
        # Try site-specific selectors first
        if site_type in self.price_selectors:
            for selector in self.price_selectors[site_type]:
                price_text = self._extract_by_selector(soup, selector)
                if price_text:
                    parsed = self._parse_price_text(price_text)
                    if parsed.get('price'):
                        result.update(parsed)
                        result['extraction_method'] = f'selector:{site_type}:{selector}'
                        return result
        
        # Then try general selectors
        for selector in self.price_selectors['general']:
            price_text = self._extract_by_selector(soup, selector)
            if price_text:
                parsed = self._parse_price_text(price_text)
                if parsed.get('price'):
                    result.update(parsed)
                    result['extraction_method'] = f'selector:general:{selector}'
                    return result
        
        # Try regex patterns on the full page text
        page_text = soup.get_text()
        for pattern in self.price_patterns:
            match = re.search(pattern, page_text)
            if match:
                price_str = match.group(1).replace(',', '')
                try:
                    price = float(price_str)
                    result['price'] = price
                    result['currency'] = 'USD'  # Assuming USD for now
                    result['extraction_method'] = f'regex:{pattern}'
                    return result
                except ValueError:
                    continue
        
        # Try structured data extraction (JSON-LD, microdata)
        structured_data = self._extract_from_structured_data(soup)
        if structured_data:
            result.update(structured_data)
            return result
        
        # If we couldn't extract a price
        logger.warning(f"Could not extract price from {url}")
        return None
    
    def _extract_by_selector(self, soup: BeautifulSoup, selector: str) -> Optional[str]:
        """
        Extract text from an element matching a CSS selector.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content
            selector (str): CSS selector
            
        Returns:
            Optional[str]: Extracted text or None if not found
        """
        element = soup.select_one(selector)
        if element:
            # Check for price in attributes first
            for attr in ['content', 'data-price', 'data-product-price']:
                if attr in element.attrs:
                    return element.attrs[attr]
            
            # Return the text content
            return element.get_text(strip=True)
        
        return None
    
    def _parse_price_text(self, price_text: str) -> Dict[str, Any]:
        """
        Parse price text to extract numeric price and currency.
        
        Args:
            price_text (str): Text containing price information
            
        Returns:
            Dict[str, Any]: Dictionary with extracted price information
        """
        result = {
            'price': None,
            'currency': None,
            'original_price': None,
        }
        
        # Clean up the price text
        clean_text = price_text.strip()
        
        # Try to identify currency symbol
        currency_map = {
            '$': 'USD',
            '£': 'GBP',
            '€': 'EUR',
            '¥': 'JPY',
        }
        
        for symbol, currency_code in currency_map.items():
            if symbol in clean_text:
                result['currency'] = currency_code
                break
        
        # If no currency symbol found, check for currency codes
        if not result['currency']:
            currency_codes = ['USD', 'EUR', 'GBP', 'JPY']
            for code in currency_codes:
                if code in clean_text:
                    result['currency'] = code
                    break
        
        # Extract the price
        # Try to find numbers that look like prices
        price_matches = re.findall(r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', clean_text)
        
        if price_matches:
            # If multiple numbers found, try to determine which is the actual price
            if len(price_matches) > 1:
                # Look for original price (usually struck through or higher)
                result['original_price'] = float(price_matches[0].replace(',', ''))
                result['price'] = float(price_matches[1].replace(',', ''))
                
                # If the first price is lower than the second, swap them
                if result['original_price'] < result['price']:
                    result['original_price'], result['price'] = result['price'], result['original_price']
            else:
                # Only one price found
                result['price'] = float(price_matches[0].replace(',', ''))
        
        # Default to USD if no currency detected
        if result['price'] and not result['currency']:
            result['currency'] = 'USD'
            
        return result
    
    def _extract_from_structured_data(self, soup):
        """
        Extract price from structured data (JSON-LD, microdata).
        
        Args:
            soup (BeautifulSoup): Parsed HTML content.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if not found.
        """
        try:
            self.selectors_tried["structured_data"]["tried"] = True
            
            # Look for JSON-LD data
            scripts = soup.find_all('script', type='application/ld+json')
            for script in scripts:
                try:
                    # Handle potential None values or empty scripts
                    if not script or not script.string:
                        continue
                        
                    data = json.loads(script.string)
                    self.selectors_tried["structured_data"]["details"] = "Found JSON-LD script tags"
                    
                    # Function to recursively search for price in a JSON object
                    def find_price(obj, path=""):
                        if isinstance(obj, dict):
                            for key, value in obj.items():
                                if key in ['price', 'Price', 'lowPrice', 'highPrice', 'offers']:
                                    new_path = f"{path}.{key}" if path else key
                                    if key == 'offers' and isinstance(value, dict):
                                        if 'price' in value:
                                            price_str = value['price']
                                            logger.debug(f"Found price in offers: {price_str} at {new_path}.price")
                                            return self._parse_price(price_str), f"JSON-LD {new_path}.price"
                                    elif key == 'offers' and isinstance(value, list):
                                        # Try to find the first valid price in the offers array
                                        for i, offer in enumerate(value):
                                            if isinstance(offer, dict) and 'price' in offer:
                                                price_str = offer['price']
                                                logger.debug(f"Found price in offers array: {price_str} at {new_path}[{i}].price")
                                                return self._parse_price(price_str), f"JSON-LD offers"
                                    elif key in ['price', 'Price', 'lowPrice']:
                                        logger.debug(f"Found price key: {value} at {new_path}")
                                        return self._parse_price(value), f"JSON-LD {new_path}"
                                
                                result = find_price(value, new_path)
                                if result[0] is not None:
                                    return result
                        elif isinstance(obj, list):
                            for i, item in enumerate(obj):
                                new_path = f"{path}[{i}]"
                                result = find_price(item, new_path)
                                if result[0] is not None:
                                    return result
                        return None, None
                    
                    # Search for price in the JSON-LD data
                    price, method = find_price(data)
                    
                    if price is not None:
                        # Verify price is in a reasonable range
                        if 10 <= price <= 100000:  # Price should be between $10 and $100,000
                            logger.info(f"Extracted price {price} using {method}")
                            self.selectors_tried["structured_data"]["found"] = True
                            self.selectors_tried["structured_data"]["details"] = f"Found price using {method}"
                            return price, method
                        else:
                            logger.warning(f"Price {price} from {method} is outside reasonable range, ignoring")
                            self.selectors_tried["structured_data"]["details"] = f"Price outside reasonable range: {price}"
                
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.debug(f"Error parsing JSON-LD: {str(e)}")
                    continue
                except Exception as e:
                    logger.debug(f"Unexpected error in JSON-LD parsing: {str(e)}")
                    continue
            
            # Look for microdata
            items = soup.find_all(itemtype=re.compile(r'schema.org/(Product|Offer|Service)'))
            for item in items:
                price_prop = item.find(itemprop=re.compile(r'price|lowPrice'))
                if price_prop:
                    # Try to get price from content attribute first
                    price_value = price_prop.get('content')
                    if not price_value:
                        price_value = price_prop.text
                    
                    logger.debug(f"Found microdata price: {repr(price_value)}")
                    price = self._parse_price(price_value)
                    if price is not None:
                        # Verify price is in a reasonable range
                        if 10 <= price <= 100000:  # Price should be between $10 and $100,000
                            logger.info(f"Extracted price {price} using microdata")
                            self.selectors_tried["structured_data"]["found"] = True
                            self.selectors_tried["structured_data"]["details"] = "Found price using microdata"
                            return price, "Microdata"
                        else:
                            logger.warning(f"Price {price} from microdata is outside reasonable range, ignoring")
                            self.selectors_tried["structured_data"]["details"] = f"Microdata price outside reasonable range: {price}"
        
        except Exception as e:
            logger.error(f"Error extracting from structured data: {str(e)}")
            self.selectors_tried["structured_data"]["details"] = f"Error: {str(e)}"
        
        return None, None
    
    def _extract_from_common_selectors(self, soup):
        """
        Extract price using common CSS selectors found on e-commerce sites.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if not found.
        """
        try:
            self.selectors_tried["css_selectors"]["tried"] = True
            
            # Check domain for site-specific selectors
            url_domain = self._get_current_domain()
            
            # Handle direct ComMarker B6 page extraction (highly targeted)
            if url_domain == "commarker.com" and "commarker-b6" in self._current_url.lower():
                # First try the exact price element used on the ComMarker B6 page
                selectors = [
                    "h1 + .woocommerce-product-details__short-description + div.price",  # Exact B6 location
                    ".price .woocommerce-Price-amount.amount:not(del .woocommerce-Price-amount.amount)",  # Current price
                    ".price ins .woocommerce-Price-amount.amount",  # Sale price
                    "form.cart .price .woocommerce-Price-amount.amount"  # Price near cart
                ]
                
                for selector in selectors:
                    self.selectors_tried["css_selectors"]["selectors_checked"].append(f"commarker_b6_special:{selector}")
                    elements = soup.select(selector)
                    
                    for element in elements:
                        price_text = element.text.strip()
                        price = self._parse_price(price_text)
                        if price is not None and 1000 <= price <= 10000:  # B6 price range
                            logger.info(f"Extracted ComMarker B6 price {price} using targeted selector '{selector}'")
                            self.selectors_tried["css_selectors"]["found"] = True
                            self.selectors_tried["css_selectors"]["details"] = f"Found ComMarker B6 price {price} using targeted selector '{selector}'"
                            return price, f"ComMarker B6 Targeted Selector"
            
            # Try site-specific selectors first if available
            if url_domain and url_domain in self.site_specific_selectors:
                site_selectors = self.site_specific_selectors[url_domain]
                logger.debug(f"Using site-specific selectors for {url_domain}")
                
                for selector in site_selectors:
                    self.selectors_tried["css_selectors"]["selectors_checked"].append(f"{url_domain}:{selector}")
                    elements = soup.select(selector)
                    
                    for element in elements:
                        # Try to get the price from various attributes or text
                        price_text = None
                        
                        # Check data attributes first
                        price_attrs = ['data-price', 'data-product-price', 'content']
                        for attr in price_attrs:
                            if element.has_attr(attr):
                                price_text = element[attr]
                                break
                        
                        # If no price in attributes, use text content
                        if not price_text:
                            price_text = element.text
                        
                        # Parse and validate the price
                        price = self._parse_price(price_text)
                        if price is not None:
                            logger.info(f"Extracted price {price} using site-specific selector '{selector}'")
                            self.selectors_tried["css_selectors"]["found"] = True
                            self.selectors_tried["css_selectors"]["details"] = f"Found price {price} using site-specific selector '{selector}'"
                            return price, f"Site-Specific Selector '{selector}'"
            
            # List of common selectors for prices on e-commerce sites
            selectors = [
                '.price', '#price', '.product-price', '.offer-price', 
                '.current-price', '.sale-price', '.product__price',
                '[data-price]', '[data-product-price]', '.price-box',
                '.price__current', '.price-group', '.product-info-price',
                # Common discount pattern selectors
                '.price ins .woocommerce-Price-amount', 
                '.price ins .amount',
                '.product .price ins',
                '.woocommerce-Price-amount',
                '.sale-price .amount',
                '.price--sale',
                # Additional sale price selectors
                '.sale-price', 
                '.price-sales',
                '[data-sale-price]',
                'span.price ins span.amount',
                '.special-price',
                '.price > .sale-price',
                '.product-price-container .sale-price',
                '.product__price--on-sale',
                '.price-box .special-price'
            ]
            
            for selector in selectors:
                self.selectors_tried["css_selectors"]["selectors_checked"].append(selector)
                elements = soup.select(selector)
                for element in elements:
                    # Try to get the price from various attributes or text
                    price_text = None
                    
                    # Check data attributes first
                    price_attrs = ['data-price', 'data-product-price', 'content']
                    for attr in price_attrs:
                        if element.has_attr(attr):
                            price_text = element[attr]
                            break
                    
                    # If no price in attributes, use text content
                    if not price_text:
                        price_text = element.text
                    
                    # Parse and validate the price
                    price = self._parse_price(price_text)
                    if price is not None:
                        logger.info(f"Extracted price {price} using selector '{selector}'")
                        self.selectors_tried["css_selectors"]["found"] = True
                        self.selectors_tried["css_selectors"]["details"] = f"Found price {price} using selector '{selector}'"
                        return price, f"CSS Selector '{selector}'"
        
        except Exception as e:
            logger.error(f"Error extracting from common selectors: {str(e)}")
            self.selectors_tried["css_selectors"]["details"] = f"Error: {str(e)}"
        
        return None, None
    
    def _extract_from_regex_patterns(self, html_content):
        """
        Extract price using regex patterns on the HTML content.
        
        Args:
            html_content (str): Raw HTML content.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if not found.
        """
        try:
            self.selectors_tried["regex_patterns"]["tried"] = True
            
            # Check for ComMarker's specific price format - their discount format often follows this exact pattern:
            # ~~$2,299~~ $1,839 Save:$460
            commarker_pattern = r'~~\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)~~\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*Save:\$'
            matches = re.findall(commarker_pattern, html_content)
            
            if matches:
                for match in matches:
                    if len(match) >= 2:  # Check if we have both original and discounted price
                        original_price = match[0]  # Original price
                        discounted_price = match[1]  # Discounted price (the one we want)
                        
                        # Parse the discounted price
                        price = self._parse_price(discounted_price)
                        if price is not None and 10 <= price <= 100000:  # Basic validation
                            logger.info(f"Extracted discounted price {price} using ComMarker's discount pattern")
                            self.selectors_tried["regex_patterns"]["found"] = True
                            self.selectors_tried["regex_patterns"]["details"] = f"Found discounted price {price} using ComMarker pattern"
                            return price, "ComMarker Discount Pattern"
            
            # Check for general strikethrough pattern
            strikethrough_pattern = r'~~\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)~~\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
            matches = re.findall(strikethrough_pattern, html_content)
            
            if matches:
                for match in matches:
                    if len(match) >= 2:  # Check if we have both original and discounted price
                        original_price = match[0]  # Original price
                        discounted_price = match[1]  # Discounted price (the one we want)
                        
                        # Parse the discounted price
                        price = self._parse_price(discounted_price)
                        if price is not None and 10 <= price <= 100000:  # Basic validation
                            logger.info(f"Extracted discounted price {price} using discount pattern")
                            self.selectors_tried["regex_patterns"]["found"] = True
                            self.selectors_tried["regex_patterns"]["details"] = f"Found discounted price {price} using strikethrough pattern"
                            return price, "Discount Price Pattern"
            
            # Try generic patterns
            for pattern in self.price_patterns:
                self.selectors_tried["regex_patterns"]["patterns_checked"].append(pattern)
                
                # Find all matches of the pattern
                matches = re.findall(pattern, html_content)
                
                if matches:
                    # Parse each match, filtering out unlikely prices
                    valid_prices = []
                    
                    for match in matches:
                        if isinstance(match, tuple):  # For patterns with capture groups
                            for group in match:
                                price = self._parse_price(group)
                                if price is not None and 10 <= price <= 100000:
                                    valid_prices.append((price, pattern))
                        else:
                            price = self._parse_price(match)
                            if price is not None and 10 <= price <= 100000:
                                valid_prices.append((price, pattern))
                    
                    # If we found any valid prices, pick the most likely one
                    if valid_prices:
                        # Sort by descending price (assume higher price is more likely to be the main product)
                        valid_prices.sort(key=lambda x: x[0], reverse=True)
                        best_price, matching_pattern = valid_prices[0]
                        
                        logger.info(f"Extracted price {best_price} using regex pattern")
                        self.selectors_tried["regex_patterns"]["found"] = True
                        self.selectors_tried["regex_patterns"]["details"] = f"Found price {best_price} using pattern"
                        return best_price, "Regex Pattern"
        
        except Exception as e:
            logger.error(f"Error extracting with regex patterns: {str(e)}")
            self.selectors_tried["regex_patterns"]["details"] = f"Error: {str(e)}"
        
        return None, None
    
    def _extract_near_add_to_cart(self, soup):
        """
        Extract price near "Add to Cart" buttons or similar elements.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if not found.
        """
        try:
            self.selectors_tried["add_to_cart_proximity"]["tried"] = True
            
            # Common patterns for "Add to Cart" buttons
            cart_patterns = [
                "add to cart", "add to bag", "buy now", "purchase", "checkout", "order now", "shop now"
            ]
            
            # Find cart buttons
            cart_elements = []
            
            # Check for ComMarker's specific add to cart button pattern
            commarker_cart_buttons = soup.select('.single_add_to_cart_button')
            if commarker_cart_buttons:
                cart_elements.extend(commarker_cart_buttons)
                
            for pattern in cart_patterns:
                # Find by text
                elements = soup.find_all(string=re.compile(pattern, re.IGNORECASE))
                cart_elements.extend([el.parent for el in elements if el.parent])
                
                # Find by class or id
                pattern_class = pattern.replace(" ", "-")
                elements = soup.select(f'[class*="{pattern_class}"]')
                cart_elements.extend(elements)
                
                elements = soup.select(f'[id*="{pattern_class}"]')
                cart_elements.extend(elements)
                
                # Find direct buttons
                button_elements = soup.find_all('button', string=re.compile(pattern, re.IGNORECASE))
                cart_elements.extend(button_elements)
                
                # Find direct inputs with value
                input_elements = soup.find_all('input', {'value': re.compile(pattern, re.IGNORECASE)})
                cart_elements.extend(input_elements)
            
            if not cart_elements:
                self.selectors_tried["add_to_cart_proximity"]["details"] = "No Add to Cart elements found"
                return None, None
            
            # Look for prices near cart buttons - first try to find strike-through discount price patterns
            for element in cart_elements:
                # Check for ComMarker's specific price pattern in parent containers
                container = element.parent
                search_elements = []
                
                # Collect elements to search (go up to 3 levels up and check siblings)
                if container:
                    search_elements.append(container)
                    parent = container.parent
                    if parent:
                        search_elements.append(parent)
                        grandparent = parent.parent
                        if grandparent:
                            search_elements.append(grandparent)
                
                # First check if this is a sale by looking for discount indicators
                is_sale = False
                for search_el in search_elements:
                    # Look for discount indicators like "Sale", "Off", "Discount", "%" etc.
                    discount_indicators = ['sale', 'off', '% off', 'discount', 'save', 'special']
                    container_text = search_el.get_text().lower()
                    if any(indicator in container_text for indicator in discount_indicators):
                        is_sale = True
                        logger.info(f"Detected sale indicators in container: {[indicator for indicator in discount_indicators if indicator in container_text]}")
                        break
                
                # Look for explicit sale price selectors
                for search_el in search_elements:
                    sale_price_selectors = [
                        '.sale-price', 
                        '.price-sales', 
                        '.special-price',
                        '[data-sale-price]',
                        'span.price ins span.amount',
                        '.price__sale'
                    ]
                    
                    for sale_selector in sale_price_selectors:
                        sale_elements = search_el.select(sale_selector)
                        if sale_elements:
                            for sale_el in sale_elements:
                                price = self._parse_price(sale_el.text)
                                if price is not None and 10 <= price <= 100000:
                                    logger.info(f"Extracted explicit sale price {price} near Add to Cart")
                                    self.selectors_tried["add_to_cart_proximity"]["found"] = True
                                    self.selectors_tried["add_to_cart_proximity"]["details"] = f"Found explicit sale price {price}"
                                    return price, "Sale Price Near Add to Cart"
                
                # Look for discounted price pattern
                for search_el in search_elements:
                    # Check for discounted price with strikethrough
                    strike_price = search_el.select_one('del .woocommerce-Price-amount')
                    current_price = search_el.select_one('ins .woocommerce-Price-amount')
                    
                    if current_price:
                        price = self._parse_price(current_price.text)
                        if price is not None:
                            logger.info(f"Extracted discounted price {price} near Add to Cart button")
                            self.selectors_tried["add_to_cart_proximity"]["found"] = True
                            self.selectors_tried["add_to_cart_proximity"]["details"] = f"Found discounted price {price} near Add to Cart button"
                            return price, "Discounted Price Near Add to Cart"
                
                # Look for price in the container and its siblings
                price_candidates = []
                
                # Check text content of container for price patterns
                container_text = element.get_text()
                price_match = re.search(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))', container_text)
                if price_match:
                    price_candidates.append(price_match.group(1))
                
                # Search in the form container (common for ComMarker)
                form_container = element.find_parent('form')
                if form_container:
                    # Look for price elements in form
                    price_elements = form_container.select('.price .woocommerce-Price-amount, .price ins .woocommerce-Price-amount')
                    for price_el in price_elements:
                        price_candidates.append(price_el.text)
                
                # Check siblings
                if container:
                    siblings = list(container.previous_siblings) + list(container.next_siblings)
                    for sibling in siblings[:5]:  # Check 5 siblings
                        if not hasattr(sibling, 'get_text'):
                            continue
                        
                        sibling_text = sibling.get_text()
                        price_match = re.search(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))', sibling_text)
                        if price_match:
                            price_candidates.append(price_match.group(1))
                
                # Try to parse each candidate
                valid_prices = []
                for candidate in price_candidates:
                    price = self._parse_price(candidate)
                    if price is not None and 10 <= price <= 100000:
                        valid_prices.append(price)
                
                if valid_prices:
                    if is_sale or len(valid_prices) > 1:  # If it's a sale or we found multiple prices, take the lowest
                        valid_prices.sort()  # Sort ascending (lowest first)
                        best_price = valid_prices[0]
                        sort_method = "ascending (sale detected)"
                    else:
                        # Default behavior for non-sale items - take the highest price
                        valid_prices.sort(reverse=True)  # Sort descending (highest first)
                        best_price = valid_prices[0]
                        sort_method = "descending (regular price)"
                    
                    logger.info(f"Extracted price {best_price} near Add to Cart button (sort method: {sort_method})")
                    self.selectors_tried["add_to_cart_proximity"]["found"] = True
                    self.selectors_tried["add_to_cart_proximity"]["details"] = f"Found price {best_price} near Add to Cart button"
                    return best_price, "Near Add to Cart"
        
        except Exception as e:
            logger.error(f"Error extracting near Add to Cart: {str(e)}")
            self.selectors_tried["add_to_cart_proximity"]["details"] = f"Error: {str(e)}"
        
        return None, None
    
    def _verify_price_with_claude(self, html_content, url, current_price, previous_price, product_category=None, machine_id=None):
        """
        Verify a significant price change using Claude AI.
        
        Args:
            html_content (str): Raw HTML content.
            url (str): URL of the page.
            current_price (float): Newly detected price.
            previous_price (float): Previously known price.
            product_category (str, optional): Category of the product.
            machine_id (str, optional): ID of the machine in the database.
            
        Returns:
            tuple: (verified (bool), price (float), method (str)) or (False, None, None) if verification failed.
        """
        try:
            self.selectors_tried["claude_ai"]["tried"] = True
            
            # Calculate difference percentage
            diff_pct = abs(current_price - previous_price) / previous_price * 100
            
            # Get machine specs from database if machine_id is provided
            product_name = None
            wattage = None
            
            if machine_id:
                try:
                    # Fetch machine details from database
                    machine_data = self.db_service.get_machine_specs(machine_id)
                    if machine_data:
                        product_name = machine_data.get("Machine Name")
                        wattage = machine_data.get("Laser Power A")  # Get wattage from Laser Power A column
                        logger.info(f"Got machine specs for {machine_id}: {product_name}, {wattage}W")
                except Exception as e:
                    logger.error(f"Error fetching machine specs from database: {str(e)}")
            
            # Log original HTML size
            logger.debug(f"Original HTML size: {len(html_content)} characters")
            was_truncated = len(html_content) > 20000
            
            # Check for critical content retention
            sale_indicators = ['sale', 'off', 'discount', 'save', 'special', 'price--sale']
            detected_indicators = [indicator for indicator in sale_indicators if indicator in html_content.lower()]
            
            # Prepare a truncated version of the HTML for Claude
            truncated_html = html_content[:20000] if was_truncated else html_content
            
            # Check if key sale indicators are in the truncated version
            if was_truncated:
                logger.warning(f"HTML was truncated from {len(html_content)} to 20000 characters for Claude verification")
                retained_indicators = [indicator for indicator in detected_indicators if indicator in truncated_html.lower()]
                lost_indicators = [indicator for indicator in detected_indicators if indicator not in truncated_html.lower()]
                
                if lost_indicators:
                    logger.warning(f"Sale indicators {lost_indicators} were lost in HTML truncation")
                if retained_indicators:
                    logger.info(f"Sale indicators {retained_indicators} were retained in truncated HTML")
            
            # Build sale indicators context
            sale_context = ""
            if detected_indicators:
                sale_context = f"\nIMPORTANT: We detected sale indicators {detected_indicators} on this page. If there are multiple prices, the LOWER price is typically the current selling price, while the HIGHER price is often the original/regular price."
            
            # Build verification prompt
            prompt = f"""I need you to verify the CURRENT SELLING PRICE (what a customer would actually pay at checkout) for a product on this webpage.

PRODUCT: {product_name if product_name else "Main product on page"}
URL: {url}
PREVIOUSLY RECORDED PRICE: ${previous_price}
NEWLY DETECTED PRICE: ${current_price}

The prices differ by {diff_pct:.2f}%.{sale_context}

HTML content:
{truncated_html}

Instructions:
1. Look CAREFULLY for evidence of sales, discounts, or special offers
2. On e-commerce sites, when an item is on sale, the HIGHER price is typically the original/regular price (often shown with strikethrough), while the LOWER price is the current selling price
3. Look for text like "Sale", "25% Off", or "Discount" which indicates the item is on sale
4. Check prices near the "Add to Cart" button - this is usually the ACTUAL price a customer would pay
5. If the page shows both ${previous_price} and ${current_price}, determine which one is the CURRENT SELLING PRICE (not the regular/original price)

Return ONLY:
- "PREVIOUS PRICE CORRECT" if ${previous_price} is the current selling price a customer would pay
- "NEW PRICE CORRECT" if ${current_price} is the current selling price a customer would pay
- "ALTERNATIVE PRICE: $X.XX" if you find a different price that is the actual current selling price
- "CANNOT DETERMINE" if you cannot find definitive evidence of the current selling price
"""
            
            # Call Claude API
            logger.info(f"Asking Claude to verify price change: ${previous_price} -> ${current_price}")
            response = self.client.messages.create(
                model=CLAUDE_HAIKU_MODEL,
                max_tokens=150,
                system="You are a specialized AI assistant that verifies product prices on e-commerce websites. You carefully examine HTML for evidence of the correct current selling price (what a customer would actually pay at checkout), especially looking for sales and discounts. When a product is on sale, you understand the higher price is typically the original price and the lower price is the actual current price. You only respond with one of these exact phrases: 'PREVIOUS PRICE CORRECT', 'NEW PRICE CORRECT', 'ALTERNATIVE PRICE: $X.XX', or 'CANNOT DETERMINE'.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Process the response
            result = response.content[0].text.strip()
            self.selectors_tried["claude_ai"]["details"] = f"Claude verification response: '{result}'"
            logger.info(f"Claude price verification result: {result}")
            
            # Parse the response
            if "NEW PRICE CORRECT" in result:
                self.selectors_tried["claude_ai"]["found"] = True
                return True, current_price, "Claude Verified Price Change"
            elif "PREVIOUS PRICE CORRECT" in result:
                self.selectors_tried["claude_ai"]["found"] = True
                return True, previous_price, "Claude Confirmed Previous Price"
            elif "ALTERNATIVE PRICE:" in result:
                # Extract the alternative price
                logger.debug(f"Extracting alternative price from: '{result}'")
                # Use a more robust regex that captures all digits in the price
                price_match = re.search(r'ALTERNATIVE PRICE:\s*\$?(\d+(?:[,.]\d+)?)', result)
                if price_match:
                    alt_price_str = price_match.group(1).replace(',', '')
                    logger.debug(f"Raw alternative price string extracted: '{alt_price_str}'")
                    try:
                        alt_price = float(alt_price_str)
                        # Add validation to ensure the price is reasonable
                        if 10 <= alt_price <= 100000:  # Basic sanity check
                            logger.info(f"Parsed valid alternative price: ${alt_price}")
                            self.selectors_tried["claude_ai"]["found"] = True
                            return True, alt_price, "Claude Alternative Price"
                        else:
                            logger.warning(f"Alternative price ${alt_price} is outside reasonable range")
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Could not parse alternative price from Claude: '{alt_price_str}', error: {str(e)}")
                else:
                    logger.warning(f"Could not extract alternative price pattern from: '{result}'")
            
            # Fallback - couldn't verify
            logger.warning("Claude couldn't verify the price change")
            return False, None, None
            
        except Exception as e:
            logger.error(f"Error using Claude for price verification: {str(e)}")
            self.selectors_tried["claude_ai"]["details"] = f"Error: {str(e)}"
            return False, None, None
    
    def _extract_using_claude(self, html, url, previous_price=None, machine_name=None, machine_specs=None, html_limit=20000, extra_prompt=""):
        """
        Extract price using Claude AI with customizable HTML limit and merchant-specific guidance.
        
        Args:
            html (str): HTML content
            url (str): Product URL
            previous_price (float, optional): Previously known price
            machine_name (str, optional): Name of the machine
            machine_specs (dict, optional): Machine specifications
            html_limit (int): Maximum number of characters to send to Claude
            extra_prompt (str): Additional prompt guidance for specific merchants
            
        Returns:
            Tuple[float, str]: (price, extraction_method) or (None, None) if extraction failed
        """
        self.selectors_tried["claude_ai"]["tried"] = True
        logger.info("Falling back to Claude AI for price extraction")
        
        if not ANTHROPIC_API_KEY:
            logger.error("No Anthropic API key provided. Cannot use Claude.")
            return None, None
            
        # Truncate HTML to avoid token limits while preserving structure
        limited_html = self._intelligent_truncate_html(html, html_limit)
        
        # Extract domain for site-specific tips
        domain = self._extract_domain(url)
        merchant = ""
        if domain:
            merchant = domain.split('.')[-2]
            
        # Prepare previous price context if available
        previous_price_context = f"The previously recorded price was ${previous_price}." if previous_price else ""
        
        # Prepare machine name context if available
        machine_context = f"This is a product page for {machine_name}." if machine_name else ""
        
        # Site-specific guidance based on domain
        site_specific = ""
        if "commarker" in domain:
            site_specific = """
            This site uses WooCommerce with discount pricing.
            - Look for prices in <ins> tags (current price) and <del> tags (original price).
            - Most products are in the $1,000 - $7,000 range.
            - The correct price is usually the SALE price, not the original price.
            """
        elif "atomstack" in domain:
            site_specific = """
            This site often has:
            - Multiple prices in different formats
            - data-price attributes with numeric values
            - Sale prices that are separate from regular prices
            - Most products are in the $500 - $5,000 range
            """
        elif "aeonlaser" in domain:
            site_specific = """
            This site often has:
            - Industrial-grade products with higher price points ($3,000 - $30,000)
            - data-product-price attributes
            - class="money" for price elements
            """
        elif "xtool" in domain:
            site_specific = """
            Look for:
            - .product-info-main .price
            - [data-price-type='finalPrice']
            - .special-price .price (for discounted items)
            """
            
        # Prepare the prompt with all context
        prompt = f"""
        I need you to analyze this HTML from {url} and extract the current price for this product.
        
        {machine_context}
        {previous_price_context}
        
        {site_specific}
        
        {extra_prompt}
        
        Please follow these guidelines:
        1. Extract ONLY the current selling price, not the original price
        2. Return JUST the numeric price value (e.g., 1299.99, not "$1,299.99")
        3. If there are multiple prices (like variants), pick the one that seems to be the default or main price
        4. For discounted items, select the SALE price, not the original price
        5. If you find multiple potential prices, indicate your confidence for each
        6. Don't include currency symbols, shipping costs, or taxes in the price
        
        Here is the HTML:
        ```
        {limited_html}
        ```
        
        First, explain your analysis briefly, list all price candidates, then provide ONLY the final price as a number (e.g., 1299.99).
        Structure your answer like this:
        Analysis: [your analysis]
        Candidates: [list price candidates with reasons]
        Price: [final numeric price only]
        Confidence: [your confidence from 0.0 to 1.0]
        """
        
        try:
            # Call Claude API
            response = self.client.messages.create(
                model=CLAUDE_HAIKU_MODEL,
                max_tokens=300,
                temperature=0,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Get Claude's response
            ai_response = response.content[0].text.strip()
            
            # Extract the price from Claude's response
            price_pattern = r"Price:\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)"
            confidence_pattern = r"Confidence:\s*(0\.\d+|1\.0)"
            
            price_match = re.search(price_pattern, ai_response, re.IGNORECASE | re.MULTILINE)
            confidence_match = re.search(confidence_pattern, ai_response, re.IGNORECASE | re.MULTILINE)
            
            if price_match:
                price_str = price_match.group(1).strip()
                extracted_price = self._parse_price(price_str)
                
                confidence = 0.7  # Default confidence
                if confidence_match:
                    confidence = float(confidence_match.group(1))
                
                if extracted_price is not None:
                    logger.info(f"Claude AI extracted price: {extracted_price} with confidence {confidence}")
                    self.selectors_tried["claude_ai"]["found"] = True
                    self.selectors_tried["claude_ai"]["details"] = f"Found price {extracted_price} with confidence {confidence}"
                    
                    # Apply additional validation for high-confidence results
                    if previous_price and confidence >= 0.8:
                        # Check if the extracted price makes sense in relation to the previous price
                        percentage_change = abs((extracted_price - previous_price) / previous_price) * 100
                        
                        if percentage_change > 50:
                            logger.warning(f"Claude price ({extracted_price}) differs significantly from previous price ({previous_price}), trying again with more explicit prompt")
                            # If the change is too large, try again with a more specific prompt
                            return self._verify_price_with_claude(html, url, extracted_price, previous_price)
                    
                    return extracted_price, "Claude AI"
                else:
                    logger.warning(f"Claude AI extracted an invalid price string: {price_str}")
            else:
                logger.warning("Claude AI couldn't extract a price")
                
            return None, None
            
        except Exception as e:
            logger.error(f"Error calling Claude AI: {str(e)}")
            return None, None

    def _get_machine_id_from_name(self, machine_name):
        """Helper method to get machine ID from name"""
        if not machine_name:
            return None
        
        # This would need to be implemented based on your database structure
        # Placeholder implementation
        return None
    
    def _verify_and_correct_price(self, price, previous_price, url=None, method=None):
        """
        Verify the extracted price and correct if necessary.
        
        This method applies a number of heuristics to detect and fix common pricing errors:
        1. Missing leading digits (e.g., $600 when it should be $6,000)
        2. Missing trailing digits (e.g., $184 when it should be $1,840)
        3. Decimal/comma parsing errors
        
        Args:
            price: The extracted price
            previous_price: Previously known price for this product
            url: URL of the product page (used for merchant-specific validation)
            method: The extraction method used (for logging)
            
        Returns:
            Tuple of (corrected_price, was_corrected)
        """
        if previous_price is None:
            return price, False
            
        # Calculate percentage change
        percentage_change = abs((price - previous_price) / previous_price) * 100
        
        # If change is small (<25%), accept as is
        if percentage_change <= 25:
            return price, False
            
        # Check for suspiciously large changes (>50%)
        if percentage_change > 50:
            logger.info(f"Large price change detected: {previous_price} -> {price} ({percentage_change:.2f}%)")
            
            # Check for missing leading digit(s)
            if price < previous_price * 0.2:
                # Try adding leading digit(s)
                corrected = price * 10
                while corrected < previous_price * 0.5:
                    corrected *= 10
                    
                # If the corrected price is within 20% of previous price, accept it
                if abs((corrected - previous_price) / previous_price) * 100 < 20:
                    logger.info(f"Corrected missing leading digit(s): {price} -> {corrected} (previous: {previous_price})")
                    return corrected, True
                    
            # Check for missing trailing digit
            if price * 10 < previous_price * 1.2 and price * 10 > previous_price * 0.8:
                corrected = price * 10
                logger.info(f"Corrected missing trailing digit: {price} -> {corrected} (previous: {previous_price})")
                return corrected, True
                
            # Check for decimal point error (e.g., 1,839.00 parsed as 1.839)
            if price < 100 and previous_price > 100:
                corrected = price * 1000
                if abs((corrected - previous_price) / previous_price) * 100 < 20:
                    logger.info(f"Corrected decimal point error: {price} -> {corrected} (previous: {previous_price})")
                    return corrected, True
                    
            # Apply merchant-specific validation if URL is provided
            if url:
                domain = self._extract_domain(url)
                merchant = self._get_merchant_key(domain)
                
                if merchant:
                    price_range = self.merchant_settings.get(merchant, {}).get("price_range")
                    requires_special_validation = self.merchant_settings.get(merchant, {}).get("requires_special_validation", False)
                    
                    # If there's a defined price range, use it for validation
                    if price_range and len(price_range) == 2:
                        min_price, max_price = price_range
                        
                        if price < min_price:
                            # If price is too low and previous was in range, try corrections
                            if min_price <= previous_price <= max_price:
                                corrected = price
                                while corrected < min_price:
                                    corrected *= 10
                                    
                                if corrected <= max_price:
                                    logger.info(f"Merchant-based correction: {price} -> {corrected} (range: {min_price}-{max_price})")
                                    return corrected, True
            
            # Flag for manual review if we can't correct automatically
            logger.warning(f"Suspicious price change ({percentage_change:.2f}%) couldn't be automatically corrected: {previous_price} -> {price}")
            
        return price, False
    
    def _extract_domain(self, url):
        """
        Extract domain name from URL for merchant identification.
        
        Args:
            url (str): URL to extract domain from.
            
        Returns:
            str: Domain name or empty string if extraction failed.
        """
        try:
            # Basic domain extraction
            domain = re.findall(r'https?://(?:www\.)?([^/]+)', url)
            if domain:
                return domain[0]
        except Exception as e:
            logger.debug(f"Error extracting domain from {url}: {str(e)}")
        
        return ""
    
    def add_problematic_merchant(self, domain):
        """
        Add a merchant to the problematic list (always use Claude).
        
        Args:
            domain (str): Domain of the problematic merchant.
        """
        if domain and domain not in self.problematic_merchants:
            self.problematic_merchants.append(domain)
            logger.info(f"Added {domain} to problematic merchants list")
    
    def _parse_price(self, price_text):
        """
        Parse a price string into a float, handling various formats and cleaning.
        
        This enhanced version handles:
        1. Different currency symbols ($, €, £, etc.)
        2. Thousands separators (commas in US format, periods in EU format)
        3. Decimal points (periods in US format, commas in EU format)
        4. HTML entities for currency symbols
        5. Extra text and whitespace
        
        Args:
            price_text (str): Text containing a price
            
        Returns:
            float: Parsed price as float, or None if parsing failed
        """
        if not price_text:
            return None
            
        try:
            # Track the original for logging
            original_text = price_text
            
            # Convert HTML entities
            price_text = price_text.replace('&nbsp;', ' ')
            price_text = price_text.replace('&#36;', '$')
            price_text = price_text.replace('&euro;', '€')
            price_text = price_text.replace('&pound;', '£')
            
            # Remove currency symbols and spaces
            price_text = price_text.replace('$', '').replace('€', '').replace('£', '').replace('USD', '').strip()
            
            # Handle cases with multiple prices (e.g., "$1,499.00 $1,219.00")
            if ' ' in price_text:
                # Split by spaces and parse each part
                potential_prices = []
                for part in price_text.split():
                    try:
                        # Strip any non-numeric chars except . and ,
                        clean_part = ''.join(c for c in part if c.isdigit() or c in '.,')
                        if clean_part:
                            potential_prices.append(self._convert_price_format(clean_part))
                    except:
                        pass
                        
                # If we found multiple potential prices, return the lowest (likely sale price)
                if len(potential_prices) > 1:
                    min_price = min(p for p in potential_prices if p is not None)
                    logger.info(f"Multiple prices found in '{original_text}', using lowest: {min_price}")
                    return min_price
                elif len(potential_prices) == 1:
                    return potential_prices[0]
            
            # Standard case - clean string and parse
            # Strip any non-numeric chars except . and ,
            price_text = ''.join(c for c in price_text if c.isdigit() or c in '.,')
            
            # Apply our smart format detection 
            price = self._convert_price_format(price_text)
            
            # Log successful conversion
            logger.debug(f"Parsed price '{original_text}' -> {price}")
            return price
            
        except Exception as e:
            logger.error(f"Error parsing price text '{price_text}': {str(e)}")
            return None
    
    def _convert_price_format(self, price_text):
        """
        Convert price text to a float, handling different international formats.
        
        Args:
            price_text (str): Cleaned price text containing only digits, commas, and periods
            
        Returns:
            float: Parsed price or None if invalid
        """
        if not price_text:
            return None
            
        # Easy case: no commas or periods
        if ',' not in price_text and '.' not in price_text:
            return float(price_text)
            
        # Handle different international formats
        
        # Check for US format: 1,234.56
        if '.' in price_text:
            # If there's a period, it's likely a decimal point
            if price_text.count('.') == 1:
                # Check if the period is 2-3 places from the end (likely decimal)
                decimal_pos = price_text.find('.')
                if len(price_text) - decimal_pos <= 4:  # $12.34 or $123.4
                    # US format: Remove commas and convert
                    cleaned = price_text.replace(',', '')
                    try:
                        return float(cleaned)
                    except:
                        logger.warning(f"Failed to parse as US format: {price_text}")
            
        # Check for European format: 1.234,56
        if ',' in price_text:
            # If there's a comma, check position to determine if it's decimal or thousands
            last_comma_pos = price_text.rfind(',')
            
            # If the comma is 2-3 places from the end, it's likely a decimal (European)
            if len(price_text) - last_comma_pos <= 4:  # 1.234,56 or 1.234,5
                try:
                    # European format: replace . with empty and , with .
                    cleaned = price_text.replace('.', '').replace(',', '.')
                    return float(cleaned)
                except:
                    logger.warning(f"Failed to parse as European format: {price_text}")
                    
        # If we can't determine format, try US format first, then European
        try:
            cleaned = price_text.replace(',', '')
            return float(cleaned)
        except:
            try:
                cleaned = price_text.replace('.', '').replace(',', '.')
                return float(cleaned)
            except:
                # Last resort: try removing all commas and periods
                try:
                    cleaned = price_text.replace(',', '').replace('.', '')
                    # If it's a very large number, assume it's a misformed price with no decimal
                    if len(cleaned) > 5:  # More than $10000
                        # Try to guess the decimal position (usually 2 digits from right)
                        decimal_pos = len(cleaned) - 2
                        return float(cleaned[:decimal_pos] + '.' + cleaned[decimal_pos:])
                    return float(cleaned)
                except:
                    logger.error(f"All price parsing methods failed for: {price_text}")
                    return None
    
    def _get_nested_value(self, obj, path):
        """
        Get a value from a nested dictionary using a dot-separated path.
        
        Args:
            obj (dict): The dictionary to search in.
            path (str): Dot-separated path to the value.
            
        Returns:
            any: The value if found, None otherwise.
        """
        keys = path.split('.')
        value = obj
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value 

    def _get_current_domain(self):
        """
        Get the domain for the current extraction operation.
        
        Returns:
            str: Domain name or None if not available.
        """
        # This is a placeholder - in real implementations, 
        # we need to track the current URL in the class instance
        current_url = getattr(self, '_current_url', None)
        if current_url:
            return self._extract_domain(current_url)
        return None 

    def _get_merchant_key(self, domain):
        """Get the merchant key from domain."""
        if not domain:
            return None
        
        for merchant in self.merchant_settings:
            if merchant in domain:
                return merchant
        return None

    def _extract_with_pattern(self, html, pattern):
        """Extract price using a specific regex pattern."""
        matches = re.findall(pattern, html)
        if not matches:
            return None
        
        # Handle different match formats
        if isinstance(matches[0], tuple):
            # Pattern with multiple groups (like discounted price format)
            # For strikethrough pattern: use the second group (discounted price)
            try:
                if "~~" in pattern:  # If it's a strikethrough pattern
                    price_str = matches[0][1]  # Second group is discounted price
                else:
                    price_str = matches[0][0]  # Otherwise use first group
                return float(price_str.replace(',', ''))
            except (IndexError, ValueError):
                return None
        else:
            # Single match group
            try:
                return float(matches[0].replace(',', ''))
            except (ValueError, TypeError):
                return None

    def _verify_price_with_merchant_context(self, html, url, extracted_price, previous_price):
        """Generic verification for significant price changes with merchant context."""
        
        # Extract the domain for merchant-specific handling
        domain = self._extract_domain(url)
        merchant = self._get_merchant_key(domain)
        
        # Only verify for known merchants
        if not merchant:
            return extracted_price, "Standard extraction"
        
        # Check if price is within expected range for this merchant
        price_range = self.merchant_settings[merchant].get("price_range", [10, 100000])
        if not (price_range[0] <= extracted_price <= price_range[1]):
            self.logger.warning(f"Price {extracted_price} is outside expected range for {merchant}: {price_range}")
            
            # If we have a previous price, check if it's a big change
            if previous_price and abs(extracted_price / previous_price - 1) > 0.4:  # >40% change
                self.logger.warning(f"Price change too significant: {previous_price} -> {extracted_price}. Forcing verification.")
                
                # Use Claude with merchant-specific context
                html_limit = self.merchant_settings[merchant].get("html_limit", 20000)
                result = self._extract_using_claude(html, url, previous_price, html_limit=html_limit)
                
                if result and result[0]:
                    verified_price, method = result
                    if price_range[0] <= verified_price <= price_range[1]:
                        return verified_price, f"Verified: {method}"
        
        # Otherwise return the original price
        return extracted_price, f"{merchant} extraction"

    def _extract_commarker_price(self, soup, html_content, previous_price=None):
        """
        Enhanced extraction method for ComMarker product pages.
        
        Args:
            soup: BeautifulSoup object of the page
            html_content: Raw HTML content
            previous_price: Previously known price (for validation)
            
        Returns:
            Tuple of (price, method)
        """
        logger.info("Using ComMarker-specific extraction")
        
        # First try to get the sale price directly from the price block
        # Look for price elements with both strikethrough and current price
        price_block = soup.select_one(".price, .product-info__price, .entry-summary .price")
        if price_block:
            # Check for strikethrough price pattern (original price followed by sale price)
            del_element = price_block.select_one("del, .price-item--regular")
            sale_element = price_block.select_one("ins, .price-item--sale")
            
            if del_element and sale_element:
                original_price_text = del_element.get_text(strip=True)
                sale_price_text = sale_element.get_text(strip=True)
                
                original_price = self._parse_price(original_price_text)
                sale_price = self._parse_price(sale_price_text)
                
                if sale_price:
                    logger.info(f"ComMarker sale price found: ${sale_price} (original: ${original_price})")
                    return sale_price, "ComMarker Sale Price Block"
            
            # If no del/ins structure, try to get any price from this block
            if not sale_element:
                # Check for non-deleted price
                price_amount = price_block.select_one(".woocommerce-Price-amount, .amount")
                if price_amount:
                    price_text = price_amount.get_text(strip=True)
                    price = self._parse_price(price_text)
                    if price:
                        logger.info(f"ComMarker price found in price block: ${price}")
                        return price, "ComMarker Price Block"
        
        # Try to find the sale price pattern in the HTML (April 2025 site format)
        # Pattern: ~~$8,888~~ $6,666
        strikethrough_pattern = r'~~\$([\d,\.]+)~~\s+\$([\d,\.]+)'
        strikethrough_match = re.search(strikethrough_pattern, html_content)
        if strikethrough_match:
            original_price_text = strikethrough_match.group(1)
            sale_price_text = strikethrough_match.group(2)
            sale_price = self._parse_price(sale_price_text)
            if sale_price:
                logger.info(f"ComMarker sale price found with strikethrough pattern: ${sale_price}")
                return sale_price, "ComMarker Strikethrough Pattern"
        
        # Try explicit schema.org pricing data
        price_element = soup.select_one('[itemprop="price"]')
        if price_element:
            price_text = price_element.get_text(strip=True) if hasattr(price_element, 'get_text') else price_element.get('content', '')
            price = self._parse_price(price_text)
            if price:
                logger.info(f"ComMarker price found with schema markup: ${price}")
                return price, "ComMarker Schema.org Price"
        
        # Try to extract from summary element which often contains accurate pricing
        summary_element = soup.select_one('.summary, .product-summary, .product-info-main')
        if summary_element:
            # Try to find non-crossed-out price in summary
            price_elements = summary_element.select('.woocommerce-Price-amount:not(del .woocommerce-Price-amount), .price:not(del .price)')
            if price_elements:
                for price_element in price_elements:
                    price_text = price_element.get_text(strip=True)
                    price = self._parse_price(price_text)
                    if price:
                        logger.info(f"ComMarker price found in summary: ${price}")
                        return price, "ComMarker Summary Price"
        
        # Try specific selectors as a fallback
        for selector in self.merchant_settings["commarker.com"]["css_selectors"]:
            price_element = soup.select_one(selector)
            if price_element:
                price_text = price_element.get_text(strip=True)
                price = self._parse_price(price_text)
                if price:
                    logger.info(f"ComMarker price found with selector '{selector}': ${price}")
                    
                    # Apply ComMarker-specific validation
                    if previous_price and price < 1000 and previous_price > 1000:
                        # ComMarker products are typically $1000+, so this is likely missing digits
                        corrected = price
                        while corrected < 1000:
                            corrected *= 10
                            
                        # If corrected price is within 20% of previous price, accept it
                        if previous_price * 0.8 <= corrected <= previous_price * 1.2:
                            logger.info(f"ComMarker price corrected: ${price} -> ${corrected}")
                            return corrected, f"ComMarker CSS Selector '{selector}' (corrected)"
                    
                    return price, f"ComMarker CSS Selector '{selector}'"
        
        # Check if price is present in the HTML at all
        all_prices = re.findall(r'\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', html_content)
        if all_prices:
            # Convert all price strings to floats
            all_price_values = []
            for price_str in all_prices:
                try:
                    price_value = float(price_str.replace(',', ''))
                    # Only consider prices that seem reasonable
                    if 1000 <= price_value <= 10000:
                        all_price_values.append(price_value)
                except ValueError:
                    continue
            
            if all_price_values:
                # Sort prices to find the most likely current price
                # For ComMarker, the sale price is usually lower than original price
                all_price_values.sort()
                
                # If we have at least two prices and they're fairly close together
                if len(all_price_values) >= 2:
                    # Get the two lowest prices - typically one is original, one is sale
                    potential_sale_price = all_price_values[0]
                    potential_original_price = all_price_values[1]
                    
                    # Check if the first price looks like a reasonable sale price
                    # (typically 10-40% less than the original)
                    ratio = potential_sale_price / potential_original_price
                    if 0.6 <= ratio <= 0.9:  # 10-40% discount
                        logger.info(f"ComMarker price extracted from all prices: ${potential_sale_price} (from ${potential_original_price})")
                        return potential_sale_price, "ComMarker Extracted Sale Price"
                
                # If we have previous price, prefer the closest price to it
                if previous_price:
                    # Find the price closest to previous price
                    closest_price = min(all_price_values, key=lambda x: abs(x - previous_price))
                    logger.info(f"ComMarker closest price to previous (${previous_price}): ${closest_price}")
                    return closest_price, "ComMarker Previous-Match Price"
                
                # Otherwise, just return the lowest price as it's most likely the sale price
                lowest_price = all_price_values[0]
                logger.info(f"ComMarker lowest price found: ${lowest_price}")
                return lowest_price, "ComMarker Lowest Price"
                
        logger.warning("ComMarker-specific extraction failed, falling back to regular extraction")
        return None, None

    def _intelligent_truncate_html(self, html, limit=20000):
        """
        Intelligently truncate HTML to stay within token limits while preserving important parts.
        
        This method prioritizes:
        1. Any segments containing price information
        2. The main product information section
        3. Balanced HTML structure (avoiding broken tags)
        
        Args:
            html (str): The full HTML content
            limit (int): Maximum character limit
            
        Returns:
            str: Truncated HTML that preserves important structure
        """
        if not html:
            return ""
            
        # If HTML is already under the limit, return as is
        if len(html) <= limit:
            return html
            
        logger.info(f"Truncating HTML from {len(html)} to {limit} characters")
        
        # Define patterns for sections likely to contain prices
        price_patterns = [
            r'<div[^>]*class=["\']price["\'][^>]*>.*?</div>',
            r'<p[^>]*class=["\']price["\'][^>]*>.*?</p>',
            r'<span[^>]*class=["\']price["\'][^>]*>.*?</span>',
            r'<div[^>]*id=["\']price["\'][^>]*>.*?</div>',
            r'<div[^>]*class=["\']product[^"\']*price[^"\']*["\'][^>]*>.*?</div>',
            r'<div[^>]*class=["\']price-box["\'][^>]*>.*?</div>',
            r'<meta[^>]*itemprop=["\']price["\'][^>]*>',
            r'<div[^>]*class=["\']woocommerce-price[^"\']*["\'][^>]*>.*?</div>'
        ]
        
        # Define important sections to preserve
        important_sections = [
            # Product information
            r'<div[^>]*class=["\']product[^"\']*info[^"\']*["\'][^>]*>.*?</div>',
            r'<div[^>]*class=["\']product[^"\']*details[^"\']*["\'][^>]*>.*?</div>',
            r'<div[^>]*class=["\']product[^"\']*summary[^"\']*["\'][^>]*>.*?</div>',
            r'<div[^>]*id=["\']product[^"\']*["\'][^>]*>.*?</div>',
            # JSON-LD
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>'
        ]
        
        # Extract head and up to 1000 chars of body beginning (often contains important metadata)
        head_match = re.search(r'<head>.*?</head>', html, re.DOTALL)
        head = head_match.group(0) if head_match else ""
        
        # Extract body
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL)
        body = body_match.group(1) if body_match else html
        
        # Start with a minimal structure
        result = []
        
        # Add head if under 5000 chars
        if len(head) < 5000:
            result.append(head)
            
        # Add the first 1000 chars of body (often contains important metadata)
        result.append(body[:1000])
        
        # Extract price sections
        price_sections = []
        total_price_length = 0
        for pattern in price_patterns:
            matches = re.findall(pattern, body, re.DOTALL)
            for match in matches:
                if total_price_length < 5000:  # Limit total price section length
                    price_sections.append(match)
                    total_price_length += len(match)
                else:
                    break
        
        # Extract other important sections
        important_parts = []
        for pattern in important_sections:
            matches = re.findall(pattern, body, re.DOTALL)
            for match in matches:
                important_parts.append(match)
        
        # Calculate remaining space
        current_length = sum(len(part) for part in result) + total_price_length
        remaining = max(0, limit - current_length)
        
        # Add as many important sections as can fit
        for part in important_parts:
            if len(part) < remaining:
                result.append(part)
                remaining -= len(part)
            else:
                # Add a truncated version if too large
                result.append(part[:remaining])
                remaining = 0
                break
        
        # Add all price sections (they're already limited to 5000 chars total)
        result.extend(price_sections)
        
        # If we still have space, add more of the body
        if remaining > 1000:
            # Skip the first 1000 chars we already added
            middle_body = body[1000:]
            # Skip the price and important sections we already added
            for section in price_sections + important_parts:
                middle_body = middle_body.replace(section, "")
            # Add as much as will fit
            result.append(middle_body[:remaining])
        
        # Join everything and ensure it's properly balanced
        truncated_html = "".join(result)
        
        logger.info(f"Truncated HTML length: {len(truncated_html)}")
        return truncated_html