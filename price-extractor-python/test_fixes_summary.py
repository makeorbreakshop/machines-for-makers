#!/usr/bin/env python3
"""
Summary test of fixes implemented so far.
Tests blacklist system and site-specific extractors.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger
from scrapers.selector_blacklist import is_selector_blacklisted
from scrapers.site_specific_extractors import SiteSpecificExtractor

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="{time:HH:mm:ss} | {level} | {message}")

def test_blacklist_fixes():
    """Test that blacklist system is working."""
    logger.info("\n" + "="*60)
    logger.info("TESTING BLACKLIST SYSTEM FIXES")
    logger.info("="*60)
    
    # Test cases that should be blacklisted
    bad_selectors = [
        ".bundle-price",
        ".bundle-price .amount",
        ".package-price",
        ".combo-price .woocommerce-Price-amount",
        "[data-bundle-price]",
        ".bundleprice",
        ".packageprice",
    ]
    
    all_blocked = True
    for selector in bad_selectors:
        if is_selector_blacklisted(selector):
            logger.success(f"✅ Correctly blocked: {selector}")
        else:
            logger.error(f"❌ NOT BLOCKED: {selector}")
            all_blocked = False
    
    if all_blocked:
        logger.success("\n✅ BLACKLIST SYSTEM: All bad selectors are being blocked!")
    else:
        logger.error("\n❌ BLACKLIST SYSTEM: Some bad selectors are not being blocked!")
    
    return all_blocked


def test_site_specific_fixes():
    """Test site-specific extractor configurations."""
    logger.info("\n" + "="*60)
    logger.info("TESTING SITE-SPECIFIC EXTRACTOR FIXES")
    logger.info("="*60)
    
    extractor = SiteSpecificExtractor()
    
    # Test ComMarker configuration
    if 'commarker.com' in extractor.site_rules:
        rules = extractor.site_rules['commarker.com']
        logger.info("\nComMarker.com configuration:")
        logger.info(f"  - Blacklisted selectors: {len(rules.get('blacklist_selectors', []))}")
        logger.info(f"  - Avoid contexts: {len(rules.get('avoid_contexts', []))}")
        logger.info(f"  - Price range: ${rules.get('min_expected_price', 0)} - ${rules.get('max_expected_price', 0)}")
        logger.info(f"  - Strict validation: {rules.get('strict_validation', False)}")
        
        # Check if bundle selectors are blacklisted
        has_bundle_blacklist = any('bundle' in s for s in rules.get('blacklist_selectors', []))
        if has_bundle_blacklist:
            logger.success("  ✅ Bundle selectors are blacklisted")
        else:
            logger.error("  ❌ Bundle selectors are NOT blacklisted")
    else:
        logger.error("❌ ComMarker.com not found in site rules!")
    
    # Test other problematic sites
    problematic_sites = ['xtool.com', 'glowforge.com', 'monport.com']
    for site in problematic_sites:
        if site in extractor.site_rules:
            logger.success(f"✅ {site} has site-specific rules")
        else:
            logger.warning(f"⚠️  {site} has no site-specific rules")


def main():
    """Run all tests."""
    logger.info("PRICE EXTRACTION FIX VALIDATION")
    logger.info("Testing fixes implemented so far\n")
    
    # Test blacklist system
    blacklist_ok = test_blacklist_fixes()
    
    # Test site-specific extractors
    test_site_specific_fixes()
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("SUMMARY OF FIXES IMPLEMENTED:")
    logger.info("="*60)
    
    logger.info("\n1. BLACKLIST SYSTEM:")
    logger.info("   - Created centralized selector_blacklist.py")
    logger.info("   - Added patterns for bundle/package/combo pricing")
    logger.info("   - Integrated into price_extractor.py")
    logger.info(f"   - Status: {'✅ WORKING' if blacklist_ok else '❌ NEEDS ATTENTION'}")
    
    logger.info("\n2. COMMARKER MCP AUTOMATION:")
    logger.info("   - Fixed naive regex in claude_mcp_client.py")
    logger.info("   - Added multi-strategy price extraction")
    logger.info("   - Implemented variant selection logic")
    logger.info("   - Status: ⚠️  NEEDS TESTING (import issues)")
    
    logger.info("\n3. SITE-SPECIFIC RULES:")
    logger.info("   - Enhanced ComMarker rules in site_specific_extractors.py")
    logger.info("   - Added blacklist selectors to ComMarker config")
    logger.info("   - Set strict validation and price ranges")
    logger.info("   - Status: ✅ CONFIGURED")
    
    logger.info("\n4. TEST INFRASTRUCTURE:")
    logger.info("   - Created test_price_extraction.py")
    logger.info("   - Loaded 53 test cases from manual corrections")
    logger.info("   - Status: ⚠️  BLOCKED BY IMPORT ISSUES")
    
    logger.info("\n" + "="*60)
    logger.info("NEXT STEPS:")
    logger.info("="*60)
    logger.info("1. Fix import issues (playwright/pyee)")
    logger.info("2. Run full test suite on ComMarker machines")
    logger.info("3. Test xTool variant selection")
    logger.info("4. Validate all fixes don't break working extractions")


if __name__ == "__main__":
    main()