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
  
  const directLaborCost = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.costBreakdown?.labor || 0), 0
  );
  
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
  const totalLaborCost = state.labor?.totalLaborCost || 0;
  const indirectLaborCost = Math.max(0, totalLaborCost - directLaborCost);
  
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