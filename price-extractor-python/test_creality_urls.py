#!/usr/bin/env python3
"""
Test URL discovery specifically for Creality Falcon to analyze what types of URLs are found
"""
import asyncio
import json
from services.url_discovery import URLDiscoveryService
from loguru import logger
import sys

async def test_creality_discovery():
    """Test URL discovery for Creality Falcon site"""
    
    discovery = URLDiscoveryService()
    base_url = "https://www.crealityfalcon.com/"
    
    logger.info(f"Testing URL discovery for: {base_url}")
    
    try:
        # Discover URLs using both sitemap and crawling if needed
        result = await discovery.discover_urls(base_url, max_pages=3)
        
        print("\n" + "="*80)
        print("CREALITY URL DISCOVERY RESULTS")
        print("="*80)
        print(f"Domain: {result['domain']}")
        print(f"Discovery Method: {result['discovery_method']}")
        print(f"Pages Crawled: {result['pages_crawled']}")
        print(f"Credits Used: {result['credits_used']}")
        print(f"Total URLs Found: {result['total_urls_found']}")
        print(f"Estimated Credits per Product: {result['estimated_credits_per_product']}")
        
        # Show categorized URLs
        categorized = result.get('categorized', {})
        if categorized:
            print(f"\n📁 URLs by Category:")
            for category, urls in categorized.items():
                print(f"  {category}: {len(urls)} URLs")
                for url in urls[:3]:  # Show first 3 examples
                    print(f"    - {url}")
                if len(urls) > 3:
                    print(f"    ... and {len(urls) - 3} more")
        
        # Show classified URLs if available
        classified = result.get('classified', {})
        if classified:
            print(f"\n🔍 Smart Classification Results:")
            summary = result.get('classification_summary', {})
            print(f"  Auto-skip: {summary.get('auto_skip', 0)}")
            print(f"  High confidence: {summary.get('high_confidence', 0)}")
            print(f"  Needs review: {summary.get('needs_review', 0)}")
            print(f"  Likely duplicates: {summary.get('duplicate_likely', 0)}")
            
            # Show examples of each type
            for status, urls in classified.items():
                if urls and status in ['auto_skip', 'high_confidence', 'needs_review']:
                    print(f"\n  {status.upper()} Examples:")
                    for url_data in urls[:5]:
                        print(f"    - {url_data['url']}")
                        print(f"      Reason: {url_data['reason']}")
                        if url_data.get('category'):
                            print(f"      Category: {url_data['category']}")
        
        # Show all URLs for manual analysis
        print(f"\n📋 All Discovered URLs ({len(result['urls'])} total):")
        for i, url in enumerate(result['urls'][:20], 1):
            print(f"  {i:2d}. {url}")
        
        if len(result['urls']) > 20:
            print(f"    ... and {len(result['urls']) - 20} more URLs")
        
        # Save full results for inspection
        output_file = 'creality_discovery_results.json'
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Full results saved to: {output_file}")
        
        # Analysis for filtering bundles/materials
        print(f"\n🔬 URL Analysis for Bundle/Material Detection:")
        bundle_indicators = ['bundle', 'kit', 'combo', 'package', 'set']
        material_indicators = ['material', 'wood', 'acrylic', 'leather', 'cardboard', 'paper', 'fabric']
        accessory_indicators = ['accessory', 'accessorie', 'attachment', 'upgrade', 'spare', 'part', 'tool']
        
        bundles = []
        materials = []
        accessories = []
        machines = []
        
        for url in result['urls']:
            url_lower = url.lower()
            is_bundle = any(indicator in url_lower for indicator in bundle_indicators)
            is_material = any(indicator in url_lower for indicator in material_indicators)
            is_accessory = any(indicator in url_lower for indicator in accessory_indicators)
            is_machine = not (is_bundle or is_material or is_accessory)
            
            if is_bundle:
                bundles.append(url)
            elif is_material:
                materials.append(url)
            elif is_accessory:
                accessories.append(url)
            else:
                machines.append(url)
        
        print(f"  Potential machines: {len(machines)}")
        print(f"  Potential bundles: {len(bundles)}")
        print(f"  Potential materials: {len(materials)}")
        print(f"  Potential accessories: {len(accessories)}")
        
        if bundles:
            print(f"\n  Bundle Examples:")
            for bundle in bundles[:5]:
                print(f"    - {bundle}")
        
        if materials:
            print(f"\n  Material Examples:")
            for material in materials[:5]:
                print(f"    - {material}")
        
        if accessories:
            print(f"\n  Accessory Examples:")
            for accessory in accessories[:5]:
                print(f"    - {accessory}")
        
        # Save analysis
        analysis = {
            'machines': machines,
            'bundles': bundles,
            'materials': materials,
            'accessories': accessories,
            'total_urls': len(result['urls']),
            'filter_suggestions': {
                'bundle_indicators': bundle_indicators,
                'material_indicators': material_indicators,
                'accessory_indicators': accessory_indicators
            }
        }
        
        analysis_file = 'creality_url_analysis.json'
        with open(analysis_file, 'w') as f:
            json.dump(analysis, f, indent=2)
        print(f"\n💾 URL analysis saved to: {analysis_file}")
        
    except Exception as e:
        logger.error(f"Discovery failed: {str(e)}", exc_info=True)

if __name__ == "__main__":
    print("🔍 Testing Creality URL Discovery")
    print("This will analyze what types of URLs are found and categorize them")
    print("=" * 80)
    
    asyncio.run(test_creality_discovery())