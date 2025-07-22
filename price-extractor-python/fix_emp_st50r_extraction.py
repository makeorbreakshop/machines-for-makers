#!/usr/bin/env python3
"""
Fix EMP ST50R extraction configuration to select the correct table column.

This script updates the site_specific_extractors.py configuration to:
1. Fix column mapping for EMP ST50R (column 3 -> column 2) 
2. Update expected price ($8495 -> $6995)
3. Update price range to match actual price
4. Remove problematic '50R' keyword
5. Add missing EMP variants (ST30J, ST50J)
"""

import sys
import os

def fix_emp_extraction_config():
    """Fix the EMP extraction configuration in site_specific_extractors.py."""
    
    config_file = 'scrapers/site_specific_extractors.py'
    
    print("🔧 Fixing EMP ST50R extraction configuration...")
    
    # Read the current file
    try:
        with open(config_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Error: {config_file} not found")
        return False
    
    # Create backup
    backup_file = f"{config_file}.backup"
    with open(backup_file, 'w') as f:
        f.write(content)
    print(f"✅ Created backup: {backup_file}")
    
    # Find and replace the EMP ST50R configuration
    old_st50r_config = """                    'EMP ST50R': {
                        'keywords': ['ST50R', 'ST 50R', '50R'],
                        'expected_price': 8495,
                        'table_column': 3,  # Fourth price column
                        'price_range': [8000, 9000]
                    },"""
    
    new_st50r_config = """                    'EMP ST50R': {
                        'keywords': ['ST50R', 'ST 50R'],  # Removed risky '50R' keyword
                        'expected_price': 6995,            # Corrected price
                        'table_column': 2,                 # Corrected column (was 3, now 2)
                        'price_range': [6500, 7500]       # Corrected range
                    },"""
    
    if old_st50r_config in content:
        content = content.replace(old_st50r_config, new_st50r_config)
        print("✅ Fixed EMP ST50R configuration")
    else:
        print("⚠️ Old ST50R configuration not found in expected format")
        print("   Manual update may be required")
    
    # Also fix the aeonlaser.us configuration (if it redirects to emplaser.com)
    old_aeon_st50r = """                    'EMP ST50R': {
                        'keywords': ['ST50R', 'ST 50R', '50R'],
                        'expected_price': 6995,
                        'price_tolerance': 0.1,
                        'variant_selector': 'li.js-option.js-radio:contains("ST50R"), li.js-option.js-radio:contains("ST 50R")',
                        'price_range': [6500, 7500]
                    },"""
    
    new_aeon_st50r = """                    'EMP ST50R': {
                        'keywords': ['ST50R', 'ST 50R'],  # Removed risky '50R' keyword
                        'expected_price': 6995,
                        'price_tolerance': 0.1,
                        'variant_selector': 'li.js-option.js-radio:contains("ST50R"), li.js-option.js-radio:contains("ST 50R")',
                        'price_range': [6500, 7500]
                    },"""
    
    if old_aeon_st50r in content:
        content = content.replace(old_aeon_st50r, new_aeon_st50r)
        print("✅ Fixed aeonlaser.us ST50R configuration")
    
    # Add missing EMP variants that are in the table
    # Look for the end of EMP ST100J configuration to add new variants after it
    st100j_end = """                    'EMP ST100J': {
                        'keywords': ['ST100J', 'ST 100J', '100J'],
                        'expected_price': 11995,
                        'table_column': 5,  # Sixth price column
                        'price_range': [11500, 12500]
                    }"""
    
    new_variants = """                    'EMP ST100J': {
                        'keywords': ['ST100J', 'ST 100J', '100J'],
                        'expected_price': 11995,
                        'table_column': 6,  # Seventh price column (corrected)
                        'price_range': [11500, 12500]
                    },
                    'EMP ST30J': {
                        'keywords': ['ST30J', 'ST 30J'],
                        'expected_price': 6995,
                        'table_column': 3,  # Fourth price column
                        'price_range': [6500, 7500]
                    },
                    'EMP ST50J': {
                        'keywords': ['ST50J', 'ST 50J'],
                        'expected_price': 8495,
                        'table_column': 4,  # Fifth price column
                        'price_range': [8000, 9000]
                    }"""
    
    if st100j_end in content:
        content = content.replace(st100j_end, new_variants)
        print("✅ Added missing EMP variants (ST30J, ST50J) and corrected ST100J column")
    else:
        print("⚠️ Could not find ST100J configuration to add new variants")
    
    # Fix ST60J column if needed (should be column 5, not 4)
    old_st60j = """                    'EMP ST60J': {
                        'keywords': ['ST60J', 'ST 60J', '60J'],
                        'expected_price': 8995,
                        'table_column': 4,  # Fifth price column
                        'price_range': [8500, 9500]
                    },"""
    
    new_st60j = """                    'EMP ST60J': {
                        'keywords': ['ST60J', 'ST 60J', '60J'],
                        'expected_price': 8995,
                        'table_column': 5,  # Sixth price column (corrected)
                        'price_range': [8500, 9500]
                    },"""
    
    if old_st60j in content:
        content = content.replace(old_st60j, new_st60j)
        print("✅ Fixed EMP ST60J column mapping")
    
    # Write the updated content
    try:
        with open(config_file, 'w') as f:
            f.write(content)
        print(f"✅ Updated {config_file}")
        return True
    except Exception as e:
        print(f"❌ Error writing file: {str(e)}")
        return False

def print_summary():
    """Print summary of changes made."""
    
    print("\n" + "="*60)
    print("📋 SUMMARY OF CHANGES")
    print("="*60)
    
    print("\n🔧 EMP ST50R Configuration Fixed:")
    print("  • Column: 3 → 2 (now selects correct ST50R)")
    print("  • Expected Price: $8,495 → $6,995")
    print("  • Price Range: [8000-9000] → [6500-7500]")
    print("  • Keywords: Removed risky '50R' keyword")
    
    print("\n📊 Table Column Mappings (Corrected):")
    print("  • Column 1: EMP ST30R  - $4,995  ✅")
    print("  • Column 2: EMP ST50R  - $6,995  ✅ (FIXED)")
    print("  • Column 3: EMP ST30J  - $6,995  ✅ (NEW)")
    print("  • Column 4: EMP ST50J  - $8,495  ✅ (NEW)")
    print("  • Column 5: EMP ST60J  - $8,995  ✅ (FIXED)")
    print("  • Column 6: EMP ST100J - $11,995 ✅ (FIXED)")
    
    print("\n⚠️ Breaking Change:")
    print("  • This fix will change EMP ST50R extraction results")
    print("  • Previous extractions may have been selecting wrong variant")
    print("  • Recommend re-running EMP price extractions after fix")
    
    print("\n🧪 Testing Recommended:")
    print("  • Run test_emp_st50r_simple.py to verify fix")
    print("  • Test other EMP variants for regression")
    print("  • Monitor price extraction results")

if __name__ == "__main__":
    print("🚀 EMP ST50R Extraction Fix")
    print("="*60)
    
    success = fix_emp_extraction_config()
    
    if success:
        print_summary()
        print("\n✅ Configuration fix completed!")
        print("\n💡 Next steps:")
        print("  1. Test the fix: python test_emp_st50r_simple.py")
        print("  2. Run EMP price extractions to verify")
        print("  3. Check for any regressions in other variants")
    else:
        print("\n❌ Configuration fix failed!")
        print("💡 Manual update required in scrapers/site_specific_extractors.py")
        sys.exit(1)