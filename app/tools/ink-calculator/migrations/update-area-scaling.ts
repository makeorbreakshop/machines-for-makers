/**
 * Area Scaling Update Migration
 * 
 * This script updates the database to use the consistent area scaling formula
 * and adds a flag indicating the formula is "increasing" not "decreasing".
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Update calibration data
export async function updateAreaScalingParameters() {
  console.log('[MIGRATION] Starting area scaling update');
  
  try {
    // Update area scaling multipliers to match the increasing formula
    const newAreaScalingMultipliers = {
      small: 1.2,   // Small prints use proportionally more ink per unit area
      medium: 1.1,  // Medium-sized prints use slightly more ink per unit area
      large: 1.05,  // Large prints use slightly more ink per unit area
      xlarge: 1.0,  // Very large prints use baseline amount of ink per unit area
    };
    
    // Add a flag indicating the formula direction
    const formulaDirection = 'increasing';
    
    // Get the latest calibration record
    const { data: latestCalibration, error: fetchError } = await supabase
      .from('ink_calculator_calibration')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (fetchError) {
      throw new Error(`Error fetching latest calibration: ${fetchError.message}`);
    }
    
    if (!latestCalibration || latestCalibration.length === 0) {
      throw new Error('No calibration record found');
    }
    
    // Create a new calibration record with updated parameters
    const oldRecord = latestCalibration[0];
    const newRecord = {
      ...oldRecord,
      area_scaling_multipliers: newAreaScalingMultipliers,
      formula_direction: formulaDirection,
      id: undefined, // Remove ID to generate a new one
      created_at: new Date().toISOString(),
    };
    
    // Insert the new record
    const { data: insertData, error: insertError } = await supabase
      .from('ink_calculator_calibration')
      .insert([newRecord]);
      
    if (insertError) {
      throw new Error(`Error inserting updated calibration: ${insertError.message}`);
    }
    
    console.log('[MIGRATION] Area scaling update completed successfully');
    return { success: true, message: 'Area scaling parameters updated successfully' };
  } catch (error: any) {
    console.error('[MIGRATION] Error updating area scaling parameters:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  updateAreaScalingParameters()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
} 