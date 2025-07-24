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
                "description": "Primary laser power with unit (e.g., '40W', '55W')"
            },
            "laser_type_b": {
                "type": "string", 
                "enum": ["Diode", "CO2", "Fiber", "Galvo", "UV", "Other"],
                "description": "Secondary laser type for dual-laser machines"
            },
            "laser_power_b": {
                "type": "string",
                "description": "Secondary laser power with unit (e.g., '2W', '10W')"
            },
            "work_area": {
                "type": "string",
                "description": "Work area dimensions in mm format (e.g., '400 x 400 mm', '600 x 305 mm')"
            },
            "speed": {
                "type": "string", 
                "description": "Maximum speed in mm/min format (e.g., '12000 mm/min', '24000 mm/min')"
            },
            "machine_size": {
                "type": "string",
                "description": "Physical machine dimensions"
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
4. Convert specifications to standard formats:
   - work_area: Convert to "X x Y mm" format (e.g., "400 x 400 mm")
   - speed: Convert to "X mm/min" format (e.g., "12000 mm/min") 
   - laser_power_a: Keep with unit (e.g., "40W", "55W")
5. Boolean fields: Use exactly "Yes" or "No"
6. Only include fields with clear mappings - leave others empty

EXAMPLES:
- "15.7 x 15.7 inches" → "399 x 399 mm" (convert inches to mm)
- "400mm/s" → "24000 mm/min" (convert mm/s to mm/min)
- "Starting at $1,299" → 1299 (extract lowest price as number)
- "WiFi enabled" → wifi: "Yes"
- "CO2 laser, 55W" → laser_type_a: "CO2", laser_power_a: "55W"

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