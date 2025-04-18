"""
Static parser for price extraction from structured data and HTML patterns.
"""
import json
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional, Tuple
from loguru import logger
from decimal import Decimal
from urllib.parse import urlparse
import httpx
from .config import Config

class StaticParser:
    """Parser for extracting prices from static HTML content."""
    
    def __init__(self, config: Config):
        self.config = config
        self.retry_attempts = getattr(config, 'retry_attempts', 3)
        self.min_confidence = getattr(config, 'min_confidence', 0.8)
        
        # JSON-LD and microdata paths for structured data
        self.structured_data_paths = [
            "$.offers.price",
            "$.offers[*].price",
            "$.price",
            "$.priceRange.lowPrice",
            "$.priceRange.highPrice",
            "$.offers.highPrice",
            "$.offers.lowPrice"
        ]
        
        # Common CSS selectors for prices
        self.common_selectors = [
            ".product-price",
            ".price",
            ".price-container",
            ".price-wrapper",
            "span.amount",
            "span.price",
            ".product-info-price",
            ".current-price",
            ".special-price",
            "#price",
            "div[itemprop='price']",
            "span[itemprop='price']",
            ".product-price-current",
        ]
        
        # CSS selectors for elements near add-to-cart buttons
        self.cart_proximity_selectors = [
            ".price-box",
            ".product-info-price",
            ".product-single__price",
            "form.cart .price",
            "button.add-to-cart + .price",
            ".add-to-cart-wrap .price",
            ".addtocart-area .price",
            "form[action*='cart'] .price"
        ]
        
        # Regex patterns for price extraction
        self.price_patterns = [
            r'(?:price|amount)[^>]*?\$\s*([\d,.]+)',  # Price/amount labels
            r'(?:current|now)[^>]*?\$\s*([\d,.]+)',   # Current/now labels
            r'(?:<del[^>]*>)[^<]*?([\d,.]+)[^<]*<\/del[^>]*>[^<]*<ins[^>]*>[^<]*?([\d,.]+)',  # Strikethrough pattern
            r'(?:<s[^>]*>)[^<]*?([\d,.]+)[^<]*<\/s[^>]*>[^<]*<p[^>]*>[^<]*?([\d,.]+)',  # Strikethrough pattern
            r'(?:sale|special)[^>]*?\$\s*([\d,.]+)',  # Sale/special labels
            r'\$\s*([\d,.]+)',  # Generic dollar signs
            r'([\d,.]+)\s*(?:USD|CAD|EUR|GBP)',  # Currency code suffix
            r'(?:price|cost):?\s*\$?\s*([\d,.]+)'  # Price/cost label
        ]
        
    async def extract_price(self, url: str, variant_attribute: Optional[str] = None) -> Dict[str, Any]:
        """Extract price from a given URL."""
        async with httpx.AsyncClient() as client:
            for attempt in range(self.retry_attempts):
                try:
                    logger.debug(f"Attempt {attempt+1}/{self.retry_attempts} to fetch {url}")
                    response = await client.get(url)
                    response.raise_for_status()
                    
                    # Try different extraction methods in order
                    result = (
                        await self._extract_from_json_ld(response.text, variant_attribute) or
                        await self._extract_from_microdata(response.text, variant_attribute) or
                        await self._extract_from_regex(response.text, variant_attribute)
                    )
                    
                    if result:
                        # Make sure we convert to float
                        try:
                            price = float(result["price"])
                        except (ValueError, TypeError):
                            # Try cleaning the price string if needed
                            price_str = str(result["price"]).replace(',', '').strip()
                            price = float(price_str)
                            
                        return {
                            "price": price,
                            "currency": result["currency"],
                            "confidence": 0.9,  # High confidence for static extraction
                            "tier": "STATIC"
                        }
                    
                    logger.warning(f"No price found in response from {url}")
                    break  # If page loaded but no price found, don't retry
                    
                except (httpx.HTTPError, httpx.ConnectError) as e:
                    logger.warning(f"HTTP error on attempt {attempt+1}: {str(e)}")
                    if attempt == self.retry_attempts - 1:
                        logger.error(f"Failed to fetch {url} after {self.retry_attempts} attempts")
                        break
                    continue
                    
        return None
        
    async def _extract_from_json_ld(self, html: str, variant_attribute: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Extract price from JSON-LD data."""
        try:
            # First try direct JSON parsing if the entire content is JSON
            data = json.loads(html)
            if isinstance(data, dict):
                # Direct JSON response
                if '@type' in data and data['@type'] == 'Product':
                    offers = data.get('offers', {})
                    if isinstance(offers, dict):
                        return {
                            "price": offers.get('price'),
                            "currency": offers.get('priceCurrency', 'USD')
                        }
        except json.JSONDecodeError:
            # Not direct JSON, try to find JSON-LD in HTML
            soup = BeautifulSoup(html, 'html.parser')
            for script in soup.find_all('script', type='application/ld+json'):
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        if data.get('@type') == 'Product':
                            offers = data.get('offers', {})
                            if isinstance(offers, dict):
                                return {
                                    "price": offers.get('price'),
                                    "currency": offers.get('priceCurrency', 'USD')
                                }
                except (json.JSONDecodeError, AttributeError):
                    continue
        except Exception as e:
            logger.error(f"Error in JSON-LD extraction: {str(e)}")
            
        return None
        
    async def _extract_from_microdata(self, html: str, variant_attribute: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Extract price from microdata."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find product element
        product = soup.find(itemtype=re.compile(r'schema.org/Product$'))
        if not product:
            return None
            
        # Find offer within product
        offer = product.find(itemtype=re.compile(r'schema.org/Offer$'))
        if not offer:
            return None
            
        # Extract price and currency
        price = offer.find(itemprop='price')
        currency = offer.find(itemprop='priceCurrency')
        
        if price:
            return {
                "price": price.get('content'),
                "currency": currency.get('content', 'USD') if currency else 'USD'
            }
        
        return None
        
    async def _extract_from_regex(self, html: str, variant_attribute: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Extract price using regex patterns."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # If variant attribute is provided, try to find the specific variant first
        if variant_attribute:
            variant_container = soup.find(
                lambda tag: tag.get('data-power') == variant_attribute or 
                          tag.get('data-variant') == variant_attribute
            )
            if variant_container:
                html = str(variant_container)
        
        # Common price patterns
        price_patterns = [
            r'\$\s*([\d,]+\.?\d*)',  # $1,234.56
            r'USD\s*([\d,]+\.?\d*)',  # USD 1,234.56
            r'([\d,]+\.?\d*)\s*USD',  # 1,234.56 USD
            r'€\s*([\d,]+\.?\d*)',    # €1,234.56
            r'EUR\s*([\d,]+\.?\d*)',  # EUR 1,234.56
            r'([\d,]+\.?\d*)\s*EUR'   # 1,234.56 EUR
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, html)
            if match:
                price_str = match.group(1).replace(',', '')
                currency = 'USD' if '$' in pattern or 'USD' in pattern else 'EUR'
                return {
                    "price": price_str,
                    "currency": currency
                }
        
        return None
    
    def extract(self, html_content: str, url: str, custom_selectors: Optional[list] = None) -> Tuple[Optional[Decimal], str, float]:
        """
        Extract price from HTML content using structured data and basic patterns.
        
        Args:
            html_content: HTML content of the page
            url: URL of the page
            custom_selectors: Optional custom CSS selectors to try first
            
        Returns:
            Tuple of (price, method, confidence)
            - price: Extracted price as Decimal or None
            - method: Method used to extract the price
            - confidence: Confidence score (0.0 to 1.0)
        """
        # Parse the HTML
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
        except Exception as e:
            logger.error(f"Error parsing HTML: {str(e)}")
            return None, "STATIC_FAILED", 0.0
        
        domain = self._extract_domain(url)
        
        # Step 1: Try structured data (highest confidence)
        price, method = self._extract_from_structured_data(soup)
        if price:
            return price, method, 0.95  # High confidence for structured data
        
        # Step 2: Try custom selectors if provided
        if custom_selectors:
            price, selector = self._extract_from_custom_selectors(soup, custom_selectors)
            if price:
                return price, f"STATIC_CUSTOM_SELECTOR:{selector}", 0.92
        
        # Step 3: Try common selectors
        price, selector = self._extract_from_common_selectors(soup)
        if price:
            return price, f"STATIC_COMMON_SELECTOR:{selector}", 0.88
        
        # Step 4: Look for prices near add-to-cart buttons/forms
        price, element = self._extract_near_add_to_cart(soup)
        if price:
            return price, "STATIC_ADD_TO_CART_PROXIMITY", 0.85
        
        # Step 5: Use regex patterns on limited HTML
        price, pattern = self._extract_from_regex_patterns(html_content[:30000])  # Limit to first 30KB
        if price:
            return price, f"STATIC_REGEX:{pattern}", 0.80
        
        # No price found with static methods
        return None, "STATIC_NO_PRICE_FOUND", 0.0
    
    def _extract_from_structured_data(self, soup: BeautifulSoup) -> Tuple[Optional[Decimal], str]:
        """Extract price from structured data in the page."""
        structured_data = []
        
        # Find all JSON-LD scripts
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_ld_scripts:
            try:
                json_data = json.loads(script.string)
                structured_data.append(json_data)
            except (ValueError, AttributeError) as e:
                logger.debug(f"Error parsing JSON-LD: {str(e)}")
        
        # Extract from found structured data
        for data in structured_data:
            for path in self.structured_data_paths:
                price = self._extract_from_json_path(data, path)
                if price:
                    try:
                        return Decimal(str(price)), f"STATIC_STRUCTURED_DATA:{path}"
                    except (ValueError, TypeError):
                        continue
        
        # Check microdata
        microdata_price = soup.find(itemprop='price')
        if microdata_price:
            price_text = microdata_price.get('content') or microdata_price.text
            try:
                return Decimal(self._clean_price_text(price_text)), "STATIC_MICRODATA"
            except (ValueError, TypeError):
                pass
        
        return None, ""
    
    def _extract_from_custom_selectors(self, soup: BeautifulSoup, selectors: list) -> Tuple[Optional[Decimal], str]:
        """Extract price using custom CSS selectors."""
        for selector in selectors:
            elements = soup.select(selector)
            for element in elements:
                price = self._parse_price_from_element(element)
                if price:
                    return price, selector
        
        return None, ""
    
    def _extract_from_common_selectors(self, soup: BeautifulSoup) -> Tuple[Optional[Decimal], str]:
        """Extract price using common CSS selectors."""
        for selector in self.common_selectors:
            elements = soup.select(selector)
            for element in elements:
                price = self._parse_price_from_element(element)
                if price:
                    return price, selector
        
        return None, ""
    
    def _extract_near_add_to_cart(self, soup: BeautifulSoup) -> Tuple[Optional[Decimal], Any]:
        """Extract price near add-to-cart buttons or forms."""
        # Try specific selectors for cart proximity
        for selector in self.cart_proximity_selectors:
            elements = soup.select(selector)
            for element in elements:
                price = self._parse_price_from_element(element)
                if price:
                    return price, element
        
        # Look for add-to-cart buttons and check nearby elements
        cart_elements = soup.find_all(['button', 'a', 'input'], 
                                    string=re.compile(r'add to cart|add to bag', re.I))
        if not cart_elements:
            cart_elements = soup.find_all(['button', 'a', 'input'], 
                                        attrs={'class': re.compile(r'add-to-cart|add_to_cart|addtocart', re.I)})
        
        # Check elements near add-to-cart buttons
        for cart_el in cart_elements:
            # Check parent and siblings
            parent = cart_el.parent
            for element in parent.find_all(['span', 'div', 'p']):
                price = self._parse_price_from_element(element)
                if price:
                    return price, element
            
            # Check previous siblings
            prev_el = cart_el.find_previous(['span', 'div', 'p'])
            if prev_el:
                price = self._parse_price_from_element(prev_el)
                if price:
                    return price, prev_el
        
        return None, None
    
    def _extract_from_regex_patterns(self, html_content: str) -> Tuple[Optional[Decimal], str]:
        """Extract price using regex patterns."""
        for pattern in self.price_patterns:
            matches = re.findall(pattern, html_content)
            if matches:
                for match in matches:
                    if isinstance(match, tuple):  # Handle multiple groups
                        # For strikethrough patterns, take the second price (discounted)
                        match = match[-1]  # Last group is usually the current price
                    
                    try:
                        price = Decimal(self._clean_price_text(match))
                        # Apply basic validation
                        if price > 0 and price < 100000:  # Reasonable price range
                            return price, pattern
                    except (ValueError, TypeError):
                        continue
        
        return None, ""
    
    def _parse_price_from_element(self, element: Any) -> Optional[Decimal]:
        """Parse price from a BeautifulSoup element."""
        if element.name == 'meta':
            price_text = element.get('content', '')
        else:
            price_text = element.text.strip()
        
        try:
            return Decimal(self._clean_price_text(price_text))
        except (ValueError, TypeError, AttributeError):
            return None
    
    def _clean_price_text(self, price_text: str) -> str:
        """Clean price text for conversion to Decimal."""
        if not price_text:
            return ""
        
        # Convert to string if needed
        price_text = str(price_text)
        
        # Remove currency symbols and text
        price_text = re.sub(r'[^\d.,]', '', price_text)
        
        # Handle comma as decimal separator (European format)
        if ',' in price_text and '.' not in price_text:
            price_text = price_text.replace(',', '.')
        
        # Handle comma as thousands separator
        price_text = price_text.replace(',', '')
        
        return price_text
    
    def _extract_from_json_path(self, data: Dict[str, Any], path: str) -> Optional[Any]:
        """Extract value from JSON data using a simplified path."""
        parts = path.strip('$').strip('.').split('.')
        current = data
        
        for part in parts:
            if '[*]' in part:
                # Handle array wildcard
                field_name = part.split('[')[0]
                if isinstance(current, dict) and field_name in current:
                    if isinstance(current[field_name], list):
                        # Go through each item in the array
                        for item in current[field_name]:
                            # Try the rest of the path on each item
                            result = self._extract_from_json_path(
                                item, 
                                '.'.join(parts[parts.index(part) + 1:])
                            )
                            if result:
                                return result
                return None
            elif isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
        
        return current
    
    def _extract_domain(self, url: str) -> str:
        """Extract the domain from a URL."""
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            if domain.startswith('www.'):
                domain = domain[4:]  # Strip www.
            return domain
        except:
            return "" 