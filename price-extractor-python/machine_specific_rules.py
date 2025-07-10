#!/usr/bin/env python3
"""
Machine-specific price extraction rules for problematic machines.
Based on investigation results from investigate_specific_machines.py
"""

import json
from loguru import logger

# Machine-specific extraction rules
MACHINE_SPECIFIC_RULES = {
    # xTool S1 - Manual corrected to $1899, actual current price shows $1899
    'xtool-s1': {
        'machine_name': 'xTool S1',
        'url_pattern': 'xtool.com/products/xtool-s1-laser-cutter',
        'correct_price': 1899.00,
        'primary_selector': '.product-badge-price',
        'fallback_selectors': [
            '.footer-price-bold.product-badge-price',
            '.product-page-info-price-container .footer-price-bold'
        ],
        'avoid_selectors': [
            # Avoid bundle/accessory prices
            '[data-bundle]', '.bundle-price', '.addon-price'
        ],
        'price_validation': {
            'min_price': 1500,
            'max_price': 2500,
            'expected_price': 1899.00,
            'tolerance_percent': 15
        },
        'context_requirements': [
            # Must be in main product area, not bundles
            'main-product', 'product-badge', 'product-info'
        ],
        'notes': 'xTool S1 correctly extracts $1899 via .product-badge-price selector'
    },
    
    # xTool F1 - Manual corrected to $1169, actual current price shows $1169
    'xtool-f1': {
        'machine_name': 'xTool F1',
        'url_pattern': 'xtool.com/products/xtool-f1',
        'correct_price': 1169.00,
        'primary_selector': '.product-badge-price',
        'fallback_selectors': [
            '.footer-price-bold.product-badge-price',
            '.product-page-info-price-container .footer-price-bold'
        ],
        'avoid_selectors': [
            # Avoid bundle/accessory prices
            '[data-bundle]', '.bundle-price', '.addon-price'
        ],
        'price_validation': {
            'min_price': 1000,
            'max_price': 1500,
            'expected_price': 1169.00,
            'tolerance_percent': 15
        },
        'context_requirements': [
            'main-product', 'product-badge', 'product-info'
        ],
        'notes': 'xTool F1 correctly extracts $1169 via .product-badge-price selector'
    },
    
    # xTool F2 Ultra - Manual corrected to $5999.99, actual shows $5999
    'xtool-f2-ultra': {
        'machine_name': 'xTool F2 Ultra',
        'url_pattern': 'xtool.com/products/xtool-f2-ultra-60w-mopa-40w-diode-dual-laser-engraver',
        'correct_price': 5999.00,
        'primary_selector': '.product-badge-price',
        'fallback_selectors': [
            '.footer-price-bold.product-badge-price',
            '.product-page-info-price-container .footer-price-bold'
        ],
        'avoid_selectors': [
            # Avoid bundle/accessory prices that are higher
            '[data-bundle]', '.bundle-price', '.addon-price'
        ],
        'price_validation': {
            'min_price': 5500,
            'max_price': 6500,
            'expected_price': 5999.00,
            'tolerance_percent': 10
        },
        'context_requirements': [
            'main-product', 'product-badge', 'product-info'
        ],
        'notes': 'xTool F2 Ultra correctly extracts $5999 via .product-badge-price selector'
    },
    
    # ComMarker B6 30W - Manual corrected to $2399, but actual current sale price is $1839
    'commarker-b6-30w': {
        'machine_name': 'ComMarker B6 30W',
        'url_pattern': 'commarker.com/product/commarker-b6',
        'correct_price': 1839.00,  # Current sale price, not manual correction
        'primary_selector': '.entry-summary .price .amount',
        'fallback_selectors': [
            '.product-summary .price .amount',
            '.woocommerce-Price-amount.amount'
        ],
        'avoid_selectors': [
            # Avoid accessory/addon prices which are much lower
            '.saveprice', '[data-addon]', '.addon-price'
        ],
        'price_validation': {
            'min_price': 1500,
            'max_price': 2500,
            'expected_price': 1839.00,  # Use sale price as expected
            'tolerance_percent': 20
        },
        'context_requirements': [
            'entry-summary', 'product-summary', 'main-product'
        ],
        'extraction_strategy': 'prefer_sale_price',
        'notes': 'ComMarker B6 30W: Manual correction $2399 appears outdated, current sale price $1839 is correct'
    },
    
    # ComMarker B6 MOPA 60W - Manual corrected to $4589, but actual current sale price is $3059
    'commarker-b6-mopa-60w': {
        'machine_name': 'ComMarker B6 MOPA 60W',
        'url_pattern': 'commarker.com/product/commarker-b6-jpt-mopa',
        'correct_price': 3059.00,  # Current sale price, not manual correction
        'primary_selector': '.entry-summary .price .amount',
        'fallback_selectors': [
            '.product-summary .price .amount',
            '.woocommerce-Price-amount.amount'
        ],
        'avoid_selectors': [
            # Avoid accessory/addon prices
            '.saveprice', '[data-addon]', '.addon-price'
        ],
        'price_validation': {
            'min_price': 2800,
            'max_price': 4800,
            'expected_price': 3059.00,  # Use sale price as expected
            'tolerance_percent': 20
        },
        'context_requirements': [
            'entry-summary', 'product-summary', 'main-product'
        ],
        'extraction_strategy': 'prefer_sale_price',
        'notes': 'ComMarker B6 MOPA 60W: Manual correction $4589 appears outdated, current sale price $3059 is correct'
    },
    
    # ComMarker B4 100W MOPA - Manual corrected to $6666, actual current price is $6666 (correct)
    'commarker-b4-100w-mopa': {
        'machine_name': 'ComMarker B4 100W MOPA',
        'url_pattern': 'commarker.com/product/b4-100w-jpt-mopa',
        'correct_price': 6666.00,
        'primary_selector': '.entry-summary .price .amount',
        'fallback_selectors': [
            '.product-summary .price .amount',
            '.woocommerce-Price-amount.amount'
        ],
        'avoid_selectors': [
            # Avoid accessory/addon prices
            '.saveprice', '[data-addon]', '.addon-price'
        ],
        'price_validation': {
            'min_price': 6000,
            'max_price': 7500,
            'expected_price': 6666.00,
            'tolerance_percent': 15
        },
        'context_requirements': [
            'entry-summary', 'product-summary', 'main-product'
        ],
        'extraction_strategy': 'prefer_sale_price',
        'notes': 'ComMarker B4 100W MOPA: Manual correction $6666 matches current sale price, extraction working correctly'
    }
}

