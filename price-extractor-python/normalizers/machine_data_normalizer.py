"""
Machine Data Normalizer
Converts raw extracted machine data into standardized format for database storage
"""
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from decimal import Decimal

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class MachineDataNormalizer:
    """Normalizes extracted machine data to database format"""

    def __init__(self):
        self.field_mappings = self._load_field_mappings()
        self.brand_mappings = self._load_brand_mappings()
        self.category_rules = self._load_category_rules()

    def _load_field_mappings(self) -> Dict[str, str]:
        """Load field name mappings from common variations to database columns"""
        return {
            # Universal fields
            'machine_name': 'Machine Name',
            'name': 'Machine Name',
            'product_name': 'Machine Name',
            'model': 'Machine Name',
            'title': 'Machine Name',
            
            'price': 'Price',
            'cost': 'Price',
            'msrp': 'Price',
            'starting_at': 'Price',
            'from_price': 'Price',
            
            'company': 'Company',
            'brand': 'Company',
            'manufacturer': 'Company',
            'make': 'Company',
            
            'machine_category': 'Machine Category',
            'category': 'Machine Category',
            'type': 'Machine Category',
            
            'laser_category': 'Laser Category',
            'laser_type': 'Laser Category',
            
            'description': 'Description',
            'excerpt': 'Excerpt (Short)',
            'excerpt_short': 'Excerpt (Short)',
            'short_description': 'Excerpt (Short)',
            'summary': 'Excerpt (Short)',
            
            'image': 'Image',
            'image_url': 'Image',
            'main_image': 'Image',
            'primary_image': 'Image',
            
            'product_link': 'product_link',
            'product_url': 'product_link',
            'url': 'product_link',
            
            'affiliate_link': 'Affiliate Link',
            'buy_link': 'Affiliate Link',
            'purchase_link': 'Affiliate Link',
            
            # Laser-specific fields
            'laser_power_a': 'Laser Power A',
            'laser_power': 'Laser Power A',
            'power': 'Laser Power A',
            'output_power': 'Laser Power A',
            'watts': 'Laser Power A',
            
            'laser_type_a': 'Laser Type A',
            'laser_technology': 'Laser Type A',
            'laser_source': 'Laser Type A',
            
            'laser_power_b': 'LaserPower B',  # Note: no space (legacy)
            'laser_type_b': 'Laser Type B',
            
            'work_area': 'Work Area',
            'cutting_area': 'Work Area',
            'engraving_area': 'Work Area',
            'bed_size': 'Work Area',
            
            'speed': 'Speed',
            'max_speed': 'Speed',
            'cutting_speed': 'Speed',
            'engraving_speed': 'Speed',
            
            'machine_size': 'Machine Size',
            'dimensions': 'Machine Size',
            'physical_size': 'Machine Size',
            
            'height': 'Height',
            'z_height': 'Height',
            'max_height': 'Height',
            
            'acceleration': 'Acceleration',
            'max_acceleration': 'Acceleration',
            
            'software': 'Software',
            'software_compatibility': 'Software',
            'compatible_software': 'Software',
            
            'focus': 'Focus',
            'focus_type': 'Focus',
            'autofocus': 'Focus',
            
            'controller': 'Controller',
            'control_system': 'Controller',
            'motherboard': 'Controller',
            
            'warranty': 'Warranty',
            'warranty_period': 'Warranty',
            
            # Boolean fields
            'enclosure': 'Enclosure',
            'enclosed': 'Enclosure',
            'safety_enclosure': 'Enclosure',
            'cover': 'Enclosure',
            
            'wifi': 'Wifi',
            'wireless': 'Wifi',
            'wi_fi': 'Wifi',
            'network': 'Wifi',
            
            'camera': 'Camera',
            'vision_system': 'Camera',
            'monitoring_camera': 'Camera',
            
            'passthrough': 'Passthrough',
            'pass_through': 'Passthrough',
            'unlimited_length': 'Passthrough',
            
            'is_featured': 'Is A Featured Resource?',
            'featured': 'Is A Featured Resource?',
            
            'hidden': 'Hidden',
            'is_hidden': 'Hidden',
            'visible': 'Hidden',  # Inverted
            
            # Advanced laser fields
            'laser_frequency': 'Laser Frequency',
            'frequency': 'Laser Frequency',
            
            'pulse_width': 'Pulse Width',
            'pulse_duration': 'Pulse Width',
            
            'laser_source_manufacturer': 'Laser Source Manufacturer',
            'diode_manufacturer': 'Laser Source Manufacturer',
            
            # Content fields
            'highlights': 'Highlights',
            'pros': 'Highlights',
            'advantages': 'Highlights',
            
            'drawbacks': 'Drawbacks',
            'cons': 'Drawbacks',
            'limitations': 'Drawbacks',
            
            'youtube_review': 'YouTube Review',
            'review_video': 'YouTube Review',
            'video_review': 'YouTube Review',
        }

    def _load_brand_mappings(self) -> Dict[str, str]:
        """Load brand name variations to standardized names"""
        return {
            # Common variations and misspellings
            'commarker': 'ComMarker',
            'com-marker': 'ComMarker',
            'com marker': 'ComMarker',
            
            'xtool': 'xTool',
            'x-tool': 'xTool',
            'x tool': 'xTool',
            
            'atomstack': 'Atomstack',
            'atom-stack': 'Atomstack',
            'atom stack': 'Atomstack',
            
            'bambulab': 'Bambu Lab',
            'bambu-lab': 'Bambu Lab',
            'bambu lab': 'Bambu Lab',
            
            'creality3d': 'Creality',
            'creality 3d': 'Creality',
            'creality3d.com': 'Creality',
            
            'prusa3d': 'Prusa',
            'prusa 3d': 'Prusa',
            'prusa research': 'Prusa',
            
            'anycubic3d': 'Anycubic',
            'any cubic': 'Anycubic',
            
            'elegoo3d': 'Elegoo',
            'elegoo mars': 'Elegoo',
            
            'carbide3d': 'Carbide 3D',
            'carbide 3d': 'Carbide 3D',
            'carbide3d.com': 'Carbide 3D',
            
            'onefinity cnc': 'Onefinity',
            'onefinity': 'Onefinity',
            
            'avid cnc': 'Avid CNC',
            'avidcnc': 'Avid CNC',
            
            'openbuilds': 'OpenBuilds',
            'open builds': 'OpenBuilds',
            'openbuilds partstore': 'OpenBuilds',
            
            'inventables': 'Inventables',
            'inventables.com': 'Inventables',
            
            # UV/DTF printer brands
            'roland dg': 'Roland',
            'rolanddga': 'Roland',
            
            'mimaki': 'Mimaki',
            'mimaki.com': 'Mimaki',
            
            'epson': 'Epson',
            'epson.com': 'Epson',
            
            'brother': 'Brother',
            'brother.com': 'Brother',
            
            'mutoh': 'Mutoh',
            'mutoh.com': 'Mutoh',
        }

    def _load_category_rules(self) -> Dict[str, Dict]:
        """Load category auto-assignment rules"""
        return {
            'laser': {
                'keywords': ['laser', 'engraver', 'cutter', 'engraving', 'cutting'],
                'subcategories': {
                    'desktop-diode-laser': ['diode', 'blue laser', '450nm', 'desktop', '5w', '10w', '20w'],
                    'desktop-co2-laser': ['co2', 'glass tube', 'desktop', '40w', '50w', '60w'],
                    'desktop-fiber-laser': ['fiber', 'metal marking', 'mopa', 'desktop'],
                    'high-end-co2-laser': ['co2', 'industrial', 'large format', '100w', '150w', '200w'],
                    'high-end-fiber': ['fiber', 'industrial', 'production', 'high power'],
                    'open-diode-laser': ['open frame', 'diy', 'kit', 'assembly required']
                }
            },
            '3d-printer': {
                'keywords': ['3d printer', '3d print', 'printer', 'fdm', 'sla', 'resin', 'filament'],
                'subcategories': {
                    'fdm': ['fdm', 'fff', 'filament', 'fused', 'fused deposition'],
                    'resin': ['resin', 'sla', 'msla', 'dlp', 'lcd', 'photopolymer']
                }
            },
            'cnc': {
                'keywords': ['cnc', 'mill', 'router', 'machining', 'cutting', 'milling'],
                'subcategories': {
                    'desktop-cnc': ['desktop', 'hobby', 'benchtop', 'small'],
                    'professional-cnc': ['professional', 'industrial', 'production', 'large format']
                }
            },
            'uv-printer': {
                'keywords': ['uv printer', 'uv print', 'flatbed', 'direct print', 'uv printing'],
                'subcategories': {
                    'small-format': ['a4', 'a3', 'desktop', 'small format'],
                    'large-format': ['large format', 'wide', 'industrial', 'production']
                }
            },
            'dtf-printer': {
                'keywords': ['dtf', 'direct to film', 'transfer', 'textile', 'dtf printer'],
                'subcategories': {
                    'desktop-dtf': ['desktop', 'small', 'a3', 'hobby'],
                    'production-dtf': ['production', 'roll to roll', 'wide format', 'commercial']
                }
            }
        }

    def normalize(self, raw_data: Dict[str, Any], machine_type: str = None) -> Tuple[Dict[str, Any], ValidationResult]:
        """
        Main normalization method
        
        Args:
            raw_data: Raw extracted data
            machine_type: Machine type hint (laser, 3d-printer, cnc, etc.)
            
        Returns:
            Tuple of (normalized_data, validation_result)
        """
        logger.info(f"Normalizing machine data for type: {machine_type}")
        
        normalized = {}
        errors = []
        warnings = []

        try:
            # Step 1: Map field names
            mapped_data = self._map_field_names(raw_data)
            
            # Step 2: Standardize units and formats
            normalized_data = self._standardize_units(mapped_data)
            
            # Step 3: Transform data types
            typed_data = self._transform_data_types(normalized_data)
            
            # Step 4: Handle relationships (brands, categories)
            final_data = self._handle_relationships(typed_data, machine_type)
            
            # Step 5: Add metadata
            final_data['discovery_source'] = 'crawler'
            final_data['last_seen_at'] = self._get_current_timestamp()
            
            normalized = final_data
            
            # Step 6: Validate
            validation = self._validate_data(normalized, machine_type)
            errors.extend(validation.errors)
            warnings.extend(validation.warnings)
            
        except Exception as e:
            error_msg = f"Error during normalization: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)

        validation_result = ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

        return normalized, validation_result

    def _map_field_names(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map field names from common variations to database column names"""
        mapped = {}
        
        for key, value in raw_data.items():
            # Skip empty values
            if value is None or value == '':
                continue
                
            # Convert key to lowercase for matching
            key_lower = str(key).lower().replace(' ', '_').replace('-', '_')
            
            # Find mapping
            if key_lower in self.field_mappings:
                mapped_key = self.field_mappings[key_lower]
                mapped[mapped_key] = value
                logger.debug(f"Mapped '{key}' -> '{mapped_key}'")
            else:
                # Keep original key if no mapping found
                mapped[key] = value
                logger.debug(f"No mapping found for '{key}', keeping original")

        return mapped

    def _standardize_units(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Standardize units and formats"""
        standardized = dict(data)  # Copy

        # Power normalization
        power_fields = ['Laser Power A', 'LaserPower B']
        for field in power_fields:
            if field in standardized:
                standardized[field] = self._normalize_power(standardized[field])

        # Speed normalization
        speed_fields = ['Speed', 'Engraving Speed Max']
        for field in speed_fields:
            if field in standardized:
                standardized[field] = self._normalize_speed(standardized[field])

        # Dimension normalization
        dimension_fields = ['Work Area', 'Machine Size', 'Height']
        for field in dimension_fields:
            if field in standardized:
                standardized[field] = self._normalize_dimensions(standardized[field])

        # Price normalization
        if 'Price' in standardized:
            standardized['Price'] = self._normalize_price(standardized['Price'])

        return standardized

    def _normalize_power(self, value: Any) -> str:
        """Normalize power values to watts with 'W' suffix"""
        if not value:
            return ''
            
        value_str = str(value).lower()
        
        # Extract number and unit
        match = re.search(r'([\d.]+)\s*(mw|kw|w|watts?)', value_str)
        if not match:
            # Try to extract just numbers
            number_match = re.search(r'([\d.]+)', value_str)
            if number_match:
                return f"{float(number_match.group(1))}W"
            return str(value)  # Return as-is if no pattern found
        
        power_value = float(match.group(1))
        unit = match.group(2)
        
        # Convert to watts
        if unit.startswith('kw'):
            power_value *= 1000
        elif unit.startswith('mw'):
            power_value /= 1000
        
        # Return as integer if whole number, float otherwise
        if power_value.is_integer():
            return f"{int(power_value)}W"
        else:
            return f"{power_value}W"

    def _normalize_speed(self, value: Any) -> str:
        """Normalize speed to mm/min format"""
        if not value:
            return ''
            
        value_str = str(value).lower()
        
        # Extract number and unit
        match = re.search(r'([\d.]+)\s*(mm\/s|mm\/min|ipm|in\/min)', value_str)
        if not match:
            return str(value)  # Return as-is if no pattern found
        
        speed_value = float(match.group(1))
        unit = match.group(2)
        
        # Convert to mm/min
        if unit == 'mm/s':
            speed_value *= 60
        elif unit in ['ipm', 'in/min']:
            speed_value *= 25.4  # inches to mm
        
        return f"{int(speed_value)} mm/min"

    def _normalize_dimensions(self, value: Any) -> str:
        """Normalize dimensions to standard format"""
        if not value:
            return ''
            
        value_str = str(value)
        
        # Pattern for dimensions like "400x400mm" or "16" x 16""
        pattern = r'([\d.]+)\s*[x×]\s*([\d.]+)(?:\s*[x×]\s*([\d.]+))?\s*(mm|cm|in|inches|")?'
        match = re.search(pattern, value_str, re.IGNORECASE)
        
        if not match:
            return str(value)  # Return as-is if no pattern found
        
        x = float(match.group(1))
        y = float(match.group(2))
        z = float(match.group(3)) if match.group(3) else None
        unit = match.group(4) or 'mm'
        
        # Convert to mm
        if unit.lower() in ['cm']:
            x *= 10
            y *= 10
            if z: z *= 10
        elif unit.lower() in ['in', 'inches', '"']:
            x *= 25.4
            y *= 25.4
            if z: z *= 25.4
        
        # Format result
        if z:
            return f"{int(x)} x {int(y)} x {int(z)} mm"
        else:
            return f"{int(x)} x {int(y)} mm"

    def _normalize_price(self, value: Any) -> float:
        """Normalize price to decimal number"""
        if not value:
            return 0.0
            
        # Remove currency symbols and commas
        price_str = re.sub(r'[$£€,]', '', str(value))
        
        # Extract first number found
        match = re.search(r'([\d.]+)', price_str)
        if match:
            return float(match.group(1))
        
        return 0.0

    def _transform_data_types(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data types for database compatibility"""
        transformed = dict(data)  # Copy

        # Boolean fields that should be "Yes"/"No" text
        boolean_fields = [
            'Enclosure', 'Wifi', 'Camera', 'Passthrough', 
            'Is A Featured Resource?', 'Hidden'
        ]
        
        for field in boolean_fields:
            if field in transformed:
                transformed[field] = self._normalize_boolean_text(transformed[field], field)

        # Special case for inverted boolean (visible -> Hidden)
        if 'visible' in data:
            transformed['Hidden'] = self._normalize_boolean_text(not data['visible'])

        # Ensure Price is numeric
        if 'Price' in transformed and transformed['Price']:
            try:
                transformed['Price'] = float(transformed['Price'])
            except (ValueError, TypeError):
                logger.warning(f"Could not convert price to number: {transformed['Price']}")

        return transformed

    def _normalize_boolean_text(self, value: Any, field_name: str = '') -> str:
        """Convert boolean values to "Yes"/"No" text format"""
        if isinstance(value, bool):
            return "Yes" if value else "No"
        
        if isinstance(value, str):
            value_lower = value.lower().strip()
            yes_values = ['yes', 'true', '1', 'on', 'enabled', 'available', 'included', 'present']
            if value_lower in yes_values:
                return "Yes"
            elif value_lower in ['no', 'false', '0', 'off', 'disabled', 'not available', 'not included', 'absent']:
                return "No"
        
        # Default based on field name context
        if field_name in ['Hidden']:
            return "No"  # Default to not hidden
        else:
            return "No"  # Default to feature not present

    def _handle_relationships(self, data: Dict[str, Any], machine_type: str = None) -> Dict[str, Any]:
        """Handle brand matching and category assignment"""
        processed = dict(data)  # Copy

        # Brand matching
        if 'Company' in processed:
            processed['Company'] = self._match_brand(processed['Company'])

        # Category assignment
        if not processed.get('Machine Category') and machine_type:
            processed['Machine Category'] = self._assign_category(data, machine_type)

        # Laser category assignment
        if processed.get('Machine Category') == 'laser' and not processed.get('Laser Category'):
            processed['Laser Category'] = self._assign_laser_category(data)

        return processed

    def _match_brand(self, brand_name: Any) -> str:
        """Match brand name to standardized version"""
        if not brand_name:
            return ''
            
        brand_lower = str(brand_name).lower().strip()
        
        # Direct mapping
        if brand_lower in self.brand_mappings:
            return self.brand_mappings[brand_lower]
        
        # Fuzzy matching for partial matches
        for variation, standard_name in self.brand_mappings.items():
            if variation in brand_lower or brand_lower in variation:
                return standard_name
        
        # Return cleaned version if no match
        return str(brand_name).title()

    def _assign_category(self, data: Dict[str, Any], machine_type: str) -> str:
        """Auto-assign machine category based on machine type and keywords"""
        if machine_type in self.category_rules:
            return machine_type
        
        # Fallback: analyze content for keywords
        content_fields = ['Machine Name', 'Description', 'Excerpt (Short)']
        content = ' '.join([str(data.get(field, '')) for field in content_fields]).lower()
        
        for category, rules in self.category_rules.items():
            if any(keyword in content for keyword in rules['keywords']):
                return category
        
        return 'laser'  # Default fallback

    def _assign_laser_category(self, data: Dict[str, Any]) -> str:
        """Auto-assign laser category based on specifications"""
        content_fields = ['Machine Name', 'Description', 'Laser Type A', 'Laser Power A']
        content = ' '.join([str(data.get(field, '')) for field in content_fields]).lower()
        
        laser_rules = self.category_rules['laser']['subcategories']
        
        for subcategory, keywords in laser_rules.items():
            if any(keyword in content for keyword in keywords):
                return subcategory
        
        # Default based on power if available
        power_str = str(data.get('Laser Power A', '')).lower()
        if any(power in power_str for power in ['5w', '10w', '20w', '30w']):
            return 'desktop-diode-laser'
        elif any(power in power_str for power in ['40w', '50w', '60w']):
            return 'desktop-co2-laser'
        elif any(power in power_str for power in ['100w', '150w', '200w']):
            return 'high-end-co2-laser'
        
        return 'desktop-diode-laser'  # Default

    def _validate_data(self, data: Dict[str, Any], machine_type: str = None) -> ValidationResult:
        """Validate normalized data"""
        errors = []
        warnings = []

        # Required fields
        required_fields = ['Machine Name', 'Price']
        for field in required_fields:
            if not data.get(field):
                errors.append(f"Missing required field: {field}")

        # Price validation
        if 'Price' in data:
            try:
                price = float(data['Price'])
                if price <= 0:
                    warnings.append("Price is zero or negative")
                elif price > 1000000:
                    warnings.append("Price seems unusually high")
                elif price < 10:
                    warnings.append("Price seems unusually low")
            except (ValueError, TypeError):
                errors.append("Price is not a valid number")

        # Machine name length
        if 'Machine Name' in data:
            name_length = len(str(data['Machine Name']))
            if name_length < 3:
                errors.append("Machine name is too short")
            elif name_length > 200:
                warnings.append("Machine name is very long")

        # URL validation
        url_fields = ['product_link', 'Affiliate Link', 'YouTube Review', 'Image']
        for field in url_fields:
            if field in data and data[field]:
                url = str(data[field])
                if not (url.startswith('http://') or url.startswith('https://')):
                    warnings.append(f"{field} does not appear to be a valid URL")

        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'


# Convenience function
def normalize_machine_data(raw_data: Dict[str, Any], machine_type: str = None) -> Tuple[Dict[str, Any], ValidationResult]:
    """
    Convenience function to normalize machine data
    
    Args:
        raw_data: Raw extracted machine data
        machine_type: Optional machine type hint
        
    Returns:
        Tuple of (normalized_data, validation_result)
    """
    normalizer = MachineDataNormalizer()
    return normalizer.normalize(raw_data, machine_type)


if __name__ == "__main__":
    # Example usage
    sample_data = {
        'name': 'ComMarker B6 MOPA 60W',
        'price': '$4,589.00',
        'brand': 'commarker',
        'laser_power': '60 watts',
        'work_area': '16" x 16"',
        'speed': '15000 mm/min',
        'enclosure': True,
        'wifi': 'Yes',
        'camera': False,
        'description': 'Professional MOPA fiber laser for metal marking',
    }
    
    normalized, validation = normalize_machine_data(sample_data, 'laser')
    
    print("Normalized data:")
    print(json.dumps(normalized, indent=2))
    print(f"\nValidation: Valid={validation.is_valid}")
    print(f"Errors: {validation.errors}")
    print(f"Warnings: {validation.warnings}")