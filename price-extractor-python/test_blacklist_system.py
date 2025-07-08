#!/usr/bin/env python3
"""
Test the CSS selector blacklist system.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.selector_blacklist import is_selector_blacklisted, get_blacklist_reason

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")

# Test selectors
TEST_SELECTORS = [
    # Should be blacklisted
    ".bundle-price",
    ".bundle-price .amount",
    ".package-price span",
    ".combo-price .woocommerce-Price-amount",
    ".price-box .price",  # Generic selector on multi-variant pages
    ".price",  # Too generic
    
    # Should NOT be blacklisted
    ".product-summary .price .woocommerce-Price-amount",
    ".single-product .price .amount",
    ".entry-summary .price:not(.bundle-price *)",
    ".product-price-wrapper .price:not(.bundle-price *)",
    "[data-product-price]",
    ".price-now",
]

def test_blacklist():
    """Test the blacklist system."""
    logger.info("TESTING CSS SELECTOR BLACKLIST SYSTEM")
    logger.info("="*60)
    
    blacklisted_count = 0
    allowed_count = 0
    
    for selector in TEST_SELECTORS:
        is_blacklisted = is_selector_blacklisted(selector)
        reason = get_blacklist_reason(selector) if is_blacklisted else None
        
        if is_blacklisted:
            blacklisted_count += 1
            logger.warning(f"❌ BLACKLISTED: {selector}")
            if reason:
                logger.info(f"   Reason: {reason}")
        else:
            allowed_count += 1
            logger.success(f"✅ ALLOWED: {selector}")
    
    logger.info(f"\n{'='*60}")
    logger.info("SUMMARY:")
    logger.info(f"Total selectors tested: {len(TEST_SELECTORS)}")
    logger.info(f"Blacklisted: {blacklisted_count}")
    logger.info(f"Allowed: {allowed_count}")
    
    # Test specific patterns
    logger.info(f"\n{'='*60}")
    logger.info("TESTING PATTERN MATCHING:")
    
    test_patterns = [
        ("bundle", [
            ".my-bundle-price",
            ".bundleprice",
            ".product-bundle .price",
            "[data-bundle-price]",
        ]),
        ("package", [
            ".package-price-display",
            ".packageprice",
            ".product-package .amount",
        ]),
        ("generic", [
            ".price",
            ".amount",
            "span.price",
        ])
    ]
    
    for pattern_name, selectors in test_patterns:
        logger.info(f"\nTesting {pattern_name} patterns:")
        for selector in selectors:
            is_blacklisted = is_selector_blacklisted(selector)
            status = "BLACKLISTED" if is_blacklisted else "ALLOWED"
            logger.info(f"  {selector}: {status}")


if __name__ == "__main__":
    test_blacklist()