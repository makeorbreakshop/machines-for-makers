"""
Site-specific price extraction rules to fix common extraction failures.
This module provides enhanced extraction logic for specific domains.
"""

import json
import re
from urllib.parse import urlparse
from loguru import logger


class SiteSpecificExtractor:
    """Enhanced price extractor with site-specific rules."""
    
    def __init__(self):
        self.site_rules = {
            'commarker.com': {
                'type': 'woocommerce',
                'avoid_contexts': [
                    'related-products', 'cross-sells', 'up-sells', 
                    'product-recommendations', 'comparison'
                ],
                'prefer_contexts': [
                    'product-summary', 'single-product', 'product-main',
                    'woocommerce-product-details', 'entry-summary'
                ],
                'price_selectors': [
                    '.product-summary .price .woocommerce-Price-amount',
                    '.single-product .price .amount',
                    '.entry-summary .price'
                ],
                'min_expected_price': 500,  # Commarker products typically > $500
                'max_expected_price': 15000
            },
            
            'cloudraylaser.com': {
                'type': 'shopify',
                'avoid_selectors': [
                    '[name*="items"] [data-price]',  # Addon form elements
                    '.product-form [data-price]',    # Form controls
                    'select [data-price]',           # Dropdown options
                    '.hdt-select [data-price]'       # Custom select widgets
                ],
                'prefer_json_ld': True,
                'json_ld_paths': [
                    'hasVariant.0.offers.price',
                    'offers.price',
                    'price'
                ],
                'price_selectors': [
                    '.product-price .price',
                    '.price-current', 
                    '.product__price'
                ],
                'min_expected_price': 200,
                'max_expected_price': 25000
            },
            
            'acmerlaser.com': {
                'type': 'custom',
                'price_selectors': [
                    '.product-price-wrapper .price',
                    '.current-price',
                    '.sale-price'
                ],
                'avoid_contexts': ['recommended', 'related'],
                'min_expected_price': 300,
                'max_expected_price': 20000
            },
            
            'aeonlaser.us': {
                'type': 'configurator',
                'requires_interaction': True,
                'price_selectors': [
                    '.total b',  # Final configurator total
                    '.tot-price .total',  # Alternative total selector
                    '.price strong',  # Starting price display
                    '.selected .price'  # Selected option price
                ],
                'configurator_selectors': {
                    'model_step': 'li.js-option.js-radio',
                    'model_options': '.option-label',
                    'total_display': '.total, .tot-price'
                },
                'fallback_patterns': [
                    r'starting at \$?([\d,]+)',  # "starting at $6995"
                    r'total[\s\n]*\$?([\d,]+)'   # "Total $6995"
                ],
                'min_expected_price': 1000,
                'max_expected_price': 50000
            },
            
            'monportlaser.com': {
                'type': 'shopify_variants',
                'base_machine_preference': True,  # Prefer base machine over bundles
                'price_selectors': [
                    '.product-price .price',
                    '.price--current',
                    '.money',
                    '[data-price]'
                ],
                'avoid_selectors': [
                    '.bundle-price',  # Avoid bundle pricing
                    '.addon-price',   # Avoid addon prices
                    '.variant-price[data-variant*="bundle"]',  # Avoid bundle variants
                    '.variant-price[data-variant*="lightburn"]',  # Avoid LightBurn bundles
                    '.variant-price[data-variant*="rotary"]'  # Avoid rotary bundles
                ],
                'prefer_contexts': [
                    'product-form-wrapper',
                    'product-price-container', 
                    'price-container',
                    'product-details'
                ],
                'variant_selection_rules': {
                    'prefer_base_machine': True,
                    'avoid_bundles': ['lightburn', 'rotary', 'bundle', 'combo'],
                    'base_keywords': ['base', 'machine', 'standalone', 'only'],
                    'selector_base_machine': 'input[value*="base"], input[value*="machine"], select option[value*="base"]'
                },
                'decimal_parsing': {
                    'fix_comma_decimal_confusion': True,
                    'expected_decimal_places': 2,
                    'common_price_patterns': [
                        r'\$(\d{1,2},?\d{3}\.\d{2})',  # $1,399.99 or $1399.99
                        r'(\d{1,2},?\d{3}\.\d{2})',   # 1,399.99 or 1399.99  
                        r'\$(\d{1,2},?\d{3})',        # $1,399 or $1399
                        r'(\d{1,2},?\d{3})'           # 1,399 or 1399
                    ]
                },
                'min_expected_price': 400,
                'max_expected_price': 8000
            },
            
        }
    
    def extract_price_with_rules(self, soup, html_content, url, machine_data=None):
        """
        Extract price using learned selectors first, then site-specific rules.
        
        Args:
            soup: BeautifulSoup object
            html_content: Raw HTML content
            url: Page URL
            machine_data: Machine record containing learned_selectors
            
        Returns:
            tuple: (price, method) or (None, None)
        """
        domain = urlparse(url).netloc.lower()
        original_domain = domain
        
        # Remove 'www.' prefix for rule matching
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Check for domain replacements (e.g., Thunder Laser USA -> Thunder Laser CN)
        if domain in self.site_rules:
            rules = self.site_rules[domain]
            if 'url_replacement' in rules:
                url_replacements = rules['url_replacement']
                # Check if current domain needs replacement
                for old_domain, new_domain in url_replacements.items():
                    if old_domain in original_domain:
                        logger.info(f"🔄 Thunder Laser domain replacement: {old_domain} → {new_domain}")
                        # Note: URL replacement should have been done during fetching
                        # This is just for logging and rule selection
                        break
        
        # METHOD 0: Try learned selectors first (fastest and free!) - BUT AVOID BAD SELECTORS
        if machine_data:
            learned_selectors = machine_data.get('learned_selectors', {})
            if domain in learned_selectors:
                selector_data = learned_selectors[domain]
                selector = selector_data.get('selector', '')
                
                # BLACKLIST: Skip known bad selectors that extract bundle/addon prices
                bad_selector_patterns = [
                    '.bundle-price', '.addon-price', '.variant-price[data-variant*="bundle"]',
                    '.variant-price[data-variant*="lightburn"]', '.variant-price[data-variant*="rotary"]',
                    '.bundle', '.combo-price', '.package-price'
                ]
                
                is_bad_selector = any(bad_pattern in selector.lower() for bad_pattern in bad_selector_patterns)
                
                if selector and not is_bad_selector:
                    logger.info(f"Trying learned selector for {domain}: {selector}")
                    price = self._extract_with_learned_selector(soup, selector, domain)
                    if price is not None:
                        logger.info(f"Successfully used learned selector: {selector}")
                        return price, f"Learned selector ({selector})"
                    else:
                        logger.warning(f"Learned selector failed: {selector}")
                elif is_bad_selector:
                    logger.warning(f"🚫 BLOCKED bad learned selector: {selector} (contains bundle/addon pricing pattern)")
                    # Continue to site-specific rules instead
            
        # METHOD 1: Check if we have specific rules for this domain
        if domain in self.site_rules:
            rules = self.site_rules[domain]
            logger.info(f"Applying site-specific rules for {domain}")
            
            # Try site-specific extraction
            price, method = self._extract_with_site_rules(soup, html_content, url, rules)
            if price is not None:
                return price, method
        
        # Fallback to generic extraction
        return None, None
    
    def _extract_with_learned_selector(self, soup, selector, domain=None):
        """
        Extract price using a learned CSS selector.
        
        Args:
            soup: BeautifulSoup object
            selector: CSS selector to try
            domain: Domain for parsing rules
            
        Returns:
            float or None: Extracted price or None if failed
        """
        try:
            elements = soup.select(selector)
            for element in elements:
                # Try to get price from various attributes first
                price_attrs = ['data-price', 'data-product-price', 'content']
                for attr in price_attrs:
                    if element.has_attr(attr):
                        price = self._parse_price_text(element[attr], domain)
                        if price is not None:
                            return price
                
                # Try text content
                price = self._parse_price_text(element.get_text(), domain)
                if price is not None:
                    return price
                    
            return None
            
        except Exception as e:
            logger.error(f"Error extracting with learned selector '{selector}': {str(e)}")
            return None
    
    def _parse_price_text(self, text, domain=None):
        """Enhanced price parser with domain-specific logic."""
        if not text:
            return None
            
        try:
            import re
            
            # Get domain-specific parsing rules
            parsing_rules = None
            if domain and domain in self.site_rules:
                parsing_rules = self.site_rules[domain].get('decimal_parsing', {})
            
            # Use domain-specific patterns first
            if parsing_rules and 'common_price_patterns' in parsing_rules:
                for pattern in parsing_rules['common_price_patterns']:
                    match = re.search(pattern, str(text))
                    if match:
                        price_str = match.group(1)
                        # Remove thousand separators, keep decimal
                        price_str = price_str.replace(',', '')
                        try:
                            price = float(price_str)
                            if 1 <= price <= 100000:
                                return price
                        except ValueError:
                            continue
            
            # Fallback to original logic
            # Remove currency symbols and extra whitespace
            text_clean = re.sub(r'[$€£¥]', '', str(text))
            text_clean = re.sub(r'\s+', '', text_clean)
            
            # Find numeric pattern - enhanced for Monport issues
            match = re.search(r'\d+(?:[,.]?\d+)*', text_clean)
            if match:
                price_str = match.group(0)
                
                # Enhanced decimal/comma handling for Monport
                if domain == 'monportlaser.com':
                    # Monport uses US format: 1,399.99
                    if ',' in price_str and '.' in price_str:
                        # Remove thousand separators, keep decimal
                        price_str = price_str.replace(',', '')
                    elif ',' in price_str and not '.' in price_str:
                        # Check if comma is thousands (e.g., "1,399") or decimal (e.g., "39,99")
                        comma_parts = price_str.split(',')
                        if len(comma_parts) == 2:
                            if len(comma_parts[0]) >= 2 and len(comma_parts[1]) == 3:
                                # Thousands separator: "1,399" -> "1399"
                                price_str = price_str.replace(',', '')
                            elif len(comma_parts[1]) <= 2:
                                # Decimal separator: "39,99" -> "39.99"
                                price_str = price_str.replace(',', '.')
                        else:
                            # Multiple commas - remove all (thousands)
                            price_str = price_str.replace(',', '')
                else:
                    # Original logic for other domains
                    if ',' in price_str and '.' in price_str:
                        last_comma = price_str.rfind(',')
                        last_dot = price_str.rfind('.')
                        
                        if last_comma > last_dot:
                            # Comma is decimal (European style): 1.234,56
                            price_str = price_str.replace('.', '').replace(',', '.')
                        else:
                            # Dot is decimal (US style): 1,234.56
                            price_str = price_str.replace(',', '')
                    elif ',' in price_str:
                        # Only comma - check if it's decimal or thousands
                        comma_parts = price_str.split(',')
                        if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                            # Likely decimal separator (e.g., "123,45")
                            price_str = price_str.replace(',', '.')
                        else:
                            # Likely thousands separator (e.g., "1,234" or "1,234,567")
                            price_str = price_str.replace(',', '')
                
                price = float(price_str)
                # Basic validation
                if 1 <= price <= 100000:
                    return price
                    
        except (ValueError, AttributeError):
            pass
            
        return None
    
    def _extract_with_site_rules(self, soup, html_content, url, rules):
        """Extract price using specific site rules."""
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Monport-specific variant selection logic
        if domain == 'monportlaser.com' and rules.get('base_machine_preference'):
            price, method = self._extract_monport_base_machine_price(soup, rules)
            if price and self._validate_price(price, rules):
                return price, f"Monport base machine ({method})"
        
        # Method 1: JSON-LD (for Shopify sites)
        if rules.get('prefer_json_ld', False):
            price, method = self._extract_json_ld_with_paths(soup, rules.get('json_ld_paths', []))
            if price and self._validate_price(price, rules):
                return price, f"Site-specific JSON-LD ({method})"
        
        # Method 2: Context-aware CSS selector extraction
        price, method = self._extract_with_context_filtering(soup, rules)
        if price and self._validate_price(price, rules):
            return price, f"Site-specific CSS ({method})"
        
        # Method 3: Fallback with avoided selectors
        price, method = self._extract_avoiding_selectors(soup, rules)
        if price and self._validate_price(price, rules):
            return price, f"Site-specific fallback ({method})"
            
        return None, None
    
    def _extract_monport_base_machine_price(self, soup, rules):
        """Extract base machine price for Monport, avoiding bundle variants."""
        variant_rules = rules.get('variant_selection_rules', {})
        avoid_bundles = variant_rules.get('avoid_bundles', [])
        
        # Strategy 1: Look for the first/default price (usually base machine)
        price_selectors = rules.get('price_selectors', ['.price--current', '.money'])
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Check if this price is in a bundle context (avoid it)
                element_text = element.get_text().lower()
                parent_text = ''
                
                # Check parent elements for bundle indicators
                parent = element.parent
                for _ in range(3):  # Check up to 3 levels up
                    if parent:
                        parent_text += parent.get_text().lower()
                        parent = parent.parent
                    
                # Skip if contains bundle keywords
                bundle_detected = any(bundle_word in element_text or bundle_word in parent_text 
                                    for bundle_word in avoid_bundles)
                
                if bundle_detected:
                    logger.debug(f"Skipping bundle price: {element_text[:50]}...")
                    continue
                    
                # Extract price
                price = self._parse_price_text(element.get_text(), 'monportlaser.com')
                if price is not None:
                    logger.info(f"Found base machine price: ${price}")
                    return price, f"base_machine:{selector}"
        
        # Strategy 2: Look for first variant option (usually base machine)
        variant_selectors = [
            'input[type="radio"]:first-child + label',
            'select option:first-child',
            '.variant-option:first-child'
        ]
        
        for selector in variant_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Look for price in or near this element
                price_text = element.get_text()
                price = self._parse_price_text(price_text, 'monportlaser.com')
                if price is not None:
                    return price, f"first_variant:{selector}"
                    
                # Check sibling elements for price
                for sibling in element.next_siblings:
                    if hasattr(sibling, 'get_text'):
                        price = self._parse_price_text(sibling.get_text(), 'monportlaser.com')
                        if price is not None:
                            return price, f"variant_sibling:{selector}"
        
        # Strategy 3: JSON-LD data with variant preference
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and 'offers' in data:
                    offers = data['offers']
                    if isinstance(offers, list) and len(offers) > 0:
                        # Take first offer (usually base machine)
                        first_offer = offers[0]
                        if 'price' in first_offer:
                            price = float(first_offer['price'])
                            return price, "json_ld_first_offer"
                    elif isinstance(offers, dict) and 'price' in offers:
                        price = float(offers['price'])
                        return price, "json_ld_offers"
            except (json.JSONDecodeError, ValueError, KeyError):
                continue
        
        return None, None
    
    def _extract_json_ld_with_paths(self, soup, json_ld_paths):
        """Extract from JSON-LD using specific paths."""
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        
        for script_idx, script in enumerate(json_ld_scripts):
            try:
                data = json.loads(script.string)
                logger.debug(f"Processing JSON-LD script {script_idx} for specific paths")
                
                # Handle both single objects and arrays
                items = data if isinstance(data, list) else [data]
                
                for item in items:
                    for path in json_ld_paths:
                        value = self._get_nested_value(item, path)
                        if value:
                            logger.debug(f"Found price at path '{path}': {value}")
                            if isinstance(value, (int, float)):
                                return float(value), path
                            else:
                                # Try to parse string value
                                parsed = self._parse_price_string(str(value))
                                if parsed:
                                    return parsed, path
                                    
            except (json.JSONDecodeError, AttributeError) as e:
                logger.debug(f"Error parsing JSON-LD script {script_idx}: {e}")
                continue
                
        return None, None
    
    def _extract_with_context_filtering(self, soup, rules):
        """Extract price with context filtering."""
        prefer_contexts = rules.get('prefer_contexts', [])
        avoid_contexts = rules.get('avoid_contexts', [])
        price_selectors = rules.get('price_selectors', [])
        
        # First try preferred contexts
        for context in prefer_contexts:
            container = soup.select_one(f'.{context}, #{context}, [class*="{context}"]')
            if container:
                logger.debug(f"Found preferred context: {context}")
                
                # Try specific selectors within this context
                for selector in price_selectors:
                    elements = container.select(selector)
                    for element in elements:
                        price = self._extract_price_from_element(element)
                        if price:
                            return price, f"context:{context} selector:{selector}"
                
                # Try generic price selectors within context
                generic_selectors = ['.price', '.amount', '[data-price]']
                for selector in generic_selectors:
                    elements = container.select(selector)
                    for element in elements:
                        price = self._extract_price_from_element(element)
                        if price:
                            return price, f"context:{context} generic:{selector}"
        
        return None, None
    
    def _extract_avoiding_selectors(self, soup, rules):
        """Extract price while avoiding specific selectors."""
        avoid_selectors = rules.get('avoid_selectors', [])
        avoid_contexts = rules.get('avoid_contexts', [])
        
        # Get all potential price elements
        all_price_elements = []
        generic_selectors = [
            '.price', '.amount', '.product-price', '.current-price',
            '[data-price]', '.woocommerce-Price-amount'
        ]
        
        for selector in generic_selectors:
            elements = soup.select(selector)
            for element in elements:
                all_price_elements.append((element, selector))
        
        # Filter out avoided elements
        filtered_elements = []
        for element, selector in all_price_elements:
            should_avoid = False
            
            # Check if element matches avoided selectors
            for avoid_selector in avoid_selectors:
                if element.select(avoid_selector) or element.parent.select(avoid_selector):
                    should_avoid = True
                    break
            
            # Check if element is in avoided context
            if not should_avoid:
                element_html = str(element)
                for avoid_context in avoid_contexts:
                    if avoid_context in element_html or avoid_context in ' '.join(element.get('class', [])):
                        should_avoid = True
                        break
            
            if not should_avoid:
                filtered_elements.append((element, selector))
        
        # Try to extract from filtered elements
        for element, selector in filtered_elements:
            price = self._extract_price_from_element(element)
            if price:
                return price, f"filtered:{selector}"
        
        return None, None
    
    def _extract_price_from_element(self, element):
        """Extract price from a single element."""
        # Try data attributes first
        for attr in ['data-price', 'data-product-price', 'content']:
            if element.has_attr(attr):
                value = element[attr]
                price = self._parse_price_string(value)
                if price:
                    return price
        
        # Try text content
        text = element.get_text(strip=True)
        if text:
            price = self._parse_price_string(text)
            if price:
                return price
        
        return None
    
    def _parse_price_string(self, price_text):
        """Parse price from string with enhanced logic."""
        if not price_text:
            return None
            
        # Handle numeric values in cents (common in data attributes)
        if isinstance(price_text, str) and price_text.isdigit() and len(price_text) >= 5:
            # Check if this looks like cents (e.g., "259900" = $2599.00)
            cents_value = int(price_text)
            if cents_value >= 10000:  # Minimum $100.00 in cents
                dollars = cents_value / 100
                if dollars <= 50000:  # Maximum $50,000
                    return dollars
        
        # Standard price parsing
        price_str = str(price_text).strip()
        
        # Remove currency symbols and extra whitespace
        price_str = re.sub(r'[$€£¥]', '', price_str)
        price_str = re.sub(r'\s+', '', price_str)
        
        # Extract first price (handle cases with multiple prices like "$8,888 $6,666")
        # Look for price patterns: 1,234.56 or 1234.56 or 1234
        matches = re.findall(r'\d+(?:[,.]?\d+)*', price_str)
        if not matches:
            # Fallback to any number
            match = re.search(r'\d+', price_str)
            if not match:
                return None
            price_clean = match.group(0)
        else:
            # Take the first match
            price_clean = matches[0]
        
        # Handle thousand separators and decimal points
        if ',' in price_clean and '.' in price_clean:
            # Both separators present
            last_comma = price_clean.rfind(',')
            last_dot = price_clean.rfind('.')
            
            if last_comma > last_dot:
                # Comma is decimal (European style)
                price_clean = price_clean.replace('.', '').replace(',', '.')
            else:
                # Dot is decimal (US style)
                price_clean = price_clean.replace(',', '')
        elif ',' in price_clean:
            # Only comma - check if it's decimal or thousands
            comma_parts = price_clean.split(',')
            if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
                # Likely decimal separator (e.g., "123,45")
                price_clean = price_clean.replace(',', '.')
            else:
                # Likely thousands separator (e.g., "1,234" or "1,234,567")
                price_clean = price_clean.replace(',', '')
        
        try:
            result = float(price_clean)
            
            # Additional validation: if result seems too low for an obvious price, it might be parsing error
            if ('.' not in str(price_text) and 
                ',' not in str(price_text) and 
                str(price_text).isdigit() and 
                len(str(price_text)) >= 3 and
                result < 100 and 
                int(price_text) > 100):
                # This might be a case where the number should be treated as-is
                # e.g., "1799" should be 1799.0, not 179.9
                return float(str(price_text))
                
            return result
        except ValueError:
            return None
    
    def _validate_price(self, price, rules):
        """Validate price against site-specific rules."""
        if not price:
            return False
        
        min_price = rules.get('min_expected_price', 10)
        max_price = rules.get('max_expected_price', 100000)
        
        if price < min_price:
            logger.warning(f"Price {price} below minimum expected {min_price}")
            return False
        
        if price > max_price:
            logger.warning(f"Price {price} above maximum expected {max_price}")
            return False
        
        return True
    
    def _get_nested_value(self, obj, path):
        """Get nested value from object using dot notation."""
        keys = path.split('.')
        value = obj
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            elif isinstance(value, list) and key.isdigit():
                try:
                    value = value[int(key)]
                except (IndexError, ValueError):
                    return None
            else:
                return None
        
        return value


def integrate_with_existing_extractor():
    """
    Example of how to integrate with existing PriceExtractor class.
    Add this method to the existing PriceExtractor class.
    """
    integration_code = '''
    def extract_price(self, soup, html_content, url):
        """Enhanced extract_price method with site-specific rules."""
        
        # Try site-specific extraction first
        site_extractor = SiteSpecificExtractor()
        price, method = site_extractor.extract_price_with_rules(soup, html_content, url)
        if price is not None:
            logger.info(f"Extracted price {price} using site-specific method: {method}")
            return price, method
        
        # Fall back to original methods
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
    '''
    
    return integration_code


if __name__ == "__main__":
    # Test the extractor
    extractor = SiteSpecificExtractor()
    print("Site-specific price extractor rules loaded:")
    for domain, rules in extractor.site_rules.items():
        print(f"- {domain}: {rules['type']} site")