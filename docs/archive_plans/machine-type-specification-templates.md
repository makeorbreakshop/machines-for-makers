# Machine Type Specification Templates

## Overview
Based on comprehensive research of 15+ manufacturers across 5 machine types (Laser, 3D Printer, CNC, UV Printer, DTF Printer), this document provides specification mapping templates for the manufacturer discovery system.

## Universal Specifications (All Machine Types)

### Core Product Information
```javascript
const universalSpecs = {
  'machine_name': {
    variations: ['Product Name', 'Model', 'Name', 'Title'],
    required: true,
    type: 'text'
  },
  'price': {
    variations: ['Price', 'MSRP', 'Cost', 'Starting at', 'From'],
    required: true,
    type: 'currency',
    format: /[\$£€]?[\d,]+\.?\d*/
  },
  'brand': {
    variations: ['Brand', 'Manufacturer', 'Company', 'Make'],
    required: true,
    type: 'brand_reference'
  },
  'dimensions': {
    variations: ['Dimensions', 'Size', 'Machine Size', 'Physical Size'],
    required: false,
    type: 'dimensions',
    format: /\d+\s*[x×]\s*\d+\s*[x×]?\s*\d*\s*(mm|cm|in|inches)/
  },
  'weight': {
    variations: ['Weight', 'Net Weight', 'Shipping Weight'],
    required: false,
    type: 'weight',
    format: /\d+\.?\d*\s*(kg|lbs|pounds)/
  }
};
```

## Machine Type: Laser Cutters/Engravers

### Specifications Template
```javascript
const laserSpecs = {
  // Power Specifications
  'laser_power_a': {
    variations: ['Laser Power', 'Power', 'Output Power', 'Watts', 'W'],
    required: true,
    type: 'power',
    format: /\d+\.?\d*\s*[Ww](?:atts?)?/,
    normalize: (value) => normalizeToWatts(value) + 'W'
  },
  'laser_type_a': {
    variations: ['Laser Type', 'Technology', 'Laser Technology'],
    required: true,
    type: 'enum',
    options: ['Diode', 'CO2', 'CO2-RF', 'CO2-Glass', 'Fiber', 'MOPA', 'Infrared', 'UV']
  },
  
  // Work Area
  'work_area': {
    variations: ['Work Area', 'Cutting Area', 'Engraving Area', 'Bed Size'],
    required: true,
    type: 'dimensions',
    format: /\d+\s*[x×]\s*\d+\s*(mm|cm|in|inches)/,
    normalize: (value) => normalizeToDimensions(value)
  },
  
  // Performance
  'speed': {
    variations: ['Speed', 'Max Speed', 'Cutting Speed', 'Engraving Speed'],
    required: false,
    type: 'speed',
    format: /\d+\.?\d*\s*(mm\/min|mm\/s|ipm|in\/min)/,
    normalize: (value) => normalizeToSpeed(value) + ' mm/min'
  },
  
  // Features (Boolean)
  'enclosure': {
    variations: ['Enclosure', 'Enclosed', 'Safety Enclosure', 'Cover'],
    required: false,
    type: 'boolean',
    normalize: (value) => normalizeToBooleanText(value)
  },
  'wifi': {
    variations: ['WiFi', 'Wireless', 'Wi-Fi', 'Network'],
    required: false,
    type: 'boolean'
  },
  'camera': {
    variations: ['Camera', 'Vision System', 'Monitoring Camera'],
    required: false,
    type: 'boolean'
  },
  'passthrough': {
    variations: ['Pass-through', 'Passthrough', 'Pass Through', 'Unlimited Length'],
    required: false,
    type: 'boolean'
  }
};
```

## Machine Type: 3D Printers

