#!/usr/bin/env python3
"""
Analyze the Creality URLs to identify actual laser engraver/cutter machines
vs bundles, materials, and accessories
"""
import json
import re
from urllib.parse import urlparse

def analyze_creality_urls():
    """Analyze the discovered Creality URLs and categorize them properly"""
    
    # Load the analysis file
    with open('creality_url_analysis.json', 'r') as f:
        data = json.load(f)
    
    # All URLs to analyze
    all_urls = []
    all_urls.extend(data['machines'])
    all_urls.extend(data['bundles'])
    all_urls.extend(data['materials'])
    all_urls.extend(data['accessories'])
    
    print(f"Analyzing {len(all_urls)} total URLs from Creality")
    print("="*80)
    
    # Define more specific patterns for actual machines
    machine_models = [
        # Falcon series models
        r'falcon2?-(?:pro-)?(?:\d+w?)', r'falcon-a1', r'cr-laser-falcon',
        # Specific model patterns
        r'falcon2-40w', r'falcon2-22w', r'falcon-a1-pro-20w', r'falcon-a1-10w',
        r'falcon2-pro-22w', r'falcon2-pro-40w', r'cr-falcon-10w', r'cr-falcon-5w'
    ]
    
    # Patterns that indicate NOT a standalone machine
    non_machine_patterns = [
        # Collections/categories
        r'/collections/',
        # Blogs/tutorials
        r'/blogs/',
        # Materials
        r'plywood', r'basswood', r'acrylic', r'leather', r'paper', r'wood',
        # Bundles and kits
        r'kit', r'bundle', r'package', r'set', r'combo', r'all-in-one',
        # Accessories and parts
        r'accessory', r'protection', r'lens', r'filter', r'riser', r'workbench',
        r'honeycomb', r'purifier', r'smoke', r'air-assist', r'safety-glass',
        r'rotary', r'upgrade', r'replacement', r'spare', r'cover', r'enclosure',
        # Materials and supplies
        r'material', r'scratch-paper', r'tag', r'wallet', r'necklace', r'card',
        r'bottle-opener', r'gift-card', r'passport-holder'
    ]
    
    # Categorize URLs
    actual_machines = []
    machine_bundles = []
    materials = []
    accessories_parts = []
    collections_blogs = []
    unsure = []
    
    for url in all_urls:
        url_lower = url.lower()
        path = urlparse(url).path.lower()
        
        # Check if it's a collection or blog
        if '/collections/' in path or '/blogs/' in path:
            collections_blogs.append(url)
            continue
        
        # Check if it matches actual machine model patterns
        is_machine_model = False
        for pattern in machine_models:
            if re.search(pattern, url_lower):
                # But make sure it's not a bundle/kit version
                if not any(re.search(non_pattern, url_lower) for non_pattern in 
                          ['kit', 'bundle', 'package', 'set', 'combo', 'all-in-one', 'basic', 'complete', 'protection', 'extension']):
                    is_machine_model = True
                    break
        
        if is_machine_model:
            actual_machines.append(url)
            continue
        
        # Check for non-machine patterns
        is_material = any(re.search(pattern, url_lower) for pattern in 
                         ['plywood', 'basswood', 'acrylic', 'leather', 'paper', 'wood', 'material', 'scratch'])
        is_accessory = any(re.search(pattern, url_lower) for pattern in 
                          ['accessory', 'protection', 'lens', 'filter', 'riser', 'workbench', 'honeycomb', 
                           'purifier', 'smoke', 'air-assist', 'safety-glass', 'rotary', 'replacement', 
                           'spare', 'cover', 'enclosure'])
        is_bundle = any(re.search(pattern, url_lower) for pattern in 
                       ['kit', 'bundle', 'package', 'set', 'combo', 'all-in-one', 'basic', 'complete', 
                        'protection', 'extension', 'upgrade'])
        
        if is_material:
            materials.append(url)
        elif is_accessory:
            accessories_parts.append(url)
        elif is_bundle:
            machine_bundles.append(url)
        else:
            unsure.append(url)
    
    # Print analysis results
    print(f"🔧 ACTUAL LASER MACHINES ({len(actual_machines)}):")
    for i, url in enumerate(actual_machines, 1):
        print(f"  {i:2d}. {url}")
    
    print(f"\n📦 MACHINE BUNDLES/KITS ({len(machine_bundles)}):")
    for i, url in enumerate(machine_bundles[:10], 1):  # Show first 10
        print(f"  {i:2d}. {url}")
    if len(machine_bundles) > 10:
        print(f"      ... and {len(machine_bundles) - 10} more")
    
    print(f"\n🧱 MATERIALS ({len(materials)}):")
    for i, url in enumerate(materials[:10], 1):  # Show first 10
        print(f"  {i:2d}. {url}")
    if len(materials) > 10:
        print(f"      ... and {len(materials) - 10} more")
    
    print(f"\n🔩 ACCESSORIES/PARTS ({len(accessories_parts)}):")
    for i, url in enumerate(accessories_parts[:10], 1):  # Show first 10
        print(f"  {i:2d}. {url}")
    if len(accessories_parts) > 10:
        print(f"      ... and {len(accessories_parts) - 10} more")
    
    print(f"\n📁 COLLECTIONS/BLOGS ({len(collections_blogs)}):")
    for i, url in enumerate(collections_blogs, 1):
        print(f"  {i:2d}. {url}")
    
    print(f"\n❓ UNSURE ({len(unsure)}):")
    for i, url in enumerate(unsure, 1):
        print(f"  {i:2d}. {url}")
    
    # Summary
    print(f"\n📊 SUMMARY:")
    print(f"   Total URLs analyzed: {len(all_urls)}")
    print(f"   Actual machines: {len(actual_machines)} ({len(actual_machines)/len(all_urls)*100:.1f}%)")
    print(f"   Machine bundles: {len(machine_bundles)} ({len(machine_bundles)/len(all_urls)*100:.1f}%)")
    print(f"   Materials: {len(materials)} ({len(materials)/len(all_urls)*100:.1f}%)")
    print(f"   Accessories/Parts: {len(accessories_parts)} ({len(accessories_parts)/len(all_urls)*100:.1f}%)")
    print(f"   Collections/Blogs: {len(collections_blogs)} ({len(collections_blogs)/len(all_urls)*100:.1f}%)")
    print(f"   Unsure: {len(unsure)} ({len(unsure)/len(all_urls)*100:.1f}%)")
    
    # Save the refined analysis
    refined_analysis = {
        'actual_machines': actual_machines,
        'machine_bundles': machine_bundles,
        'materials': materials,
        'accessories_parts': accessories_parts,
        'collections_blogs': collections_blogs,
        'unsure': unsure,
        'summary': {
            'total_urls': len(all_urls),
            'machine_count': len(actual_machines),
            'machine_percentage': len(actual_machines)/len(all_urls)*100,
            'should_process': len(actual_machines),
            'should_skip': len(all_urls) - len(actual_machines)
        }
    }
    
    with open('creality_refined_analysis.json', 'w') as f:
        json.dump(refined_analysis, f, indent=2)
    
    print(f"\n💾 Refined analysis saved to: creality_refined_analysis.json")
    
    # Generate filtering recommendations
    print(f"\n🎯 FILTERING RECOMMENDATIONS:")
    print(f"   Process only: actual_machines ({len(actual_machines)} URLs)")
    print(f"   Skip: everything else ({len(all_urls) - len(actual_machines)} URLs)")
    print(f"   Credit savings: ~{(len(all_urls) - len(actual_machines)) * 20} credits")

if __name__ == "__main__":
    analyze_creality_urls()