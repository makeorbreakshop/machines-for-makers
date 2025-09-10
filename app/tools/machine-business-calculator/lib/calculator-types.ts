export interface Material {
  id: string;
  name: string;
  batchCost: number;         // Total cost for the batch (e.g., $45)
  batchQuantity: number;     // Number in batch (e.g., 1 sheet, 10 ft, etc)
  unit: string;              // Unit name (e.g., "sheet", "ft", "yard", "lb")
  unitCost: number;          // Calculated: batchCost / batchQuantity
}

export interface MaterialUsage {
  materialId?: string;       // Optional - can be a one-off material
  name: string;              // Material name (for display)
  quantity: number;          // Amount used per product
  unitCost: number;          // Cost per unit
  cost: number;              // Total: quantity * unitCost
  isBatch?: boolean;         // Whether this material comes from batch pricing
  batchQuantities?: Array<{  // Batch pricing tiers for reference
    quantity: number;
    totalCost: number;
    unitCost: number;
  }>;
}

export interface PlatformFee {
  id: string;
  name: string;          // Platform name (Etsy, Amazon, Direct, etc.)
  feePercentage: number; // Fee percentage (e.g., 6.5 for Etsy)
  salesPercentage: number; // Percentage of sales on this platform (e.g., 80)
  locked?: boolean;      // Whether this platform's percentage is locked from redistribution
}

export interface MachineUsage {
  machineId?: string;
  machineName?: string;
  machineMinutes: number;
  costPerHour: number;
  totalCost: number;
}

export interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  monthlyUnits: number; // Units to produce per month
  materialUsage?: MaterialUsage[];  // New: material usage with batch pricing
  machineTime?: MachineUsage; // Machine time tracking
  costs: {
    materials: number;    // Raw material costs (calculated from materialUsage)
    finishing: number;    // Post-processing, sanding, etc.
    packaging: number;    // Boxes, bags, labels
    shipping: number;     // Shipping materials, postage
    other: number;        // Miscellaneous costs
  };
  timeBreakdown: {
    design: number;       // minutes
    setup: number;        // minutes
    machine: number;      // minutes
    finishing: number;    // minutes
    packaging: number;    // minutes
  };
  platformFees: PlatformFee[]; // Platform fees for this product
  showCostBreakdown?: boolean; // For progressive disclosure
  showTimeBreakdown?: boolean; // For progressive disclosure
  showPlatformFees?: boolean;  // For progressive disclosure
  isEditingName?: boolean;     // For inline name editing
  pricingMode?: 'price' | 'margin'; // Which field is driving the price (default: 'price')
  targetMargin?: number; // Target profit margin percentage
}

export interface MarketingChannel {
  id: string;
  name: string;
  monthlySpend: number;
  monthlyBudget?: number;  // For saving/restoring state
  conversionRate: number; // percentage: leads to sales
  costPerClick?: number;  // For digital ads
  unitsPerMonth: number;  // calculated or estimated sales from this channel
  costPerUnit: number;    // CAC for this channel
  isActive: boolean;
}

export interface EventChannel {
  id: string;
  name: string;
  monthlySpend: number;     // Booth fees and event costs
  monthlyBudget?: number;   // For saving/restoring state
  monthlyAttendance: number; // Expected number of people who will see your booth
  conversionRate?: number;  // Alternative field name for consistency
  salesRate: number;        // percentage: attendees who buy
  unitsPerMonth: number;    // calculated sales from this channel
  costPerUnit: number;      // Cost per sale for this channel
  isActive: boolean;
}

export interface MarketingCategory {
  expanded: boolean;
  channels: MarketingChannel[];
}

export interface EventCategory {
  expanded: boolean;
  channels: EventChannel[];
}

export interface MarketingState {
  organicUnitsPerMonth: number;
  digitalAdvertising: MarketingCategory;
  eventsAndShows: EventCategory;
  // Calculated totals
  totalMonthlySpend?: number;
  overallCAC?: number;
  totalUnitsFromMarketing?: number;
  organicPercentage?: number;
  digitalPercentage?: number;
  eventsPercentage?: number;
}

