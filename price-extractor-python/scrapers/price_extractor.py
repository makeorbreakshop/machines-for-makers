import json
import re
from bs4 import BeautifulSoup
from loguru import logger
import anthropic
from decimal import Decimal, InvalidOperation

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from scrapers.site_specific_extractors import SiteSpecificExtractor
from scrapers.dynamic_scraper import DynamicScraper
from scrapers.selector_blacklist import is_selector_blacklisted, get_blacklist_reason

class PriceExtractor:
    """Class for extracting prices from web pages using multiple methods."""
    
    def __init__(self):
        """Initialize the price extractor with the Claude client."""
        # Ensure the required Anthropic version header is set
        self.client = anthropic.Anthropic(
            api_key=ANTHROPIC_API_KEY,
            default_headers={"anthropic-version": "2023-06-01"} # Recommended version
        )
        self.site_extractor = SiteSpecificExtractor()
        logger.info("Price extractor initialized with Anthropic version header and site-specific rules")
    
    async def extract_price(self, soup, html_content, url, old_price=None, machine_name=None, machine_data=None):
        """
        Extract price using multiple methods in order of preference.
        
        Args:
            soup (BeautifulSoup): Parsed HTML content.
            html_content (str): Raw HTML content.
            url (str): Page URL.
            old_price (float, optional): Previous price for context.
            machine_name (str, optional): Machine name for variant selection.
            machine_data (dict, optional): Machine record with learned_selectors.
            
        Returns:
            tuple: (price as float, method used) or (None, None) if extraction failed.
        """
        
        # Enhanced logging for batch analysis
        logger.info(f"=== PRICE EXTRACTION START ===")
        logger.info(f"Machine: {machine_name}")
        logger.info(f"URL: {url}")
        logger.info(f"Old Price: ${old_price}")
        logger.info(f"Page Title: {soup.title.string if soup.title else 'No title'}")
        logger.info(f"HTML Size: {len(html_content)} chars")
        
        # Log page characteristics for debugging
        price_elements = soup.find_all(string=re.compile(r'\$[\d,]+'))
        logger.info(f"Price-like elements found: {len(price_elements)}")
        if len(price_elements) <= 10:  # Only log if reasonable number
            logger.info(f"Price candidates: {[p.strip() for p in price_elements[:5]]}")
        
        # Check for common error indicators
        error_indicators = ['404', 'not found', 'error', 'temporarily unavailable', 'out of stock']
        page_text = html_content.lower()
        found_errors = [err for err in error_indicators if err in page_text]
        if found_errors:
            logger.warning(f"Error indicators found: {found_errors}")
        
        # Check for bot detection
        bot_indicators = ['captcha', 'robot', 'automated', 'suspicious activity']
        found_bot_signs = [bot for bot in bot_indicators if bot in page_text]
        if found_bot_signs:
            logger.warning(f"Bot detection indicators: {found_bot_signs}")
        # Method 0: MCP Learning System removed - was redundant with dynamic scraper
        # The MCP system was just another layer of Playwright automation on top of our existing dynamic scraper

        # Method 1: Try dynamic extraction for sites requiring variant selection
        if machine_name and self._requires_dynamic_extraction(url):
            try:
                logger.info(f"🌐 METHOD 1: Attempting dynamic extraction with browser automation")
                price, method = await self._extract_with_dynamic_scraper(url, machine_name, machine_data)
                if price is not None:
                    # Validate the price against expected ranges and old price
                    if self._validate_extracted_price(price, url, old_price):
                        logger.info(f"✅ METHOD 1 SUCCESS: Extracted price ${price} using dynamic method: {method}")
                        logger.info(f"=== PRICE EXTRACTION COMPLETE ===")
                        return price, method
                    else:
                        logger.warning(f"❌ METHOD 1 VALIDATION FAILED: Dynamic extraction price ${price} failed validation, falling back to static methods")
                else:
                    logger.info(f"❌ METHOD 1 FAILED: No price found with dynamic extraction")
            except Exception as e:
                logger.error(f"❌ METHOD 1 ERROR: Dynamic extraction failed: {str(e)}")
        else:
            logger.info(f"⏭️ METHOD 1 SKIPPED: Dynamic extraction not required for this URL")
        
        # Method 2: Try site-specific extraction (static) - now includes learned selectors!
        logger.info(f"🎯 METHOD 2: Attempting site-specific extraction with rules and learned selectors")
        price, method = self.site_extractor.extract_price_with_rules(soup, html_content, url, machine_data)
        if price is not None:
            # Validate the price against expected ranges and old price
            if self._validate_extracted_price(price, url, old_price):
                logger.info(f"✅ METHOD 2 SUCCESS: Extracted price ${price} using site-specific method: {method}")
                logger.info(f"=== PRICE EXTRACTION COMPLETE ===")
                return price, method
            else:
                logger.warning(f"❌ METHOD 2 VALIDATION FAILED: Site-specific extraction price ${price} failed validation, continuing to next method")
        else:
            logger.info(f"❌ METHOD 2 FAILED: No price found with site-specific extraction")
        
        # Method 3: Try structured data (JSON-LD, microdata)
        logger.info(f"📊 METHOD 3: Attempting structured data extraction")
        price, method = self._extract_from_structured_data(soup)
        if price is not None:
            # Validate the price against expected ranges and old price
            if self._validate_extracted_price(price, url, old_price):
                logger.info(f"✅ METHOD 3 SUCCESS: Extracted price ${price} using structured data method: {method}")
                logger.info(f"=== PRICE EXTRACTION COMPLETE ===")
                return price, method
            else:
                logger.warning(f"❌ METHOD 3 VALIDATION FAILED: Structured data extraction price ${price} failed validation, continuing to next method")
        else:
            logger.info(f"❌ METHOD 3 FAILED: No price found in structured data")
        
        # Method 4: Try common price selectors
        logger.info(f"🔍 METHOD 4: Attempting common CSS selectors")
        price, method = self._extract_from_common_selectors(soup)
        if price is not None:
            # Validate the price against expected ranges and old price
            if self._validate_extracted_price(price, url, old_price):
                logger.info(f"✅ METHOD 4 SUCCESS: Extracted price ${price} using common selectors method: {method}")
                logger.info(f"=== PRICE EXTRACTION COMPLETE ===")
                return price, method
            else:
                logger.warning(f"❌ METHOD 4 VALIDATION FAILED: Common selectors extraction price ${price} failed validation, continuing to next method")
        else:
            logger.info(f"❌ METHOD 4 FAILED: No price found with common selectors")
        
        # Method 5: Use Claude MCP as fallback (with full browser automation)
        logger.info(f"🤖 METHOD 5: Attempting Claude MCP as fallback")
        try:
            from scrapers.claude_mcp_client import extract_price_with_claude_mcp
            price, method = await extract_price_with_claude_mcp(url, machine_name, old_price, machine_data)
            if price is not None:
                logger.info(f"✅ METHOD 5 SUCCESS: Extracted price ${price} using Claude MCP: {method}")
                logger.info(f"=== PRICE EXTRACTION COMPLETE ===")
                return price, method
            else:
                logger.info(f"❌ METHOD 5 FAILED: No price found with Claude MCP")
        except Exception as e:
            logger.error(f"❌ METHOD 5 ERROR: Claude MCP extraction failed: {str(e)}")
            
        # Method 6: Fallback to original Claude API (without automation)
        logger.info(f"🧠 METHOD 6: Attempting original Claude API as final fallback")
        price, method = await self._extract_using_claude(html_content, url, old_price, machine_data)
        if price is not None:
            logger.info(f"✅ METHOD 6 SUCCESS: Extracted price ${price} using Claude API: {method}")
            logger.info(f"=== PRICE EXTRACTION COMPLETE ===")
            return price, method
        else:
            logger.info(f"❌ METHOD 6 FAILED: No price found with Claude API")
        
        # No price found with any method
        logger.error(f"=== PRICE EXTRACTION FAILED ===")
        logger.error(f"Machine: {machine_name}")
        logger.error(f"URL: {url}")
        logger.error(f"All methods exhausted, no price found")
        logger.error(f"Page length: {len(html_content)} chars")
        logger.error(f"Page contains '$': {'$' in html_content}")
        logger.error(f"Page contains 'price': {'price' in html_content.lower()}")
        
        # Log a small sample of the page for manual inspection
        if html_content:
            sample = html_content[:500] + "..." if len(html_content) > 500 else html_content
            logger.error(f"Page sample: {sample}")
        
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
            logger.debug(f"Found {len(json_ld_scripts)} JSON-LD scripts")
            
            for script_idx, script in enumerate(json_ld_scripts):
                try:
                    data = json.loads(script.string)
                    logger.debug(f"Processing JSON-LD script {script_idx}")
                    
                    # Remove special case handling for ACMER and implement more general validation
                    
                    # Handle both single and array formats
                    if isinstance(data, list):
                        items = data
                    elif isinstance(data, dict):
                        items = [data]
                    else:
                        continue
                    
                    # Look for price in the JSON-LD data
                    for item in items:
                        # Enhanced debug logging
                        if 'offers' in item:
                            logger.debug(f"Found offers in script {script_idx}: {json.dumps(item['offers'])[:200]}")
                            
                            # Extract URL for logging purposes only
                            product_url = None
                            if 'url' in item:
                                product_url = item['url']
                                logger.debug(f"Found product URL: {product_url}")
                        
                        # Check for direct price properties
                        price_fields = ['price', 'offers.price', 'offers.lowPrice']
                        for field in price_fields:
                            value = self._get_nested_value(item, field)
                            if value:
                                logger.debug(f"Found price field '{field}' with value: {repr(value)}")
                                
                                # For JSON-LD price detection, do extra validation if it's a number
                                if isinstance(value, (int, float)):
                                    # Log the precise type and value
                                    logger.debug(f"JSON-LD price is numeric type {type(value)}: {value}")
                                    
                                    # Check if the price might be off by a factor of 10
                                    # Common error: "1199.0" stored as "119.0" or "119.9" stored as "11.99"
                                    price_as_str = str(value)
                                    if '.' in price_as_str:
                                        # Get the length before decimal point
                                        int_part_length = len(price_as_str.split('.')[0])
                                        decimal_part = price_as_str.split('.')[1]
                                        
                                        # If very short integer part with suspiciously round decimal
                                        # (less than 3 digits and ending in 0 or 9), log but still use the value
                                        if int_part_length < 3 and (decimal_part.endswith('0') or decimal_part.endswith('9')):
                                            logger.warning(f"Possibly truncated price value {value} from field '{field}'. If this looks wrong, please check the JSON-LD data.")
                                    
                                    # Use the value directly for numeric types
                                    price = float(value)
                                    if price is not None:
                                        # Verify price is in a reasonable range
                                        if 10 <= price <= 100000:  # Price should be between $10 and $100,000
                                            logger.info(f"Extracted numeric price {price} using JSON-LD")
                                            return price, "JSON-LD"
                                        else:
                                            logger.warning(f"Price {price} from JSON-LD is outside reasonable range, ignoring")
                                else:
                                    # For string values, use the parser
                                    price = self._parse_price(value)
                                    if price is not None:
                                        # Verify price is in a reasonable range
                                        if 10 <= price <= 100000:  # Price should be between $10 and $100,000
                                            logger.info(f"Extracted parsed price {price} using JSON-LD")
                                            return price, "JSON-LD"
                                        else:
                                            logger.warning(f"Price {price} from JSON-LD is outside reasonable range, ignoring")
                        
                        # Check offers array if present
                        if 'offers' in item and isinstance(item['offers'], list):
                            for offer_idx, offer in enumerate(item['offers']):
                                if 'price' in offer:
                                    value = offer['price']
                                    logger.debug(f"Found price in offer {offer_idx}: {repr(value)}")
                                    
                                    # Same validation as above
                                    if isinstance(value, (int, float)):
                                        logger.debug(f"JSON-LD offer price is numeric type {type(value)}: {value}")
                                        
                                        # Check if the price might be off by a factor of 10
                                        price_as_str = str(value)
                                        if '.' in price_as_str:
                                            # Get the length before decimal point
                                            int_part_length = len(price_as_str.split('.')[0])
                                            decimal_part = price_as_str.split('.')[1]
                                            
                                            # If very short integer part with suspiciously round decimal
                                            if int_part_length < 3 and (decimal_part.endswith('0') or decimal_part.endswith('9')):
                                                logger.warning(f"Possibly truncated price value {value} from offer. If this looks wrong, please check the JSON-LD data.")
                                        
                                        # Use the value directly
                                        price = float(value)
                                    else:
                                        # Parse string values
                                        price = self._parse_price(value)
                                        
                                    if price is not None:
                                        # Verify price is in a reasonable range
                                        if 10 <= price <= 100000:  # Price should be between $10 and $100,000
                                            logger.info(f"Extracted price {price} using JSON-LD offers array")
                                            return price, "JSON-LD offers"
                                        else:
                                            logger.warning(f"Price {price} from JSON-LD offer is outside reasonable range, ignoring")
                
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
                    
                    logger.debug(f"Found microdata price: {repr(price_value)}")
                    price = self._parse_price(price_value)
                    if price is not None:
                        # Verify price is in a reasonable range
                        if 10 <= price <= 100000:  # Price should be between $10 and $100,000
                            logger.info(f"Extracted price {price} using microdata")
                            return price, "Microdata"
                        else:
                            logger.warning(f"Price {price} from microdata is outside reasonable range, ignoring")
        
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
                # Skip blacklisted selectors
                if is_selector_blacklisted(selector):
                    logger.debug(f"Skipping blacklisted selector: {selector}")
                    continue
                    
                elements = soup.select(selector)
                for element in elements:
                    # Check if element is within a blacklisted context
                    parent_classes = []
                    parent = element.parent
                    while parent and len(parent_classes) < 5:  # Check up to 5 parent levels
                        if parent.get('class'):
                            parent_classes.extend(parent.get('class'))
                        parent = parent.parent
                    
                    # Skip if parent has blacklisted class
                    parent_class_str = ' '.join(parent_classes).lower()
                    if any(pattern in parent_class_str for pattern in ['bundle', 'package', 'combo', 'addon', 'related']):
                        logger.debug(f"Skipping price in blacklisted context: {parent_class_str}")
                        continue
                    
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
    
    def _get_brand_specific_instructions(self, machine_data, url):
        """Get brand-specific extraction instructions for Claude AI."""
        from urllib.parse import urlparse
        
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Get brand from machine data if available
        brand = None
        if machine_data and 'brand' in machine_data:
            brand = machine_data['brand'].lower()
        
        # ComMarker specific instructions
        if domain == 'commarker.com' or (brand and 'commarker' in brand):
            return """BRAND-SPECIFIC INSTRUCTIONS FOR COMMARKER:

TASK: Find the STANDALONE product price (NOT bundle pricing)

CRITICAL - AVOID these CSS patterns at all costs:
- .bundle-price, .bundle-price *, .package-price, .combo-price
- Any element containing "bundle", "package", "combo", "kit" in the class name

LOOK FOR prices in these preferred locations:
- .product-summary .price .woocommerce-Price-amount
- .entry-summary .price .amount
- .woocommerce-product-details .price
- .product-price-wrapper .price
- .single-product .price

COMMARKER CONTEXT:
- This is a WooCommerce site selling laser engravers
- Look for the main product price, typically the sale price (current/discounted price)
- Avoid any bundle/package pricing sections
- Look for the core machine price in standard WooCommerce price elements"""

        # Glowforge specific instructions  
        elif domain == 'glowforge.com' or (brand and 'glowforge' in brand):
            machine_name = machine_data.get('name', '') if machine_data else ''
            return f"""BRAND-SPECIFIC INSTRUCTIONS FOR GLOWFORGE:

TASK: Find the variant-specific price for this Glowforge machine: {machine_name}

VARIANT DETECTION:
- Look for HTML content around price elements that matches the variant name
- Plus models: look for "live camera view" without "hd" 
- Plus HD models: look for "live camera view hd"
- Pro models: look for "pro" without "hd"
- Pro HD models: look for "pro" and "hd"

APPROACH:
- Find all prices on the page
- Match each price to the surrounding HTML content/features
- Select the price that matches the variant indicated in the machine name"""

        # Generic instructions for other brands
        else:
            return """GENERAL PRODUCT EXTRACTION INSTRUCTIONS:

TASK: Find the main standalone product price

AVOID:
- Bundle prices, package prices, accessory prices
- Financing amounts, promotional pricing
- Cross-sell, up-sell, or related product prices

LOOK FOR:
- Primary product price in main product summary
- WooCommerce .price elements
- Shopify product pricing sections
- Main price display areas"""
    
    async def _extract_using_claude(self, html_content, url, old_price=None, machine_data=None):
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
            
            # Create context about previous price
            price_context = ""
            if old_price is not None:
                price_context = f"""
IMPORTANT CONTEXT: The previous price for this product was ${old_price:,.2f}
- If you see multiple prices on the page, choose the main product price (usually the highest)
- If prices seem unreasonable compared to the previous price, double-check your selection
- Avoid selecting addon prices, financing amounts, or promotional bundle prices

"""

            # Get brand-specific instructions
            brand_instructions = self._get_brand_specific_instructions(machine_data, url)
            
            # Add machine name context if available
            machine_context = ""
            if machine_data:
                machine_name = machine_data.get('Machine Name', '') or machine_data.get('name', '')
                if machine_name:
                    machine_context = f"""
MACHINE CONTEXT: You are extracting the price for "{machine_name}"
- If the page shows multiple variants (e.g., 20W, 30W, 60W), select the price that matches this specific model
- Look for power ratings, model numbers, or other distinguishing features in the machine name
- For example, if the machine is "ComMarker B6 MOPA 30W", find the price for the 30W variant
"""

            # Create prompt for Claude with brand-specific learning capabilities
            prompt = f"""You are acting as a sub-agent to extract the correct product price from this webpage.

URL: {url}
{price_context}{machine_context}Here is the HTML content of the page (truncated if too long):
{truncated_html}

{brand_instructions}

Format your response as JSON with the EXACT price you find and the CSS selector:
{{"price": "XXXX.XX", "selector": ".actual-selector-you-found"}}
"""
            
            # Call Claude API
            logger.info(f"Calling Claude API to extract price and learn selector from {url}")
            response = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=200,
                system="You are a specialized AI assistant that extracts product prices and CSS selectors from web pages. Always respond with valid JSON containing 'price' and 'selector' fields.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Process the response
            result = response.content[0].text.strip()
            logger.debug(f"Claude returned raw response: '{result}'")
            
            # Try to parse JSON response
            try:
                import json
                # Clean up the response in case Claude added extra text
                if '{' in result and '}' in result:
                    json_start = result.find('{')
                    json_end = result.rfind('}') + 1
                    json_str = result[json_start:json_end]
                    data = json.loads(json_str)
                    
                    price_str = data.get('price', '')
                    selector = data.get('selector', '')
                    
                    # Check if Claude found a price
                    if price_str.lower() == "no price found" or not price_str:
                        logger.warning(f"Claude couldn't find a price for {url}")
                        return None, None
                    
                    # Parse the price
                    price = self._parse_price(price_str)
                    if price is not None and selector:
                        # Check if selector is blacklisted before storing it
                        if is_selector_blacklisted(selector):
                            reason = get_blacklist_reason(selector)
                            logger.warning(f"🚫 BLOCKED Claude AI from learning bad selector: {selector} ({reason})")
                            return price, f"Claude AI (selector blocked: {reason})"
                        else:
                            logger.info(f"Extracted price {price} using Claude AI with selector: {selector}")
                            # Store the learned selector only if it's not blacklisted
                            await self._store_learned_selector(url, selector, price)
                            return price, f"Claude AI (learned: {selector})"
                    elif price is not None:
                        logger.info(f"Extracted price {price} using Claude AI (no selector provided)")
                        return price, "Claude AI (no selector)"
                        
            except (json.JSONDecodeError, KeyError) as e:
                logger.debug(f"Failed to parse Claude JSON response: {str(e)}")
                # Fall back to old parsing method
                
            # Fallback: try to extract just the price from non-JSON response
            price = self._parse_price(result)
            if price is not None:
                logger.info(f"Extracted price {price} using Claude AI (fallback parsing)")
                return price, "Claude AI (fallback)"
                
            logger.warning(f"Claude returned an invalid response: {result}")
            return None, None
        
        except Exception as e:
            logger.error(f"Error using Claude for price extraction: {str(e)}")
            return None, None
    
    async def _store_learned_selector(self, url, selector, price):
        """
        Store a successfully learned CSS selector for future use.
        
        Args:
            url (str): The URL where the selector worked
            selector (str): The CSS selector that found the price
            price (float): The price that was extracted
        """
        try:
            from urllib.parse import urlparse
            from datetime import datetime
            
            # Get domain from URL
            domain = urlparse(url).netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Import database service here to avoid circular imports
            from services.database import DatabaseService
            db_service = DatabaseService()
            
            # Get machine by URL to update its learned_selectors
            # We'll need to find machines that match this URL
            machines = await db_service.get_machines_by_url(url)
            
            for machine in machines:
                machine_id = machine.get('id')
                current_selectors = machine.get('learned_selectors', {})
                
                # Add the new selector
                current_selectors[domain] = {
                    'selector': selector,
                    'last_success': datetime.utcnow().isoformat(),
                    'confidence': 1.0,  # Start with high confidence
                    'price_found': price
                }
                
                # Update the machine record
                await db_service.update_machine_learned_selectors(machine_id, current_selectors)
                logger.info(f"Stored learned selector '{selector}' for domain '{domain}' on machine {machine_id}")
                
        except Exception as e:
            logger.error(f"Error storing learned selector: {str(e)}")
            # Don't fail the extraction if we can't store the selector
    
    def _parse_price(self, price_text):
        """
        Parse and normalize a price from text. More robust handling of separators.
        
        Args:
            price_text (str): Text containing the price.
            
        Returns:
            float: Parsed price or None if parsing failed.
        """
        if not price_text:
            return None

        # Log the raw input using repr() to see hidden characters
        logger.debug(f"_parse_price received raw input: {repr(price_text)}")

        try:
            price_str = str(price_text).strip()
            
            # Remove currency symbols (like $, €, £) and whitespace variations
            price_str = re.sub(r'[$€£]', '', price_str) # Remove currency first
            price_str = re.sub(r'\s+', '', price_str) # Remove all whitespace types

            # Attempt to find the numeric part using a more specific regex
            # This tries to capture patterns like 1,234.56 or 1.234,56 or 1234.56 or 1234
            match = re.search(r'\d+(?:[,.]?\d+)*', price_str) 
            if not match:
                logger.debug(f"No numeric pattern found in cleaned '{price_str}' from original '{repr(price_text)}'")
                return None
            
            price_clean = match.group(0)
            
            # Determine decimal separator based on the last occurrence of '.' or ','
            last_dot = price_clean.rfind('.')
            last_comma = price_clean.rfind(',')
            
            # If both separators exist, assume the last one is the decimal separator
            if last_dot > -1 and last_comma > -1:
                if last_comma > last_dot:
                    # Comma is decimal separator (e.g., 1.234,56)
                    price_clean = price_clean.replace('.', '').replace(',', '.')
                else:
                    # Dot is decimal separator (e.g., 1,234.56)
                    price_clean = price_clean.replace(',', '')
            # If only comma exists, assume it's a decimal separator only if it's followed by 1-2 digits
            # Otherwise, assume it's a thousands separator
            elif last_comma > -1:
                 if len(price_clean) - last_comma - 1 <= 2:
                     price_clean = price_clean.replace(',', '.')
                 else:
                    price_clean = price_clean.replace(',', '') # Treat as thousands separator
            # If only dot exists, it's the decimal separator (remove potential thousands commas if any snuck through regex)
            elif last_dot > -1:
                 price_clean = price_clean.replace(',', '')
            
            # --- AGGRESSIVE FINAL CLEANING --- 
            # Remove anything that is not a digit or a period right before conversion
            price_clean_final = re.sub(r'[^\d.]', '', price_clean)
            logger.debug(f"Attempting to convert final cleaned price string: '{price_clean_final}' (from intermediate '{price_clean}')")

            # Convert to Decimal for precision, then to float
            try:
                # Force comma removal right before Decimal conversion as a failsafe
                price_decimal = Decimal(price_clean_final.replace(',','')) 
                # Limit to 2 decimal places - Use ROUND_HALF_UP for standard rounding
                price_quantized = price_decimal.quantize(Decimal('0.01'), rounding='ROUND_HALF_UP')
                price_float = float(price_quantized)

                # Basic validation: check if price is non-negative
                if price_float < 0:
                    logger.warning(f"Parsed negative price {price_float} from {price_text}. Ignoring.")
                    return None

                logger.debug(f"Parsed price {price_float} from '{price_text}' (cleaned: '{price_clean_final}')")
                return price_float
            except InvalidOperation:
                logger.warning(f"Could not convert final cleaned price '{price_clean_final}' to Decimal from original '{price_text}'")
                return None
        except Exception as e:
            logger.error(f"Unexpected error parsing price '{price_text}': {str(e)}")
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
    
    
    def _requires_dynamic_extraction(self, url):
        """
        Determine if a URL requires dynamic extraction with JavaScript.
        
        Args:
            url (str): The URL to check.
            
        Returns:
            bool: True if dynamic extraction is needed.
        """
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower()
        
        # Remove 'www.' prefix
        if domain.startswith('www.'):
            domain = domain[4:]
            
        # Sites that require dynamic extraction for variant selection
        dynamic_sites = [
            'cloudraylaser.com',
            'commarker.com'  # Complex variant selection with bundle pricing
        ]
        
        return any(site in domain for site in dynamic_sites)
    
    async def _extract_with_dynamic_scraper(self, url, machine_name, machine_data=None):
        """
        Extract price using dynamic scraper with variant selection.
        
        Args:
            url (str): Product page URL.
            machine_name (str): Machine name for variant matching.
            machine_data (dict): Full machine data including old_price
            
        Returns:
            tuple: (price, method) or (None, None) if extraction failed.
        """
        try:
            # Get variant rules for this site
            variant_rules = self._get_variant_rules(url)
            
            async with DynamicScraper() as scraper:
                price, method = await scraper.extract_price_with_variants(
                    url, machine_name, variant_rules, machine_data
                )
                
                if price:
                    return price, method
                else:
                    return None, None
                    
        except Exception as e:
            logger.error(f"Error in dynamic extraction: {str(e)}")
            return None, None
    
    def _get_variant_rules(self, url):
        """
        Get variant selection rules for a specific URL.
        
        Args:
            url (str): The URL to get rules for.
            
        Returns:
            dict: Variant selection rules.
        """
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower()
        
        if domain.startswith('www.'):
            domain = domain[4:]
            
        # Define variant selection rules for each site
        variant_rules = {
            'commarker.com': {
                'price_selectors': [
                    '.product-image-summary-inner .price .amount:nth-of-type(2)',
                    '.entry-summary .price .amount:nth-of-type(2)',
                    '.product-summary .price .amount:nth-of-type(2)',
                    '.price .woocommerce-Price-amount:last-child'
                ],
                'power_selectors': [
                    'button[data-power="{value}"]',
                    'input[value*="{value}W"]',
                    'option[value*="{value}"]',
                    '[data-variant*="{value}"]'
                ],
                'min_expected_price': 500,
                'max_expected_price': 15000
            },
            
            'cloudraylaser.com': {
                'price_selectors': [
                    '.product-price .price',
                    '.price-current',
                    '.product__price',
                    '[data-price]'
                ],
                'model_selectors': [
                    'option[value*="{value}"]',
                    'button[data-model="{value}"]',
                    'input[value*="{value}"]',
                    '[data-variant*="{value}"]'
                ],
                'min_expected_price': 200,
                'max_expected_price': 25000
            }
        }
        
        return variant_rules.get(domain, {})
    
    def _validate_extracted_price(self, price, url, old_price=None):
        """
        Validate an extracted price to detect obvious errors.
        
        Args:
            price (float): The extracted price
            url (str): The URL being processed
            old_price (float, optional): Previous price for comparison
            
        Returns:
            bool: True if price seems valid, False if suspicious
        """
        try:
            from urllib.parse import urlparse
            
            # Basic range validation
            if price < 10 or price > 100000:
                logger.warning(f"Price {price} outside reasonable range $10-$100,000")
                return False
            
            # Site-specific validation using existing rules
            domain = urlparse(url).netloc.lower()
            if domain.startswith('www.'):
                domain = domain[4:]
                
            if domain in self.site_extractor.site_rules:
                rules = self.site_extractor.site_rules[domain]
                min_price = rules.get('min_expected_price', 10)
                max_price = rules.get('max_expected_price', 100000)
                
                if price < min_price:
                    logger.warning(f"Price {price} below site minimum {min_price} for {domain}")
                    return False
                    
                if price > max_price:
                    logger.warning(f"Price {price} above site maximum {max_price} for {domain}")
                    return False
            
            # Compare with old price if available (detect major changes)
            if old_price is not None and old_price > 0:
                percent_change = abs(price - old_price) / old_price * 100
                
                # Site-specific change thresholds
                change_threshold = 75  # Default 75%
                if 'commarker.com' in domain:
                    change_threshold = 80  # ComMarker prices may have major sales
                elif 'cloudraylaser.com' in domain:
                    change_threshold = 50  # CloudRay has more variation
                
                if percent_change > change_threshold:
                    logger.warning(f"Price {price} differs from old price {old_price} by {percent_change:.1f}% (threshold: {change_threshold}%)")
                    return False
            
            logger.debug(f"Price {price} passed validation for {domain}")
            return True
            
        except Exception as e:
            logger.error(f"Error validating price {price}: {str(e)}")
            return True  # Default to accepting price if validation fails