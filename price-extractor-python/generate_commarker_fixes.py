#!/usr/bin/env python3
"""
Generate SQL fixes for ComMarker price extraction issues.
Standalone script without database dependencies.
"""

from loguru import logger
from datetime import datetime

def generate_commarker_price_fixes():
    """Generate SQL updates for ComMarker machines based on investigation findings."""
    
    timestamp = datetime.now().isoformat()
    
    fixes = [
        {
            'machine': 'ComMarker B6 30W',
            'issue': 'Manual correction outdated',
            'old_price': 2399.00,
            'new_price': 1839.00,
            'reason': 'Current sale price $1839 vs regular $2299 - manual correction was outdated'
        },
        {
            'machine': 'ComMarker B6 MOPA 60W', 
            'issue': 'Manual correction outdated',
            'old_price': 4589.00,
            'new_price': 3059.00,
            'reason': 'Current sale price $3059 vs regular $3599 - manual correction was outdated'
        },
        {
            'machine': 'ComMarker B4 100W MOPA',
            'issue': 'Working correctly',
            'old_price': 6666.00,
            'new_price': 6666.00,
            'reason': 'Manual correction matches current sale price - no change needed'
        }
    ]
    
    sql_updates = []
    
    # Header comment
    sql_updates.append(f"""
-- ComMarker Price Extraction Fixes
-- Generated: {timestamp}
-- Based on investigation findings from PRICE_EXTRACTION_ANALYSIS_REPORT.md
--
-- SUMMARY:
-- - ComMarker B6 30W: Update $2399 → $1839 (current sale price)
-- - ComMarker B6 MOPA 60W: Update $4589 → $3059 (current sale price)  
-- - ComMarker B4 100W MOPA: No change needed ($6666 is correct)
--
-- REASON: Manual corrections were outdated compared to current website sale prices
""")
    
    # Individual machine updates
    for fix in fixes:
        machine_name = fix['machine']
        new_price = fix['new_price']
        reason = fix['reason']
        
        if fix['old_price'] != fix['new_price']:
            # Price update needed
            sql_updates.append(f"""
-- {machine_name}: ${fix['old_price']} → ${new_price}
UPDATE machines 
SET "Price" = {new_price},
    learned_selectors = jsonb_set(
      COALESCE(learned_selectors, '{{}}'),
      '{{commarker.com}}',
      '{{
        "selector": ".entry-summary .price ins .amount",
        "last_success": "{timestamp}",
        "confidence": 0.95,
        "price_found": {new_price},
        "method": "Enhanced Sale Price Extraction",
        "reasoning": "{reason}"
      }}'
    )
WHERE "Machine Name" = '{machine_name}';
""")
        else:
            # Just update learned selector (no price change)
            sql_updates.append(f"""
-- {machine_name}: Update learned selector (price already correct)
UPDATE machines
SET learned_selectors = jsonb_set(
      COALESCE(learned_selectors, '{{}}'),
      '{{commarker.com}}',
      '{{
        "selector": ".entry-summary .price ins .amount",
        "last_success": "{timestamp}",
        "confidence": 0.95,
        "price_found": {new_price},
        "method": "Enhanced Sale Price Extraction",
        "reasoning": "{reason}"
      }}'
    )
WHERE "Machine Name" = '{machine_name}';
""")
    
    # Footer with verification queries
    sql_updates.append("""
-- Verification queries to check the updates
SELECT "Machine Name", "Price", learned_selectors->'commarker.com' as commarker_selector
FROM machines 
WHERE "Machine Name" IN ('ComMarker B6 30W', 'ComMarker B6 MOPA 60W', 'ComMarker B4 100W MOPA')
ORDER BY "Machine Name";

-- Expected results:
-- ComMarker B4 100W MOPA: $6666.00 (no change)
-- ComMarker B6 30W: $1839.00 (updated from $2399)  
-- ComMarker B6 MOPA 60W: $3059.00 (updated from $4589)
""")
    
    return '\n'.join(sql_updates), fixes

def generate_xtool_summary():
    """Generate summary for xTool machines (no changes needed)."""
    
    xtool_summary = """
-- xTool Machines Summary (No Changes Needed)
-- Generated: """ + datetime.now().isoformat() + """
--
-- INVESTIGATION RESULTS:
-- All xTool machines are extracting prices correctly using .product-badge-price selector
--
-- xTool S1: $1899.00 ✅ (manual correction matches current price)
-- xTool F1: $1169.00 ✅ (manual correction matches current price)  
-- xTool F2 Ultra: $5999.00 ✅ (manual correction matches current price)
--
-- CURRENT EXTRACTION METHOD: .product-badge-price
-- STATUS: Working correctly, no changes required
--
-- Verification query:
SELECT "Machine Name", "Price", learned_selectors->'xtool.com' as xtool_selector
FROM machines 
WHERE "Machine Name" IN ('xTool S1', 'xTool F1', 'xTool F2 Ultra')
ORDER BY "Machine Name";
"""
    
    return xtool_summary

def main():
    """Generate all price extraction fixes."""
    logger.info("📋 Generating ComMarker price extraction fixes...")
    
    # Generate ComMarker fixes
    commarker_sql, commarker_fixes = generate_commarker_price_fixes()
    
    # Generate xTool summary
    xtool_summary = generate_xtool_summary()
    
    # Save ComMarker fixes
    with open('commarker_price_fixes.sql', 'w') as f:
        f.write(commarker_sql)
    
    # Save xTool summary
    with open('xtool_machines_summary.sql', 'w') as f:
        f.write(xtool_summary)
    
    # Generate comprehensive summary
    summary = f"""
# Price Extraction Fix Summary

Generated: {datetime.now().isoformat()}

## ComMarker Machines (Fixes Required)

"""
    
    for fix in commarker_fixes:
        summary += f"- **{fix['machine']}**: ${fix['old_price']} → ${fix['new_price']}\n"
        summary += f"  - Issue: {fix['issue']}\n"
        summary += f"  - Reason: {fix['reason']}\n\n"
    
    summary += """
## xTool Machines (Working Correctly)

- **xTool S1**: $1899.00 ✅ No changes needed
- **xTool F1**: $1169.00 ✅ No changes needed  
- **xTool F2 Ultra**: $5999.00 ✅ No changes needed

## Files Generated

1. `commarker_price_fixes.sql` - SQL updates for ComMarker machines
2. `xtool_machines_summary.sql` - Summary of xTool machines (no changes)
3. `price_fix_summary.md` - This summary file

## Next Steps

1. Review the SQL files
2. Apply the ComMarker price updates
3. Test extraction on the updated machines
4. Monitor for future price changes
"""
    
    # Save summary
    with open('price_fix_summary.md', 'w') as f:
        f.write(summary)
    
    # Log results
    logger.info("✅ Generated ComMarker price fixes:")
    for fix in commarker_fixes:
        if fix['old_price'] != fix['new_price']:
            logger.info(f"  - {fix['machine']}: ${fix['old_price']} → ${fix['new_price']}")
        else:
            logger.info(f"  - {fix['machine']}: ${fix['new_price']} (no change needed)")
    
    logger.info("📁 Files generated:")
    logger.info("  - commarker_price_fixes.sql")
    logger.info("  - xtool_machines_summary.sql") 
    logger.info("  - price_fix_summary.md")
    
    return commarker_sql, xtool_summary

if __name__ == "__main__":
    main()