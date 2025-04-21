import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

// Use Node.js runtime for child process operations
export const runtime = 'nodejs';

// Promisify exec for easier async/await usage
const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { url, jsClickSequence, variantAttribute = 'DEFAULT' } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }
    
    if (!jsClickSequence || !Array.isArray(jsClickSequence) || jsClickSequence.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid JS click sequence is required' },
        { status: 400 }
      );
    }
    
    // Create a temporary file to store the config
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'js-test-'));
    const configPath = path.join(tempDir, 'config.json');
    
    // Write config to file
    await fs.writeFile(configPath, JSON.stringify({
      url,
      js_click_sequence: jsClickSequence,
      variant_attribute: variantAttribute
    }));
    
    // Build the command to run the Python script
    const pythonScript = path.resolve(process.cwd(), 'price-extractor-python', 'test_js_interaction.py');
    const command = `python "${pythonScript}" --config "${configPath}"`;
    
    console.log(`Executing command: ${command}`);
    
    // Execute the Python script
    const { stdout, stderr } = await execAsync(command);
    
    // Clean up the temporary file
    await fs.rm(tempDir, { recursive: true, force: true }).catch(error => {
      console.error('Error cleaning up temp files:', error);
    });
    
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
        { 
          success: false, 
          error: 'Invalid output from JavaScript test script', 
          stdout: stdout.substring(0, 1000) // Limit output size for debugging
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-js-interaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 