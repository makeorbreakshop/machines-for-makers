-- Migration to fix price_history previous_price, price_change and percentage_change fields
-- Adds a database trigger to automatically calculate these values if not provided

-- Create function to calculate previous_price, price_change, and percentage_change
CREATE OR REPLACE FUNCTION calculate_price_changes()
RETURNS TRIGGER AS $$
DECLARE
  prev_price NUMERIC;
  price_diff NUMERIC;
BEGIN
  -- Only process if previous_price is NULL but price is not NULL
  IF NEW.previous_price IS NULL AND NEW.price IS NOT NULL THEN
    -- Get the previous price record for this machine/variant  
    SELECT price INTO prev_price
    FROM price_history
    WHERE machine_id = NEW.machine_id 
      AND variant_attribute = NEW.variant_attribute
      AND id != NEW.id  -- Exclude the current record
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

-- Create or replace the trigger
DROP TRIGGER IF EXISTS price_history_changes_trigger ON price_history;

CREATE TRIGGER price_history_changes_trigger
BEFORE INSERT ON price_history
FOR EACH ROW
EXECUTE FUNCTION calculate_price_changes();

-- Backfill existing NULL values
DO $$
DECLARE
  ph_record RECORD;
  prev_price NUMERIC;
  price_diff NUMERIC;
BEGIN
  -- Loop through all price_history records with NULL previous_price
  FOR ph_record IN 
    SELECT id, machine_id, variant_attribute, price, date
    FROM price_history
    WHERE previous_price IS NULL AND price IS NOT NULL
    ORDER BY date ASC
  LOOP
    -- Find the previous price for this machine/variant
    SELECT price INTO prev_price
    FROM price_history
    WHERE machine_id = ph_record.machine_id 
      AND variant_attribute = ph_record.variant_attribute
      AND date < ph_record.date
    ORDER BY date DESC
    LIMIT 1;
    
    -- If we found a previous price, update the record
    IF prev_price IS NOT NULL THEN
      price_diff := ph_record.price - prev_price;
      
      -- Update the record with calculated values
      UPDATE price_history
      SET 
        previous_price = prev_price,
        price_change = price_diff,
        percentage_change = CASE WHEN prev_price > 0 THEN (price_diff / prev_price) * 100 ELSE NULL END
      WHERE id = ph_record.id;
      
      RAISE NOTICE 'Updated record % for machine % / %', ph_record.id, ph_record.machine_id, ph_record.variant_attribute;
    END IF;
  END LOOP;
END $$; 