export interface Worker {
  id: string;
  name: string;
  hourlyRate: number;
  maxHoursPerWeek: number;
  skills: string[]; // Which tasks they can do
  assignedHours: number;
  costPerWeek: number;
}

export interface BusinessTask {
  id: string;
  name: string;
  category: 'admin' | 'marketing' | 'maintenance' | 'inventory' | 'shipping' | 'development';
  hoursPerWeek: number;
  assignedWorkerId?: string;
  description: string;
}

export interface LaborState {
  // Auto-calculated from products
  productionHoursPerWeek: number;
  
  // Business overhead tasks
  businessTasks: BusinessTask[];
  
  // Workers
  workers: Worker[];
  
  // Product to worker assignments
  productAssignments?: { [productId: string]: string };
  
  // Calculated totals
  totalHoursNeeded?: number;
  totalLaborCost?: number;
  unassignedHours?: number;
  ownerHours?: number;
  businessTasksLaborCost?: number;
  productLaborCost?: number;
}

export interface BusinessCost {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  category: 'fees' | 'taxes' | 'insurance' | 'equipment' | 'workspace' | 'professional';
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  targetHourlyRate: number;
  recommendedPricing: { [productId: string]: number };
  timeOptimizations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  implementationDifficulty: number; // 1-10
  timeToProfit: number; // months
}

export interface CalculatorState {
  // Level 1 - Setup
  monthlyGoal: number;
  products: Product[];
  materials: Material[];  // Materials library
  
  // Level 2 - Time Reality
  hourlyRate: number;
  
  // Level 3 - Marketing & CAC
  marketing: MarketingState;
  
  // Level 4 - Labor Management
  labor: LaborState;
  
  // Level 5 - Business Costs
  businessMode: 'hobby' | 'side' | 'business';
  selectedCosts: BusinessCost[];
  businessExpenses?: any; // Stores the full business expenses state
  
  // Level 6 - Projections & Optimization
  optimizedPrices: { [productId: string]: number };
  recommendedStrategy: Strategy | null;
  
  // Meta
  currentLevel: number;
  completedLevels: number[];
  userEmail: string;
  userName: string;
}

export interface CalculatedMetrics {
  // Per product calculations
  productMetrics: {
    [productId: string]: {
      totalTimeMinutes: number;
      totalTimeHours: number;
      totalCosts: number;
      grossProfit: number;
      profitMargin: number;
      hourlyRate: number;
      monthlyRevenue: number;
      monthlyCosts: number;
      monthlyGrossProfit: number;
      monthlyTimeHours: number;
      unitsProduced: number;
      costBreakdown: {
        materials: number;
        finishing: number;
        packaging: number;
        shipping: number;
        other: number;
        labor: number;
        platformFees: number;
        marketing: number; // CAC allocation per unit
      };
    };
  };
  
  // Marketing metrics
  marketingMetrics: {
    totalMonthlySpend: number;
    averageCAC: number;
    totalPaidUnits: number;
    organicUnits: number;
    blendedCAC: number; // Total marketing spend / Total units
    marketingROI: number;
    costPerChannel: { [channelId: string]: number };
  };
  
  // Combined totals
  totalMonthlyUnits: number;
  totalMonthlyHours: number;
  totalMonthlyCosts: number;
  totalMarketingCosts: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  averageHourlyRate: number;
  totalBusinessCosts: number;
  goalAchievementPercentage: number;
}

export const DEFAULT_PLATFORM_PRESETS = [
  { name: 'Direct Sales', feePercentage: 0 },
  { name: 'Etsy', feePercentage: 6.5 },
  { name: 'Amazon Handmade', feePercentage: 15 },
  { name: 'Shopify', feePercentage: 2.9 },
  { name: 'Square', feePercentage: 2.6 },
  { name: 'PayPal', feePercentage: 3.49 },
  { name: 'Facebook/Instagram', feePercentage: 5 },
  { name: 'Other', feePercentage: 0 }
];

