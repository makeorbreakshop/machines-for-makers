/**
 * Service for interacting with the Claude API
 */

interface ClaudeResponse {
  completion: string;
  stop_reason: string;
  model: string;
}

interface Categories {
  machineCategories: string[];
  laserCategories: string[];
  laserTypes: string[];
  companies: {
    id: string;
    name: string;
    slug: string;
  }[];
  booleanFeatures: {
    enclosure: string[];
    wifi: string[];
    camera: string[];
    passthrough: string[];
  };
}

// Keep track of the last raw response for debugging
let lastRawResponse: any = null;
let lastRawPrompt: any = null;

/**
 * Gets the last raw response from Claude for debugging purposes
 */
export function getLastRawResponse() {
  return {
    prompt: lastRawPrompt,
    response: lastRawResponse
  };
}

/**
 * Fetches valid categories to include in the Claude prompt
 */
async function fetchCategories(): Promise<Categories> {
  try {
    // Instead of fetching from the API directly, we'll define categories directly here
    // This avoids the need for cross-API calls within Edge runtime
    
    // Default categories if we can't fetch
    const defaultCategories: Categories = {
      machineCategories: [
        "Laser Cutter", "3D Printer", "CNC Router", "CNC Mill", "Vinyl Cutter", 
        "Embroidery Machine", "Plasma Cutter", "Waterjet Cutter", "Laser Engraver"
      ],
      laserCategories: [
        "CO2", "Diode", "Fiber", "Hybrid", "YAG"
      ],
      laserTypes: [
        "CO2", "Diode", "Fiber", "Hybrid", "YAG", "Blue Diode", "IR Diode"
      ],
      companies: [],
      booleanFeatures: {
        enclosure: ["Yes", "No"],
        wifi: ["Yes", "No"],
        camera: ["Yes", "No"],
        passthrough: ["Yes", "No"]
      }
    };
    
    return defaultCategories;
  } catch (error) {
    console.error('Error getting categories:', error);
    // Return empty arrays as fallback
    return {
      machineCategories: [],
      laserCategories: [],
      laserTypes: [],
      companies: [],
      booleanFeatures: {
        enclosure: [],
        wifi: [],
        camera: [],
        passthrough: []
      }
    };
  }
}

/**
 * Sends a prompt to Claude to process the scraped HTML content
 * and extract structured machine data
 */
export async function processMachineData(content: string, url: string): Promise<any> {
  // Check if API key is set
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  // Ensure the API key doesn't have any whitespace or formatting issues
  const cleanApiKey = apiKey.trim();
  
  // Log information about the API key (not the key itself for security)
  console.log(`API Key exists with length: ${cleanApiKey.length}`);
  console.log(`API Key first 4 chars: ${cleanApiKey.substring(0, 4)}***`);

  try {
    // Fetch categories to include in the prompt
    const categories = await fetchCategories();
    
    // Create the system prompt with categories
    const systemPrompt = createSystemPrompt(categories);
    // Create the user prompt with the HTML content
    const userPrompt = createUserPrompt(content, url);
    
    // Store raw prompt for debugging
    lastRawPrompt = {
      system: systemPrompt,
      user: userPrompt
    };
    
    console.log("Making Claude API request...");

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cleanApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    // Enhanced error handling
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Claude API Error (${response.status}: ${response.statusText})`;
      
      try {
        // Try to parse as JSON if possible
        const errorData = JSON.parse(errorText);
        errorMessage += `: ${JSON.stringify(errorData)}`;
      } catch (parseError) {
        // If it's not JSON, just include the raw text
        errorMessage += `: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
      }
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    console.log("Claude API request successful!");
    const data = await response.json();
    
    // Store raw response for debugging
    lastRawResponse = data;
    
    // Log the structure of the response (for debugging)
    console.log("Claude API response structure:", JSON.stringify(Object.keys(data), null, 2));
    
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2));
      throw new Error("Claude API returned an unexpected response structure");
    }
    
    // Parse the JSON response from Claude
    return parseClaudeResponse(data.content[0].text);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Creates the system prompt for Claude
 */
function createSystemPrompt(categories?: Categories): string {
  // Format category options for the prompt
  const machineCategories = categories?.machineCategories?.length 
    ? `\nValid machine categories: ${categories.machineCategories.join(', ')}`
    : '';
  
  const laserCategories = categories?.laserCategories?.length 
    ? `\nValid laser categories: ${categories.laserCategories.join(', ')}`
    : '';
  
  const laserTypes = categories?.laserTypes?.length 
    ? `\nValid laser types: ${categories.laserTypes.join(', ')}`
    : '';

  return `You are a specialized AI assistant that extracts precise machine specifications from product pages.
Your task is to analyze product information and extract specific details about machines (like laser cutters, 3D printers, CNC machines, etc.).
Focus on pulling factual information and specifications from the content without adding your own opinions.

${machineCategories}
${laserCategories}
${laserTypes}

Respond ONLY with a valid JSON object containing the extracted information with the following structure:
{
  "machine_name": "Full name of the machine",
  "company": "Manufacturer/company name",
  "machine_category": "Type of machine (e.g., laser cutter, 3D printer, CNC)",
  "laser_category": "Category if it's a laser (e.g., CO2, diode, fiber)",
  "price": numeric price without currency symbol (e.g., 2499.99),
  "image_url": "URL to the main product image if available",
  "laser_type_a": "Primary laser type",
  "laser_power_a": "Primary laser power with units (e.g., '40W')",
  "laser_type_b": "Secondary laser type if applicable",
  "laser_power_b": "Secondary laser power with units if applicable",
  "laser_frequency": "Laser frequency if specified",
  "pulse_width": "Pulse width if specified",
  "laser_source_manufacturer": "Who makes the laser source",
  "work_area": "Working area dimensions (e.g., '400 x 600 mm')",
  "machine_size": "External dimensions",
  "height": "Height/Z-axis travel",
  "speed": "Maximum speed/feed rate",
  "acceleration": "Acceleration if specified",
  "focus": "Focus mechanism",
  "controller": "Controller type",
  "software": "Compatible software",
  "warranty": "Warranty information",
  "enclosure": boolean (true/false),
  "wifi": boolean (true/false),
  "camera": boolean (true/false),
  "passthrough": boolean (true/false) for passthrough capability,
  "description": "Brief description of the machine",
  "highlights": "Key selling points or highlights",
  "drawbacks": "Any mentioned limitations",
  "product_link": "Original product URL"
}

IMPORTANT: For "machine_category" and "laser_category", use ONLY values from the valid categories provided.
If you cannot determine a category that matches the valid options, use null for that field.

If you cannot find certain information, use null for that field. For boolean fields, if not specifically mentioned, default to false.
Do not make assumptions about fields you cannot find - use null instead.
The response must be valid JSON without any extra text, explanations, or comments.`;
}

/**
 * Creates the user prompt with the content to analyze
 */
function createUserPrompt(content: string, url: string): string {
  return `Extract the machine specifications from the following product page content.
The product URL is: ${url}

CONTENT:
${content}

Respond only with the JSON containing the extracted information.`;
}

/**
 * Parses the Claude response text to extract the JSON object
 */
function parseClaudeResponse(responseText: string): any {
  try {
    // Extract JSON from the response (in case there's any extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON object in Claude response");
    }
    
    const jsonString = jsonMatch[0];
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing Claude response:", error);
    throw new Error("Failed to parse structured data from Claude response");
  }
} 