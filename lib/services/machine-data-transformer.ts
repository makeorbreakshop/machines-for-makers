/**
 * Machine Data Transformer Service
 * 
 * Transforms raw scraped data into the format expected by the machine form and database.
 * Handles field mapping, dropdown matching, unit standardization, and data validation.
 */

import type { BrandFromDB } from "@/lib/database-types";
import type { MachineFormData } from "@/components/admin/machine-form";

// Raw data interface (what comes from scrapers/Claude)
interface RawMachineData {
  machine_name?: string;
  company?: string;
  machine_category?: string;
  laser_category?: string;
  price?: number | string;
  rating?: number | string;
  laser_type_a?: string;
  laser_power_a?: string;
  laser_type_b?: string;
  laser_power_b?: string;
  work_area?: string;
  speed?: string;
  height?: string;
  machine_size?: string;
  acceleration?: string;
  laser_frequency?: string;
  pulse_width?: string;
  focus?: string;
  enclosure?: boolean | string;
  wifi?: boolean | string;
  camera?: boolean | string;
  passthrough?: boolean | string;
  controller?: string;
  software?: string;
  warranty?: string;
  laser_source_manufacturer?: string;
  description?: string;
  highlights?: string;
  drawbacks?: string;
  image_url?: string;
  images?: string[];
  product_link?: string;
  [key: string]: any;
}

// Field mapping from raw data to form fields
const FIELD_MAPPING: Record<string, string> = {
  machine_name: 'machine_name',
  company: 'company',
  machine_category: 'machine_category',
  laser_category: 'laser_category',
  price: 'price',
  rating: 'rating',
  laser_type_a: 'laser_type_a',
  laser_power_a: 'laser_power_a',
  laser_type_b: 'laser_type_b',
  laser_power_b: 'laser_power_b',
  work_area: 'work_area',
  speed: 'speed',
  height: 'height',
  machine_size: 'machine_size',
  acceleration: 'acceleration',
  laser_frequency: 'laser_frequency',
  pulse_width: 'pulse_width',
  focus: 'focus',
  enclosure: 'enclosure',
  wifi: 'wifi',
  camera: 'camera',
  passthrough: 'passthrough',
  controller: 'controller',
  software: 'software',
  warranty: 'warranty',
  laser_source_manufacturer: 'laser_source_manufacturer',
  description: 'description',
  highlights: 'highlights',
  drawbacks: 'drawbacks',
  image_url: 'image_url',
  product_link: 'product_link',
};

// Dropdown option mappings with fuzzy matching
const CATEGORY_MAPPINGS = {
  machine_category: {
    'laser': [
      'laser', 'laser cutter', 'laser engraver', 'laser cutting', 'laser engraving',
      'co2 laser', 'diode laser', 'fiber laser', 'desktop laser', 'cnc laser'
    ],
    '3d-printer': [
      '3d printer', '3d printing', 'printer', 'fdm printer', 'resin printer',
      'sla printer', 'dlp printer', 'fdm', 'sla', 'dlp'
    ],
    'cnc': [
      'cnc', 'cnc router', 'cnc mill', 'milling machine', 'router',
      'cnc machine', 'mill', 'milling', 'cnc milling'
    ]
  },
  laser_category: {
    'desktop-diode-laser': [
      'desktop diode', 'diode laser', 'blue diode', 'desktop diode laser',
      'diode', 'blue laser', 'desktop laser diode'
    ],
    'desktop-co2-laser': [
      'desktop co2', 'co2 laser', 'carbon dioxide', 'desktop co2 laser',
      'co2', 'desktop carbon dioxide'
    ],
    'desktop-fiber-laser': [
      'desktop fiber', 'fiber laser', 'desktop fiber laser', 'fiber'
    ],
    'fiber-laser': [
      'fiber laser', 'fiber', 'industrial fiber', 'professional fiber'
    ],
    'high-end-co2-laser': [
      'high-end co2', 'high end co2', 'professional co2', 'industrial co2',
      'high power co2', 'large co2'
    ],
    'industrial-co2-laser': [
      'industrial co2', 'industrial carbon dioxide', 'large co2',
      'commercial co2', 'production co2'
    ],
    'industrial-fiber-laser': [
      'industrial fiber', 'commercial fiber', 'production fiber',
      'large fiber', 'high power fiber'
    ]
  },
  laser_type_a: {
    'Diode': ['diode', 'blue diode', 'laser diode', 'semiconductor', 'led'],
    'CO2': ['co2', 'carbon dioxide', 'gas laser', 'co₂'],
    'Fiber': ['fiber', 'fibre', 'fiber laser', 'solid state'],
    'Galvo': ['galvo', 'galvanometer', 'galvo scanner'],
    'UV': ['uv', 'ultraviolet', 'uv laser'],
    'Other': ['other', 'hybrid', 'mixed', 'multiple']
  },
  laser_type_b: {
    'Diode': ['diode', 'blue diode', 'laser diode', 'semiconductor', 'led'],
    'CO2': ['co2', 'carbon dioxide', 'gas laser', 'co₂'],
    'Fiber': ['fiber', 'fibre', 'fiber laser', 'solid state'],
    'Galvo': ['galvo', 'galvanometer', 'galvo scanner'],
    'UV': ['uv', 'ultraviolet', 'uv laser'],
    'Other': ['other', 'hybrid', 'mixed', 'multiple']
  },
  focus: {
    'Auto': ['auto', 'automatic', 'auto focus', 'automatic focus', 'autofocus'],
    'Manual': ['manual', 'manual focus', 'hand focus', 'manual adjustment']
  }
};

