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
                    'product-recommendations', 'comparison', 'bundle', 'package',
                    'accessories', 'addons', 'extras', 'upsell-products',
                    'related_products', 'cross-sell-products'
                ],
                'avoid_selectors': [
                    '.bundle-price', '.bundle-price *', '.package-price', '.package-price *',
                    '.addon-price', '.extra-price', '.accessories-price',
                    '.cross-sell', '.up-sell', '.related', '.recommendation',
                    '.upsell-products', '.related_products', '.cross-sell-products',
                    'section.related', 'section.upsell', '.woocommerce-Tabs-panel'
                ],
                'prefer_contexts': [
                    'product-summary', 'single-product', 'product-main',
                    'woocommerce-product-details', 'entry-summary', 'product-price-wrapper'
                ],
                'price_selectors': [
                    # Target the specific price displayed after bundle/variant selection
                    '.package-selection .price .amount',  # Bundle price after selection
                    '.bundle-price .amount:last-child',    # Final bundle price
                    '.selected-package .price .amount',    # Selected package price
                    '.woocommerce-variation-price .price .amount:last-child',  # Variant price
                    
                    # Prioritize sale price selectors in main product area
                    '.product-summary .price ins .amount',  # Sale price in <ins> tag
                    '.entry-summary .price ins .amount',
                    '.single-product-content .price ins .amount',
                    'form.cart .price ins .amount',
                    
                    # Current price after variant selection
                    '.product-summary .price .amount:last-child',
                    '.entry-summary .price .amount:last-child',
                ],
                'blacklist_selectors': [
                    '.bundle-price', '.bundle-price .main-amount', '.bundle-price *',
                    '.package-price', '.package-price *', '.combo-price', '.combo-price *',
                    '.upsell-products .price', '.related_products .price'
                ],
                'strict_validation': True,  # Enable strict price validation
                'requires_dynamic': True,  # Re-enable dynamic extraction for variant selection
                # Removed machine_specific_validation - using percentage-based validation instead
                # Fixed ranges were too restrictive and rejecting valid prices
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
                ]
            },
            
            'acmerlaser.com': {
                'type': 'custom',
                'price_selectors': [
                    '.product-price-wrapper .price',
                    '.current-price',
                    '.sale-price'
                ],
                'avoid_contexts': ['recommended', 'related']
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
            },
            
            'shop.glowforge.com': {
                'type': 'shopify',
                'use_base_price': True,
                'multi_price_strategy': 'highest_visible',
                'price_selectors': [
                    '.price--main:not(.price--compare)',  # Main price, not comparison price
                    '.product__price .price--main',        # Product page main price
                    '[data-price]:not(.price--compare)',   # Data attribute price
                    '.price:not(.price--compare) .money'   # Money element without compare
                ],
                'avoid_selectors': [
                    '.price--compare',     # Old/comparison price
                    '.was-price',         # Previous price
                    'strike',             # Struck-through price
                    '.price--save',       # Savings amount
                    '.bundle-price'       # Bundle pricing
                ],
                'validation': {
                    'price_ranges': {
                        'plus': {'min': 4000, 'max': 5000},
                        'plus-hd': {'min': 4500, 'max': 5500},
                        'pro': {'min': 5500, 'max': 6500},
                        'pro-hd': {'min': 6500, 'max': 7500}
                    }
                },
                'strict_validation': True,
                'fallback_patterns': [
                    r'starting at \$?([\d,]+)',  # "starting at $6995"
                    r'total[\s\n]*\$?([\d,]+)'   # "Total $6995"
                ]
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
                }
            },
            
            'glowforge.com': {
                'type': 'variant_configurator',
                'requires_variant_detection': True,
                'machine_variant_mapping': {
                    'Glowforge Pro HD': {
                        'keywords': ['pro', 'hd'], 
                        'expected_price_range': [6500, 7500],
                        'selector_hints': ['.pro.hd', '[data-variant*="pro-hd"]']
                    },
                    'Glowforge Pro': {
                        'keywords': ['pro'], 
                        'exclude_keywords': ['hd'],
                        'expected_price_range': [5500, 6500],
                        'selector_hints': ['.pro:not(.hd)', '[data-variant*="pro"]:not([data-variant*="hd"])']
                    },
                    'Glowforge Plus HD': {
                        'keywords': ['plus', 'hd'], 
                        'expected_price_range': [4500, 5500],
                        'selector_hints': ['.plus.hd', '[data-variant*="plus-hd"]']
                    },
                    'Glowforge Plus': {
                        'keywords': ['plus'], 
                        'exclude_keywords': ['hd'],
                        'expected_price_range': [4000, 5000],
                        'selector_hints': ['.plus:not(.hd)', '[data-variant*="plus"]:not([data-variant*="hd"])']
                    },
                    'Glowforge Aura': {
                        'url_contains': ['/craft', '/aura'], 
                        'expected_price_range': [1000, 1500],
                        'separate_page': True
                    }
                },
                'avoid_selectors': [
                    '.bundle-price', '.promotion-price', '.package-price',
                    '.main-bundle-price', '.bundle .main-amount',
                    '.financing-price', '.monthly-price'
                ],
                'price_selectors': [
                    '.product-price:not(.bundle-price)',
                    '.variant-price:not([class*="bundle"])',
                    '.base-price',
                    '.current-price:not(.bundle)',
                    '[data-price]:not([data-bundle])'
                ],
                'prefer_contexts': [
                    'product-variants',
                    'variant-selector', 
                    'product-options',
                    'configurator-step',
                    'product-pricing'
                ],
                'variant_detection_patterns': [
                    r'(?i)glowforge\s+(pro|plus)\s*(hd)?',
                    r'(?i)(pro|plus)(?:\s+hd)?',
                    r'(?i)\$(\d{1,2},?\d{3})'
                ]
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
            price, method = self._extract_with_site_rules(soup, html_content, url, rules, machine_data)
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
    
    def _extract_with_site_rules(self, soup, html_content, url, rules, machine_data=None):
        """Extract price using specific site rules."""
        domain = urlparse(url).netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Monport-specific variant selection logic
        if domain == 'monportlaser.com' and rules.get('base_machine_preference'):
            price, method = self._extract_monport_base_machine_price(soup, rules)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Monport base machine ({method})"
        
        # ComMarker-specific price extraction logic
        if domain == 'commarker.com':
            price, method = self._extract_commarker_main_price(soup, rules)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"ComMarker main price ({method})"
        
        # Glowforge-specific variant detection logic
        if domain == 'glowforge.com' and rules.get('requires_variant_detection'):
            price, method = self._extract_glowforge_variant_price(soup, html_content, url, rules, machine_data)
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Glowforge variant ({method})"
        
        # Method 1: JSON-LD (for Shopify sites)
        if rules.get('prefer_json_ld', False):
            price, method = self._extract_json_ld_with_paths(soup, rules.get('json_ld_paths', []))
            if price and self._validate_price(price, rules, machine_data):
                return price, f"Site-specific JSON-LD ({method})"
        
        # Method 2: Context-aware CSS selector extraction
        price, method = self._extract_with_context_filtering(soup, rules)
        if price and self._validate_price(price, rules, machine_data):
            return price, f"Site-specific CSS ({method})"
        
        # Method 3: Fallback with avoided selectors
        price, method = self._extract_avoiding_selectors(soup, rules)
        if price and self._validate_price(price, rules, machine_data):
            return price, f"Site-specific fallback ({method})"
            
        return None, None
    
    def _extract_commarker_main_price(self, soup, rules):
        """Extract main product price for ComMarker, targeting main product summary."""
        logger.info("🔍 Attempting ComMarker-specific price extraction")
        
        # Log page structure for debugging
        title_elem = soup.find('title')
        if title_elem:
            logger.info(f"Page title: {title_elem.get_text()}")
        
        # Check if this is actually a ComMarker product page
        page_content = soup.get_text().lower()
        # More lenient check - sometimes the content is corrupted
        if len(page_content) < 100:
            logger.warning("❌ Page content too short, likely corrupted")
            # Don't return None here, continue trying
        
        # Strategy 1: Enhanced WooCommerce price detection with context awareness
        priority_selectors = [
            # Most specific selectors first
            '.summary-inner .price .woocommerce-Price-amount.amount',
            '.entry-summary .price .woocommerce-Price-amount.amount',
            '.product-summary .woocommerce-Price-amount.amount',
            '.product .price .woocommerce-Price-amount.amount',
            # Broader fallbacks
            '.woocommerce-Price-amount.amount',
            '.price .amount',
            '.summary-inner .price .amount',
            '.entry-summary .price .amount'
        ]
        
        all_prices_found = []
        for selector in priority_selectors:
            elements = soup.select(selector)
            logger.info(f"🔍 ComMarker selector '{selector}': found {len(elements)} elements")
            
            for i, elem in enumerate(elements):
                price_text = elem.get_text().strip()
                logger.info(f"  Element {i+1} text: '{price_text}'")
                
                # Check element context to avoid bundle/addon prices
                context = self._get_element_context(elem)
                if any(avoid in context.lower() for avoid in ['bundle', 'package', 'addon', 'extra', 'accessory']):
                    logger.info(f"  ❌ Skipping price in bundle/addon context: {context}")
                    continue
                
                price = self._parse_price_text(price_text, 'commarker.com')
                if price and 500 <= price <= 15000:  # Reasonable ComMarker price range
                    parent_classes = ' '.join(elem.parent.get('class', []) if elem.parent else [])
                    all_prices_found.append((price, elem, selector, parent_classes))
                    logger.info(f"  ✅ Valid price: ${price} (context: {parent_classes})")
        
        # Sort prices and log them
        all_prices_found.sort(key=lambda x: x[0], reverse=True)
        logger.info(f"🔍 All valid ComMarker prices: {[f'${p[0]}' for p in all_prices_found]}")
        
        # Enhanced price selection logic
        if len(all_prices_found) >= 2:
            high_price, _, _, high_context = all_prices_found[0]
            low_price, low_elem, low_selector, low_context = all_prices_found[1]
            
            # Calculate price difference
            price_difference_percent = ((high_price - low_price) / high_price) * 100
            
            # Prefer sale prices when there's a reasonable discount
            if price_difference_percent > 15 and low_price < high_price:
                logger.info(f"✅ Selected ComMarker sale price ${low_price} (was ${high_price}, {price_difference_percent:.1f}% off)")
                return low_price, f"sale_price:{low_selector}"
            else:
                logger.info(f"✅ Selected ComMarker primary price ${high_price} (diff too small: {price_difference_percent:.1f}%)")
                return high_price, f"primary_price:{all_prices_found[0][2]}"
        
        # Single price found
        elif len(all_prices_found) == 1:
            price, elem, selector, context = all_prices_found[0]
            logger.info(f"✅ Selected single ComMarker price: ${price}")
            return price, f"single_price:{selector}"
        
        # Strategy 2: Fallback to even more general search
        fallback_selectors = [
            '.product-summary .price',
            '.entry-summary .price', 
            '.woocommerce-product-details .price',
            '.single-product-summary .price',
            '.product-info .price',
            '.product-main .price'
        ]
        
        for selector in fallback_selectors:
            elements = soup.select(selector)
            logger.info(f"Fallback ComMarker selector '{selector}': found {len(elements)} elements")
            for element in elements:
                # Look for any price text within this element
                price_text = element.get_text()
                logger.info(f"  Fallback element text: '{price_text[:100]}...'")
                price = self._parse_price_text(price_text, 'commarker.com')
                if price is not None and price > 1000:
                    logger.info(f"Found ComMarker fallback price: ${price} using selector: {selector}")
                    return price, f"fallback:{selector}"
        
        logger.warning("ComMarker-specific extraction failed to find valid price")
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
    
    def _extract_glowforge_variant_price(self, soup, html_content, url, rules, machine_data=None):
        """Extract variant-specific price for Glowforge machines."""
        variant_mapping = rules.get('machine_variant_mapping', {})
        
        # Determine which machine variant we're looking for
        target_variant = None
        machine_name = ''
        
        if machine_data and 'Machine Name' in machine_data:
            machine_name = machine_data['Machine Name'].lower()
            
            # Match machine name to variant mapping
            for variant_name, variant_config in variant_mapping.items():
                variant_keywords = variant_config.get('keywords', [])
                exclude_keywords = variant_config.get('exclude_keywords', [])
                
                # Check if machine name contains required keywords
                has_required = all(keyword.lower() in machine_name for keyword in variant_keywords)
                has_excluded = any(keyword.lower() in machine_name for keyword in exclude_keywords)
                
                if has_required and not has_excluded:
                    target_variant = variant_name
                    break
        
        # Special handling for Aura (different URL)
        if target_variant == 'Glowforge Aura':
            aura_config = variant_mapping['Glowforge Aura']
            url_patterns = aura_config.get('url_contains', [])
            if any(pattern in url.lower() for pattern in url_patterns):
                # This is the Aura page, extract normally
                price_selectors = rules.get('price_selectors', [])
                for selector in price_selectors:
                    elements = soup.select(selector)
                    for element in elements:
                        price = self._parse_price_text(element.get_text(), 'glowforge.com')
                        if price and 1000 <= price <= 1500:  # Aura price range
                            return price, f"aura_page:{selector}"
            return None, None
        
        if not target_variant:
            logger.warning(f"Could not determine Glowforge variant for machine: {machine_name}")
            return None, None
        
        logger.info(f"Looking for Glowforge variant: {target_variant}")
        
        # Strategy 1: Look for variant-specific selectors
        variant_config = variant_mapping[target_variant]
        selector_hints = variant_config.get('selector_hints', [])
        expected_range = variant_config.get('expected_price_range', [])
        
        for selector_hint in selector_hints:
            elements = soup.select(selector_hint)
            for element in elements:
                # Look for price in or around this element
                price_element = element.select_one('.price, .amount, [data-price]')
                if not price_element:
                    price_element = element
                
                price = self._parse_price_text(price_element.get_text(), 'glowforge.com')
                if price and expected_range[0] <= price <= expected_range[1]:
                    return price, f"variant_selector:{selector_hint}"
        
        # Strategy 2: Look for all prices on page and match by expected range
        price_selectors = rules.get('price_selectors', [])
        avoid_selectors = rules.get('avoid_selectors', [])
        
        for selector in price_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Skip if element matches avoid selectors
                element_html = str(element)
                if any(avoid_pattern in element_html.lower() for avoid_pattern in [s.lower() for s in avoid_selectors]):
                    continue
                
                price = self._parse_price_text(element.get_text(), 'glowforge.com')
                if price and expected_range[0] <= price <= expected_range[1]:
                    logger.info(f"Found {target_variant} price {price} in expected range {expected_range}")
                    return price, f"range_match:{selector}"
        
        # Strategy 3: Pattern matching in HTML content
        variant_patterns = rules.get('variant_detection_patterns', [])
        keywords = variant_config.get('keywords', [])
        
        for pattern in variant_patterns:
            matches = re.finditer(pattern, html_content, re.IGNORECASE)
            for match in matches:
                match_text = match.group(0).lower()
                
                # Check if this match relates to our target variant
                keyword_match = any(keyword.lower() in match_text for keyword in keywords)
                if keyword_match:
                    # Look for price near this match
                    price_match = re.search(r'\$?(\d{1,2},?\d{3})', match.group(0))
                    if price_match:
                        price = self._parse_price_text(price_match.group(1), 'glowforge.com')
                        if price and expected_range[0] <= price <= expected_range[1]:
                            return price, f"pattern_match:{pattern}"
        
        # Strategy 4: Fallback - look for any price in expected range with context clues
        all_text = soup.get_text().lower()
        keyword_positions = []
        for keyword in keywords:
            pos = all_text.find(keyword.lower())
            if pos != -1:
                keyword_positions.append(pos)
        
        if keyword_positions:
            # Look for prices near keyword positions
            price_pattern = r'\$?(\d{1,2},?\d{3})'
            for match in re.finditer(price_pattern, all_text):
                price = self._parse_price_text(match.group(1), 'glowforge.com')
                if price and expected_range[0] <= price <= expected_range[1]:
                    # Check if price is reasonably close to a keyword
                    match_pos = match.start()
                    min_distance = min(abs(match_pos - kw_pos) for kw_pos in keyword_positions)
                    if min_distance < 500:  # Within 500 characters
                        return price, f"keyword_proximity:{min_distance}chars"
        
        # Strategy 5: Context-aware price extraction - match prices to their product cards
        logger.info(f"Trying Strategy 5: Context-aware price extraction for {target_variant}")
        
        # Create keywords to look for based on the target variant
        variant_keywords = []
        if 'pro hd' in target_variant.lower():
            variant_keywords = ['pro', 'hd']
        elif 'pro' in target_variant.lower():
            variant_keywords = ['pro']
        elif 'plus hd' in target_variant.lower():
            variant_keywords = ['plus', 'hd']  
        elif 'plus' in target_variant.lower():
            variant_keywords = ['plus']
        
        # Find all price elements with their surrounding context
        all_price_elements = soup.find_all(string=re.compile(r'\$\s*[\d,]+'))
        
        for price_text in all_price_elements:
            # Skip if it's in an avoided context
            parent_html = str(price_text.parent) if price_text.parent else ""
            if any(avoid_pattern in parent_html.lower() for avoid_pattern in avoid_selectors):
                continue
                
            price = self._parse_price_text(price_text, 'glowforge.com')
            if not price or not (expected_range[0] <= price <= expected_range[1]):
                continue
                
            # Check the surrounding context for variant keywords
            # Look up the DOM tree to find the product card container
            current_element = price_text.parent
            context_found = False
            variant_context = ""
            
            # Look up to 10 levels up in the DOM to find the product card (increased from 5)
            for level in range(10):
                if not current_element:
                    break
                    
                element_text = current_element.get_text(separator=' ').lower() if hasattr(current_element, 'get_text') else str(current_element).lower()
                variant_context += element_text + " "
                
                # Debug logging to see what context we're finding
                if price == 4499 or price == 4999:  # Debug specific prices
                    logger.info(f"DEBUG: Level {level} for ${price}: Found text snippet: '{element_text[:100]}...'")
                
                # Check if this context contains our variant keywords
                if variant_keywords:
                    # Use specific feature detection based on Glowforge product differences
                    if 'plus' in variant_keywords and 'hd' not in variant_keywords:
                        # Looking for "plus" (not HD) - check for "live camera view" WITHOUT "hd"
                        if 'live camera view' in element_text and 'live camera view hd' not in element_text:
                            logger.info(f"🎯 Found Plus (non-HD) signature: 'live camera view' without 'hd' for ${price}")
                            context_found = True
                            break
                        elif 'glowforge plus' in element_text and 'glowforge plus hd' not in element_text:
                            logger.info(f"🎯 Found exact match for 'glowforge plus' without 'hd' for ${price}")
                            context_found = True
                            break
                    elif 'plus' in variant_keywords and 'hd' in variant_keywords:
                        # Looking for "plus hd" - check for "live camera view hd"
                        if 'live camera view hd' in element_text:
                            logger.info(f"🎯 Found Plus HD signature: 'live camera view hd' for ${price}")
                            context_found = True
                            break
                    elif all(keyword in element_text for keyword in variant_keywords):
                        logger.info(f"🎯 Found all keywords {variant_keywords} for ${price}")
                        context_found = True
                        break
                
                current_element = current_element.parent if hasattr(current_element, 'parent') else None
            
            if context_found:
                logger.info(f"✅ Strategy 5 SUCCESS: Found {target_variant} price ${price} with matching context: {variant_keywords}")
                return price, f"context_aware:keywords_{'+'.join(variant_keywords)}"
        
        # If context-aware matching failed, fall back to simple range matching
        logger.info(f"Strategy 5 context-aware failed, falling back to simple range matching")
        all_found_prices = []
        for price_text in all_price_elements:
            parent_html = str(price_text.parent) if price_text.parent else ""
            if any(avoid_pattern in parent_html.lower() for avoid_pattern in avoid_selectors):
                continue
            price = self._parse_price_text(price_text, 'glowforge.com')
            if price:
                all_found_prices.append(price)
        
        # Look for price in expected range as fallback
        for price in all_found_prices:
            if expected_range[0] <= price <= expected_range[1]:
                logger.info(f"✅ Strategy 5 FALLBACK: Found {target_variant} price ${price} in expected range {expected_range}")
                return price, f"direct_extraction:range_match"
        
        # Log what prices we found for debugging
        logger.warning(f"Strategy 5: Found prices {all_found_prices} but none in expected range {expected_range} for {target_variant}")
        
        logger.warning(f"Could not find price for {target_variant} in expected range {expected_range}")
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
    
    def _validate_price(self, price, rules, machine_data=None):
        """Validate price against machine-specific data."""
        if not price:
            return False
        
        # Use machine data if available, otherwise use wide defaults
        if machine_data and machine_data.get('old_price'):
            old_price = float(machine_data['old_price'])
            # Allow 60% variance from old price
            min_price = old_price * 0.4
            max_price = old_price * 1.6
            logger.debug(f"Using machine-based range: ${min_price:.2f} - ${max_price:.2f} (old: ${old_price:.2f})")
        else:
            # Wide defaults when no machine data
            min_price = 10
            max_price = 100000
        
        if price < min_price:
            logger.warning(f"Price ${price} below expected range (min: ${min_price:.2f})")
            return False
        
        if price > max_price:
            logger.warning(f"Price ${price} above expected range (max: ${max_price:.2f})")
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
    
    def _get_element_context(self, element):
        """Get contextual information about an element for better price filtering."""
        context_parts = []
        
        # Get element's own classes and attributes
        if element.get('class'):
            context_parts.extend(element.get('class'))
        if element.get('id'):
            context_parts.append(element.get('id'))
        
        # Get parent element context
        current = element.parent
        depth = 0
        while current and depth < 3:  # Check up to 3 levels up
            if current.name:
                if current.get('class'):
                    context_parts.extend([f"parent-{cls}" for cls in current.get('class')])
                if current.get('id'):
                    context_parts.append(f"parent-{current.get('id')}")
            current = current.parent
            depth += 1
        
        # Get surrounding text content
        if element.parent:
            parent_text = element.parent.get_text()[:200].lower()
            context_parts.append(parent_text)
        
        return ' '.join(context_parts)


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