### Specifications Template
```javascript
const printer3DSpecs = {
  // Build Volume
  'build_volume': {
    variations: ['Build Volume', 'Print Size', 'Build Size', 'Print Area', 'Max Build Dimensions'],
    required: true,
    type: 'dimensions',
    format: /\d+\s*[x×]\s*\d+\s*[x×]\s*\d+\s*(mm|cm|in|inches)/,
    frequency: '100%', // Appears on all manufacturer sites
    normalize: (value) => normalizeTo3DDimensions(value)
  },
  
  // Print Technology
  'print_technology': {
    variations: ['Technology', 'Print Technology', 'Type'],
    required: true,
    type: 'enum',
    options: ['FDM', 'FFF', 'SLA', 'DLP', 'MSLA', 'LCD', 'Resin']
  },
  
  // Speed
  'print_speed': {
    variations: ['Print Speed', 'Max Speed', 'Speed'],
    required: false,
    type: 'speed',
    format: /\d+\.?\d*\s*(mm\/s|mm\/min)/,
    frequency: '90%',
    normalize: (value) => normalizeTo3DSpeed(value) + ' mm/s'
  },
  
  // Temperature Capabilities
  'hotend_temperature': {
    variations: ['Hotend Temperature', 'Nozzle Temperature', 'Max Temperature', 'Temperature'],
    required: false,
    type: 'temperature',
    format: /\d+\.?\d*\s*[°]?C/,
    frequency: '85%'
  },
  'heated_bed': {
    variations: ['Heated Bed', 'Bed Temperature', 'Build Plate Temperature'],
    required: false,
    type: 'temperature',
    format: /\d+\.?\d*\s*[°]?C/,
    frequency: '80%'
  },
  
  // Features
  'auto_bed_leveling': {
    variations: ['Auto Bed Leveling', 'ABL', 'Auto-leveling', 'Automatic Leveling', 'Auto Leveling'],
    required: false,
    type: 'boolean',
    frequency: '75%'
  },
  'enclosed': {
    variations: ['Enclosed', 'Enclosure', 'Chamber'],
    required: false,
    type: 'boolean',
    frequency: '60%'
  },
  'multi_material': {
    variations: ['Multi-material', 'AMS', 'Multi-color', 'Dual Extruder', 'Multi Extruder'],
    required: false,
    type: 'boolean',
    frequency: '40%'
  },
  
  // Layer Resolution
  'layer_height': {
    variations: ['Layer Height', 'Resolution', 'Layer Resolution', 'Min Layer Height'],
    required: false,
    type: 'precision',
    format: /\d+\.?\d*\s*(mm|μm|microns?)/,
    frequency: '70%'
  }
};
```

## Machine Type: CNC Machines

### Specifications Template
```javascript
const cncSpecs = {
  // Work Area
  'cutting_area': {
    variations: ['Cutting Area', 'Work Area', 'Travel', 'Envelope', 'Working Envelope'],
    required: true,
    type: 'dimensions',
    format: /\d+\.?\d*\s*[x×"']\s*\d+\.?\d*\s*[x×"']?\s*\d*\.?\d*\s*(mm|cm|in|inches|'|")/,
    frequency: '100%',
    normalize: (value) => normalizeToCNCDimensions(value)
  },
  
  // Motor System
  'motor_type': {
    variations: ['Motors', 'Motor Type', 'Drive System', 'Stepper Motors'],
    required: false,
    type: 'enum',
    options: ['NEMA 23', 'NEMA 34', 'Servo', 'Stepper'],
    frequency: '85%'
  },
  
  // Drive System
  'drive_system': {
    variations: ['Drive System', 'Motion System', 'Drive Type'],
    required: false,
    type: 'enum',
    options: ['Belt Drive', 'Ballscrew', 'Lead Screw', 'Rack and Pinion'],
    frequency: '80%'
  },
  
  // Frame Construction
  'frame_material': {
    variations: ['Frame', 'Construction', 'Frame Material', 'Build'],
    required: false,
    type: 'enum',
    options: ['Aluminum Extrusion', 'Steel', 'Cast Iron', 'Hybrid'],
    frequency: '70%'
  },
  
  // Spindle
  'spindle_mount': {
    variations: ['Spindle Mount', 'Router Mount', 'Spindle Size'],
    required: false,
    type: 'measurement',
    format: /\d+\s*mm/,
    common_values: ['65mm', '80mm'],
    frequency: '75%'
  },
  
  // Precision
  'repeatability': {
    variations: ['Repeatability', 'Accuracy', 'Precision'],
    required: false,
    type: 'precision',
    format: /[±]?\d+\.?\d*\s*(mm|in|mil|μm)/,
    frequency: '60%'
  },
  
  // Speed
  'cutting_speed': {
    variations: ['Cutting Speed', 'Feed Rate', 'Max Speed'],
    required: false,
    type: 'speed',
    format: /\d+\.?\d*\s*(ipm|mm\/min|in\/min)/,
    frequency: '65%'
  }
};
```