/**
 * Fuzzy match a value against mapping options
 */
function fuzzyMatchDropdown(value: string, mappings: Record<string, string[]>): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const normalizedValue = value.toLowerCase().trim();
  
  // First try exact match
  for (const [key, options] of Object.entries(mappings)) {
    if (options.includes(normalizedValue)) {
      return key;
    }
  }
  
  // Then try partial match
  for (const [key, options] of Object.entries(mappings)) {
    for (const option of options) {
      if (normalizedValue.includes(option) || option.includes(normalizedValue)) {
        return key;
      }
    }
  }
  
  return null;
}

/**
 * Standardize power values to consistent format
 */
function standardizePower(value: string): string {
  if (!value || typeof value !== 'string') return '';
  
  // Remove extra spaces and normalize
  const cleaned = value.trim().toLowerCase();
  
  // Extract number and unit
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(w|watt|watts|kilowatt|kw)?/i);
  if (!match) return value; // Return original if no match
  
  const number = parseFloat(match[1]);
  const unit = match[2] || '';
  
  // Convert kilowatts to watts
  if (unit.toLowerCase().includes('k')) {
    return `${number * 1000}W`;
  }
  
  // Return in standard format
  return `${number}W`;
}

/**
 * Standardize speed values to consistent format
 */
function standardizeSpeed(value: string): string {
  if (!value || typeof value !== 'string') return '';
  
  const cleaned = value.trim().toLowerCase();
  
  // Extract number and try to determine unit
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(mm\/min|mm\/s|m\/min|m\/s|ipm|ips)?/i);
  if (!match) return value; // Return original if no match
  
  const number = parseFloat(match[1]);
  const unit = match[2] || '';
  
  // Convert to mm/min (standard format)
  if (unit.includes('mm/s')) {
    return `${number * 60} mm/min`;
  } else if (unit.includes('m/min')) {
    return `${number * 1000} mm/min`;
  } else if (unit.includes('m/s')) {
    return `${number * 1000 * 60} mm/min`;
  } else if (unit.includes('ipm')) {
    return `${number * 25.4} mm/min`;
  } else if (unit.includes('ips')) {
    return `${number * 25.4 * 60} mm/min`;
  } else if (unit.includes('mm/min') || !unit) {
    return `${number} mm/min`;
  }
  
  return value;
}

/**
 * Standardize dimension values to consistent format
 */
