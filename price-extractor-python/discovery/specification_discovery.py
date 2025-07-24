"""
Specification Discovery System
Analyzes extracted machine data to discover common specification patterns and formats
"""
import re
import json
import logging
from typing import Dict, Any, List, Set, Tuple, Optional
from collections import defaultdict, Counter
from dataclasses import dataclass
import statistics

logger = logging.getLogger(__name__)


@dataclass
class SpecificationPattern:
    """Represents a discovered specification pattern"""
    field_name: str
    field_type: str  # 'text', 'number', 'boolean', 'array', 'json'
    display_name: str
    common_values: List[str]
    value_patterns: List[str]  # Regex patterns for values
    units: Set[str]  # Common units found
    frequency: int  # How often this spec appears
    validation_rules: Dict[str, Any]


class SpecificationDiscovery:
    """Discovers and analyzes specification patterns from extracted machine data"""
    
    def __init__(self):
        self.patterns = {}
        self.machine_type_specs = defaultdict(list)
        self.unit_patterns = {
            'power': re.compile(r'(\d+(?:\.\d+)?)\s*(W|kW|mW|watts?)', re.IGNORECASE),
            'speed': re.compile(r'(\d+(?:\.\d+)?)\s*(mm/s|mm/min|in/min|ipm)', re.IGNORECASE),
            'dimension': re.compile(r'(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:[xX×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|in|inches?)', re.IGNORECASE),
            'weight': re.compile(r'(\d+(?:\.\d+)?)\s*(kg|lb|lbs|pounds?)', re.IGNORECASE),
            'temperature': re.compile(r'(\d+(?:\.\d+)?)\s*[°]?\s*([CF])', re.IGNORECASE),
            'voltage': re.compile(r'(\d+(?:\.\d+)?)\s*[Vv](?:olts?)?', re.IGNORECASE),
            'frequency': re.compile(r'(\d+(?:\.\d+)?)\s*(Hz|kHz|MHz)', re.IGNORECASE)
        }
    
    def analyze_dataset(self, machine_data: List[Dict[str, Any]], machine_type: str = None) -> Dict[str, SpecificationPattern]:
        """Analyze a dataset to discover specification patterns"""
        logger.info(f"Analyzing {len(machine_data)} machines for specification patterns")
        
        # Collect all field data
        field_data = defaultdict(list)
        field_frequencies = defaultdict(int)
        
        for machine in machine_data:
            # Analyze both raw and normalized data
            all_data = {}
            if 'raw_data' in machine:
                all_data.update(machine['raw_data'] or {})
            if 'normalized_data' in machine:
                all_data.update(machine['normalized_data'] or {})
            
            for field_name, value in all_data.items():
                if value is not None and value != '':
                    field_data[field_name].append(value)
                    field_frequencies[field_name] += 1
        
        # Analyze each field
        discovered_patterns = {}
        for field_name, values in field_data.items():
            if field_frequencies[field_name] < 2:  # Skip fields that appear less than twice
                continue
                
            pattern = self._analyze_field_pattern(field_name, values, field_frequencies[field_name])
            if pattern:
                discovered_patterns[field_name] = pattern
                
        # Store patterns by machine type
        if machine_type:
            self.machine_type_specs[machine_type] = list(discovered_patterns.values())
            
        self.patterns.update(discovered_patterns)
        return discovered_patterns
    
    def _analyze_field_pattern(self, field_name: str, values: List[Any], frequency: int) -> Optional[SpecificationPattern]:
        """Analyze a specific field to determine its pattern"""
        
        # Convert all values to strings for analysis
        str_values = [str(v).strip() for v in values if v is not None]
        if not str_values:
            return None
        
        # Determine field type
        field_type = self._determine_field_type(str_values)
        
        # Extract common values (for categorical fields)
        common_values = self._get_common_values(str_values)
        
        # Extract value patterns
        value_patterns = self._extract_value_patterns(str_values, field_type)
        
        # Extract units
        units = self._extract_units(str_values)
        
        # Generate display name
        display_name = self._generate_display_name(field_name)
        
        # Create validation rules
        validation_rules = self._create_validation_rules(str_values, field_type, units)
        
        return SpecificationPattern(
            field_name=field_name,
            field_type=field_type,
            display_name=display_name,
            common_values=common_values,
            value_patterns=value_patterns,
            units=units,
            frequency=frequency,
            validation_rules=validation_rules
        )
    
    def _determine_field_type(self, values: List[str]) -> str:
        """Determine the data type of a field based on its values"""
        
        # Check for boolean patterns
        boolean_patterns = {'yes', 'no', 'true', 'false', '1', '0', 'on', 'off', 'enabled', 'disabled'}
        if all(v.lower() in boolean_patterns for v in values):
            return 'boolean'
        
        # Check for numeric patterns
        numeric_count = 0
        for value in values:
            # Remove common units and separators
            clean_value = re.sub(r'[^\d.,]', '', value)
            try:
                float(clean_value.replace(',', ''))
                numeric_count += 1
            except:
                pass
        
        if numeric_count / len(values) > 0.8:  # 80% numeric
            return 'number'
        
        # Check for array-like patterns
        array_indicators = [',', ';', '/', '|', ' and ', ' & ']
        array_count = sum(1 for value in values if any(indicator in value for indicator in array_indicators))
        if array_count / len(values) > 0.3:  # 30% contain separators
            return 'array'
        
        # Check for JSON-like patterns
        json_count = 0
        for value in values:
            if (value.startswith('{') and value.endswith('}')) or (value.startswith('[') and value.endswith(']')):
                try:
                    json.loads(value)
                    json_count += 1
                except:
                    pass
        
        if json_count / len(values) > 0.5:  # 50% valid JSON
            return 'json'
        
        # Default to text
        return 'text'
    
    def _get_common_values(self, values: List[str], max_values: int = 10) -> List[str]:
        """Get the most common values for categorical fields"""
        if len(set(values)) > 20:  # Too many unique values
            return []
        
        counter = Counter(values)
        return [value for value, count in counter.most_common(max_values)]
    
    def _extract_value_patterns(self, values: List[str], field_type: str) -> List[str]:
        """Extract regex patterns that match the field values"""
        patterns = []
        
        if field_type == 'number':
            # Number with optional units
            patterns.append(r'\d+(?:\.\d+)?(?:\s*[a-zA-Z]+)?')
        elif field_type == 'boolean':
            patterns.append(r'(?:yes|no|true|false|on|off|enabled|disabled)')
        elif field_type == 'array':
            patterns.append(r'.+(?:[,;/|]|\s+and\s+|\s+&\s+).+')
        else:
            # Try to find common patterns in text
            # Dimension patterns
            if any(self.unit_patterns['dimension'].search(v) for v in values):
                patterns.append(r'\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?\s*(?:mm|cm|in|inches?)')
            
            # Power patterns
            if any(self.unit_patterns['power'].search(v) for v in values):
                patterns.append(r'\d+(?:\.\d+)?\s*(?:W|kW|mW|watts?)')
            
            # Speed patterns
            if any(self.unit_patterns['speed'].search(v) for v in values):
                patterns.append(r'\d+(?:\.\d+)?\s*(?:mm/s|mm/min|in/min|ipm)')
        
        return patterns
    
    def _extract_units(self, values: List[str]) -> Set[str]:
        """Extract common units from field values"""
        units = set()
        
        for pattern_name, pattern in self.unit_patterns.items():
            for value in values:
                matches = pattern.findall(value)
                for match in matches:
                    if isinstance(match, tuple):
                        units.update(match[1:])  # Skip the number part
                    else:
                        units.add(match)
        
        return units
    
    def _generate_display_name(self, field_name: str) -> str:
        """Generate a human-readable display name from field name"""
        # Convert snake_case or camelCase to Title Case
        name = re.sub(r'[_-]', ' ', field_name)
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
        return name.title()
    
    def _create_validation_rules(self, values: List[str], field_type: str, units: Set[str]) -> Dict[str, Any]:
        """Create validation rules based on the analyzed data"""
        rules = {}
        
        if field_type == 'number':
            # Extract numeric values for range validation
            numbers = []
            for value in values:
                clean_value = re.sub(r'[^\d.,]', '', value)
                try:
                    numbers.append(float(clean_value.replace(',', '')))
                except:
                    pass
            
            if numbers:
                rules['min'] = min(numbers) * 0.5  # Allow 50% below minimum
                rules['max'] = max(numbers) * 2.0   # Allow 200% above maximum
                rules['typical_range'] = [
                    statistics.quantile(numbers, 0.25),
                    statistics.quantile(numbers, 0.75)
                ]
        
        elif field_type == 'text':
            rules['max_length'] = max(len(v) for v in values) * 1.5
            rules['min_length'] = 1
        
        elif field_type == 'array':
            # Determine common separators
            separators = []
            for value in values:
                if ',' in value: separators.append(',')
                if ';' in value: separators.append(';')
                if '/' in value: separators.append('/')
                if '|' in value: separators.append('|')
            
            if separators:
                rules['separators'] = list(set(separators))
        
        if units:
            rules['allowed_units'] = list(units)
        
        return rules
    
    def export_specifications_for_database(self, machine_type: str) -> List[Dict[str, Any]]:
        """Export discovered specifications in format suitable for database insertion"""
        
        if machine_type not in self.machine_type_specs:
            return []
        
        db_specs = []
        for i, spec in enumerate(self.machine_type_specs[machine_type]):
            db_spec = {
                'machine_type': machine_type,
                'field_name': spec.field_name,
                'field_type': spec.field_type,
                'display_name': spec.display_name,
                'is_required': spec.frequency > len(self.machine_type_specs[machine_type]) * 0.8,  # Required if >80% frequency
                'validation_rules': spec.validation_rules,
                'field_order': i * 10  # Leave gaps for manual ordering
            }
            db_specs.append(db_spec)
        
        return db_specs
    
    def get_specification_summary(self, machine_type: str = None) -> Dict[str, Any]:
        """Get a summary of discovered specifications"""
        
        if machine_type and machine_type in self.machine_type_specs:
            specs = self.machine_type_specs[machine_type]
        else:
            specs = list(self.patterns.values())
        
        summary = {
            'total_specifications': len(specs),
            'by_type': defaultdict(int),
            'most_common': [],
            'units_found': set()
        }
        
        for spec in specs:
            summary['by_type'][spec.field_type] += 1
            summary['units_found'].update(spec.units)
        
        # Sort by frequency
        summary['most_common'] = sorted(specs, key=lambda s: s.frequency, reverse=True)[:10]
        summary['units_found'] = list(summary['units_found'])
        
        return summary
    
    def suggest_missing_specifications(self, machine_data: Dict[str, Any], machine_type: str) -> List[str]:
        """Suggest specifications that might be missing from a machine"""
        
        if machine_type not in self.machine_type_specs:
            return []
        
        existing_fields = set(machine_data.keys())
        expected_specs = self.machine_type_specs[machine_type]
        
        missing = []
        for spec in expected_specs:
            if spec.field_name not in existing_fields and spec.frequency > 0.5:
                missing.append(spec.display_name)
        
        return missing[:5]  # Limit to top 5 suggestions


def analyze_existing_machines():
    """Utility function to analyze existing machines in database"""
    # This would connect to database and analyze existing machine data
    # Implementation depends on database access setup
    pass


if __name__ == "__main__":
    # Example usage
    discovery = SpecificationDiscovery()
    
    # Sample machine data for testing
    sample_data = [
        {
            'raw_data': {
                'name': 'Laser Engraver Pro',
                'power': '40W',
                'working_area': '300x200mm',
                'connectivity': 'WiFi, USB',
                'auto_focus': 'yes'
            }
        },
        {
            'raw_data': {
                'name': 'CNC Router X1',
                'spindle_power': '2.2kW',
                'cutting_area': '600x400x80mm',
                'connectivity': 'USB',
                'auto_leveling': 'no'
            }
        }
    ]
    
    patterns = discovery.analyze_dataset(sample_data, 'laser-cutter')
    summary = discovery.get_specification_summary('laser-cutter')
    
    print("Discovered patterns:")
    for name, pattern in patterns.items():
        print(f"  {name}: {pattern.field_type} ({pattern.frequency} occurrences)")