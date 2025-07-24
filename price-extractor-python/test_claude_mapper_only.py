#!/usr/bin/env python3
"""
Test Claude Mapper Only (No Scrapfly Credits)
Tests the Claude mapper with sample data to verify the output format
"""
import asyncio
import json
from services.claude_mapper import ClaudeMapper

# Sample Scrapfly-like data (based on what we saw in the database)
sample_scrapfly_data = {
    "name": "xTool P2S 55W Desktop CO2 Laser Cutter",
    "brand": "xTool",
    "offers": [{"price": 3999, "currency": "USD"}],
    "specifications": [
        {"name": "Laser Type", "value": "55W CO2 Laser"},
        {"name": "Working Area", "value": "23.6\" × 12\" (600 mm × 305 mm)"},
        {"name": "Max. Working Speed", "value": "23.6 ips (600 mm/s)"}
    ],
    "images": [
        "http://www.xtool.com/cdn/shop/files/mk-baidituyingyong_us_pc_p-whitebackground_1200x1200.webp"
    ],
    "description": "Discover the power of the xTool P2 laser cutter...",
    "source_url": "https://www.xtool.com/products/xtool-p2-55w-co2-laser-cutter"
}

async def test_claude_mapper():
    """Test the Claude mapper with sample data"""
    print("Testing Claude Mapper with Sample Data")
    print("=" * 50)
    
    try:
        # Initialize Claude mapper
        mapper = ClaudeMapper()
        
        # Test mapping
        print("Input data:")
        print(json.dumps(sample_scrapfly_data, indent=2))
        print("\n" + "=" * 50)
        
        mapped_data, warnings = mapper.map_to_database_schema(sample_scrapfly_data)
        
        print("Claude Mapped Output:")
        print(f"Type: {type(mapped_data)}")
        print(f"Keys: {list(mapped_data.keys()) if isinstance(mapped_data, dict) else 'Not a dict'}")
        print(json.dumps(mapped_data, indent=2, default=str))
        
        print(f"\nWarnings: {warnings}")
        
        # Check specific fields we expect
        print("\n" + "=" * 50)
        print("Field Analysis:")
        print(f"name field: {mapped_data.get('name', 'NOT FOUND')}")
        print(f"Machine Name field: {mapped_data.get('Machine Name', 'NOT FOUND')}")
        print(f"price field: {mapped_data.get('price', 'NOT FOUND')}")
        print(f"Price field: {mapped_data.get('Price', 'NOT FOUND')}")
        
        return mapped_data, warnings
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, []

if __name__ == "__main__":
    result = asyncio.run(test_claude_mapper())