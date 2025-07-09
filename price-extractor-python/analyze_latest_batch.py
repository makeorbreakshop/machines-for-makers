#!/usr/bin/env python3
"""
Analyze Latest Batch - Simplified version for immediate analysis
"""

import re
from pathlib import Path
from datetime import datetime

def analyze_batch_log_and_corrections():
    """Analyze the latest batch log and identify issues based on manual corrections."""
    
    # Read the latest batch log
    log_path = Path("logs/batch_20250709_091236_c64cbce7.log")
    
    print("=== BATCH ANALYSIS: c64cbce7 ===")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Based on the manual corrections you made:
    corrections = [
        {
            "machine": "Glowforge Plus",
            "extracted": 3995.00,
            "corrected": 4499.00,
            "url": "https://shop.glowforge.com/collections/printers/products/glowforge-plus",
            "issue": "Price decrease of 11.2% - likely extracting promotional/old price"
        },
        {
            "machine": "Glowforge Plus HD", 
            "extracted": 4995.00,
            "corrected": 4999.00,
            "url": "https://shop.glowforge.com/collections/printers/products/glowforge-plus-hd",
            "issue": "Minor price difference - possibly wrong variant or old cached price"
        },
        {
            "machine": "Gweike G6 Split",
            "extracted": 3999.00,
            "corrected": 3899.00,
            "url": "https://www.gweikecloud.com/products/g6-split-30w-60w-100w-fiber-laser-marking-engraving-machine-1",
            "issue": "Price increase of 2.6% - extracting higher tier variant price"
        }
    ]
    
    print("MANUAL CORRECTIONS MADE:")
    for corr in corrections:
        diff = ((corr["corrected"] - corr["extracted"]) / corr["extracted"]) * 100
        print(f"\n{corr['machine']}:")
        print(f"  Extracted: ${corr['extracted']:.2f}")
        print(f"  Corrected: ${corr['corrected']:.2f} ({diff:+.1f}%)")
        print(f"  Issue: {corr['issue']}")
    
    print("\n" + "="*60)
    print("PATTERN ANALYSIS:")
    print("="*60)
    
    # Pattern 1: Glowforge pricing issues
    print("\n1. GLOWFORGE DOMAIN ISSUES:")
    print("   - Both Glowforge machines had incorrect prices")
    print("   - System extracting lower prices than actual")
    print("   - Possible causes:")
    print("     a) Extracting promotional/sale prices")
    print("     b) Old prices from cached content")
    print("     c) Wrong CSS selector picking up crossed-out prices")
    print("   - Current extraction method: Claude AI with learned selectors")
    
    # Pattern 2: Minor price variations
    print("\n2. PRICE VARIATION PATTERNS:")
    print("   - Glowforge Plus HD: Only $4 difference (0.1%)")
    print("   - Gweike G6 Split: $100 difference (2.6%)")
    print("   - These small variations suggest:")
    print("     a) Currency conversion issues")
    print("     b) Tax/shipping included in extracted price")
    print("     c) Regional pricing differences")
    
    # Pattern 3: Extraction method analysis
    print("\n3. EXTRACTION METHOD PERFORMANCE:")
    print("   - All 3 corrections were from 'Claude AI' extraction method")
    print("   - This suggests the AI might be:")
    print("     a) Learning incorrect selectors")
    print("     b) Not handling multi-price scenarios well")
    print("     c) Picking the first price it sees")
    
    print("\n" + "="*60)
    print("RECOMMENDED FIXES:")
    print("="*60)
    
    print("\n1. GLOWFORGE SPECIFIC FIX:")
    print("   - Add site-specific rules for shop.glowforge.com")
    print("   - Ensure we extract the main price, not promotional prices")
    print("   - Look for patterns like:")
    print("     • Main price in specific containers")
    print("     • Avoid crossed-out/original prices")
    print("     • Check for 'data-price' attributes")
    
    print("\n2. IMPROVE CLAUDE AI EXTRACTION:")
    print("   - When multiple prices exist, instruct AI to:")
    print("     • Identify the current/active price")
    print("     • Ignore promotional or crossed-out prices")
    print("     • Consider the product name when selecting variants")
    
    print("\n3. VALIDATION IMPROVEMENTS:")
    print("   - For Glowforge: Set expected price ranges")
    print("   - Flag any extraction below known minimums")
    print("   - Add domain-specific validation rules")
    
    print("\n4. SYSTEMATIC IMPROVEMENTS:")
    print("   - Create a 'price confidence' score")
    print("   - If multiple prices found, flag for review")
    print("   - Store extraction context (nearby text, CSS classes)")
    
    # Check the log for these specific machines
    if log_path.exists():
        print("\n" + "="*60)
        print("LOG ANALYSIS FOR CORRECTED MACHINES:")
        print("="*60)
        
        with open(log_path, 'r') as f:
            content = f.read()
        
        for corr in corrections:
            machine = corr["machine"]
            # Find the extraction section for this machine
            pattern = f"Machine: {machine}.*?=== PRICE EXTRACTION COMPLETE ==="
            match = re.search(pattern, content, re.DOTALL)
            
            if match:
                section = match.group(0)
                print(f"\n{machine} Extraction Details:")
                
                # Extract key information
                if "Claude AI" in section:
                    selector_match = re.search(r"learned: ([^)]+)\)", section)
                    if selector_match:
                        print(f"  - Learned selector: {selector_match.group(1)}")
                
                # Check what methods were tried
                methods_tried = re.findall(r"METHOD (\d+).*?(?:SUCCESS|FAILED)", section)
                print(f"  - Methods attempted: {', '.join(set(methods_tried))}")
                
                # Look for price candidates
                price_matches = re.findall(r"Price candidates: \[(.*?)\]", section, re.DOTALL)
                if price_matches:
                    prices = price_matches[0].strip()
                    if len(prices) > 100:
                        print(f"  - Multiple price candidates found (truncated)")
                    else:
                        print(f"  - Price candidates: {prices}")
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("1. Update site_specific_extractors.py with Glowforge rules")
    print("2. Enhance Claude AI prompts for multi-price scenarios")
    print("3. Add price range validation for known brands")
    print("4. Re-test these 3 machines after implementing fixes")
    print("5. Monitor tomorrow's batch for similar patterns")
    
    # Generate a fix template
    print("\n" + "="*60)
    print("SUGGESTED CODE FIXES:")
    print("="*60)
    
    print("\n# Add to SITE_RULES in site_specific_extractors.py:")
    print("""
"shop.glowforge.com": {
    "rules": {
        "use_base_price": True,
        "multi_price_strategy": "highest_visible",
        "price_patterns": [
            {"selector": ".price--main", "priority": 1},
            {"selector": "[data-price]:not(.price--compare)", "priority": 2}
        ],
        "avoid_selectors": [".price--compare", ".was-price", "strike"],
        "validation": {
            "glowforge-plus": {"min": 4000, "max": 5000},
            "glowforge-plus-hd": {"min": 4500, "max": 5500}
        }
    }
}
""")

if __name__ == "__main__":
    analyze_batch_log_and_corrections()