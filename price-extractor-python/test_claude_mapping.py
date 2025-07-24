#!/usr/bin/env python3
"""
Test Claude-based Data Mapping
Tests that Claude can properly map Scrapfly data to our database schema
"""

import asyncio
import sys
import json
from colorama import init, Fore, Style

# Add the current directory to Python path
sys.path.append('.')

from services.claude_mapper import ClaudeMapper
from config import ANTHROPIC_API_KEY

# Initialize colorama for colored output
init()

def test_claude_mapping():
    """Test Claude mapping with sample Scrapfly data"""
    
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"CLAUDE DATA MAPPING TEST")
    print(f"{'='*60}{Style.RESET_ALL}\n")
    
    # Check if Claude is configured
    if not ANTHROPIC_API_KEY:
        print(f"{Fore.RED}❌ ANTHROPIC_API_KEY not found in environment{Style.RESET_ALL}")
        return False
    
    # Sample Scrapfly data (similar to what we'd get from xTool)
    sample_scrapfly_data = {
        "name": "xTool S1 40W Enclosed Diode Laser Cutter",
        "brand": "xTool",
        "description": "The xTool S1 is a 40W enclosed diode laser cutter with advanced features for precise cutting and engraving.",
        "offers": [
            {
                "price": 2499,
                "currency": "USD",
                "availability": "in_stock"
            }
        ],
        "specifications": [
            {"name": "Laser Power", "value": "40W"},
            {"name": "Work Area", "value": "498 x 319 mm"},
            {"name": "Max Speed", "value": "600 mm/s"},
            {"name": "Laser Type", "value": "Diode"},
            {"name": "Enclosure", "value": "Yes"}
        ],
        "images": [
            {"url": "https://example.com/xtool-s1-1.jpg"},
            {"url": "https://example.com/xtool-s1-2.jpg"}
        ],
        "categories": ["Laser Cutters", "Enclosed Lasers"],
        "_extraction_quality": {"score": 0.85},
        "_credits_used": 47
    }
    
    try:
        # Initialize Claude mapper
        print(f"{Fore.YELLOW}🔄 Initializing Claude mapper...{Style.RESET_ALL}")
        mapper = ClaudeMapper()
        
        # Test the mapping
        print(f"{Fore.YELLOW}🔄 Sending data to Claude for mapping...{Style.RESET_ALL}")
        mapped_data, warnings = mapper.map_to_database_schema(sample_scrapfly_data)
        
        # Display results
        print(f"\n{Fore.GREEN}✅ Claude mapping successful!{Style.RESET_ALL}\n")
        
        print(f"{Fore.CYAN}📊 MAPPED DATA:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{'-'*40}{Style.RESET_ALL}")
        
        # Display key fields
        key_fields = ['name', 'price', 'brand', 'machine_category', 'laser_power', 'work_area']
        for field in key_fields:
            value = mapped_data.get(field, 'Not found')
            print(f"{field.replace('_', ' ').title()}: {Fore.GREEN}{value}{Style.RESET_ALL}")
        
        print(f"\n{Fore.CYAN}⚠️  WARNINGS:{Style.RESET_ALL}")
        if warnings:
            for warning in warnings:
                print(f"  • {Fore.YELLOW}{warning}{Style.RESET_ALL}")
        else:
            print(f"  {Fore.GREEN}None{Style.RESET_ALL}")
        
        print(f"\n{Fore.CYAN}📋 FULL MAPPED DATA:{Style.RESET_ALL}")
        print(f"{Fore.WHITE}{'-'*40}{Style.RESET_ALL}")
        print(json.dumps(mapped_data, indent=2))
        
        # Success summary
        print(f"\n{Fore.GREEN}✅ TEST PASSED: Claude successfully mapped Scrapfly data to database schema{Style.RESET_ALL}")
        return True
        
    except Exception as e:
        print(f"\n{Fore.RED}❌ ERROR: {str(e)}{Style.RESET_ALL}")
        return False

if __name__ == "__main__":
    success = test_claude_mapping()
    sys.exit(0 if success else 1)