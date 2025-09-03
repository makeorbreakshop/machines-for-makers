import { Product, BusinessCost, CalculatedMetrics, CalculatorState, PlatformFee, MarketingState } from './calculator-types';

export function calculatePlatformFees(product: Product): {
  blendedFeeRate: number;
  totalFeesPerUnit: number;
  platformBreakdown: Array<{
    platformName: string;
    feeRate: number;
    salesPercentage: number;
    unitsOnPlatform: number;
    feesPerUnit: number;
  }>;
} {
  const platformFees = product.platformFees || [];
  
  if (platformFees.length === 0) {
    return {
      blendedFeeRate: 0,
      totalFeesPerUnit: 0,
      platformBreakdown: []
    };
  }

  // Normalize percentages to add up to 100%
  const totalPercentage = platformFees.reduce((sum, fee) => sum + fee.salesPercentage, 0);
  const normalizedFees = platformFees.map(fee => ({
    ...fee,
    salesPercentage: totalPercentage > 0 ? (fee.salesPercentage / totalPercentage) * 100 : 0
  }));

  // Calculate blended fee rate
  const blendedFeeRate = normalizedFees.reduce((sum, fee) => 
    sum + (fee.feePercentage * fee.salesPercentage / 100), 0
  );

  // Calculate fees per unit
  const totalFeesPerUnit = (product.sellingPrice || 0) * (blendedFeeRate / 100);

  // Calculate platform breakdown
  const platformBreakdown = normalizedFees.map(fee => ({
    platformName: fee.name,
    feeRate: fee.feePercentage,
    salesPercentage: fee.salesPercentage,
    unitsOnPlatform: Math.round((product.monthlyUnits || 0) * (fee.salesPercentage / 100)),
    feesPerUnit: (product.sellingPrice || 0) * (fee.feePercentage / 100)
  }));

  return {
    blendedFeeRate,
    totalFeesPerUnit,
    platformBreakdown
  };
}

export function calculateProductMetrics(product: Product, globalHourlyRate: number = 0): {
  totalTimeMinutes: number;
  totalTimeHours: number;
  totalCosts: number;
  laborCosts: number;
  platformFees: number;
  grossProfit: number;
  profitMargin: number;
  hourlyRate: number;
} {
  // Handle both old and new product structures safely
  const timeBreakdown = product.timeBreakdown || {
    design: 0, setup: 0, machine: 0, finishing: 0, packaging: 0
  };
  const costs = product.costs || {
    materials: 0, finishing: 0, packaging: 0, shipping: 0, other: 0
  };
  
  const totalTimeMinutes = Object.values(timeBreakdown).reduce((sum, time) => sum + (time || 0), 0);
  const totalTimeHours = totalTimeMinutes / 60;
  const laborCosts = totalTimeHours * globalHourlyRate;
  const materialCosts = Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0);
  
  // Calculate platform fees
  const platformFeeCalc = calculatePlatformFees(product);
  const platformFees = platformFeeCalc.totalFeesPerUnit;
  
  const totalCosts = materialCosts + laborCosts + platformFees;
  const grossProfit = (product.sellingPrice || 0) - totalCosts;
  const profitMargin = product.sellingPrice > 0 ? grossProfit / product.sellingPrice : 0;
  const hourlyRate = totalTimeHours > 0 ? grossProfit / totalTimeHours : 0;

  return {
    totalTimeMinutes,
    totalTimeHours,
    totalCosts,
    laborCosts,
    platformFees,
    grossProfit,
    profitMargin,
    hourlyRate
  };
}

export function calculateMarketingMetrics(marketing: MarketingState): {
  totalMonthlySpend: number;
  averageCAC: number;
  totalPaidUnits: number;
  organicUnits: number;
  blendedCAC: number;
  marketingROI: number;
  costPerChannel: { [channelId: string]: number };
} {
  if (!marketing) {
    return {
      totalMonthlySpend: 0,
      averageCAC: 0,
      totalPaidUnits: 0,
      organicUnits: 0,
      blendedCAC: 0,
      marketingROI: 0,
      costPerChannel: {}
    };
  }

  // Handle both old and new marketing state structures
  let allChannels: any[] = [];
  if ('channels' in marketing && Array.isArray(marketing.channels)) {
    // Old structure
    allChannels = marketing.channels;
  } else {
    // New structure
    const digitalChannels = marketing.digitalAdvertising?.channels || [];
    const eventChannels = marketing.eventsAndShows?.channels || [];
    allChannels = [...digitalChannels, ...eventChannels];
  }

  const activeChannels = allChannels.filter(c => c.isActive);
  const totalMonthlySpend = activeChannels.reduce((sum, c) => sum + c.monthlySpend, 0);
  const totalPaidUnits = activeChannels.reduce((sum, c) => sum + c.unitsPerMonth, 0);
  const organicUnits = marketing.organicUnitsPerMonth || 0;
  
  // Weighted average CAC across all paid channels
  const averageCAC = totalPaidUnits > 0 ? totalMonthlySpend / totalPaidUnits : 0;
  
  // Blended CAC including organic units (marketing spend / all units)
  const totalUnits = totalPaidUnits + organicUnits;
  const blendedCAC = totalUnits > 0 ? totalMonthlySpend / totalUnits : 0;
  
  // Simple ROI calculation (would need revenue data for real ROI)
  const marketingROI = totalMonthlySpend > 0 ? (totalPaidUnits * 50) / totalMonthlySpend : 0; // Assuming $50 avg profit per unit
  
  const costPerChannel = activeChannels.reduce((acc, channel) => {
    acc[channel.id] = channel.costPerUnit;
    return acc;
  }, {} as { [channelId: string]: number });

  return {
    totalMonthlySpend,
    averageCAC,
    totalPaidUnits,
    organicUnits,
    blendedCAC,
    marketingROI,
    costPerChannel
  };
}

