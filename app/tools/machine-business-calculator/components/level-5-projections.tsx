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
      selfEmploymentRate: 15.3,
      federalRate: 12,
      stateRate: 5,
      expanded: false
    },
    physicalCosts: { items: { rent: 200, insurance: 75, utilities: 50 }, expanded: false },
    softwareCosts: { items: { design_software: 50, accounting_software: 25 }, expanded: false },
    savings: { rate: 8, expanded: false }
  };
  
  const totalTaxRate = actualBusinessExpenses.taxReserve.selfEmploymentRate + 
                       actualBusinessExpenses.taxReserve.federalRate + 
                       actualBusinessExpenses.taxReserve.stateRate;

  // Calculate projections for different time periods
  const quarterlyProfit = netProfit * 3;
  const annualProfit = netProfit * 12;

  return (
    <div className="space-y-6">
      {/* P&L Statement */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-base font-medium text-foreground">Profit & Loss Statement</span>
              <span className="text-xs text-muted-foreground ml-auto">Monthly View</span>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Revenue Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Revenue</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(monthlyRevenue)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Cost of Goods Sold</div>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Materials & Supplies</span>
                  <span className="font-mono text-muted-foreground">
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Direct Labor</span>
                  <span className="font-mono text-muted-foreground">
                    {formatCurrencyPrecise(
                      Object.values(metrics.productMetrics || {}).reduce(
                        (sum, p: any) => sum + (p.costBreakdown?.labor || 0), 0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fees</span>
                  <span className="font-mono text-muted-foreground">
                    {formatCurrencyPrecise(
                      Object.values(metrics.productMetrics || {}).reduce(
                        (sum, p: any) => sum + (p.costBreakdown?.platformFees || 0), 0
                      )
                    )}
                  </span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span className="text-muted-foreground">Total COGS</span>
                <span className="font-mono text-muted-foreground">-{formatCurrency(productCosts)}</span>
              </div>
            </div>
            
            {/* Gross Profit */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Gross Profit</span>
                <div className="text-right">
                  <div className="font-mono font-bold">{formatCurrency(grossProfit)}</div>
                  <div className="text-xs text-muted-foreground">
                    {monthlyRevenue > 0 ? `${((grossProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Operating Expenses</div>
              <div className="pl-4 space-y-1">
                {marketingCosts > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Marketing & Advertising</span>
                    <span className="font-mono text-muted-foreground">{formatCurrencyPrecise(marketingCosts)}</span>
                  </div>
                )}
                {indirectLaborCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Business Labor (Admin, etc.)</span>
                    <span className="font-mono text-muted-foreground">{formatCurrencyPrecise(indirectLaborCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Physical Costs</span>
                  <span className="font-mono text-muted-foreground">{formatCurrencyPrecise(physicalCostsTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Software & Tools</span>
                  <span className="font-mono text-muted-foreground">{formatCurrencyPrecise(softwareCostsTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Savings ({actualBusinessExpenses.savings.rate}%)</span>
                  <span className="font-mono text-muted-foreground">{formatCurrencyPrecise(savingsCost)}</span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span className="text-muted-foreground">Total Operating</span>
                <span className="font-mono text-muted-foreground">
                  -{formatCurrency(operatingExpensesBeforeTax)}
                </span>
              </div>
            </div>
            
            {/* Pre-Tax Profit */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Pre-Tax Profit (EBIT)</span>
                <div className="text-right">
                  <div className="font-mono font-bold">{formatCurrency(preTaxProfit)}</div>
                  <div className="text-xs text-muted-foreground">
                    {monthlyRevenue > 0 ? `${((preTaxProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Taxes */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax Reserve ({totalTaxRate.toFixed(1)}% of pre-tax)</span>
                <span className="font-mono text-muted-foreground">-{formatCurrencyPrecise(taxCost)}</span>
              </div>
            </div>
            
            {/* Net Profit */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-lg">Net Profit</span>
                <div className="text-right">
                  <div className={`font-mono font-bold text-xl ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(netProfit)}
                  </div>
                  <div className="text-xs text-muted-foreground">
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
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Monthly</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(netProfit)}
                </div>
                <div className="text-xs text-muted-foreground">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Quarterly</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className={`text-2xl font-bold ${quarterlyProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(quarterlyProfit)}
                </div>
                <div className="text-xs text-muted-foreground">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Annual</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className={`text-2xl font-bold ${annualProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(annualProfit)}
                </div>
                <div className="text-xs text-muted-foreground">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}