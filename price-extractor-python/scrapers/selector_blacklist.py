"""
Centralized CSS selector blacklist to prevent extraction of incorrect prices.
This module contains patterns and selectors that consistently extract wrong prices.
"""

# Global blacklist patterns that apply to all sites
GLOBAL_BLACKLIST_PATTERNS = [
    # Bundle and package pricing
    'bundle-price', 'bundle_price', 'bundleprice',
    'package-price', 'package_price', 'packageprice',
    'combo-price', 'combo_price', 'comboprice',
    'kit-price', 'kit_price', 'kitprice',
    
    # Addon and upgrade pricing
    'addon', 'add-on', 'upgrade', 'accessories', 'extras',
    'additional', 'option-price', 'extra-cost',
    
    # Specific variant issues
    '.variant-price[data-variant*="lightburn"]',
    '.variant-price[data-variant*="rotary"]',
    
    # Cart and checkout elements
    'cart-price', 'checkout-price', 'subtotal', 'total-price',
    
    # Comparison and old pricing
    'compare-price', 'was-price', 'old-price', 'original-price',
    'strike-through', 'crossed-out',
    
    # Shipping and tax
    'shipping', 'tax', 'delivery', 'handling',
    
    # Related products
    'related', 'similar', 'recommended', 'cross-sell', 'up-sell',
    
    # Modal and popup pricing
    'modal-price', 'popup-price', 'lightbox-price'
]

# Exact selectors to blacklist (case-sensitive)
EXACT_BLACKLIST_SELECTORS = [
    '.bundle-price',
    '.bundle-price .main-amount',
    '.bundle-price *',
    '.package-price',
    '.package-price *',
    '.combo-price',
    '.combo-price *',
    '.variant-price[data-variant*="lightburn"]',
    '.variant-price[data-variant*="rotary"]',
    '[class*="bundle"] .price',
    '[class*="package"] .price',
    '[class*="combo"] .price',
    '.related-products .price',
    '.cross-sells .price',
    '.up-sells .price'
]

def is_selector_blacklisted(selector: str) -> bool:
    """
    Check if a CSS selector is blacklisted.
    
    Args:
        selector: The CSS selector to check
        
    Returns:
        bool: True if the selector is blacklisted, False otherwise
    """
    if not selector:
        return False
        
    selector_lower = selector.lower()
    
    # Check exact matches first
    if selector in EXACT_BLACKLIST_SELECTORS:
        return True
    
    # Check pattern matches
    for pattern in GLOBAL_BLACKLIST_PATTERNS:
        if pattern in selector_lower:
            return True
    
    return False

def clean_selector_for_blacklist_check(selector: str) -> str:
    """
    Clean a selector for blacklist checking by removing quotes and extra spaces.
    
    Args:
        selector: The selector to clean
        
    Returns:
        str: Cleaned selector
    """
    if not selector:
        return ""
    
    # Remove quotes and trim
    selector = selector.strip().strip('"').strip("'")
    
    # Normalize whitespace
    selector = " ".join(selector.split())
    
    return selector

def get_blacklist_reason(selector: str) -> str:
    """
    Get the reason why a selector is blacklisted.
    
    Args:
        selector: The blacklisted selector
        
    Returns:
        str: Description of why the selector is blacklisted
    """
    selector_lower = selector.lower()
    
    if 'bundle' in selector_lower:
        return "Contains bundle pricing pattern"
    elif 'package' in selector_lower:
        return "Contains package pricing pattern"
    elif 'combo' in selector_lower:
        return "Contains combo pricing pattern"
    elif 'addon' in selector_lower or 'add-on' in selector_lower:
        return "Contains addon pricing pattern"
    elif 'lightburn' in selector_lower or 'rotary' in selector_lower:
        return "Contains variant-specific addon pattern"
    elif 'related' in selector_lower or 'cross-sell' in selector_lower:
        return "Contains related product pricing pattern"
    elif 'shipping' in selector_lower or 'tax' in selector_lower:
        return "Contains shipping/tax pattern"
    else:
        return "Matches blacklist pattern"