#!/usr/bin/env python3
"""
Debug why ComMarker B6 MOPA 60W is not finding $4,589.
Analyze the current extraction logic and identify the issue.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def analyze_issue():
    """Analyze why the price extraction is failing."""
    
    logger.info("=== DEBUGGING COMMARKER B6 MOPA 60W PRICING ISSUE ===")
    
    logger.info("\n📋 WHAT WE KNOW:")
    logger.info("1. The correct price is $4,589")
    logger.info("2. This requires selecting: Effect Power = 'B6 MOPA 60W' + Package = 'B6 Mopa Basic Bundle'")
    logger.info("3. The system is finding $4,799 instead")
    logger.info("4. Static HTML analysis shows $4,589 is NOT in the initial HTML")
    logger.info("5. The price is loaded dynamically via JavaScript when options are selected")
    
    logger.info("\n🔍 CURRENT EXTRACTION FLOW:")
    logger.info("1. dynamic_scraper.py navigates to the page")
    logger.info("2. _select_commarker_variant() selects 60W power")
    logger.info("3. For B6 MOPA 60W, it also selects 'Basic Bundle'")
    logger.info("4. After selection, it extracts prices using various selectors")
    logger.info("5. It finds multiple prices but selects $4,799 (closest to old price)")
    
    logger.info("\n❌ THE PROBLEM:")
    logger.info("The system is successfully selecting the options BUT:")
    logger.info("- It's not finding $4,589 among the extracted prices")
    logger.info("- This means our price selectors are not looking in the right place")
    logger.info("- The $4,589 likely appears in a specific element after JavaScript updates")
    
    logger.info("\n💡 HYPOTHESIS:")
    logger.info("The $4,589 price appears in a specific location after bundle selection:")
    logger.info("1. It might be in the bundle selection UI itself (not main price area)")
    logger.info("2. It could be in a variation-specific price element")
    logger.info("3. It might be loaded via AJAX after selection")
    
    logger.info("\n🛠️ SOLUTION APPROACH:")
    logger.info("We need to add more specific selectors for B6 MOPA 60W that target:")
    logger.info("1. The variation price area (.woocommerce-variation-price)")
    logger.info("2. Bundle-specific price displays")
    logger.info("3. Dynamic price elements that appear after selection")
    
    logger.info("\n📝 RECOMMENDED FIX:")
    logger.info("Update the price extraction selectors in dynamic_scraper.py to include:")
    logger.info("- '.woocommerce-variation .woocommerce-variation-price .amount'")
    logger.info("- '.single_variation_wrap .price .amount'")
    logger.info("- 'form.variations_form .single_variation .price'")
    logger.info("- '.product-type-variable .price ins .amount'")

if __name__ == "__main__":
    analyze_issue()