"""
Test script for Claude-based data mapper
Demonstrates how Claude intelligently maps Scrapfly data to our database schema
"""
import asyncio
import json
from services.claude_mapper import ClaudeMapper

# Example Scrapfly extracted data (similar to what we get from their AI)
sample_scrapfly_data = {
    "name": "xTool S1 40W Enclosed Diode Laser Cutter",
    "description": "The xTool S1 is a powerful 40W diode laser engraver and cutter featuring an enclosed design for safety, automatic focus adjustment, and advanced material processing capabilities.",
    "brand": {
        "name": "xTool",
        "type": "Organization"
    },
    "offers": [
        {
            "price": "$3,799.00",
            "priceValue": "3799",
            "priceCurrency": "USD",
            "availability": "InStock",
            "seller": "xTool Official Store"
        }
    ],
    "images": [
        {"url": "https://example.com/xtool-s1-main.jpg", "alt": "xTool S1 Main View"},
        {"url": "https://example.com/xtool-s1-side.jpg", "alt": "xTool S1 Side View"}
    ],
    "specifications": [
        {"name": "Laser Power", "value": "40W"},
        {"name": "Working Area", "value": "498mm x 319mm"},
        {"name": "Max Speed", "value": "600mm/s"},
        {"name": "Focus", "value": "Automatic"},
        {"name": "Connectivity", "value": "USB, WiFi, Ethernet"},
        {"name": "Software", "value": "xTool Creative Space, LightBurn"},
        {"name": "Safety Features", "value": "Fully Enclosed, Emergency Stop"},
        {"name": "Frame Material", "value": "Aluminum Alloy"}
    ],
    "categories": ["Laser Cutters", "Diode Lasers", "Enclosed Laser Cutters"],
    "features": [
        "Automatic Focus Adjustment",
        "Built-in Camera for positioning",
        "Air Assist System",
        "Rotary Module Compatible",
        "Pass-through doors for larger materials"
    ]
}

async def test_claude_mapper():
    """Test the Claude mapper with sample data"""
    print("Testing Claude-based intelligent field mapper")
    print("=" * 60)
    
    try:
        # Initialize the mapper
        mapper = ClaudeMapper()
        print("✓ Claude mapper initialized")
        
        # Add source URL to the data
        enhanced_data = {
            **sample_scrapfly_data,
            "source_url": "https://www.xtool.com/products/xtool-s1-laser-cutter"
        }
        
        print("\nOriginal Scrapfly data:")
        print(json.dumps(sample_scrapfly_data, indent=2)[:500] + "...")
        
        # Map the data using Claude
        print("\nSending to Claude for intelligent mapping...")
        mapped_data, warnings = mapper.map_to_database_schema(enhanced_data)
        
        print(f"\n✓ Claude successfully mapped {len(mapped_data)} fields")
        
        print("\nMapped database fields:")
        print("-" * 40)
        for field, value in mapped_data.items():
            print(f"{field}: {value}")
        
        if warnings:
            print("\nWarnings:")
            for warning in warnings:
                print(f"⚠️  {warning}")
        
        # Show some key transformations
        print("\nKey transformations by Claude:")
        print(f"- Price: '{sample_scrapfly_data['offers'][0]['price']}' → {mapped_data.get('Price')}")
        print(f"- Brand: {sample_scrapfly_data['brand']} → '{mapped_data.get('Company')}'")
        print(f"- Work Area: Found in specs → '{mapped_data.get('Working Area')}'")
        print(f"- Features: Detected enclosed design → Enclosure: '{mapped_data.get('Enclosure')}'")
        print(f"- Features: Detected camera → Camera: '{mapped_data.get('Camera')}'")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_claude_mapper())