function standardizeDimensions(value: string): string {
  if (!value || typeof value !== 'string') return '';
  
  const cleaned = value.trim().toLowerCase();
  
  // Match various dimension formats
  const patterns = [
    /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m|in|inch|inches)?/i,
    /(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(?:×\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m|in|inch|inches)?/i,
    /(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*(?:\*\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m|in|inch|inches)?/i
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const width = parseFloat(match[1]);
      const height = parseFloat(match[2]);
      const depth = match[3] ? parseFloat(match[3]) : null;
      const unit = match[4] || 'mm';
      
      // Convert to mm
      let multiplier = 1;
      if (unit.includes('cm')) multiplier = 10;
      else if (unit.includes('m') && !unit.includes('mm')) multiplier = 1000;
      else if (unit.includes('in')) multiplier = 25.4;
      
      const widthMm = Math.round(width * multiplier);
      const heightMm = Math.round(height * multiplier);
      
      if (depth) {
        const depthMm = Math.round(depth * multiplier);
        return `${widthMm} x ${heightMm} x ${depthMm} mm`;
      } else {
        return `${widthMm} x ${heightMm} mm`;
      }
    }
  }
  
  return value;
}

/**
 * Convert various boolean representations to actual boolean
 */
function convertToBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'on';
  }
  return false;
}

/**
 * Find matching brand from existing brands list
 */
function findMatchingBrand(companyName: string, brands: BrandFromDB[]): BrandFromDB | null {
  if (!companyName || !brands.length) return null;
  
  const normalized = companyName.toLowerCase().trim();
  
  // Exact match first
  for (const brand of brands) {
    if (brand.Name?.toLowerCase() === normalized) {
      return brand;
    }
  }
  
  // Partial match
  for (const brand of brands) {
    const brandName = brand.Name?.toLowerCase() || '';
    if (brandName.includes(normalized) || normalized.includes(brandName)) {
      return brand;
    }
  }
  
  return null;
}

/**
 * Generate a URL slug from machine name
 */
