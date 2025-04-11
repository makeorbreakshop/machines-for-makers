-- Function to update a machine and its images in a transaction
CREATE OR REPLACE FUNCTION update_machine_with_images(
  p_machine_id UUID,
  p_machine_data JSONB,
  p_images JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_image JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Update the machine data
    UPDATE machines
    SET 
      "Machine Name" = p_machine_data->>'Machine Name',
      "Internal link" = p_machine_data->>'Internal link',
      "Company" = p_machine_data->>'Company',
      "Machine Category" = p_machine_data->>'Machine Category',
      "Laser Category" = p_machine_data->>'Laser Category',
      "Price" = (p_machine_data->>'Price')::numeric,
      "Rating" = (p_machine_data->>'Rating')::numeric,
      "Award" = p_machine_data->>'Award',
      "Laser Type A" = p_machine_data->>'Laser Type A',
      "Laser Power A" = p_machine_data->>'Laser Power A',
      "Laser Type B" = p_machine_data->>'Laser Type B',
      "LaserPower B" = p_machine_data->>'LaserPower B',
      "Work Area" = p_machine_data->>'Work Area',
      "Speed" = p_machine_data->>'Speed',
      "Height" = p_machine_data->>'Height',
      "Machine Size" = p_machine_data->>'Machine Size',
      "Acceleration" = p_machine_data->>'Acceleration',
      "Software" = p_machine_data->>'Software',
      "Focus" = p_machine_data->>'Focus',
      "Enclosure" = p_machine_data->>'Enclosure',
      "Wifi" = p_machine_data->>'Wifi',
      "Camera" = p_machine_data->>'Camera',
      "Passthrough" = p_machine_data->>'Passthrough',
      "Controller" = p_machine_data->>'Controller',
      "Warranty" = p_machine_data->>'Warranty',
      "Excerpt (Short)" = p_machine_data->>'Excerpt (Short)',
      "Description" = p_machine_data->>'Description',
      "Highlights" = p_machine_data->>'Highlights',
      "Drawbacks" = p_machine_data->>'Drawbacks',
      "Is A Featured Resource?" = p_machine_data->>'Is A Featured Resource?',
      "Hidden" = p_machine_data->>'Hidden',
      "Image" = p_machine_data->>'Image',
      "product_link" = p_machine_data->>'product_link',
      "Affiliate Link" = p_machine_data->>'Affiliate Link',
      "YouTube Review" = p_machine_data->>'YouTube Review',
      "Laser Frequency" = p_machine_data->>'Laser Frequency',
      "Pulse Width" = p_machine_data->>'Pulse Width',
      "Laser Source Manufacturer" = p_machine_data->>'Laser Source Manufacturer',
      "Updated On" = p_machine_data->>'Updated On',
      "Published On" = CASE 
                       WHEN p_machine_data->>'Published On' IS NOT NULL 
                       THEN p_machine_data->>'Published On' 
                       ELSE "Published On" 
                       END
    WHERE id = p_machine_id
    RETURNING to_jsonb(machines.*) INTO v_result;
    
    -- Delete existing images for this machine
    DELETE FROM images WHERE machine_id = p_machine_id;
    
    -- Insert new images if any
    IF jsonb_array_length(p_images) > 0 THEN
      FOR i IN 0..jsonb_array_length(p_images)-1 LOOP
        v_image := p_images->i;
        INSERT INTO images (machine_id, url, alt_text, sort_order)
        VALUES (
          p_machine_id,
          v_image->>'url',
          v_image->>'alt_text',
          (v_image->>'sort_order')::integer
        );
      END LOOP;
    END IF;
    
    -- Return the updated machine data
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back the transaction on error
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION update_machine_with_images(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_machine_with_images(UUID, JSONB, JSONB) TO service_role; 