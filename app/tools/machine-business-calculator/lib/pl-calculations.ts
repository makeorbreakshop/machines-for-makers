import { CalculatedMetrics, CalculatorState } from './calculator-types';
import { BusinessExpenses } from '../components/level-4-business-costs';

export interface PLCalculation {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpensesBeforeTax: number;
  taxAmount: number;
  totalOperatingExpenses: number;
  netProfit: number;
  preTaxProfit: number;
  
  // Breakdown
  materialsCost: number;
  directLaborCost: number;
  platformFeesCost: number;
  marketingCosts: number;
  indirectLaborCost: number;
  physicalCostsTotal: number;
  softwareCostsTotal: number;
  savingsCost: number;
}

export function calculatePL(
  metrics: CalculatedMetrics,
  state: CalculatorState,
  businessExpenses?: BusinessExpenses
): PLCalculation {
  // Revenue
  const revenue = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.monthlyRevenue || 0), 0
  );
  
  // Gross Profit (from metrics)
  const grossProfit = metrics.totalGrossProfit || 0;
  
  // COGS components
  const materialsCost = Object.values(metrics.productMetrics || {}).reduce(
    (sum, p: any) => sum + ((p.costBreakdown?.materials || 0) + 
                            (p.costBreakdown?.finishing || 0) + 
                            (p.costBreakdown?.packaging || 0) + 
                            (p.costBreakdown?.shipping || 0) + 
                            (p.costBreakdown?.other || 0)), 0
  );
  
  // Calculate direct labor cost using actual worker assignments
  let directLaborCost = 0;
  if (state.labor?.productLaborCost !== undefined) {
    // Use the pre-calculated product labor cost from the labor state
    // This is already monthly and uses correct worker assignments
    directLaborCost = state.labor.productLaborCost;
  } else if (state.labor?.workers && state.products) {
    // Fallback: Calculate from product assignments
    const productAssignments = state.labor.productAssignments || {};
    
    state.products.forEach(product => {
      const productMetric = metrics.productMetrics?.[product.id];
      if (productMetric) {
        // Get the assigned worker for this product
        const assignedWorkerId = productAssignments[product.id] || 'owner';
        const worker = state.labor!.workers.find(w => w.id === assignedWorkerId);
        
        if (worker) {
          // Calculate labor cost based on actual worker rate
          const monthlyHours = productMetric.monthlyTimeHours || 0;
          // Note: monthlyTimeHours includes machine time, so we need to subtract it
          const timeBreakdown = product.timeBreakdown || { design: 0, setup: 0, machine: 0, finishing: 0, packaging: 0 };
          const laborMinutes = timeBreakdown.design + timeBreakdown.setup + timeBreakdown.finishing + timeBreakdown.packaging;
          const laborHours = (laborMinutes / 60) * (product.monthlyUnits || 0);
          
          directLaborCost += laborHours * worker.hourlyRate;
        }
      }
    });
  } else {
    // Fallback to the old calculation if labor state is not available
    directLaborCost = Object.values(metrics.productMetrics || {}).reduce(
      (sum, product: any) => sum + (product.costBreakdown?.labor || 0), 0
    );
  }
  
  const platformFeesCost = Object.values(metrics.productMetrics || {}).reduce(
    (sum, p: any) => sum + (p.costBreakdown?.platformFees || 0), 0
  );
  
  const cogs = materialsCost + directLaborCost + platformFeesCost;
  
  // Operating Expenses
  const actualBusinessExpenses = businessExpenses || {
    taxReserve: { 
      selfEmploymentRate: 0,
      federalRate: 0,
      stateRate: 0,
      expanded: false
    },
    physicalCosts: { items: { rent: 0, insurance: 0, utilities: 0 }, expanded: false },
    softwareCosts: { items: { design_software: 0, accounting_software: 0 }, expanded: false },
    savings: { rate: 0, expanded: false }
  };
  
  const physicalCostsTotal = Object.values(actualBusinessExpenses.physicalCosts.items).reduce(
    (sum, cost) => sum + cost, 0
  );
  
  const softwareCostsTotal = Object.values(actualBusinessExpenses.softwareCosts.items).reduce(
    (sum, cost) => sum + cost, 0
  );
  
  const savingsCost = (revenue * actualBusinessExpenses.savings.rate) / 100;
  
  // Labor costs
  // Use pre-calculated business tasks labor cost if available
  let indirectLaborCost = 0;
  if (state.labor?.businessTasksLaborCost !== undefined) {
    // Use the pre-calculated business tasks labor cost from the labor state
    // This is already monthly and uses correct worker assignments
    indirectLaborCost = state.labor.businessTasksLaborCost;
  } else if (state.labor?.businessTasks && state.labor?.workers) {
    // Fallback: Calculate business tasks labor
    // Business tasks are ALWAYS indirect costs (operating expenses)
    state.labor.businessTasks.forEach(task => {
      const assignedWorkerId = task.assignedWorkerId || 'owner';
      const worker = state.labor!.workers.find(w => w.id === assignedWorkerId);
      if (worker) {
        indirectLaborCost += task.hoursPerWeek * worker.hourlyRate * 4.33; // Convert to monthly
      }
    });
  }
  
  // Debug logging
  console.log('P&L Labor Calculation:', {
    directLaborCost,
    indirectLaborCost,
    businessTasks: state.labor?.businessTasks,
    workers: state.labor?.workers,
    productAssignments: state.labor?.productAssignments
  });
  
  // Marketing costs
  const marketingCosts = metrics.totalMarketingCosts || 0;
  
  // Operating expenses before tax
  const operatingExpensesBeforeTax = physicalCostsTotal + softwareCostsTotal + savingsCost + marketingCosts + indirectLaborCost;
  
  // Tax calculation
  const preTaxProfit = grossProfit - operatingExpensesBeforeTax;
  const totalTaxRate = actualBusinessExpenses.taxReserve.selfEmploymentRate + 
                       actualBusinessExpenses.taxReserve.federalRate + 
                       actualBusinessExpenses.taxReserve.stateRate;
  const taxAmount = Math.max(0, (preTaxProfit * totalTaxRate) / 100);
  
  // Total operating expenses including tax
  const totalOperatingExpenses = operatingExpensesBeforeTax + taxAmount;
  
  // Net profit
  const netProfit = grossProfit - totalOperatingExpenses;
  
  return {
    revenue,
    cogs,
    grossProfit,
    operatingExpensesBeforeTax,
    taxAmount,
    totalOperatingExpenses,
    netProfit,
    preTaxProfit,
    materialsCost,
    directLaborCost,
    platformFeesCost,
    marketingCosts,
    indirectLaborCost,
    physicalCostsTotal,
    softwareCostsTotal,
    savingsCost
  };
}