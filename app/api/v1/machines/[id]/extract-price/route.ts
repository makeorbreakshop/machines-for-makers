import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Use Node.js runtime for file system and child process operations
export const runtime = 'nodejs';

// Promisify exec for easier async/await usage
const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const machineId = params.id;
  
  if (!machineId) {
    return NextResponse.json(
      { success: false, error: "Machine ID is required" },
      { status: 400 }
    );
  }
  
  try {
    const body = await request.json();
    const { test_mode = false, variant_attribute = 'DEFAULT' } = body;
    
    const supabase = createAdminClient();
    
    // Get machine information
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();
    
    if (machineError) {
      console.error('Error fetching machine:', machineError);
      return NextResponse.json(
        { success: false, error: machineError.message },
        { status: 500 }
      );
    }
    
    if (!machine) {
      return NextResponse.json(
        { success: false, error: "Machine not found" },
        { status: 404 }
      );
    }
    
    const productUrl = machine.product_link;
    
    if (!productUrl) {
      return NextResponse.json(
        { success: false, error: "Machine has no product URL" },
        { status: 400 }
      );
    }
    
    // Get variant configuration
    const { data: variantConfig, error: variantConfigError } = await supabase
      .from('variant_extraction_config')
      .select('*')
      .eq('machine_id', machineId)
      .eq('variant_attribute', variant_attribute)
      .maybeSingle();
    
    if (variantConfigError) {
      console.error('Error fetching variant configuration:', variantConfigError);
      return NextResponse.json(
        { success: false, error: variantConfigError.message },
        { status: 500 }
      );
    }
    
    // If testing JS interaction specifically, use the JS interaction tester
    if (test_mode && variantConfig?.requires_js_interaction && variantConfig?.js_click_sequence) {
      // Create a temporary file to store the JSON configuration
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'js-test-'));
      const configPath = path.join(tempDir, 'config.json');
      
      await fs.writeFile(configPath, JSON.stringify({
        url: productUrl,
        js_click_sequence: variantConfig.js_click_sequence,
        variant_attribute
      }));
      
      // Build the command to run the Python script
      const pythonScript = path.resolve(process.cwd(), 'price-extractor-python', 'test_js_interaction.py');
      const command = `python "${pythonScript}" --config "${configPath}"`;
      
      console.log(`Executing command: ${command}`);
      
      // Execute the Python script
      const { stdout, stderr } = await execAsync(command);
      
      // Clean up the temporary file
      await fs.rm(tempDir, { recursive: true, force: true });
      
      if (stderr) {
        console.error('Error from Python script:', stderr);
        return NextResponse.json(
          { success: false, error: `Error executing JavaScript interaction: ${stderr}` },
          { status: 500 }
        );
      }
      
      // Parse the output from the Python script
      let result;
      try {
        result = JSON.parse(stdout);
      } catch (error) {
        console.error('Error parsing Python script output:', error);
        return NextResponse.json(
          { success: false, error: 'Invalid output from JavaScript test script', stdout },
          { status: 500 }
        );
      }
      
      // Return the result
      return NextResponse.json(result);
    }
    
    // For non-JS testing or normal extraction, we would call the Python extraction service
    // This is a placeholder for now - you would implement the full extraction pipeline here
    // For simplicity, we're just returning a success message
    
    return NextResponse.json({
      success: true,
      message: "Price extraction test mode - this would call the Python extraction service",
      machine: machine["Machine Name"],
      url: productUrl,
      variant: variant_attribute,
      // Dummy data for testing
      price: 1299.99,
      confidence: 0.95,
      tier: "STATIC" 
    });
    
  } catch (error) {
    console.error('Error testing price extraction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
} 