export function calculateProductRevenue(product: Product, globalHourlyRate: number = 0, blendedCAC: number = 0): {
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyGrossProfit: number;
  monthlyTimeHours: number;
  costBreakdown: {
    materials: number;
    finishing: number;
    packaging: number;
    shipping: number;
    other: number;
    labor: number;
    platformFees: number;
    marketing: number;
  };
} {
  // Handle both old and new product structures safely
  const costs = product.costs || {
    materials: 0, finishing: 0, packaging: 0, shipping: 0, other: 0
  };
  const timeBreakdown = product.timeBreakdown || {
    design: 0, setup: 0, machine: 0, finishing: 0, packaging: 0
  };
  
  const monthlyUnits = product.monthlyUnits || 0;
  const sellingPrice = product.sellingPrice || 0;
  
  const monthlyRevenue = monthlyUnits * sellingPrice;
  const totalTimeMinutes = Object.values(timeBreakdown).reduce((sum, time) => sum + (time || 0), 0);
  const totalTimeHours = totalTimeMinutes / 60;
  const laborCostPerUnit = totalTimeHours * globalHourlyRate;
  const materialCostPerUnit = Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0);
  
  // Calculate platform fees per unit
  const platformFeeCalc = calculatePlatformFees(product);
  const platformFeesPerUnit = platformFeeCalc.totalFeesPerUnit;
  
  // Add marketing cost per unit (CAC)
  const marketingCostPerUnit = blendedCAC || 0;
  
  const totalUnitCosts = materialCostPerUnit + laborCostPerUnit + platformFeesPerUnit + marketingCostPerUnit;
  const monthlyCosts = monthlyUnits * totalUnitCosts;
  const monthlyGrossProfit = monthlyRevenue - monthlyCosts;
  
  const monthlyTimeHours = (monthlyUnits * totalTimeMinutes) / 60;
  
  const costBreakdown = {
    materials: monthlyUnits * (costs.materials || 0),
    finishing: monthlyUnits * (costs.finishing || 0),
    packaging: monthlyUnits * (costs.packaging || 0),
    shipping: monthlyUnits * (costs.shipping || 0),
    other: monthlyUnits * (costs.other || 0),
    labor: monthlyUnits * laborCostPerUnit,
    platformFees: monthlyUnits * platformFeesPerUnit,
    marketing: monthlyUnits * marketingCostPerUnit,
  };
  
  return {
    monthlyRevenue,
    monthlyCosts,
    monthlyGrossProfit,
    monthlyTimeHours,
    costBreakdown
  };
}

export function calculateBusinessCosts(
  monthlyRevenue: number,
  monthlyProfit: number,
  selectedCosts: BusinessCost[]
): number {
  return selectedCosts.reduce((total, cost) => {
    if (cost.type === 'percentage') {
      // Percentage costs apply to revenue or profit based on the cost type
      const baseAmount = cost.category === 'taxes' ? monthlyProfit : monthlyRevenue;
      return total + (baseAmount * cost.value / 100);
    } else {
      // Fixed costs are simply added
      return total + cost.value;
    }
  }, 0);
}