## Machine Type: UV Printers

### Specifications Template
```javascript
const uvPrinterSpecs = {
  // Print Size
  'print_size': {
    variations: ['Print Size', 'Maximum Print Size', 'Media Size', 'Bed Size'],
    required: true,
    type: 'dimensions',
    format: /\d+\.?\d*\s*[x×"']\s*\d+\.?\d*\s*(mm|cm|in|inches|'|")/,
    frequency: '100%'
  },
  
  // Resolution
  'resolution': {
    variations: ['Resolution', 'DPI', 'Print Resolution', 'Maximum Resolution'],
    required: true,
    type: 'resolution',
    format: /\d+\s*[x×]?\s*\d*\s*dpi/,
    frequency: '100%',
    common_values: ['1200x1200 dpi', '1800x1800 dpi']
  },
  
  // Ink System
  'ink_colors': {
    variations: ['Ink Colors', 'Color System', 'Ink Configuration', 'Color Channels'],
    required: true,
    type: 'ink_system',
    format: /\d+[\-\s]color|CMYK|\+White|\+Clear/,
    frequency: '100%',
    common_values: ['6-color', '8-color', '10-color', 'CMYK+White', 'CMYK+White+Clear']
  },
  
  // Substrate Thickness
  'max_substrate_thickness': {
    variations: ['Max Substrate Thickness', 'Material Thickness', 'Media Thickness'],
    required: false,
    type: 'thickness',
    format: /\d+\.?\d*\s*(mm|in|inches)/,
    frequency: '85%'
  },
  
  // UV Curing
  'uv_curing': {
    variations: ['UV Curing', 'UV LED', 'Curing System', 'UV System'],
    required: false,
    type: 'enum',
    options: ['LED UV', 'Mercury UV', 'Dual UV', 'Instant Cure'],
    frequency: '80%'
  },
  
  // White Ink System
  'white_ink': {
    variations: ['White Ink', 'White Ink System', 'White Ink Circulation'],
    required: false,
    type: 'boolean_with_details',
    details: ['Circulation System', 'Agitation', 'Dual White'],
    frequency: '75%'
  }
};
```

## Machine Type: DTF Printers