export const DEFAULT_MARKETING_STATE: MarketingState = {
  organicUnitsPerMonth: 10,
  digitalAdvertising: {
    expanded: false,
    channels: [
      {
        id: 'facebook-ads',
        name: 'Facebook/Instagram',
        monthlySpend: 0,
        conversionRate: 2.5,
        unitsPerMonth: 0,
        costPerUnit: 0,
        isActive: false
      },
      {
        id: 'google-ads',
        name: 'Google Ads',
        monthlySpend: 0,
        conversionRate: 3.5,
        unitsPerMonth: 0,
        costPerUnit: 0,
        isActive: false
      }
    ]
  },
  eventsAndShows: {
    expanded: false,
    channels: [
      {
        id: 'craft-shows',
        name: 'Craft Shows',
        monthlySpend: 0,
        monthlyAttendance: 0,
        salesRate: 15,
        conversionRate: 15,
        unitsPerMonth: 0,
        costPerUnit: 0,
        isActive: false
      },
      {
        id: 'maker-faires',
        name: 'Maker Faires',
        monthlySpend: 0,
        monthlyAttendance: 0,
        salesRate: 12,
        conversionRate: 12,
        unitsPerMonth: 0,
        costPerUnit: 0,
        isActive: false
      }
    ]
  }
};

export const DEFAULT_BUSINESS_COSTS: BusinessCost[] = [
  {
    id: 'platform-fees',
    name: 'Platform Fees (Etsy, Amazon, etc.)',
    type: 'percentage',
    value: 11,
    description: 'Transaction fees, listing fees, and payment processing',
    category: 'fees'
  },
  {
    id: 'tax-reserve',
    name: 'Tax Reserve',
    type: 'percentage',
    value: 30,
    description: 'Income tax, self-employment tax, state tax',
    category: 'taxes'
  },
  {
    id: 'health-insurance',
    name: 'Health Insurance',
    type: 'fixed',
    value: 400,
    description: 'Monthly health insurance premium',
    category: 'insurance'
  },
  {
    id: 'equipment-fund',
    name: 'Equipment Fund',
    type: 'percentage',
    value: 10,
    description: 'Maintenance, upgrades, replacement savings',
    category: 'equipment'
  },
  {
    id: 'workspace-rent',
    name: 'Workspace/Rent',
    type: 'fixed',
    value: 500,
    description: 'Dedicated workspace or home office allocation',
    category: 'workspace'
  },
  {
    id: 'business-insurance',
    name: 'Business Insurance',
    type: 'fixed',
    value: 100,
    description: 'General liability, product liability insurance',
    category: 'insurance'
  },
  {
    id: 'professional-services',
    name: 'Professional Services',
    type: 'fixed',
    value: 200,
    description: 'Accounting, legal, business services',
    category: 'professional'
  }
];

export const DEFAULT_BUSINESS_TASKS: BusinessTask[] = [
  {
    id: 'admin-bookkeeping',
    name: 'Bookkeeping & Admin',
    category: 'admin',
    hoursPerWeek: 0,
    description: 'Record transactions, manage expenses, handle paperwork'
  },
  {
    id: 'admin-emails',
    name: 'Customer Service & Emails',
    category: 'admin',
    hoursPerWeek: 0,
    description: 'Respond to customer inquiries, handle support tickets'
  },
  {
    id: 'marketing-social',
    name: 'Social Media & Marketing',
    category: 'marketing',
    hoursPerWeek: 0,
    description: 'Create posts, engage with customers, run ad campaigns'
  },
  {
    id: 'inventory-management',
    name: 'Inventory & Procurement',
    category: 'inventory',
    hoursPerWeek: 0,
    description: 'Order materials, manage stock levels, organize supplies'
  },
  {
    id: 'shipping-fulfillment',
    name: 'Order Fulfillment & Shipping',
    category: 'shipping',
    hoursPerWeek: 0,
    description: 'Pack orders, print labels, coordinate pickups'
  },
  {
    id: 'maintenance-shop',
    name: 'Shop Maintenance & Setup',
    category: 'maintenance',
    hoursPerWeek: 0,
    description: 'Clean workspace, maintain equipment, organize tools'
  },
  {
    id: 'development-planning',
    name: 'Product Development & Planning',
    category: 'development',
    hoursPerWeek: 0,
    description: 'Design new products, improve processes, strategic planning'
  }
];

