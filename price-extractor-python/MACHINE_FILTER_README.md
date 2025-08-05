# Machine Filter Service

## Overview

The Machine Filter Service uses GPT-4o mini to intelligently filter discovered product URLs, automatically identifying and skipping non-machine products like materials, accessories, and services. This reduces manual review time and ensures only actual manufacturing equipment (laser cutters, 3D printers, CNC machines) are processed.

## How It Works

### 1. URL Discovery
When discovering products from a manufacturer site, the system first:
- Checks sitemaps for efficiency
- Applies URL pattern-based filtering (skips obvious non-products)
- Classifies URLs by confidence level

### 2. Machine Filtering (NEW)
Before duplicate detection, the system now:
- Sends batches of URLs to GPT-4o mini
- Classifies each URL as:
  - **MACHINE**: Actual manufacturing equipment → Process normally
  - **MATERIAL**: Sheets, filaments, resins → Auto-skip
  - **ACCESSORY**: Attachments, upgrades, tools → Auto-skip
  - **PACKAGE**: Bundles with machine + extras → Needs review
  - **SERVICE**: Warranties, courses, support → Auto-skip
  - **UNKNOWN**: Cannot determine → Needs review

### 3. Results
URLs classified as materials, accessories, or services are automatically moved to the skip list, reducing the number of products that need manual review.

## Usage

### Via Admin UI
1. Go to Manufacturer Sites in admin panel
2. Click "Discover URLs" on a manufacturer
3. The system will automatically apply machine filtering
4. Results show both URL pattern classification and ML classification badges

### Via API
```python
# Direct API call
POST http://localhost:8000/api/v1/smart/smart-discover-urls
{
    "manufacturer_id": "123",
    "base_url": "https://omtechlaser.com",
    "manufacturer_name": "OMTech Laser",
    "max_pages": 5,
    "apply_smart_filtering": true  # Enables GPT-4o mini filtering
}
```

### Testing
```bash
cd price-extractor-python
python test_machine_filter.py
```

## Classification Examples

### Machines (Process Normally)
- `/products/polar-350-50w-desktop-laser-engraver` → MACHINE (laser_cutter)
- `/products/ender-3-v3-se-3d-printer` → MACHINE (3d_printer)
- `/products/cnc-3018-pro-router-kit` → MACHINE (cnc_machine)

### Materials (Auto-Skip)
- `/products/birch-plywood-sheets-12x20` → MATERIAL
- `/products/pla-filament-1kg-spool` → MATERIAL
- `/products/acrylic-sheets-for-laser` → MATERIAL

### Accessories (Auto-Skip)
- `/products/rotary-attachment-for-laser` → ACCESSORY
- `/products/air-assist-pump-kit` → ACCESSORY
- `/products/honeycomb-work-bed` → ACCESSORY

### Packages (Needs Review)
- `/products/polar-350-ultimate-bundle` → PACKAGE
- `/products/ender-3-starter-kit` → PACKAGE

### Services (Auto-Skip)
- `/products/1-year-extended-warranty` → SERVICE
- `/products/laser-cutting-course` → SERVICE

## Configuration

The service uses GPT-4o mini for cost efficiency:
- Model: `gpt-4o-mini`
- Batch size: 20 URLs per API call
- Cost: ~$0.0001 per URL classification

## Benefits

1. **Reduced Manual Review**: Automatically filters out 30-50% of non-machine products
2. **Improved Data Quality**: Only actual machines enter the database
3. **Time Savings**: Less time spent reviewing materials and accessories
4. **Cost Effective**: GPT-4o mini provides accurate classification at minimal cost

## Implementation Details

### Files Modified
- `services/machine_filter_service.py` - Core filtering logic
- `api/smart_discovery.py` - Integration with discovery pipeline
- `components/admin/url-discovery-modal.tsx` - UI updates

### Database Impact
No database changes required. The filtering happens before URLs are saved to the discovered_urls table.

## Future Enhancements

1. **Learning System**: Track classification accuracy and improve prompts
2. **Custom Rules**: Per-manufacturer filtering rules
3. **Subcategory Detection**: Identify laser type, printer technology, etc.
4. **Confidence Thresholds**: Adjustable confidence levels for auto-skip