export function calculateComprehensiveMetrics(state: CalculatorState): CalculatedMetrics {
  const productMetrics: { [productId: string]: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  let totalMonthlyUnits = 0;
  let totalMonthlyHours = 0;
  let totalGrossProfit = 0;
  let totalMonthlyRevenue = 0;
  let totalMonthlyCosts = 0;

  // Calculate marketing metrics first to get blended CAC
  const marketingMetrics = calculateMarketingMetrics(state.marketing);
  const blendedCAC = marketingMetrics.blendedCAC;

  // Calculate metrics for each product based on their monthly units
  state.products.forEach(product => {
    const productMetric = calculateProductMetrics(product, state.hourlyRate);
    const revenueMetric = calculateProductRevenue(product, state.hourlyRate, blendedCAC);
    
    productMetrics[product.id] = {
      ...productMetric,
      ...revenueMetric,
      unitsProduced: product.monthlyUnits
    };

    totalMonthlyUnits += product.monthlyUnits;
    totalMonthlyHours += revenueMetric.monthlyTimeHours;
    totalGrossProfit += revenueMetric.monthlyGrossProfit;
    totalMonthlyRevenue += revenueMetric.monthlyRevenue;
    totalMonthlyCosts += revenueMetric.monthlyCosts;
  });

  // Calculate business costs
  const totalBusinessCosts = calculateBusinessCosts(
    totalMonthlyRevenue,
    totalGrossProfit,
    state.selectedCosts
  );

  const totalNetProfit = totalGrossProfit - totalBusinessCosts;
  const averageHourlyRate = totalMonthlyHours > 0 ? totalGrossProfit / totalMonthlyHours : 0;
  const goalAchievementPercentage = state.monthlyGoal > 0 ? (totalGrossProfit / state.monthlyGoal) * 100 : 0;

  return {
    productMetrics,
    marketingMetrics,
    totalMonthlyUnits,
    totalMonthlyHours,
    totalMonthlyCosts,
    totalMarketingCosts: marketingMetrics.totalMonthlySpend,
    totalGrossProfit,
    totalNetProfit,
    averageHourlyRate,
    totalBusinessCosts,
    goalAchievementPercentage
  };
}

export function generatePriceOptimizationSuggestions(
  product: Product,
  targetHourlyRate: number = 30
): {
  currentHourlyRate: number;
  suggestedPrice: number;
  priceIncrease: number;
  impactOnDemand: string;
} {
  const currentMetrics = calculateProductMetrics(product);
  // const currentHourlyRate = currentMetrics.hourlyRate; // Will be used for comparisons later
  
  // Calculate suggested price to achieve target hourly rate
  const totalTimeHours = currentMetrics.totalTimeHours;
  const targetProfit = targetHourlyRate * totalTimeHours;
  const costs = product.costs || { materials: 0, finishing: 0, packaging: 0, shipping: 0, other: 0 };
  const totalCosts = Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0);
  const suggestedPrice = totalCosts + targetProfit;
  
  const priceIncrease = ((suggestedPrice - product.sellingPrice) / product.sellingPrice) * 100;
  
  // Simple demand impact estimation
  let impactOnDemand = 'minimal';
  if (priceIncrease > 50) impactOnDemand = 'significant';
  else if (priceIncrease > 25) impactOnDemand = 'moderate';
  else if (priceIncrease > 10) impactOnDemand = 'slight';
  
  return {
    currentHourlyRate,
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    priceIncrease: Math.round(priceIncrease * 100) / 100,
    impactOnDemand
  };
}

export function generateBusinessStrategies(state: CalculatorState): {
  strategies: Array<{
    name: string;
    description: string;
    targetHourlyRate: number;
    keyChanges: string[];
    riskLevel: 'low' | 'medium' | 'high';
    timeToProfit: number;
  }>;
} {
  const metrics = calculateComprehensiveMetrics(state);
  const currentHourlyRate = metrics.averageHourlyRate;
  
  const strategies = [
    {
      name: 'Premium Strategy',
      description: 'Focus on high-value, low-volume products with premium pricing',
      targetHourlyRate: 50,
      keyChanges: [
        'Increase prices by 30-50%',
        'Reduce product variety, focus on best sellers',
        'Invest in premium materials and finishing',
        'Target affluent customer segments'
      ],
      riskLevel: 'medium' as const,
      timeToProfit: 3
    },
    {
      name: 'Efficiency Strategy',
      description: 'Optimize processes and batch production for better time utilization',
      targetHourlyRate: 35,
      keyChanges: [
        'Batch similar products together',
        'Invest in jigs and templates',
        'Streamline finishing processes',
        'Automate repetitive design elements'
      ],
      riskLevel: 'low' as const,
      timeToProfit: 2
    },
    {
      name: 'Volume Strategy',
      description: 'Scale up production with standardized products and processes',
      targetHourlyRate: 25,
      keyChanges: [
        'Create product lines vs. custom work',
        'Implement assembly line approach',
        'Focus on faster-turnaround items',
        'Consider outsourcing some processes'
      ],
      riskLevel: 'high' as const,
      timeToProfit: 6
    }
  ];

  return { strategies };
}