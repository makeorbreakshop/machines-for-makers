import json
import re
from bs4 import BeautifulSoup
from loguru import logger
import anthropic
from decimal import Decimal, InvalidOperation

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

class PriceExtractor:
    """Class for extracting prices from web pages using multiple methods."""
    
    def __init__(self):
        """Initialize the price extractor with the Claude client."""
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        logger.info("Price extractor initialized")
    
    def extract_price(self, soup, html_content, url):
        """
        Extract price using multiple methods in order of preference.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content.
            html_content (str): Raw HTML content.
            url (str): URL of the page.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if extraction failed.
        """
        # Method 1: Try structured data (JSON-LD, microdata)
        price, method = self._extract_from_structured_data(soup)
        if price is not None:
            return price, method
        
        # Method 2: Try common price selectors
        price, method = self._extract_from_common_selectors(soup)
        if price is not None:
            return price, method
        
        # Method 3: Use Claude AI as fallback
        price, method = self._extract_using_claude(html_content, url)
        if price is not None:
            return price, method
        
        # No price found with any method
        logger.warning(f"Failed to extract price from {url} using any method")
        return None, None
    
    def _extract_from_structured_data(self, soup):
        """
        Extract price from structured data like JSON-LD or microdata.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if not found.
        """
        try:
            # Look for JSON-LD data
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    # Handle both single and array formats
                    if isinstance(data, list):
                        items = data
                    elif isinstance(data, dict):
                        items = [data]
                    else:
                        continue
                    
                    # Look for price in the JSON-LD data
                    for item in items:
                        # Check for direct price properties
                        price_fields = ['price', 'offers.price', 'offers.lowPrice']
                        for field in price_fields:
                            value = self._get_nested_value(item, field)
                            if value:
                                price = self._parse_price(value)
                                if price is not None:
                                    logger.info(f"Extracted price {price} using JSON-LD")
                                    return price, "JSON-LD"
                        
                        # Check offers array if present
                        if 'offers' in item and isinstance(item['offers'], list):
                            for offer in item['offers']:
                                if 'price' in offer:
                                    price = self._parse_price(offer['price'])
                                    if price is not None:
                                        logger.info(f"Extracted price {price} using JSON-LD offers array")
                                        return price, "JSON-LD offers"
                
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.debug(f"Error parsing JSON-LD: {str(e)}")
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
                    
                    price = self._parse_price(price_value)
                    if price is not None:
                        logger.info(f"Extracted price {price} using microdata")
                        return price, "Microdata"
        
        except Exception as e:
            logger.error(f"Error extracting from structured data: {str(e)}")
        
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
            # List of common selectors for prices on e-commerce sites
            selectors = [
                '.price', '#price', '.product-price', '.offer-price', 
                '.current-price', '.sale-price', '.product__price',
                '[data-price]', '[data-product-price]', '.price-box',
                '.price__current', '.price-group', '.product-info-price'
            ]
            
            for selector in selectors:
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
                        return price, f"CSS Selector '{selector}'"
        
        except Exception as e:
            logger.error(f"Error extracting from common selectors: {str(e)}")
        
        return None, None
    
    def _extract_using_claude(self, html_content, url):
        """
        Extract price using Claude AI as a fallback.
        
        Args:
            html_content (str): Raw HTML content.
            url (str): URL of the page.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if extraction failed.
        """
        try:
            # Prepare a truncated version of the HTML for Claude
            truncated_html = html_content[:15000] if len(html_content) > 15000 else html_content
            
            # Create prompt for Claude
            prompt = f"""I need to extract the current price of a product from this webpage. 
URL: {url}

Here is the HTML content of the page (truncated if too long):
{truncated_html}

Please extract ONLY the product's current price. 
- Return ONLY the numeric price value without currency symbols, in the format: 399.99
- If there are multiple prices (like regular and sale price), return the current selling price.
- Do not include shipping costs or taxes in the price.
- If you can't find a clear price, respond with "No price found".
- Do not explain your reasoning, just return the price or "No price found".
"""
            
            # Call Claude API
            logger.info(f"Calling Claude API to extract price from {url}")
            response = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=150,
                system="You are a specialized AI assistant that only extracts product prices from web pages. You only respond with the numeric price value (e.g., '299.99') or 'No price found'. Never include explanations or other text.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Process the response
            result = response.content[0].text.strip()
            
            # Check if Claude found a price
            if result.lower() == "no price found":
                logger.warning(f"Claude couldn't find a price for {url}")
                return None, None
            
            # Validate and clean the price
            price = self._parse_price(result)
            if price is not None:
                logger.info(f"Extracted price {price} using Claude AI")
                return price, "Claude AI"
            
            logger.warning(f"Claude returned an invalid price: {result}")
            return None, None
        
        except Exception as e:
            logger.error(f"Error using Claude for price extraction: {str(e)}")
            return None, None
    
    def _parse_price(self, price_text):
        """
        Parse and normalize a price from text.
        
        Args:
            price_text (str): Text containing the price.
            
        Returns:
            float: Parsed price or None if parsing failed.
        """
        if not price_text:
            return None
        
        try:
            # Convert to string if not already
            price_str = str(price_text).strip()
            
            # Remove all non-numeric characters except period and comma
            # Keep only the first match of a number pattern
            matches = re.search(r'(\d[\d,.]*\d|\d)', price_str)
            if not matches:
                return None
            
            price_clean = matches.group(0)
            
            # Normalize price format (handle different decimal/thousands separators)
            if ',' in price_clean and '.' in price_clean:
                # Format like 1,234.56
                if price_clean.rindex(',') < price_clean.rindex('.'):
                    price_clean = price_clean.replace(',', '')
                # Format like 1.234,56
                else:
                    price_clean = price_clean.replace('.', '').replace(',', '.')
            elif ',' in price_clean and '.' not in price_clean:
                # If only commas, check if it's likely a decimal separator
                if len(price_clean.split(',')[-1]) <= 2:
                    price_clean = price_clean.replace(',', '.')
                else:
                    price_clean = price_clean.replace(',', '')
            
            # Convert to Decimal for accurate parsing
            price = float(Decimal(price_clean))
            
            # Validate price range (avoid unreasonable values)
            if price <= 0 or price > 1000000:
                logger.warning(f"Parsed price {price} is outside reasonable range")
                return None
            
            return price
        
        except (ValueError, InvalidOperation, TypeError) as e:
            logger.debug(f"Error parsing price from '{price_text}': {str(e)}")
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