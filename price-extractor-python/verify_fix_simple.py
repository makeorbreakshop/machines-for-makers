#!/usr/bin/env python3
"""
Simple verification that the EMP ST50R fix was applied correctly.
"""

import sys
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

def verify_fix():
    """Verify the fix was applied by checking file content."""
    
    logger.info("=== EMP ST50R FIX VERIFICATION ===")
    
    config_file = 'scrapers/site_specific_extractors.py'
    
    try:
        with open(config_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        logger.error(f"❌ Config file not found: {config_file}")
        return False
    
    # Check for the fixed configuration
    checks = [
        {
            'name': 'Column changed to 2',
            'pattern': "'table_column': 2,                 # Corrected column",
            'success_msg': 'Column mapping fixed (3 → 2)'
        },
        {
            'name': 'Price changed to 6995',
            'pattern': "'expected_price': 6995,            # Corrected price",
            'success_msg': 'Expected price fixed ($8495 → $6995)'
        },
        {
            'name': 'Risky keyword removed',
            'pattern': "'keywords': ['ST50R', 'ST 50R'],  # Removed risky '50R' keyword",
            'success_msg': "Risky '50R' keyword removed"
        },
        {
            'name': 'Price range updated',
            'pattern': "'price_range': [6500, 7500]       # Corrected range",
            'success_msg': 'Price range updated [8000-9000] → [6500-7500]'
        }
    ]
    
    all_passed = True
    for check in checks:
        if check['pattern'] in content:
            logger.info(f"✅ {check['success_msg']}")
        else:
            logger.error(f"❌ {check['name']} - pattern not found")
            all_passed = False
    
    # Additional verification - check we don't have old config
    old_patterns = [
        "'table_column': 3",  # Old column
        "'expected_price': 8495",  # Old price  
        "'50R']",  # Risky keyword still present
        "[8000, 9000]"  # Old price range for ST50R
    ]
    
    logger.info(f"\n🔍 Checking for old configuration remnants...")
    old_found = False
    for pattern in old_patterns:
        # Count occurrences and check if they're in EMP ST50R context
        occurrences = content.count(pattern)
        if pattern in ["'50R']", "[8000, 9000]", "'expected_price': 8495", "'table_column': 3"]:
            # These might legitimately exist for other variants
            # Check if they're in ST50R context
            st50r_sections = []
            lines = content.split('\n')
            in_st50r = False
            current_section = []
            
            for line in lines:
                if "'EMP ST50R'" in line:
                    in_st50r = True
                    current_section = [line]
                elif in_st50r:
                    current_section.append(line)
                    if line.strip().endswith('},') and 'EMP' in line:
                        st50r_sections.append('\n'.join(current_section))
                        in_st50r = False
                        current_section = []
            
            # Check if old patterns exist in ST50R sections
            for section in st50r_sections:
                if pattern in section:
                    logger.warning(f"⚠️ Found old pattern in ST50R section: {pattern}")
                    old_found = True
    
    if old_found:
        logger.warning("⚠️ Some old configuration patterns still exist")
    else:
        logger.info("✅ No old configuration remnants found")
    
    return all_passed and not old_found

def check_backup_exists():
    """Check if backup was created."""
    
    import os
    backup_file = 'scrapers/site_specific_extractors.py.backup'
    
    if os.path.exists(backup_file):
        logger.info(f"✅ Backup file exists: {backup_file}")
        return True
    else:
        logger.warning(f"⚠️ Backup file not found: {backup_file}")
        return False

if __name__ == "__main__":
    logger.info("🔍 Verifying EMP ST50R extraction fix...")
    
    backup_ok = check_backup_exists()
    fix_ok = verify_fix()
    
    if fix_ok:
        logger.info(f"\n{'='*60}")
        logger.info("✅ EMP ST50R FIX VERIFICATION PASSED!")
        logger.info("\n🎯 Key Changes Confirmed:")
        logger.info("  • Table column: 3 → 2 (now targets correct ST50R)")
        logger.info("  • Expected price: $8,495 → $6,995")
        logger.info("  • Removed risky '50R' keyword")
        logger.info("  • Updated price range: [8000-9000] → [6500-7500]")
        
        logger.info("\n📊 Impact:")
        logger.info("  • EMP ST50R extractions will now select column 2")
        logger.info("  • Should extract EMP ST50R price ($6,995) instead of EMP ST30J")
        logger.info("  • Reduced risk of keyword conflicts with 50W variants")
        
        logger.info("\n💡 Recommended Testing:")
        logger.info("  1. Test EMP ST50R extraction in contaminated machines test")
        logger.info("  2. Verify other EMP variants still work correctly")
        logger.info("  3. Monitor price extraction accuracy")
        
    else:
        logger.error(f"\n{'='*60}")
        logger.error("❌ EMP ST50R FIX VERIFICATION FAILED!")
        logger.error("💡 Manual review required")
        sys.exit(1)