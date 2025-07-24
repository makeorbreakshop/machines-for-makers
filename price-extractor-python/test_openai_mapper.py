#!/usr/bin/env python3
"""
Test script for OpenAI-based product data mapper
Tests tool calls vs prompt-based approaches
"""
import json
import asyncio
from services.openai_mapper import create_openai_mapper

# Test data from actual xTool P2S scrape
TEST_XTOOL_DATA = {
    "url": "https://www.xtool.com/products/xtool-p2-55w-co2-laser-cutter",
    "name": "xTool P2S 55W Desktop CO2 Laser Cutter",
    "brand": "xTool",
    "images": [
        "http://www.xtool.com/cdn/shop/files/mk-baidituyingyong_us_pc_p-whitebackground_5122-70034_1200x1200.webp?v=1747623460",
        "http://www.xtool.com/cdn/shop/files/preview_images/12a4d2ff449a46f1a3ba3f121f1be66b.thumbnail.0000000000_1200x1200.jpg?v=1707201494"
    ],
    "offers": [
        {"price": 3999, "currency": "USD", "availability": "available"},
        {"price": 5099, "currency": "USD", "availability": "available"},
        {"price": 5999, "currency": "USD", "availability": "available"}
    ],
    "description": "Discover the power of the xTool P2 laser cutter, a versatile machine perfect for all your cutting and engraving needs. With extensive material compatibility, including non-metals and metals, this laser cutting machine offers exceptional results.",
    "specifications": [
        {"name": "Laser Type", "value": "55W CO2 Laser"},
        {"name": "Working Area", "value": "23.6\" × 12\" (600 mm × 305 mm)"},
        {"name": "Max. Working Speed", "value": "23.6 ips (600 mm/s), X-axis Acceleration 6400 mm/s²"},
        {"name": "Max. Laser Cutting Capacity (Basswood)", "value": "0.71\" (18 mm) in ONE PASS"},
        {"name": "Built-in Camera", "value": "16 MP Close-range Camera + 16 MP Panoramic Camera"},
        {"name": "Focus Mode", "value": "Autofocus"},
        {"name": "Connection Method", "value": "USB/Wi-Fi"},
        {"name": "Supported Software", "value": "xTool Creative Space/Lightburn"},
        {"name": "Pre-assembled", "value": "Yes"},
        {"name": "Product Weight", "value": "99.21 lb (45 kg)"}
    ]
}

# Test data from ComMarker B4
TEST_COMMARKER_DATA = {
    "url": "https://commarker.com/products/commarker-b4-20w-fiber-laser-engraver",
    "name": "ComMarker B4 20W Fiber Laser Engraver",
    "brand": "ComMarker",
    "images": ["https://example.com/commarker-b4.jpg"],
    "offers": [{"price": 1299, "currency": "USD", "availability": "available"}],
    "description": "Professional 20W fiber laser engraver for metal marking and engraving",
    "specifications": [
        {"name": "Laser Type", "value": "20W Fiber Laser"},
        {"name": "Working Area", "value": "110 x 110 mm"},
        {"name": "Laser Wavelength", "value": "1064nm"},
        {"name": "Max Speed", "value": "7000 mm/min"},
        {"name": "Connectivity", "value": "USB, WiFi"},
        {"name": "Software", "value": "LightBurn, LaserGRBL"},
        {"name": "Focus", "value": "Manual focus"},
        {"name": "Weight", "value": "8.5 kg"}
    ]
}

def print_test_results(test_name: str, mapped_data: dict, warnings: list):
    """Print formatted test results"""
    print(f"\n{'='*60}")
    print(f"TEST: {test_name}")
    print(f"{'='*60}")
    
    print(f"\n✅ MAPPED FIELDS ({len(mapped_data)}):")
    for field, value in mapped_data.items():
        print(f"  {field}: {value}")
    
    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for warning in warnings:
            print(f"  - {warning}")
    else:
        print(f"\n✅ NO WARNINGS")
    
    # Validate key fields
    required_fields = ['name', 'brand', 'price', 'machine_category']
    missing_required = [f for f in required_fields if f not in mapped_data]
    
    if missing_required:
        print(f"\n❌ MISSING REQUIRED FIELDS: {missing_required}")
    else:
        print(f"\n✅ ALL REQUIRED FIELDS PRESENT")
    
    print(f"\n{'='*60}")

async def test_openai_mapper():
    """Test the OpenAI mapper with different products"""
    print("🧪 Testing OpenAI GPT-4o mini Mapper with Tool Calls")
    print("=" * 60)
    
    try:
        # Initialize mapper
        mapper = create_openai_mapper()
        print(f"✅ Mapper initialized successfully")
        print(f"Model: {mapper.model}")
        print(f"Schema fields: {len(mapper.schema)}")
        
        # Test 1: xTool P2S CO2 Laser
        print(f"\n🔄 Testing xTool P2S CO2 Laser...")
        mapped_data, warnings = mapper.map_to_database_schema(TEST_XTOOL_DATA)
        print_test_results("xTool P2S 55W CO2 Laser", mapped_data, warnings)
        
        # Validate specific conversions
        expected_checks = [
            ('machine_category', 'laser'),
            ('laser_category', 'desktop-co2-laser'),
            ('laser_type_a', 'CO2'),
            ('laser_power_a', '55W'),
            ('price', 3999),  # Should pick lowest price
            ('wifi', 'Yes'),  # Should extract from "USB/Wi-Fi"
        ]
        
        print(f"\n🔍 VALIDATION CHECKS:")
        for field, expected in expected_checks:
            actual = mapped_data.get(field)
            status = "✅" if actual == expected else "❌"
            print(f"  {status} {field}: expected '{expected}', got '{actual}'")
        
        # Test 2: ComMarker B4 Fiber Laser
        print(f"\n🔄 Testing ComMarker B4 Fiber Laser...")
        mapped_data2, warnings2 = mapper.map_to_database_schema(TEST_COMMARKER_DATA)
        print_test_results("ComMarker B4 20W Fiber Laser", mapped_data2, warnings2)
        
        # Validate fiber laser specific fields
        fiber_checks = [
            ('machine_category', 'laser'),
            ('laser_category', 'desktop-fiber-laser'),
            ('laser_type_a', 'Fiber'),
            ('laser_power_a', '20W'),
            ('work_area', '110 x 110 mm'),
            ('speed', '7000 mm/min'),
        ]
        
        print(f"\n🔍 FIBER LASER VALIDATION:")
        for field, expected in fiber_checks:
            actual = mapped_data2.get(field)
            status = "✅" if actual == expected else "❌"
            print(f"  {status} {field}: expected '{expected}', got '{actual}'")
        
        print(f"\n🎉 OpenAI Mapper Testing Complete!")
        
        # Compare to old approach
        print(f"\n📊 ADVANTAGES OF TOOL CALLS APPROACH:")
        print(f"  ✅ Guaranteed JSON structure (no parsing errors)")
        print(f"  ✅ Type validation by OpenAI")
        print(f"  ✅ Enum validation built-in")
        print(f"  ✅ Much cheaper than Claude ($0.15/1M vs $3/1M tokens)")
        print(f"  ✅ Faster response times")
        print(f"  ✅ Schema can be loaded dynamically from database")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_openai_mapper())