### Specifications Template
```javascript
const dtfPrinterSpecs = {
  // Print Width
  'print_width': {
    variations: ['Print Width', 'Maximum Width', 'Roll Width', 'Media Width'],
    required: true,
    type: 'width',
    format: /\d+\.?\d*\s*(mm|cm|in|inches|")/,
    frequency: '100%',
    common_values: ['13"', '16"', '24"', '42"', '64"']
  },
  
  // Resolution
  'resolution': {
    variations: ['Resolution', 'DPI', 'Print Resolution'],
    required: true,
    type: 'resolution',
    format: /\d+\s*[x×]?\s*\d*\s*dpi/,
    frequency: '100%',
    common_values: ['1440x1440 dpi', '5760x1440 dpi']
  },
  
  // Ink System
  'ink_system': {
    variations: ['Ink System', 'Ink Configuration', 'Color System'],
    required: true,
    type: 'ink_system',
    format: /CMYK|White|Double White|\d+[\-\s]color/,
    frequency: '100%',
    common_values: ['CMYK+White', 'CMYK+Double White', '6-color with White']
  },
  
  // Production Speed
  'production_speed': {
    variations: ['Production Speed', 'Print Speed', 'Productivity'],
    required: false,
    type: 'production_rate',
    format: /\d+\.?\d*\s*(sqft\/hr|m²\/hr|pieces\/hr)/,
    frequency: '70%'
  },
  
  // Roll-to-Roll
  'roll_to_roll': {
    variations: ['Roll to Roll', 'Roll-to-Roll', 'Continuous Feed'],
    required: false,
    type: 'boolean',
    frequency: '60%'
  },
  
  // Heat Press Compatibility
  'heat_press_temp': {
    variations: ['Heat Press Temperature', 'Transfer Temperature', 'Application Temperature'],
    required: false,
    type: 'temperature',
    format: /\d+\.?\d*\s*[°]?[CF]/,
    frequency: '50%'
  },
  
  // Powder System
  'powder_application': {
    variations: ['Powder Application', 'TPU Powder', 'Adhesive Powder'],
    required: false,
    type: 'enum',
    options: ['Manual', 'Automatic', 'Semi-Automatic', 'Integrated'],
    frequency: '40%'
  }
};
```

## Normalization Functions

### Universal Normalizers
```javascript
const normalizers = {
  // Boolean conversion for database compatibility
  normalizeToBooleanText: (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    const str = String(value).toLowerCase();
    const yesValues = ['yes', 'true', '1', 'on', 'enabled', 'available', 'included'];
    return yesValues.includes(str) ? 'Yes' : 'No';
  },
  
  // Power normalization
  normalizeToWatts: (value) => {
    const str = String(value).toLowerCase();
    const match = str.match(/([\d.]+)\s*(mw|kw|w|watts?)/);
    if (!match) return value;
    
    let watts = parseFloat(match[1]);
    const unit = match[2];
    
    if (unit.startsWith('kw')) watts *= 1000;
    if (unit.startsWith('mw')) watts /= 1000;
    
    return Math.round(watts);
  },
  
  // Dimension normalization
  normalizeToDimensions: (value) => {
    // Convert various formats to "X x Y mm" format
    const str = String(value);
    const match = str.match(/([\d.]+)\s*[x×]\s*([\d.]+)(?:\s*[x×]\s*([\d.]+))?\s*(mm|cm|in|inches|")/);
    
    if (!match) return value;
    
    let [, x, y, z, unit] = match;
    
    // Convert to mm if needed
    if (unit === 'cm') {
      x = parseFloat(x) * 10;
      y = parseFloat(y) * 10;
      if (z) z = parseFloat(z) * 10;
    } else if (unit === 'in' || unit === 'inches' || unit === '"') {
      x = parseFloat(x) * 25.4;
      y = parseFloat(y) * 25.4;
      if (z) z = parseFloat(z) * 25.4;
    }
    
    return z ? `${Math.round(x)} x ${Math.round(y)} x ${Math.round(z)} mm` : `${Math.round(x)} x ${Math.round(y)} mm`;
  },
  
  // Speed normalization
  normalizeToSpeed: (value) => {
    const str = String(value).toLowerCase();
    const match = str.match(/([\d.]+)\s*(mm\/s|mm\/min|ipm|in\/min)/);
    
    if (!match) return value;
    
    let speed = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert to mm/min
    if (unit === 'mm/s') speed *= 60;
    if (unit === 'ipm' || unit === 'in/min') speed *= 25.4;
    
    return Math.round(speed);
  }
};
```

## Category Auto-Assignment Rules

