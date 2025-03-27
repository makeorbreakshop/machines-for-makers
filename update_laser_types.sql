-- Update Fiber to lowercase
UPDATE machines SET "Laser Type A" = 'fiber' WHERE "Laser Type A" = 'Fiber';
UPDATE machines SET "Laser Type B" = 'fiber' WHERE "Laser Type B" = 'Fiber';

-- Update MOPA to lowercase
UPDATE machines SET "Laser Type A" = 'mopa' WHERE "Laser Type A" = 'MOPA';
UPDATE machines SET "Laser Type B" = 'mopa' WHERE "Laser Type B" = 'MOPA';

-- Verify the changes
SELECT DISTINCT "Laser Type A", "Laser Type B" 
FROM machines 
WHERE "Laser Type A" IN ('fiber', 'mopa') 
   OR "Laser Type B" IN ('fiber', 'mopa'); 