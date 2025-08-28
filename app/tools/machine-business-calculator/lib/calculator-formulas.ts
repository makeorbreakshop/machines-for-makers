import { Product, BusinessCost, CalculatedMetrics, CalculatorState } from './calculator-types';

export function calculateProductMetrics(product: Product, globalHourlyRate: number = 0): {
  totalTimeMinutes: number;
  totalTimeHours: number;
  totalCosts: number;
  laborCosts: number;
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
  const totalCosts = materialCosts + laborCosts;
  const grossProfit = (product.sellingPrice || 0) - totalCosts;
  const profitMargin = product.sellingPrice > 0 ? grossProfit / product.sellingPrice : 0;
  const hourlyRate = totalTimeHours > 0 ? grossProfit / totalTimeHours : 0;

  return {
    totalTimeMinutes,
    totalTimeHours,
    totalCosts,
    laborCosts,
    grossProfit,
    profitMargin,
    hourlyRate
  };
}

export function calculateProductRevenue(product: Product, globalHourlyRate: number = 0): {
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
  const totalUnitCosts = materialCostPerUnit + laborCostPerUnit;
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

  // Calculate metrics for each product based on their monthly units
  state.products.forEach(product => {
    const productMetric = calculateProductMetrics(product, state.hourlyRate);
    const revenueMetric = calculateProductRevenue(product, state.hourlyRate);
    
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
    totalMonthlyUnits,
    totalMonthlyHours,
    totalMonthlyCosts,
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