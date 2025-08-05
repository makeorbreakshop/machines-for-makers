"""
Test the machine filter service
"""
import asyncio
from services.machine_filter_service import MachineFilterService
from loguru import logger

async def test_machine_filter():
    """Test the machine filter with sample URLs"""
    
    # Sample URLs that include machines, materials, and accessories
    test_urls = [
        # Actual machines
        "https://omtechlaser.com/products/polar-350-50w-desktop-laser-engraver",
        "https://www.creality.com/products/ender-3-v3-se-3d-printer",
        "https://xtool.com/products/xtool-s1-40w-diode-laser-cutter",
        
        # Materials
        "https://omtechlaser.com/products/birch-plywood-sheets-12x20",
        "https://www.creality.com/products/pla-filament-1kg-spool",
        "https://xtool.com/products/basswood-sheets-for-laser-cutting",
        
        # Accessories
        "https://omtechlaser.com/products/rotary-attachment-for-laser",
        "https://www.creality.com/products/glass-bed-upgrade-kit",
        "https://xtool.com/products/air-assist-pump-kit",
        
        # Packages/Bundles
        "https://omtechlaser.com/products/polar-350-ultimate-bundle",
        "https://www.creality.com/products/ender-3-starter-package",
        
        # Services
        "https://omtechlaser.com/products/1-year-extended-warranty",
        "https://xtool.com/products/laser-cutting-course"
    ]
    
    logger.info(f"Testing machine filter with {len(test_urls)} URLs")
    
    # Initialize the service
    filter_service = MachineFilterService()
    
    # Classify the URLs
    results = filter_service.classify_urls_batch(test_urls, "Test Manufacturer")
    
    # Display results
    print("\n=== Machine Filter Test Results ===\n")
    
    machines = []
    materials = []
    accessories = []
    packages = []
    services = []
    unknown = []
    
    for url, info in results.items():
        classification = info['classification']
        confidence = info['confidence']
        reason = info['reason']
        
        print(f"\nURL: {url}")
        print(f"Classification: {classification} (confidence: {confidence:.2f})")
        print(f"Reason: {reason}")
        print(f"Should Skip: {info['should_skip']}")
        print(f"Needs Review: {info['needs_review']}")
        
        if classification == 'MACHINE':
            machines.append(url)
            print(f"Machine Type: {info['machine_type']}")
        elif classification == 'MATERIAL':
            materials.append(url)
        elif classification == 'ACCESSORY':
            accessories.append(url)
        elif classification == 'PACKAGE':
            packages.append(url)
        elif classification == 'SERVICE':
            services.append(url)
        else:
            unknown.append(url)
    
    print("\n=== Summary ===")
    print(f"Machines: {len(machines)}")
    print(f"Materials: {len(materials)} (will be auto-skipped)")
    print(f"Accessories: {len(accessories)} (will be auto-skipped)")
    print(f"Packages: {len(packages)} (need review)")
    print(f"Services: {len(services)} (will be auto-skipped)")
    print(f"Unknown: {len(unknown)} (need review)")
    
    # Show which URLs would be auto-skipped
    skip_urls = filter_service.get_skip_urls(results)
    print(f"\n=== URLs to Auto-Skip ({len(skip_urls)}) ===")
    for url in skip_urls:
        print(f"- {url}")
    
    # Show which URLs are actual machines
    machine_urls = filter_service.get_machine_urls_only(results)
    print(f"\n=== Actual Machines ({len(machine_urls)}) ===")
    for url in machine_urls:
        print(f"- {url}")
    
    # Show which URLs need review
    review_urls = filter_service.get_review_urls(results)
    print(f"\n=== URLs Needing Review ({len(review_urls)}) ===")
    for url in review_urls:
        print(f"- {url}")

if __name__ == "__main__":
    asyncio.run(test_machine_filter())