class MachineSpecificExtractor:
    """Machine-specific price extraction rules."""
    
    def __init__(self):
        self.rules = MACHINE_SPECIFIC_RULES
        logger.info(f"Loaded {len(self.rules)} machine-specific extraction rules")
    
    def get_machine_rule(self, machine_name=None, url=None):
        """Get extraction rule for a specific machine."""
        if not machine_name and not url:
            return None
            
        # First try to match by machine name
        if machine_name:
            machine_key = self._normalize_machine_name(machine_name)
            if machine_key in self.rules:
                return self.rules[machine_key]
        
        # Then try to match by URL pattern
        if url:
            for rule_key, rule in self.rules.items():
                if rule['url_pattern'] in url:
                    return rule
        
        return None
    
    def _normalize_machine_name(self, machine_name):
        """Normalize machine name to match rule keys."""
        normalized = machine_name.lower().strip()
        
        # Create mapping for common variations
        name_mappings = {
            'xtool s1': 'xtool-s1',
            'xtool f1': 'xtool-f1', 
            'xtool f2 ultra': 'xtool-f2-ultra',
            'commarker b6 30w': 'commarker-b6-30w',
            'commarker b6 mopa 60w': 'commarker-b6-mopa-60w',
            'commarker b4 100w mopa': 'commarker-b4-100w-mopa'
        }
        
        return name_mappings.get(normalized, normalized.replace(' ', '-'))
    
    def extract_price_with_machine_rules(self, soup, machine_name=None, url=None):
        """Extract price using machine-specific rules."""
        rule = self.get_machine_rule(machine_name, url)
        if not rule:
            logger.debug(f"No machine-specific rule found for {machine_name} / {url}")
            return None, None
            
        logger.info(f"Applying machine-specific rule for {rule['machine_name']}")
        
        # Try primary selector first
        price = self._try_selector(soup, rule['primary_selector'], rule)
        if price:
            if self._validate_price(price, rule):
                logger.info(f"✅ Extracted ${price} using primary selector: {rule['primary_selector']}")
                return price, f"machine_rule_primary:{rule['primary_selector']}"
            else:
                logger.warning(f"Price ${price} failed validation for {rule['machine_name']}")
        
        # Try fallback selectors
        for selector in rule.get('fallback_selectors', []):
            price = self._try_selector(soup, selector, rule)
            if price and self._validate_price(price, rule):
                logger.info(f"✅ Extracted ${price} using fallback selector: {selector}")
                return price, f"machine_rule_fallback:{selector}"
        
        logger.warning(f"Failed to extract valid price for {rule['machine_name']}")
        return None, None
    
    def _try_selector(self, soup, selector, rule):
        """Try to extract price using a specific selector."""
        try:
            elements = soup.select(selector)
            avoid_selectors = rule.get('avoid_selectors', [])
            
            for element in elements:
                # Check if element should be avoided
                if self._should_avoid_element(element, avoid_selectors):
                    continue
                    
                # Check context requirements
                if not self._meets_context_requirements(element, rule.get('context_requirements', [])):
                    continue
                
                # Extract price from element
                price_text = element.get_text().strip()
                price = self._parse_price_text(price_text)
                if price:
                    return price
                    
        except Exception as e:
            logger.error(f"Error trying selector {selector}: {str(e)}")
        
        return None
    
    def _should_avoid_element(self, element, avoid_selectors):
        """Check if element matches any avoid selectors."""
        element_html = str(element)
        for avoid_selector in avoid_selectors:
            if avoid_selector in element_html or avoid_selector in ' '.join(element.get('class', [])):
                return True
        return False
    
    def _meets_context_requirements(self, element, context_requirements):
        """Check if element meets context requirements."""
        if not context_requirements:
            return True
            
        # Check element and parent context
        current = element
        depth = 0
        while current and depth < 5:
            element_classes = ' '.join(current.get('class', []))
            element_id = current.get('id', '')
            context_text = f"{element_classes} {element_id}".lower()
            
            # If any requirement is found in context, it's valid
            for requirement in context_requirements:
                if requirement.lower() in context_text:
                    return True
                    
            current = current.parent
            depth += 1
        
        return False
    
    def _parse_price_text(self, text):
        """Parse price from text."""
        if not text:
            return None
            
        import re
        
        # Remove currency symbols and extra whitespace
        text_clean = re.sub(r'[$€£¥]', '', str(text))
        text_clean = re.sub(r'\s+', '', text_clean)
        
        # Find numeric pattern
        match = re.search(r'\d+(?:[,.]?\d+)*', text_clean)
        if match:
            price_str = match.group(0)
            
            # Handle thousand separators and decimal points
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
                    # Likely thousands separator (e.g., "1,234")
                    price_str = price_str.replace(',', '')
            
            try:
                price = float(price_str)
                if 1 <= price <= 100000:
                    return price
            except ValueError:
                pass
                
        return None
    
    def _validate_price(self, price, rule):
        """Validate price against machine-specific rules."""
        validation = rule.get('price_validation', {})
        
        # Check min/max range
        min_price = validation.get('min_price', 0)
        max_price = validation.get('max_price', 100000)
        
        if price < min_price or price > max_price:
            logger.debug(f"Price ${price} outside range ${min_price}-${max_price}")
            return False
        
        # Check tolerance from expected price
        expected_price = validation.get('expected_price')
        tolerance_percent = validation.get('tolerance_percent', 50)
        
        if expected_price:
            tolerance = expected_price * (tolerance_percent / 100)
            if abs(price - expected_price) > tolerance:
                logger.debug(f"Price ${price} too far from expected ${expected_price} (tolerance: ${tolerance})")
                return False
        
        return True
    
    def generate_learned_selectors_update(self):
        """Generate SQL to update learned selectors for these machines."""
        updates = []
        
        for rule_key, rule in self.rules.items():
            machine_name = rule['machine_name']
            primary_selector = rule['primary_selector']
            expected_price = rule.get('price_validation', {}).get('expected_price', rule['correct_price'])
            
            update_sql = f"""
-- Update learned selector for {machine_name}
UPDATE machines 
SET learned_selectors = jsonb_set(
  COALESCE(learned_selectors, '{{}}'),
  '{{{rule['url_pattern'].split('/')[0]}}}',
  '{{
    "selector": "{primary_selector}",
    "last_success": "{json.dumps(None)}",
    "confidence": 0.95,
    "price_found": {expected_price},
    "method": "Machine-Specific Rule",
    "reasoning": "{rule.get('notes', 'Machine-specific extraction rule')}"
  }}'
)
WHERE "Machine Name" = '{machine_name}';
"""
            updates.append(update_sql)
        
        return '\n'.join(updates)

def main():
    """Test the machine-specific extractor."""
    extractor = MachineSpecificExtractor()
    
    # Test rule lookup
    test_machines = [
        ('xTool S1', 'https://www.xtool.com/products/xtool-s1-laser-cutter'),
        ('ComMarker B6 30W', 'https://commarker.com/product/commarker-b6'),
        ('xTool F2 Ultra', 'https://www.xtool.com/products/xtool-f2-ultra-60w-mopa-40w-diode-dual-laser-engraver')
    ]
    
    for machine_name, url in test_machines:
        rule = extractor.get_machine_rule(machine_name, url)
        if rule:
            logger.info(f"✅ Found rule for {machine_name}: {rule['primary_selector']}")
        else:
            logger.warning(f"❌ No rule found for {machine_name}")
    
    # Generate SQL updates
    sql_updates = extractor.generate_learned_selectors_update()
    with open('machine_specific_learned_selectors.sql', 'w') as f:
        f.write(sql_updates)
    
    logger.info("📁 Generated machine_specific_learned_selectors.sql")

if __name__ == "__main__":
    main()