export const DEFAULT_LABOR_STATE: LaborState = {
  productionHoursPerWeek: 0, // Calculated from products
  businessTasks: DEFAULT_BUSINESS_TASKS,
  workers: [
    {
      id: 'owner',
      name: 'You (Owner)',
      hourlyRate: 25, // Will sync with main hourly rate
      maxHoursPerWeek: 40,
      skills: ['admin', 'marketing', 'maintenance', 'inventory', 'shipping', 'development', 'production'],
      assignedHours: 0,
      costPerWeek: 0
    }
  ],
  totalHoursNeeded: 0,
  totalLaborCost: 0,
  unassignedHours: 0,
  ownerHours: 0
};

export const DEFAULT_PRODUCT_TEMPLATES = [
  {
    name: 'Custom Engravings',
    estimatedSellingPrice: 25,
    estimatedMonthlyUnits: 20,
    estimatedTotalCost: 6, // Simplified - just total cost
    estimatedCosts: {
      materials: 6,      // Total cost simplified to materials for now
      finishing: 0,      
      packaging: 0,    
      shipping: 0,       
      other: 0         
    },
    machineTime: {
      machineMinutes: 10,
      costPerHour: 5,  // Default $5/hour for laser engraving
      totalCost: 0.83  // 10 min at $5/hr
    },
    timeBreakdown: {
      design: 15,
      setup: 5,
      machine: 10,
      finishing: 5,
      packaging: 5
    },
    platformFees: [
      {
        id: 'direct-default',
        name: 'Direct Sales',
        feePercentage: 0,
        salesPercentage: 100
      }
    ]
  },
  {
    name: '3D Printed Parts',
    estimatedSellingPrice: 35,
    estimatedMonthlyUnits: 10,
    estimatedTotalCost: 10.5,
    estimatedCosts: {
      materials: 10.5,   // Total cost simplified
      finishing: 0,      
      packaging: 0,      
      shipping: 0,       
      other: 0         
    },
    machineTime: {
      machineMinutes: 120,
      costPerHour: 1.5,  // Default $1.50/hour for 3D printing
      totalCost: 3.0  // 120 min at $1.50/hr
    },
    timeBreakdown: {
      design: 30,
      setup: 10,
      machine: 120,
      finishing: 15,
      packaging: 5
    },
    platformFees: [
      {
        id: 'direct-default',
        name: 'Direct Sales',
        feePercentage: 0,
        salesPercentage: 100
      }
    ]
  },
  {
    name: 'CNC Machined Parts',
    estimatedSellingPrice: 75,
    estimatedMonthlyUnits: 8,
    estimatedTotalCost: 21,
    estimatedCosts: {
      materials: 21,     // Total cost simplified
      finishing: 0,      
      packaging: 0,      
      shipping: 0,       
      other: 0           
    },
    machineTime: {
      machineMinutes: 60,
      costPerHour: 8,  // Default $8/hour for CNC
      totalCost: 8.0  // 60 min at $8/hr
    },
    timeBreakdown: {
      design: 45,
      setup: 20,
      machine: 60,
      finishing: 20,
      packaging: 10
    },
    platformFees: [
      {
        id: 'direct-default',
        name: 'Direct Sales',
        feePercentage: 0,
        salesPercentage: 100
      }
    ]
  },
  {
    name: 'Custom Signage',
    estimatedSellingPrice: 60,
    estimatedMonthlyUnits: 12,
    estimatedTotalCost: 16.5,
    estimatedCosts: {
      materials: 16.5,   // Total cost simplified
      finishing: 0,      
      packaging: 0,    
      shipping: 0,       
      other: 0           
    },
    machineTime: {
      machineMinutes: 15,
      costPerHour: 5,  // Default $5/hour for laser cutting
      totalCost: 1.25  // 15 min at $5/hr
    },
    timeBreakdown: {
      design: 20,
      setup: 10,
      machine: 15,
      finishing: 10,
      packaging: 10
    },
    platformFees: [
      {
        id: 'direct-default',
        name: 'Direct Sales',
        feePercentage: 0,
        salesPercentage: 100
      }
    ]
  }
];