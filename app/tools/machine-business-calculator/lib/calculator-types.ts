export interface PlatformFee {
  id: string;
  name: string;          // Platform name (Etsy, Amazon, Direct, etc.)
  feePercentage: number; // Fee percentage (e.g., 6.5 for Etsy)
  salesPercentage: number; // Percentage of sales on this platform (e.g., 80)
}

export interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  monthlyUnits: number; // Units to produce per month
  costs: {
    materials: number;    // Raw material costs
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
}

export interface MarketingChannel {
  id: string;
  name: string;
  monthlySpend: number;
  conversionRate: number; // percentage: leads to sales
  unitsPerMonth: number;  // calculated or estimated sales from this channel
  costPerUnit: number;    // CAC for this channel
  isActive: boolean;
}

export interface MarketingState {
  totalMonthlySpend: number;
  channels: MarketingChannel[];
  overallCAC: number;      // weighted average CAC across all channels
  totalUnitsFromMarketing: number;
  organicUnitsPerMonth: number; // sales without paid marketing
  organicPercentage: number;    // what % of sales come organically
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
  
  // Level 2 - Time Reality
  hourlyRate: number;
  
  // Level 3 - Marketing & CAC
  marketing: MarketingState;
  
  // Level 4 - Business Costs
  businessMode: 'hobby' | 'side' | 'business';
  selectedCosts: BusinessCost[];
  
  // Level 5 - Projections & Optimization
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
  { name: 'Craft Shows', feePercentage: 0 },
  { name: 'Facebook/Instagram', feePercentage: 5 },
  { name: 'Other', feePercentage: 0 }
];

export const DEFAULT_MARKETING_CHANNELS: MarketingChannel[] = [
  {
    id: 'facebook-ads',
    name: 'Facebook/Instagram Ads',
    monthlySpend: 300,
    conversionRate: 2.5, // 2.5% of people who see ads buy
    unitsPerMonth: 0, // calculated
    costPerUnit: 0, // calculated CAC
    isActive: true
  },
  {
    id: 'google-ads', 
    name: 'Google Ads',
    monthlySpend: 200,
    conversionRate: 3.5,
    unitsPerMonth: 0,
    costPerUnit: 0,
    isActive: false
  },
  {
    id: 'craft-shows',
    name: 'Craft Shows',
    monthlySpend: 400, // booth fees, travel
    conversionRate: 15, // higher in-person conversion
    unitsPerMonth: 0,
    costPerUnit: 0,
    isActive: false
  },
  {
    id: 'direct-outreach',
    name: 'Direct Outreach',
    monthlySpend: 50, // mostly time/email costs
    conversionRate: 8,
    unitsPerMonth: 0,
    costPerUnit: 0,
    isActive: false
  }
];

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