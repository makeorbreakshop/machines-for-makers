'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign, Calculator, Activity } from 'lucide-react';
import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';
import { BusinessExpenses } from './level-4-business-costs';
import { PLCalculation } from '../lib/pl-calculations';

interface Level5ProjectionsProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  businessExpenses?: BusinessExpenses;
  plCalculation?: PLCalculation;
}

export function Level5Projections({ 
  state, 
  metrics,
  businessExpenses,
  plCalculation 
}: Level5ProjectionsProps) {
  
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  const formatCurrencyPrecise = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  // Use shared calculation if provided, otherwise calculate locally
  const {
    revenue: monthlyRevenue,
    cogs: productCosts,
    grossProfit,
    materialsCost,
    directLaborCost,
    platformFeesCost,
    marketingCosts,
    indirectLaborCost,
    physicalCostsTotal,
    softwareCostsTotal,
    savingsCost,
    preTaxProfit,
    taxAmount: taxCost,
    netProfit,
    operatingExpensesBeforeTax
  } = plCalculation || {
    // Fallback calculations if not provided
    revenue: Object.values(metrics.productMetrics || {}).reduce(
      (sum, product: any) => sum + (product.monthlyRevenue || 0), 0
    ),
    cogs: 0,
    grossProfit: metrics.totalGrossProfit || 0,
    materialsCost: 0,
    directLaborCost: 0,
    platformFeesCost: 0,
    marketingCosts: 0,
    indirectLaborCost: 0,
    physicalCostsTotal: 0,
    softwareCostsTotal: 0,
    savingsCost: 0,
    preTaxProfit: 0,
    taxAmount: 0,
    netProfit: 0,
    operatingExpensesBeforeTax: 0
  };
  
  // Get business expenses for display
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
  
  const totalTaxRate = actualBusinessExpenses.taxReserve.selfEmploymentRate + 
                       actualBusinessExpenses.taxReserve.federalRate + 
                       actualBusinessExpenses.taxReserve.stateRate;

  // Calculate projections for different time periods
  const quarterlyProfit = netProfit * 3;
  const annualProfit = netProfit * 12;

  return (
    <div className="space-y-4">
      {/* P&L Statement */}
      <Card className="border-0 bg-white dark:bg-gray-800/50 shadow-lg">
        <CardContent className="p-0">
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profit & Loss Statement</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-auto">Monthly View</span>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {/* Revenue Section */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Revenue</span>
                <span className="font-mono font-bold text-xl tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(monthlyRevenue)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div className="space-y-1">
              <div className="text-base font-semibold text-gray-700 dark:text-gray-300">Cost of Goods Sold</div>
              <div className="pl-3 space-y-0.5">
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 dark:text-gray-300">Materials & Supplies</span>
                  <span className="font-mono tabular-nums text-gray-600 dark:text-gray-400">
                    {formatCurrencyPrecise(
                      Object.values(metrics.productMetrics || {}).reduce(
                        (sum, p: any) => sum + ((p.costBreakdown?.materials || 0) + 
                                                (p.costBreakdown?.finishing || 0) + 
                                                (p.costBreakdown?.packaging || 0) + 
                                                (p.costBreakdown?.shipping || 0) + 
                                                (p.costBreakdown?.other || 0)), 0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 dark:text-gray-300">Direct Labor</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {formatCurrencyPrecise(
                      Object.values(metrics.productMetrics || {}).reduce(
                        (sum, p: any) => sum + (p.costBreakdown?.labor || 0), 0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 dark:text-gray-300">Platform Fees</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {formatCurrencyPrecise(
                      Object.values(metrics.productMetrics || {}).reduce(
                        (sum, p: any) => sum + (p.costBreakdown?.platformFees || 0), 0
                      )
                    )}
                  </span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total COGS</span>
                <span className="font-mono font-semibold tabular-nums text-gray-600 dark:text-gray-400">-{formatCurrency(productCosts)}</span>
              </div>
            </div>
            
            {/* Gross Profit */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Gross Profit</span>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(grossProfit)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {monthlyRevenue > 0 ? `${((grossProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-1">
              <div className="text-base font-semibold text-gray-700 dark:text-gray-300">Operating Expenses</div>
              <div className="pl-3 space-y-0.5">
                {marketingCosts > 0 && (
                  <div className="flex justify-between text-base">
                    <span className="text-gray-700 dark:text-gray-300">Marketing & Advertising</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">{formatCurrencyPrecise(marketingCosts)}</span>
                  </div>
                )}
                {indirectLaborCost > 0 && (
                  <div className="flex justify-between text-base">
                    <span className="text-gray-700 dark:text-gray-300">Business Labor (Admin, etc.)</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">{formatCurrencyPrecise(indirectLaborCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 dark:text-gray-300">Physical Costs</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">{formatCurrencyPrecise(physicalCostsTotal)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 dark:text-gray-300">Software & Tools</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">{formatCurrencyPrecise(softwareCostsTotal)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 dark:text-gray-300">Savings ({actualBusinessExpenses.savings.rate}%)</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">{formatCurrencyPrecise(savingsCost)}</span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span className="text-gray-700 dark:text-gray-300">Total Operating</span>
                <span className="font-mono text-gray-600 dark:text-gray-400">
                  -{formatCurrency(operatingExpensesBeforeTax)}
                </span>
              </div>
            </div>
            
            {/* Pre-Tax Profit */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Pre-Tax Profit (EBIT)</span>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(preTaxProfit)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {monthlyRevenue > 0 ? `${((preTaxProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Taxes */}
            <div className="space-y-1">
              <div className="flex justify-between text-base">
                <span className="text-gray-700 dark:text-gray-300">Tax Reserve ({totalTaxRate.toFixed(1)}% of pre-tax)</span>
                <span className="font-mono text-gray-600 dark:text-gray-400">-{formatCurrencyPrecise(taxCost)}</span>
              </div>
            </div>
            
            {/* Net Profit */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">Net Profit</span>
                <div className="text-right">
                  <div className={`font-mono font-black text-2xl tabular-nums ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(netProfit)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {monthlyRevenue > 0 ? `${((netProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Period Projections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Monthly</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className={`text-2xl font-black tabular-nums ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(netProfit)}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Quarterly</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className={`text-2xl font-black tabular-nums ${quarterlyProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(quarterlyProfit)}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Annual</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className={`text-2xl font-black tabular-nums ${annualProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(annualProfit)}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}