function generateSlug(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Main transformation function
 */
export function transformMachineData(
  rawData: RawMachineData,
  existingBrands: BrandFromDB[] = []
): Partial<MachineFormData> {
  const transformed: Partial<MachineFormData> = {};
  
  // Map basic fields
  for (const [rawKey, formKey] of Object.entries(FIELD_MAPPING)) {
    const value = rawData[rawKey];
    if (value !== undefined && value !== null && value !== '') {
      transformed[formKey as keyof MachineFormData] = value;
    }
  }
  
  // Transform dropdown fields
  if (rawData.machine_category) {
    const matched = fuzzyMatchDropdown(rawData.machine_category, CATEGORY_MAPPINGS.machine_category);
    if (matched) transformed.machine_category = matched;
  }
  
  if (rawData.laser_category) {
    const matched = fuzzyMatchDropdown(rawData.laser_category, CATEGORY_MAPPINGS.laser_category);
    if (matched) transformed.laser_category = matched;
  }
  
  if (rawData.laser_type_a) {
    const matched = fuzzyMatchDropdown(rawData.laser_type_a, CATEGORY_MAPPINGS.laser_type_a);
    if (matched) transformed.laser_type_a = matched;
  }
  
  if (rawData.laser_type_b) {
    const matched = fuzzyMatchDropdown(rawData.laser_type_b, CATEGORY_MAPPINGS.laser_type_b);
    if (matched) transformed.laser_type_b = matched;
  }
  
  if (rawData.focus) {
    const matched = fuzzyMatchDropdown(rawData.focus, CATEGORY_MAPPINGS.focus);
    if (matched) transformed.focus = matched;
  }
  
  // Transform company to brand ID, but also store the original name for display
  if (rawData.company) {
    const matchedBrand = findMatchingBrand(rawData.company, existingBrands);
    if (matchedBrand) {
      transformed.company = matchedBrand.id;
      // Store the display name for the UI
      (transformed as any).company_display_name = matchedBrand.Name;
    } else {
      // If no match, store the original company name for display
      transformed.company = rawData.company;
      (transformed as any).company_display_name = rawData.company;
    }
  }
  
  // Standardize power values
  if (rawData.laser_power_a) {
    transformed.laser_power_a = standardizePower(rawData.laser_power_a);
  }
  
  if (rawData.laser_power_b) {
    transformed.laser_power_b = standardizePower(rawData.laser_power_b);
  }
  
  // Standardize speed
  if (rawData.speed) {
    transformed.speed = standardizeSpeed(rawData.speed);
  }
  
  // Standardize dimensions
  if (rawData.work_area) {
    transformed.work_area = standardizeDimensions(rawData.work_area);
  }
  
  if (rawData.machine_size) {
    transformed.machine_size = standardizeDimensions(rawData.machine_size);
  }
  
  if (rawData.height) {
    transformed.height = standardizeDimensions(rawData.height);
  }
  
  // Convert boolean fields
  transformed.enclosure = convertToBoolean(rawData.enclosure);
  transformed.wifi = convertToBoolean(rawData.wifi);
  transformed.camera = convertToBoolean(rawData.camera);
  transformed.passthrough = convertToBoolean(rawData.passthrough);
  
  // Handle numeric fields
  if (rawData.price) {
    const price = typeof rawData.price === 'string' ? parseFloat(rawData.price) : rawData.price;
    if (!isNaN(price)) transformed.price = price;
  }
  
  if (rawData.rating) {
    const rating = typeof rawData.rating === 'string' ? parseFloat(rawData.rating) : rawData.rating;
    if (!isNaN(rating)) transformed.rating = Math.max(0, Math.min(10, rating));
  }
  
  // Generate slug from machine name
  if (rawData.machine_name) {
    transformed.slug = generateSlug(rawData.machine_name);
  }
  
  // Handle images array
  if (rawData.images && Array.isArray(rawData.images)) {
    transformed.images = rawData.images;
    // If no main image_url, use first image
    if (!transformed.image_url && rawData.images.length > 0) {
      transformed.image_url = rawData.images[0];
    }
  }
  
  // Set default values for new machines
  if (!transformed.hidden) transformed.hidden = true;
  if (!transformed.is_featured) transformed.is_featured = false;
  
  return transformed;
}

/**
 * Get transformation suggestions for UI display
 */
export function getTransformationSuggestions(rawData: RawMachineData): {
  field: string;
  original: string;
  suggested: string;
  type: 'mapping' | 'standardization' | 'conversion';
}[] {
  const suggestions: {
    field: string;
    original: string;
    suggested: string;
    type: 'mapping' | 'standardization' | 'conversion';
  }[] = [];
  
  // Check dropdown mappings
  if (rawData.machine_category) {
    const matched = fuzzyMatchDropdown(rawData.machine_category, CATEGORY_MAPPINGS.machine_category);
    if (matched && matched !== rawData.machine_category) {
      suggestions.push({
        field: 'machine_category',
        original: rawData.machine_category,
        suggested: matched,
        type: 'mapping'
      });
    }
  }
  
  // Check power standardization
  if (rawData.laser_power_a) {
    const standardized = standardizePower(rawData.laser_power_a);
    if (standardized !== rawData.laser_power_a) {
      suggestions.push({
        field: 'laser_power_a',
        original: rawData.laser_power_a,
        suggested: standardized,
        type: 'standardization'
      });
    }
  }
  
  // Check speed standardization
  if (rawData.speed) {
    const standardized = standardizeSpeed(rawData.speed);
    if (standardized !== rawData.speed) {
      suggestions.push({
        field: 'speed',
        original: rawData.speed,
        suggested: standardized,
        type: 'standardization'
      });
    }
  }
  
  // Check dimension standardization
  if (rawData.work_area) {
    const standardized = standardizeDimensions(rawData.work_area);
    if (standardized !== rawData.work_area) {
      suggestions.push({
        field: 'work_area',
        original: rawData.work_area,
        suggested: standardized,
        type: 'standardization'
      });
    }
  }
  
  return suggestions;
}

/**
 * Validate transformed data for completeness
 */
export function validateTransformedData(data: Partial<MachineFormData>): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!data.machine_name) missingFields.push('machine_name');
  if (!data.company) missingFields.push('company');
  
  // Check publication requirements
  if (!data.hidden) {
    if (!data.machine_category) missingFields.push('machine_category');
    if (!data.laser_category) missingFields.push('laser_category');
    if (!data.price) missingFields.push('price');
    if (!data.laser_type_a) missingFields.push('laser_type_a');
    if (!data.laser_power_a) missingFields.push('laser_power_a');
    if (!data.work_area) missingFields.push('work_area');
    if (!data.speed) missingFields.push('speed');
    if (!data.image_url) missingFields.push('image_url');
  }
  
  // Check for warnings
  if (data.price && data.price < 100) {
    warnings.push('Price seems unusually low');
  }
  
  if (data.rating && (data.rating < 1 || data.rating > 10)) {
    warnings.push('Rating should be between 1 and 10');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  };
}