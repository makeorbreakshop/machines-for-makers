"use client"

/**
 * Service for fetching reference data for form fields
 * Used to populate dropdowns and checkbox options
 */

// Define types for reference data
export interface ReferenceData {
  machineCategories: string[];
  laserCategories: string[];
  laserTypes: string[];
  companies: {
    id: string;
    name: string;
    slug: string;
  }[];
  booleanFeatures: {
    enclosure: string[];
    wifi: string[];
    camera: string[];
    passthrough: string[];
  };
}

// Fetch reference data for form fields
export async function getReferenceData(): Promise<ReferenceData> {
  try {
    console.log('Fetching reference data...');
    const response = await fetch('/api/admin/machine-categories');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`Failed to fetch reference data: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Reference data fetched successfully');
    return data;
  } catch (error) {
    console.error('Error fetching reference data:', error);
    // Return empty data as fallback
    return {
      machineCategories: [],
      laserCategories: [],
      laserTypes: [],
      companies: [],
      booleanFeatures: {
        enclosure: ['Yes', 'No'],
        wifi: ['Yes', 'No'],
        camera: ['Yes', 'No'],
        passthrough: ['Yes', 'No'],
      }
    };
  }
} 