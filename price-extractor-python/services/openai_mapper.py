"""
OpenAI-based intelligent field mapper using tool calls for structured output
Much more reliable and maintainable than prompt-based JSON parsing
"""
import json
import logging
import yaml
from typing import Dict, Optional, Tuple, List
from openai import OpenAI
from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)


class OpenAIMapper:
    """Uses OpenAI GPT-4o mini with tool calls for reliable structured mapping"""
    
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set in environment")
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = "gpt-4o-mini"
        self.schema = self.load_database_schema()
        logger.info(f"OpenAI mapper initialized with model: {self.model}")
    
    def load_database_schema(self) -> Dict:
        """Load database schema - for now hardcoded, but should be dynamic"""
        return {
            # Core fields
            "name": {
                "type": "string",
                "description": "Product name/model (e.g., 'xTool P2S 55W Desktop CO2 Laser Cutter')"
            },
            "brand": {
                "type": "string", 
                "description": "Brand/manufacturer name (e.g., 'xTool', 'Glowforge')"
            },
            "price": {
                "type": "number",
                "description": "Base price in USD as number only, no currency symbols"
            },
            "machine_category": {
                "type": "string",
                "enum": ["laser", "3d-printer", "cnc"],
                "description": "Type of machine"
            },
            "laser_category": {
                "type": "string", 
                "enum": [
                    "desktop-diode-laser",
                    "desktop-co2-laser", 
                    "desktop-fiber-laser",
                    "fiber-laser",
                    "high-end-co2-laser",
                    "industrial-co2-laser",
                    "industrial-fiber-laser"
                ],
                "description": "Laser subcategory if machine_category is laser"
            },
            "description": {
                "type": "string",
                "description": "Full product description"
            },
            "images": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Array of product image URLs"
            },
            
            # Technical specifications
            "laser_type_a": {
                "type": "string",
                "enum": ["Diode", "CO2", "Fiber", "Galvo", "UV", "Other"],
                "description": "Primary laser type"
            },
            "laser_power_a": {
                "type": "string",
                "description": "Primary laser power as number only without unit (e.g., '40', '55')"
            },
            "laser_type_b": {
                "type": "string", 
                "enum": ["Diode", "CO2", "Fiber", "Galvo", "UV", "Other"],
                "description": "Secondary laser type for dual-laser machines"
            },
            "laser_power_b": {
                "type": "string",
                "description": "Secondary laser power as number only without unit (e.g., '2', '10')"
            },
            "work_area": {
                "type": "string",
                "description": "Work area dimensions in mm format with no spaces around x (e.g., '400x400 mm', '600x305 mm')"
            },
            "speed": {
                "type": "string", 
                "description": "Maximum speed in mm/s format (e.g., '1200 mm/s', '15000 mm/s')"
            },
            "machine_size": {
                "type": "string",
                "description": "Physical machine dimensions in format like '1000x639x268 mm' or '39.4x25.1x10.6 inches'"
            },
            "software": {
                "type": "string",
                "description": "Compatible software (e.g., 'LightBurn', 'xTool Creative Space')"
            },
            "focus": {
                "type": "string",
                "enum": ["Auto", "Manual", "Auto/Manual"],
                "description": "Focus type"
            },
            "enclosure": {
                "type": "string",
                "enum": ["Yes", "No"],
                "description": "Whether machine has enclosure"
            },
            "wifi": {
                "type": "string", 
                "enum": ["Yes", "No"],
                "description": "Whether machine has WiFi connectivity"
            },
            "camera": {
                "type": "string",
                "enum": ["Yes", "No"], 
                "description": "Whether machine has built-in camera"
            },
            "air_assist": {
                "type": "string",
                "enum": ["Yes", "No"],
                "description": "Whether machine has air assist"
            },
            "rotary": {
                "type": "string",
                "enum": ["Yes", "No", "Optional"],
                "description": "Rotary attachment availability"
            },
            "passthrough": {
                "type": "string",
                "enum": ["Yes", "No"],
                "description": "Whether machine has passthrough capability for long materials"
            },
            
            # Additional fields to match discovery modal
            "product_link": {
                "type": "string",
                "description": "Official product page URL"
            },
            "height": {
                "type": "string",
                "description": "Z-axis height or clearance in mm (e.g., '268 mm')"
            },
            "acceleration": {
                "type": "string",
                "description": "Acceleration specification (e.g., '2000 mm/s²')"
            },
            "laser_frequency": {
                "type": "string",
                "description": "Laser frequency in Hz (e.g., '20000 Hz')"
            },
            "pulse_width": {
                "type": "string",
                "description": "Pulse width specification (e.g., '0.05-10ms')"
            },
            "controller": {
                "type": "string",
                "description": "Controller type (e.g., 'Ruida', 'GRBL', 'Marlin')"
            },
            "warranty": {
                "type": "string",
                "description": "Warranty information (e.g., '1 year limited warranty')"
            },
            "laser_source_manufacturer": {
                "type": "string",
                "description": "Laser source/diode manufacturer (e.g., 'OSRAM', 'Nichia')"
            }
        }
    
    def build_mapping_tool(self) -> Dict:
        """Build OpenAI tool schema from database schema"""
        return {
            "type": "function",
            "function": {
                "name": "map_product_data",
                "description": "Map scraped product data to structured database schema",
                "parameters": {
                    "type": "object",
                    "properties": self.schema,
                    "required": ["name", "brand", "price", "machine_category"]
                }
            }
        }
    
    def map_to_database_schema(self, scrapfly_data: Dict) -> Tuple[Dict, List[str]]:
        """
        Map Scrapfly extracted data to database schema using OpenAI tool calls
        
        Args:
            scrapfly_data: Raw data from Scrapfly product extraction
            
        Returns:
            Tuple of (mapped_data, warnings)
        """
        try:
            # Build detailed prompt with examples
            prompt = self._build_mapping_prompt(scrapfly_data)
            
            # Call OpenAI with tool calls for structured output
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a product data mapping expert. Extract and transform scraped product data to match the exact database schema. Pay attention to units, formatting, and enum values."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                tools=[self.build_mapping_tool()],
                tool_choice="required",
                temperature=0  # Deterministic mapping
            )
            
            # Extract mapped data from tool call
            tool_call = response.choices[0].message.tool_calls[0]
            mapped_data = json.loads(tool_call.function.arguments)
            
            # Validate and clean the data
            cleaned_data, warnings = self._validate_and_clean(mapped_data)
            
            logger.info(f"OpenAI successfully mapped {len(cleaned_data)} fields")
            if warnings:
                logger.warning(f"Mapping warnings: {warnings}")
            
            return cleaned_data, warnings
            
        except Exception as e:
            logger.error(f"OpenAI mapping failed: {str(e)}")
            return {}, [f"OpenAI mapping error: {str(e)}"]
    
    def _build_mapping_prompt(self, scrapfly_data: Dict) -> str:
        """Build detailed mapping prompt with examples"""
        return f"""Map the following scraped product data to our database schema.

SCRAPED DATA:
{json.dumps(scrapfly_data, indent=2)}

MAPPING INSTRUCTIONS:
1. Extract core product info: name, brand, price
2. Determine machine_category from product type
3. For lasers, determine laser_category based on power/type
4. Convert specifications to EXACT database formats:
   - work_area: Convert to "XxY mm" format with NO SPACES around x (e.g., "400x400 mm", "600x305 mm")
   - machine_size: Convert to "XxYxZ mm" format for physical dimensions (e.g., "1000x639x268 mm")
   - speed: Convert to "X mm/s" format (e.g., "1200 mm/s", "15000 mm/s") 
   - laser_power_a: Number only, NO UNIT (e.g., "40", "55")
   - laser_power_b: Number only, NO UNIT (e.g., "2", "10")
5. Boolean fields: Use exactly "Yes" or "No"
6. Look carefully in specifications array for detailed technical data
7. Feature detection - look for variations and context:
   - Air Assist: "air assist", "air-assist", "air assistance", "C4 Air Assist", "air pump"
   - Passthrough: "pass-through", "passthrough", "pass through", "door design", "oversized materials"
   - Rotary: "rotary attachment", "rotary axis", "rotary roller", "M3 Rotary", "4-pin aviation port"
   - Enclosure: "enclosure", "enclosed", "housing", "protective cover", "safety enclosure"
8. Check product accessories and compatibility mentions for feature hints
9. Extract URLs and links:
   - product_link: Extract the main product page URL from 'url', 'product_url', or 'canonical_url'
   - Look for warranty information in specifications or product details
   - Find controller type (Ruida, GRBL, etc.) in technical specifications
   - Extract laser source manufacturer (OSRAM, Nichia, etc.) if mentioned
10. Only include fields with clear mappings - leave others empty

EXAMPLES:
- "23.6" × 12" (600 mm × 305 mm)" → work_area: "600x305 mm" (use the mm measurements)
- "39.4" × 25.1" × 10.6" (1000 mm × 639 mm × 268 mm)" → machine_size: "1000x639x268 mm" (physical dimensions)
- "24000 mm/min" → "400 mm/s" (convert mm/min to mm/s by dividing by 60)
- "Starting at $1,299" → 1299 (extract lowest price as number)
- "WiFi enabled" → wifi: "Yes"
- "CO2 laser, 55W" → laser_type_a: "CO2", laser_power_a: "55"
- "Autofocus" → focus: "Auto"
- "USB/Wi-Fi" → wifi: "Yes"
- "https://example.com/product" → product_link: "https://example.com/product"
- "1 year warranty" → warranty: "1 year warranty"
- "OSRAM diodes" → laser_source_manufacturer: "OSRAM"
- "Ruida controller" → controller: "Ruida"

Map only fields that have clear values in the source data."""
    
    def _validate_and_clean(self, mapped_data: Dict) -> Tuple[Dict, List[str]]:
        """Validate and clean mapped data"""
        warnings = []
        cleaned = {}
        
        for field, value in mapped_data.items():
            if field not in self.schema:
                warnings.append(f"Unknown field: {field}")
                continue
                
            if value is None or value == "":
                continue
                
            field_schema = self.schema[field]
            
            # Type validation
            if field_schema["type"] == "string" and not isinstance(value, str):
                value = str(value)
            elif field_schema["type"] == "number" and not isinstance(value, (int, float)):
                try:
                    value = float(value)
                except ValueError:
                    warnings.append(f"Invalid number for {field}: {value}")
                    continue
            elif field_schema["type"] == "array" and not isinstance(value, list):
                warnings.append(f"Expected array for {field}, got {type(value)}")
                continue
            
            # Enum validation
            if "enum" in field_schema:
                if value not in field_schema["enum"]:
                    warnings.append(f"Invalid enum value for {field}: {value}. Valid: {field_schema['enum']}")
                    continue
            
            cleaned[field] = value
        
        return cleaned, warnings


def create_openai_mapper() -> OpenAIMapper:
    """Factory function to create OpenAI mapper"""
    return OpenAIMapper()