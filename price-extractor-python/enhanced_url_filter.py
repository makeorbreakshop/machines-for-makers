#!/usr/bin/env python3
"""
Enhanced URL filtering logic for Creality and other manufacturers
This improves on the existing SmartURLClassifier to better identify actual machines
"""
import re
from typing import List, Dict, Set
from urllib.parse import urlparse
from dataclasses import dataclass

@dataclass
class MachineClassification:
    """Enhanced classification result"""
    is_machine: bool
    confidence: float
    category: str  # 'machine', 'bundle', 'material', 'accessory', 'collection', 'other'
    reason: str
    machine_type: str  # 'laser_cutter', 'laser_engraver', '3d_printer', 'cnc_machine', 'unknown'

class EnhancedMachineFilter:
    """Enhanced filtering specifically for identifying actual machines vs bundles/materials"""
    
    def __init__(self):
        # Specific machine model patterns (high confidence)
        self.machine_model_patterns = [
            # Creality Falcon models
            r'falcon2?-(?:pro-)?(?:\d+w?)(?:-enclosed)?(?:-laser)?(?:-engraver)?(?:-and)?(?:-cutter)?$',
            r'falcon-a1(?:-pro)?(?:-\d+w)?(?:-dual)?(?:-laser)?(?:-engraver)?$',
            r'cr-laser-falcon(?:-\d+w)?(?:-machine)?$',
            
            # xTool models
            r'xtool-[a-z]\d+(?:-\d+w)?$',
            r'd1(?:-pro)?$',
            r'm1(?:-ultra)?$',
            r's1(?:-\d+w)?$',
            
            # Ortur models
            r'ortur-[\w-]+(?:-\d+w)?$',
            r'laser-master-\d+(?:-pro)?$',
            
            # Atomstack models
            r'atomstack-[a-z]\d+(?:-pro)?(?:-\d+w)?$',
            r'[a-z]\d+(?:-pro)?(?:-\d+w)?-laser-engraver$',
            
            # Generic patterns
            r'[\w-]*(?:laser|cutter|engraver|printer|cnc)[\w-]*-\d+w?$',
            r'[\w-]*-(?:laser|cutter|engraver|printer|cnc)-[\w-]*$',
        ]
        
        # Patterns that definitely indicate NOT a standalone machine
        self.non_machine_patterns = [
            # Bundles and kits (high confidence)
            r'(?:kit|bundle|package|set|combo)(?:s)?(?:-|$)',
            r'(?:all-in-one|complete|basic|extension|protection|crafting)(?:-|$)',
            r'(?:upgrade|enhanced|improved)(?:-|$)',
            
            # Materials (high confidence)
            r'(?:plywood|basswood|acrylic|leather|paper|wood|material)(?:s)?(?:-|$)',
            r'(?:sheets?|board|craft|diy)(?:-|$)',
            r'(?:scratch|colored|opaque|glossy|frosted)(?:-|$)',
            
            # Accessories and parts (high confidence)
            r'(?:accessory|accessorie|attachment|spare|part|tool)(?:s)?(?:-|$)',
            r'(?:lens|filter|riser|workbench|honeycomb|purifier|smoke)(?:s)?(?:-|$)',
            r'(?:air-assist|safety|glass|rotary|replacement|cover|enclosure)(?:-|$)',
            r'(?:protection|protective|fence|strip)(?:-|$)',
            
            # Collections and categories
            r'/collections?/',
            r'/categories?/',
            r'/blogs?/',
            
            # Specific non-machine items
            r'(?:tag|necklace|wallet|card|holder|opener|gift|cup)(?:s)?(?:-|$)',
            r'(?:passport|luggage|jewelry|makeup|storage|bag)(?:s)?(?:-|$)',
        ]
        
        # Machine type detection
        self.machine_type_patterns = {
            'laser_cutter': [
                r'laser.*cut', r'cut.*laser', r'co2.*laser', r'fiber.*laser'
            ],
            'laser_engraver': [
                r'laser.*engrav', r'engrav.*laser', r'marking.*laser', r'etching.*laser'
            ],
            '3d_printer': [
                r'3d.*print', r'print.*3d', r'fdm', r'sla', r'resin.*print'
            ],
            'cnc_machine': [
                r'cnc', r'mill', r'router', r'machining', r'spindle'
            ]
        }
        
        # Power rating patterns (good indicator of actual machines)
        self.power_patterns = [
            r'\b\d+w\b',  # 40w, 22w, etc.
            r'\b\d+\s*watt',  # 40 watt
            r'\b\d+kw\b',  # 1kw
        ]
        
        # Model number patterns
        self.model_patterns = [
            r'\b[A-Z]+\d+[A-Z]*\b',  # K40, CO2-100W, etc.
            r'\b\d+[A-Z]+\d*\b',  # 40W, 22W, etc.
            r'\b[a-z]\d+(?:-pro)?\b',  # s1, d1-pro, etc.
        ]

    def classify_url(self, url: str) -> MachineClassification:
        """
        Classify a URL to determine if it's an actual machine
        
        Args:
            url: The URL to classify
            
        Returns:
            MachineClassification with detailed analysis
        """
        url_lower = url.lower()
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        # Initialize scoring
        machine_score = 0.0
        reasons = []
        category = 'other'
        machine_type = 'unknown'
        
        # Check for obvious non-machines first
        for pattern in self.non_machine_patterns:
            if re.search(pattern, url_lower):
                if 'collection' in pattern or 'blog' in pattern:
                    category = 'collection'
                elif any(word in pattern for word in ['kit', 'bundle', 'package', 'set', 'combo']):
                    category = 'bundle'
                elif any(word in pattern for word in ['plywood', 'basswood', 'acrylic', 'material']):
                    category = 'material'
                elif any(word in pattern for word in ['accessory', 'lens', 'filter', 'riser']):
                    category = 'accessory'
                
                return MachineClassification(
                    is_machine=False,
                    confidence=0.9,
                    category=category,
                    reason=f'Matches non-machine pattern: {pattern}',
                    machine_type='unknown'
                )
        
        # Check for specific machine model patterns (high confidence)
        for pattern in self.machine_model_patterns:
            if re.search(pattern, url_lower):
                machine_score += 0.8
                reasons.append(f'Matches machine model pattern: {pattern}')
                break
        
        # Check for power ratings (good indicator)
        for pattern in self.power_patterns:
            if re.search(pattern, url_lower):
                machine_score += 0.3
                reasons.append('Contains power rating')
                break
        
        # Check for model numbers
        for pattern in self.model_patterns:
            if re.search(pattern, url):  # Case sensitive for model numbers
                machine_score += 0.2
                reasons.append('Contains model number pattern')
                break
        
        # Detect machine type
        for mtype, patterns in self.machine_type_patterns.items():
            for pattern in patterns:
                if re.search(pattern, url_lower):
                    machine_type = mtype
                    machine_score += 0.1
                    break
            if machine_type != 'unknown':
                break
        
        # URL structure analysis
        path_parts = [p for p in path.split('/') if p]
        if len(path_parts) >= 2 and path_parts[-2] == 'products':
            machine_score += 0.1
            reasons.append('In products directory')
        
        # Check for machine-related words
        machine_words = ['laser', 'cutter', 'engraver', 'printer', 'cnc', 'machine']
        word_count = sum(1 for word in machine_words if word in url_lower)
        if word_count >= 2:
            machine_score += 0.2
            reasons.append(f'Contains {word_count} machine-related words')
        
        # Penalties for bundle/kit indicators
        bundle_words = ['kit', 'bundle', 'package', 'set', 'combo', 'complete', 'all-in-one']
        if any(word in url_lower for word in bundle_words):
            machine_score -= 0.4
            reasons.append('Contains bundle/kit indicators')
            category = 'bundle'
        
        # Final classification
        if machine_score >= 0.7:
            is_machine = True
            category = 'machine'
            confidence = min(0.95, machine_score)
        elif machine_score >= 0.4:
            is_machine = True  # Needs review but likely a machine
            category = 'machine'
            confidence = machine_score
        else:
            is_machine = False
            confidence = 1.0 - machine_score
            if category == 'other':
                category = 'unknown'
        
        reason = '; '.join(reasons) if reasons else 'No specific indicators found'
        
        return MachineClassification(
            is_machine=is_machine,
            confidence=confidence,
            category=category,
            reason=reason,
            machine_type=machine_type
        )
    
    def filter_machine_urls(self, urls: List[str], confidence_threshold: float = 0.6) -> Dict[str, List[str]]:
        """
        Filter a list of URLs to separate actual machines from everything else
        
        Args:
            urls: List of URLs to filter
            confidence_threshold: Minimum confidence to consider a URL a machine
            
        Returns:
            Dict with categorized URLs
        """
        results = {
            'machines': [],
            'bundles': [],
            'materials': [],
            'accessories': [],
            'collections': [],
            'unknown': []
        }
        
        classifications = []
        
        for url in urls:
            classification = self.classify_url(url)
            classifications.append((url, classification))
            
            if classification.is_machine and classification.confidence >= confidence_threshold:
                results['machines'].append(url)
            elif classification.category == 'bundle':
                results['bundles'].append(url)
            elif classification.category == 'material':
                results['materials'].append(url)
            elif classification.category == 'accessory':
                results['accessories'].append(url)
            elif classification.category == 'collection':
                results['collections'].append(url)
            else:
                results['unknown'].append(url)
        
        return results, classifications

