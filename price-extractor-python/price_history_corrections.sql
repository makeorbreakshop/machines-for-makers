-- Price History Corrections Based on MCP Investigation  
-- Add entries to price_history table for the batch run date: 2025-07-02

-- 1. Aeon MIRA 5 S: Confirmed price $6,995 (configurator interaction required)
INSERT INTO price_history (machine_id, price, previous_price, date, source, currency, status, extraction_method, review_reason)
SELECT 
    id as machine_id,
    6995.00 as price,
    "Price" as previous_price,
    '2025-07-02T15:45:50Z' as date,  -- Match the batch timestamp
    'mcp-investigation' as source,
    'USD' as currency,
    'AUTO_APPLIED' as status,
    'MCP Configurator Interaction' as extraction_method,
    'Price confirmed via MCP configurator interaction - requires multi-step configurator' as review_reason
FROM machines 
WHERE "Machine Name" = 'Aeon MIRA 5 S';

-- 2. ThunderLaser Bolt Plus: Confirmed price $7,495 (accessible, was temporary network issue)
INSERT INTO price_history (machine_id, price, previous_price, date, source, currency, status, extraction_method, review_reason)
SELECT 
    id as machine_id,
    7495.00 as price,
    "Price" as previous_price,
    '2025-07-02T15:45:50Z' as date,
    'mcp-investigation' as source,
    'USD' as currency,
    'AUTO_APPLIED' as status,
    'MCP Static Extraction' as extraction_method,
    'Price confirmed via MCP - previous HTTP error was temporary' as review_reason
FROM machines 
WHERE "Machine Name" LIKE '%Bolt Plus%' 
AND "Company" ILIKE '%thunder%';

-- 3. ComMarker B4 30W: Confirmed price $2,266 (easily accessible)
INSERT INTO price_history (machine_id, price, previous_price, date, source, currency, status, extraction_method, review_reason)
SELECT 
    id as machine_id,
    2266.00 as price,
    "Price" as previous_price,
    '2025-07-02T15:45:50Z' as date,
    'mcp-investigation' as source,
    'USD' as currency,
    'AUTO_APPLIED' as status,
    'MCP Static Extraction' as extraction_method,
    'Price confirmed via MCP - likely CSS selector issue in automated extraction' as review_reason
FROM machines 
WHERE "Machine Name" = 'ComMarker B4 30W';

-- 4. Update learned selectors for machines where MCP investigation succeeded
UPDATE machines 
SET learned_selectors = COALESCE(learned_selectors, '{}'::jsonb) || 
    jsonb_build_object(
        'aeonlaser.us', 
        jsonb_build_object(
            'selector', '.total b, .price strong',
            'method', 'configurator_aware',
            'last_updated', '2025-07-02',
            'success_rate', 100,
            'requires_interaction', true
        )
    )
WHERE product_link LIKE '%aeonlaser.us%';

-- 5. Mark AtomStack URLs that need updating (confirmed 404s)
UPDATE machines 
SET "Excerpt (Short)" = COALESCE("Excerpt (Short)", '') || ' | URL needs updating - confirmed 404 error via MCP investigation, likely domain migration (.com vs .net)'
WHERE product_link LIKE '%atomstack.com%' AND product_link LIKE '%ikier%';

-- 6. Add retry metadata for ThunderLaser URLs (confirmed working but had network issues)
UPDATE machines 
SET learned_selectors = COALESCE(learned_selectors, '{}'::jsonb) || 
    jsonb_build_object(
        'thunderlaserusa.com',
        jsonb_build_object(
            'retry_on_network_error', true,
            'last_confirmed_working', '2025-07-02',
            'temp_failures_expected', true
        )
    )
WHERE product_link LIKE '%thunderlaserusa.com%';

-- 7. Update ComMarker learned selectors
UPDATE machines 
SET learned_selectors = COALESCE(learned_selectors, '{}'::jsonb) || 
    jsonb_build_object(
        'commarker.com',
        jsonb_build_object(
            'selector', '.price, [data-price], .product-price',
            'method', 'static_extraction',
            'last_updated', '2025-07-02',
            'success_rate', 100
        )
    )
WHERE product_link LIKE '%commarker.com%' AND "Machine Name" = 'ComMarker B4 30W';

-- Optional: If you want to immediately apply these prices to the main table
-- (normally handled by approval workflow)
-- UPDATE machines SET "Price" = 6995.00 WHERE "Machine Name" = 'Aeon MIRA 5 S';
-- UPDATE machines SET "Price" = 7495.00 WHERE "Machine Name" LIKE '%Bolt Plus%' AND brand_id IN (SELECT id FROM brands WHERE name ILIKE '%thunder%');
-- UPDATE machines SET "Price" = 2266.00 WHERE "Machine Name" = 'ComMarker B4 30W';