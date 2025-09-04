import re

def _variant_matches_machine(variant_text, machine_name):
    """Check if variant description matches the machine name."""
    if not variant_text or not machine_name:
        return False
    
    variant_lower = variant_text.lower()
    machine_lower = machine_name.lower()
    
    print(f"Comparing:")
    print(f"  Machine: {machine_name} -> {machine_lower}")
    print(f"  Variant: {variant_text} -> {variant_lower}")
    
    # Extract key attributes from machine name
    if 'b4' in machine_lower:
        if 'b4' not in variant_lower:
            print(f"  ❌ B4 model mismatch")
            return False
    elif 'b6' in machine_lower:
        if 'b6' not in variant_lower:
            print(f"  ❌ B6 model mismatch")
            return False
    
    # Check wattage
    machine_wattage = re.search(r'(\d+)w', machine_lower)
    variant_wattage = re.search(r'(\d+)w', variant_lower)
    
    print(f"  Machine wattage: {machine_wattage.group(1) if machine_wattage else 'None'}")
    print(f"  Variant wattage: {variant_wattage.group(1) if variant_wattage else 'None'}")
    
    if machine_wattage and variant_wattage:
        wattage_match = machine_wattage.group(1) == variant_wattage.group(1)
        print(f"  Wattage match: {wattage_match}")
        return wattage_match
    
    # Check for MOPA
    if 'mopa' in machine_lower:
        mopa_match = 'mopa' in variant_lower
        print(f"  MOPA match: {mopa_match}")
        return mopa_match
    
    # Basic text similarity check
    common_words = set(machine_lower.split()) & set(variant_lower.split())
    similarity_match = len(common_words) >= 2
    print(f"  Common words: {common_words} (count: {len(common_words)}, match: {similarity_match})")
    return similarity_match

# Test data from the log output
test_cases = [
    {
        'machine': 'ComMarker B6 MOPA 30W',
        'variants': [
            'ComMarker B6 JPT MOPA Fiber Laser Engraver - B6 MOPA 20W / B6 MOPA Basic Bundle',
            'ComMarker B6 JPT MOPA Fiber Laser Engraver - B6 MOPA 30W / B6 MOPA Basic Bundle',
            'ComMarker B6 JPT MOPA Fiber Laser Engraver - B6 MOPA 60W / B6 MOPA Basic Bundle'
        ]
    }
]

for test_case in test_cases:
    machine = test_case['machine']
    print(f"\n{'='*60}")
    print(f"Testing machine: {machine}")
    print(f"{'='*60}")
    
    for variant in test_case['variants']:
        print(f"\n--- Testing variant ---")
        match = _variant_matches_machine(variant, machine)
        print(f"RESULT: {'✅ MATCH' if match else '❌ NO MATCH'}")
        print()