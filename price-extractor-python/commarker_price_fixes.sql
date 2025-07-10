
-- ComMarker Price Extraction Fixes
-- Generated: 2025-07-10T11:51:57.349265
-- Based on investigation findings from PRICE_EXTRACTION_ANALYSIS_REPORT.md
--
-- SUMMARY:
-- - ComMarker B6 30W: Update $2399 → $1839 (current sale price)
-- - ComMarker B6 MOPA 60W: Update $4589 → $3059 (current sale price)  
-- - ComMarker B4 100W MOPA: No change needed ($6666 is correct)
--
-- REASON: Manual corrections were outdated compared to current website sale prices


-- ComMarker B6 30W: $2399.0 → $1839.0
UPDATE machines 
SET "Price" = 1839.0,
    learned_selectors = jsonb_set(
      COALESCE(learned_selectors, '{}'),
      '{commarker.com}',
      '{
        "selector": ".entry-summary .price ins .amount",
        "last_success": "2025-07-10T11:51:57.349265",
        "confidence": 0.95,
        "price_found": 1839.0,
        "method": "Enhanced Sale Price Extraction",
        "reasoning": "Current sale price $1839 vs regular $2299 - manual correction was outdated"
      }'
    )
WHERE "Machine Name" = 'ComMarker B6 30W';


-- ComMarker B6 MOPA 60W: $4589.0 → $3059.0
UPDATE machines 
SET "Price" = 3059.0,
    learned_selectors = jsonb_set(
      COALESCE(learned_selectors, '{}'),
      '{commarker.com}',
      '{
        "selector": ".entry-summary .price ins .amount",
        "last_success": "2025-07-10T11:51:57.349265",
        "confidence": 0.95,
        "price_found": 3059.0,
        "method": "Enhanced Sale Price Extraction",
        "reasoning": "Current sale price $3059 vs regular $3599 - manual correction was outdated"
      }'
    )
WHERE "Machine Name" = 'ComMarker B6 MOPA 60W';


-- ComMarker B4 100W MOPA: Update learned selector (price already correct)
UPDATE machines
SET learned_selectors = jsonb_set(
      COALESCE(learned_selectors, '{}'),
      '{commarker.com}',
      '{
        "selector": ".entry-summary .price ins .amount",
        "last_success": "2025-07-10T11:51:57.349265",
        "confidence": 0.95,
        "price_found": 6666.0,
        "method": "Enhanced Sale Price Extraction",
        "reasoning": "Manual correction matches current sale price - no change needed"
      }'
    )
WHERE "Machine Name" = 'ComMarker B4 100W MOPA';


-- Verification queries to check the updates
SELECT "Machine Name", "Price", learned_selectors->'commarker.com' as commarker_selector
FROM machines 
WHERE "Machine Name" IN ('ComMarker B6 30W', 'ComMarker B6 MOPA 60W', 'ComMarker B4 100W MOPA')
ORDER BY "Machine Name";

-- Expected results:
-- ComMarker B4 100W MOPA: $6666.00 (no change)
-- ComMarker B6 30W: $1839.00 (updated from $2399)  
-- ComMarker B6 MOPA 60W: $3059.00 (updated from $4589)
