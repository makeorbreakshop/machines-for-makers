-- Fix bad bundle-price selectors that are causing systematic extraction errors
-- These selectors extract bundle/promotional pricing instead of individual product prices

-- ComMarker machines (remove commarker.com selectors with bundle-price)
UPDATE machines 
SET learned_selectors = learned_selectors - 'commarker.com'
WHERE learned_selectors->'commarker.com'->>'selector' LIKE '%bundle-price%';

-- Glowforge machines (remove glowforge.com selectors with bundle-price)
UPDATE machines 
SET learned_selectors = learned_selectors - 'glowforge.com'
WHERE learned_selectors->'glowforge.com'->>'selector' LIKE '%bundle-price%';

-- Monport machines (remove monportlaser.com selectors with bundle-price)
UPDATE machines 
SET learned_selectors = learned_selectors - 'monportlaser.com'
WHERE learned_selectors->'monportlaser.com'->>'selector' LIKE '%bundle-price%';

-- xTool machines (remove xtool.com selectors with bundle-price)
UPDATE machines 
SET learned_selectors = learned_selectors - 'xtool.com'
WHERE learned_selectors->'xtool.com'->>'selector' LIKE '%bundle-price%';

-- Verification: Check how many machines still have bundle-price selectors
SELECT 
  COUNT(*) as remaining_bad_selectors,
  string_agg(DISTINCT "Machine Name", ', ') as affected_machines
FROM machines 
WHERE learned_selectors::text LIKE '%bundle-price%';