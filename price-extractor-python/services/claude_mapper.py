"""
Claude-based intelligent field mapper for Scrapfly JSON to database schema
Uses AI to intelligently map extracted product data to our database fields
"""
import json
import logging
from typing import Dict, Optional, Tuple, List
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

logger = logging.getLogger(__name__)


class ClaudeMapper:
    """Uses Claude AI to intelligently map Scrapfly data to database schema"""
    
    def __init__(self):
        if not ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)
        self.model = CLAUDE_MODEL
        logger.info(f"Claude mapper initialized with model: {self.model}")
    
    def map_to_database_schema(self, scrapfly_data: Dict) -> Tuple[Dict, List[str]]:
        """
        Map Scrapfly extracted data to our database schema using Claude
        
        Args:
            scrapfly_data: Raw data from Scrapfly product extraction
            
        Returns:
            Tuple of (mapped_data, warnings)
        """
        try:
            # Build the prompt with our database schema and the data to map
            prompt = self._build_mapping_prompt(scrapfly_data)
            
            # Call Claude to do the mapping
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4000,
                temperature=0,  # We want consistent, deterministic mapping
                system="You are a data mapping expert. Your job is to map extracted product data to a specific database schema. Be precise and accurate. Extract and convert units properly. Return valid JSON only.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Extract the mapped data from Claude's response
            result = self._parse_claude_response(response.content[0].text)
            
            logger.info(f"Claude successfully mapped {len(result.get('mapped_data', {}))} fields")
            
            return result.get('mapped_data', {}), result.get('warnings', [])
            
        except Exception as e:
            logger.error(f"Claude mapping failed: {str(e)}")
            # Return empty mapping on error
            return {}, [f"Claude mapping error: {str(e)}"]
    
    def _build_mapping_prompt(self, scrapfly_data: Dict) -> str:
        """Build the prompt for Claude with schema info and data"""
        
        prompt = f"""Map the following extracted product data to our database schema.

EXTRACTED DATA FROM SCRAPFLY:
{json.dumps(scrapfly_data, indent=2)}

DATABASE SCHEMA (target fields):
Core Fields:
- "name" (text) - Product name/model
- "brand" (text) - Brand/manufacturer name
- "price" (numeric) - Base price in USD (number only, no symbols)
- "machine_category" (text) - One of: "laser", "3d-printer", "cnc"
- "laser_category" (text) - For lasers: "desktop-diode-laser", "desktop-co2-laser", "desktop-fiber-laser", "fiber-laser", "high-end-co2-laser", "industrial-co2-laser", "industrial-fiber-laser"
- "description" (text) - Full product description
- "excerpt" (text) - Short summary (max 200 chars)
- "product_url" (text) - Product URL
- "images" (array) - Array of image URLs

Specifications:
- "laser_type_a" (text) - Primary laser type: "Diode", "CO2", "Fiber", "Galvo", "UV", "Other"
- "laser_power_a" (text) - Power with unit (e.g., "10W", "40W")
- "laser_type_b" (text) - Secondary laser type (if dual laser)
- "laser_power_b" (text) - Secondary power
- "work_area" (text) - Work area dimensions in mm (e.g., "400 x 400 mm")
- "build_volume" (text) - For 3D printers (e.g., "220 x 220 x 250 mm")  
- "speed" (text) - Maximum speed in mm/min (e.g., "12000 mm/min")
- "machine_size" (text) - Physical dimensions
- "software" (text) - Compatible software
- "focus" (text) - "Auto", "Manual", or "Auto/Manual"
- "enclosure" (text) - "Yes" or "No"
- "wifi" (text) - "Yes" or "No"
- "camera" (text) - "Yes" or "No"
- "passthrough" (text) - "Yes" or "No"
- "air_assist" (text) - "Yes" or "No"
- "rotary" (text) - "Yes", "No", or "Optional"
- "material" (text) - Frame/construction material
- "connectivity" (text) - Connection methods (USB, WiFi, Ethernet, etc.)

MAPPING RULES:
1. Extract numeric values and units separately when needed
2. Convert all prices to USD numbers only (no $, no commas)
3. Normalize Yes/No fields to exactly "Yes" or "No"
4. Convert work area to mm format: "400 x 400 mm"
5. Convert speed to mm/min format: "12000 mm/min"
6. If multiple values exist (e.g., price range), use the lowest
7. Leave fields empty if no clear mapping exists
8. Determine machine category from product type/name/description
9. For laser category, look for keywords: diode, CO2, fiber, UV, IR

EXAMPLES:
- Price "$1,299.00" → 1299.0
- Price "Starting at €1,199" → (convert to USD)  
- Power "10W" → "10W"
- Work area "400mm x 400mm" → "400 x 400 mm"
- Work area "15.7 x 15.7 inches" → "399 x 399 mm"
- Speed "400mm/s" → "24000 mm/min"
- Has WiFi connectivity → wifi: "Yes"
- "Fully enclosed design" → enclosure: "Yes"

Return a JSON object with:
{{
  "mapped_data": {{
    "name": "...",
    "brand": "...",
    "price": 1234.56,
    "laser_type_a": "CO2",
    "laser_power_a": "55W",
    "work_area": "600 x 305 mm",
    "speed": "14160 mm/min",
    "machine_category": "laser",
    "laser_category": "desktop-co2-laser"
    // ... other mapped fields
  }},
  "warnings": [
    // List any fields that couldn't be mapped or issues found
  ]
}}

Only include fields that have clear mappings. Do not guess or make up data."""
        
        return prompt
    
    def _parse_claude_response(self, response_text: str) -> Dict:
        """Parse Claude's response to extract the mapped data"""
        try:
            # Claude should return JSON, but let's be safe
            # Look for JSON in the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                return json.loads(json_str)
            else:
                logger.error("No JSON found in Claude response")
                return {"mapped_data": {}, "warnings": ["Failed to parse Claude response"]}
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.debug(f"Response text: {response_text[:500]}...")
            return {"mapped_data": {}, "warnings": ["Invalid JSON in Claude response"]}
    
    def extract_specifications(self, raw_specs: Dict) -> Dict:
        """
        Use Claude to extract and normalize specifications
        
        Args:
            raw_specs: Raw specification data in various formats
            
        Returns:
            Normalized specifications dict
        """
        prompt = f"""Extract and normalize these product specifications to our standard fields:

RAW SPECIFICATIONS:
{json.dumps(raw_specs, indent=2)}

Map to these standard specification fields:
- Laser Power (extract number and unit)
- Working Area (dimensions in original units)
- Max Speed (with unit)
- Focus Type (Auto/Manual)
- Connectivity options
- Physical dimensions
- Weight
- Software compatibility
- Any Yes/No features

Return JSON with normalized field names and values."""
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return self._parse_claude_response(response.content[0].text).get('specifications', {})
            
        except Exception as e:
            logger.error(f"Failed to extract specifications: {e}")
            return {}