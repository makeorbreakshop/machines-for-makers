# Claude AI Data Mapper

## Overview

The Claude Mapper service uses AI to intelligently map Scrapfly's extracted product data to our database schema, replacing complex hardcoded normalization logic with Claude's natural language understanding.

## Benefits

1. **Intelligent Field Mapping**: Claude understands context and can map fields even when names don't match exactly
2. **Unit Conversion**: Automatically handles different unit formats (e.g., "$1,299" → 1299.0)
3. **Feature Detection**: Infers Yes/No fields from descriptions (e.g., "fully enclosed design" → Enclosure: "Yes")
4. **Multi-format Support**: Handles various data structures from different websites
5. **Self-documenting**: Claude provides warnings for unmapped fields or data issues

## How It Works

```python
# Initialize the mapper
mapper = ClaudeMapper()

# Send Scrapfly data to Claude
mapped_data, warnings = mapper.map_to_database_schema(scrapfly_data)

# Result: Clean data ready for database
{
    "Machine Name": "xTool S1 40W Laser Cutter",
    "Company": "xTool",
    "Price": 3799.0,
    "Machine Category": "Laser Cutter",
    "Laser Category": "Diode",
    "Working Area": "498x319mm",
    "Enclosure": "Yes",
    "Camera": "Yes",
    ...
}
```

## Database Schema Mapping

Claude maps to these key database fields:

### Core Fields
- `Machine Name` - Product name/model
- `Company` - Brand/manufacturer
- `Price` - Numeric USD value
- `Machine Category` - Type classification
- `Description` - Product description
- `product_link` - Source URL

### Specifications
- `Laser Type A/B` - Laser types (for dual laser)
- `Laser Power A/B` - Power ratings
- `Working Area` - Work dimensions
- `Max Speed (mm/min)` - Operating speed
- `Machine Size` - Physical dimensions
- `Software` - Compatible software

### Features (Yes/No)
- `Focus` - Auto/Manual/Auto-Manual
- `Enclosure` - Enclosed design
- `Wifi` - Wireless connectivity
- `Camera` - Built-in camera
- `Passthrough` - Pass-through capability
- `Air Assist` - Air assist system
- `Rotary` - Rotary attachment

## Mapping Rules

Claude follows these rules when mapping:

1. **Price Extraction**: Removes currency symbols, converts to float
2. **Unit Preservation**: Keeps original units (mm, inches)
3. **Boolean Normalization**: Converts to exact "Yes"/"No" strings
4. **Category Detection**: Infers from product type/name/description
5. **Multi-value Handling**: Takes lowest price from ranges
6. **Missing Data**: Leaves fields empty rather than guessing

## Example Transformations

```
Input: {"price": "$1,299.00"} 
Output: {"Price": 1299.0}

Input: {"features": ["WiFi enabled", "Camera included"]}
Output: {"Wifi": "Yes", "Camera": "Yes"}

Input: {"work_area": "400mm x 400mm"}
Output: {"Working Area": "400x400mm"}

Input: {"laser": {"type": "diode", "power": "10W"}}
Output: {"Laser Type A": "Diode", "Laser Power A": "10W"}
```

## Cost Considerations

- Uses Claude Haiku model (cheapest option)
- Typical cost: ~$0.001 per product mapped
- Temperature set to 0 for consistent results
- Max tokens limited to prevent runaway costs

## Error Handling

The mapper handles errors gracefully:
- Returns empty mapping on Claude API errors
- Provides warnings for unmapped fields
- Falls back to URL parsing for product names
- Logs all operations for debugging

## Future Enhancements

1. **Specification Extraction**: Use Claude to parse complex spec tables
2. **Multi-language Support**: Map products in different languages
3. **Image Analysis**: Use Claude's vision to extract specs from images
4. **Confidence Scoring**: Have Claude rate its mapping confidence
5. **Learning Mode**: Store successful mappings for pattern recognition