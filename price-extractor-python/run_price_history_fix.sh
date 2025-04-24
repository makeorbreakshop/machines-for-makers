#!/bin/bash

# Script to fix the price_history fields issue

echo "===== PRICE HISTORY FIELDS FIXER ====="
echo "Please copy the following SQL and run it in your Supabase SQL Editor:"
echo ""
echo "--------- BEGIN SQL ---------"
cat << 'EOF'
-- Updated migration to fix price_history fields - removes the NULL check condition

-- Create improved function that always calculates values
CREATE OR REPLACE FUNCTION calculate_price_changes()
RETURNS TRIGGER AS $$
DECLARE
  prev_price NUMERIC;
  price_diff NUMERIC;
BEGIN
  -- Always try to find the previous price, regardless of whether previous_price is NULL
  IF NEW.price IS NOT NULL THEN
    -- Get the previous price record for this machine/variant
    SELECT price INTO prev_price
    FROM price_history
    WHERE machine_id = NEW.machine_id 
      AND variant_attribute = NEW.variant_attribute
      AND id != NEW.id  -- Exclude the current record
      AND date < NEW.date  -- Only consider older records
    ORDER BY date DESC
    LIMIT 1;
    
    -- If we found a previous price, calculate the changes
    IF prev_price IS NOT NULL THEN
      -- Set the previous price
      NEW.previous_price := prev_price;
      
      -- Calculate price change
      price_diff := NEW.price - prev_price;
      NEW.price_change := price_diff;
      
      -- Calculate percentage change if prev_price > 0
      IF prev_price > 0 THEN
        NEW.percentage_change := (price_diff / prev_price) * 100;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger (same as before)
DROP TRIGGER IF EXISTS price_history_changes_trigger ON price_history;

CREATE TRIGGER price_history_changes_trigger
BEFORE INSERT ON price_history
FOR EACH ROW
EXECUTE FUNCTION calculate_price_changes();

-- More aggressive backfill for existing data
DO $$
DECLARE
  machine_record RECORD;
  price_records RECORD;
  prev_price NUMERIC;
  current_price NUMERIC;
  price_diff NUMERIC;
  update_count INT := 0;
BEGIN
  -- Process each unique machine/variant combination
  FOR machine_record IN 
    SELECT DISTINCT machine_id, variant_attribute 
    FROM price_history
  LOOP
    -- Reset previous price for each machine
    prev_price := NULL;
    
    -- Get all price records for this machine/variant in chronological order
    FOR price_records IN
      SELECT id, price, previous_price, price_change, percentage_change
      FROM price_history
      WHERE machine_id = machine_record.machine_id
        AND variant_attribute = machine_record.variant_attribute
      ORDER BY date ASC
    LOOP
      -- Current record's price
      current_price := price_records.price;
      
      -- If we have both current and previous price, update the record
      IF current_price IS NOT NULL AND prev_price IS NOT NULL THEN
        price_diff := current_price - prev_price;
        
        UPDATE price_history
        SET 
          previous_price = prev_price,
          price_change = price_diff,
          percentage_change = CASE WHEN prev_price > 0 THEN (price_diff / prev_price) * 100 ELSE NULL END
        WHERE id = price_records.id;
        
        update_count := update_count + 1;
      END IF;
      
      -- Set this price as the previous price for the next record
      prev_price := current_price;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Updated % price history records with correct previous prices and changes', update_count;
END $$;
EOF
echo "--------- END SQL ---------"
echo ""
echo "Instructions:"
echo "1. Go to the Supabase dashboard for your project"
echo "2. Click on 'SQL Editor' in the left sidebar"
echo "3. Create a new query and paste the SQL above"
echo "4. Click 'Run' to execute"
echo "5. Run another batch job to verify the fix works"
echo "" 