def test_enhanced_filter():
    """Test the enhanced filter with Creality URLs"""
    import json
    
    # Load the URLs
    with open('creality_url_analysis.json', 'r') as f:
        data = json.load(f)
    
    all_urls = []
    all_urls.extend(data['machines'])
    all_urls.extend(data['bundles'])
    all_urls.extend(data['materials'])
    all_urls.extend(data['accessories'])
    
    filter_engine = EnhancedMachineFilter()
    results, classifications = filter_engine.filter_machine_urls(all_urls)
    
    print("ENHANCED FILTERING RESULTS")
    print("="*80)
    
    for category, urls in results.items():
        if urls:
            print(f"\n{category.upper()} ({len(urls)}):")
            for i, url in enumerate(urls[:5], 1):
                print(f"  {i}. {url}")
            if len(urls) > 5:
                print(f"     ... and {len(urls) - 5} more")
    
    # Show some classification details
    print(f"\nCLASSIFICATION EXAMPLES:")
    for url, classification in classifications[:10]:
        print(f"\n{url}")
        print(f"  Machine: {classification.is_machine} (confidence: {classification.confidence:.2f})")
        print(f"  Category: {classification.category}")
        print(f"  Type: {classification.machine_type}")
        print(f"  Reason: {classification.reason}")
    
    # Summary
    total = len(all_urls)
    machine_count = len(results['machines'])
    print(f"\nSUMMARY:")
    print(f"  Total URLs: {total}")
    print(f"  Identified as machines: {machine_count} ({machine_count/total*100:.1f}%)")
    print(f"  Should skip: {total - machine_count} ({(total-machine_count)/total*100:.1f}%)")
    print(f"  Estimated credit savings: {(total - machine_count) * 20}")

if __name__ == "__main__":
    test_enhanced_filter()