```javascript
const categoryRules = {
  'laser': {
    keywords: ['laser', 'engraver', 'cutter', 'engraving', 'cutting'],
    subcategories: {
      'desktop-diode-laser': ['diode', 'blue laser', '450nm', 'desktop'],
      'desktop-co2-laser': ['co2', 'glass tube', 'desktop', '40w', '50w'],
      'desktop-fiber-laser': ['fiber', 'metal marking', 'mopa', 'desktop'],
      'high-end-co2-laser': ['co2', 'industrial', 'large format', '100w', '150w'],
      'high-end-fiber': ['fiber', 'industrial', 'production', 'high power'],
      'open-diode-laser': ['open frame', 'diy', 'kit']
    }
  },
  
  '3d-printer': {
    keywords: ['3d printer', '3d print', 'printer', 'fdm', 'sla', 'resin'],
    subcategories: {
      'fdm': ['fdm', 'fff', 'filament', 'fused'],
      'resin': ['resin', 'sla', 'msla', 'dlp', 'lcd']
    }
  },
  
  'cnc': {
    keywords: ['cnc', 'mill', 'router', 'machining', 'cutting'],
    subcategories: {
      'desktop-cnc': ['desktop', 'hobby', 'benchtop'],
      'professional-cnc': ['professional', 'industrial', 'production']
    }
  },
  
  'uv-printer': {
    keywords: ['uv printer', 'uv print', 'flatbed', 'direct print'],
    subcategories: {
      'small-format': ['a4', 'a3', 'desktop'],
      'large-format': ['large format', 'wide', 'industrial']
    }
  },
  
  'dtf-printer': {
    keywords: ['dtf', 'direct to film', 'transfer', 'textile'],
    subcategories: {
      'desktop-dtf': ['desktop', 'small', 'a3'],
      'production-dtf': ['production', 'roll to roll', 'wide format']
    }
  }
};
```

## Brand Fuzzy Matching Rules

```javascript
const brandMappings = {
  // Common variations and misspellings
  'commarker': 'ComMarker',
  'com-marker': 'ComMarker',
  'xtool': 'xTool',
  'x-tool': 'xTool',
  'atomstack': 'Atomstack',
  'atom-stack': 'Atomstack',
  'bambulab': 'Bambu Lab',
  'bambu-lab': 'Bambu Lab',
  'creality3d': 'Creality',
  'creality 3d': 'Creality',
  'prusa3d': 'Prusa',
  'prusa 3d': 'Prusa',
  'anycubic3d': 'Anycubic',
  'elegoo3d': 'Elegoo',
  'carbide3d': 'Carbide 3D',
  'carbide 3d': 'Carbide 3D',
  'onefinity cnc': 'Onefinity',
  'avid cnc': 'Avid CNC',
  'openbuilds': 'OpenBuilds',
  'open builds': 'OpenBuilds'
};
```

## Usage Example

```javascript
// Using the templates to extract and normalize machine data
const extractMachineSpecs = (machineType, rawData) => {
  const template = getTemplate(machineType); // laser, 3d-printer, cnc, uv-printer, dtf-printer
  const normalizedData = {};
  
  for (const [specKey, specConfig] of Object.entries(template)) {
    // Try each variation of the field name
    for (const variation of specConfig.variations) {
      if (rawData[variation]) {
        let value = rawData[variation];
        
        // Apply normalization if specified
        if (specConfig.normalize) {
          value = specConfig.normalize(value);
        }
        
        normalizedData[specKey] = value;
        break;
      }
    }
    
    // Mark missing required fields
    if (specConfig.required && !normalizedData[specKey]) {
      normalizedData[specKey] = null;
      normalizedData._validation_errors = normalizedData._validation_errors || [];
      normalizedData._validation_errors.push(`Missing required field: ${specKey}`);
    }
  }
  
  return normalizedData;
};
```

This template system provides:
1. **Comprehensive coverage** of all researched machine types
2. **Format flexibility** to handle different manufacturer presentations  
3. **Normalization functions** for consistent data storage
4. **Validation rules** to ensure data quality
5. **Auto-categorization** based on keywords and specifications
6. **Brand matching** with fuzzy logic for common variations

The templates can be stored in the `machine_type_specifications` database table and used by the normalization system to process discovered machines consistently.