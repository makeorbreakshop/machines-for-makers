'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, DollarSign, Building, Server, Calculator, ChevronDown, TrendingUp, Percent } from 'lucide-react';
import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';

export interface BusinessExpenses {
  physicalCosts: {
    items: Record<string, number>;
    expanded: boolean;
  };
  softwareCosts: {
    items: Record<string, number>;
    expanded: boolean;
  };
  taxReserve: {
    selfEmploymentRate: number;
    federalRate: number;
    stateRate: number;
    expanded: boolean;
  };
  savings: {
    rate: number;
    expanded: boolean;
  };
}

interface Level4BusinessCostsProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onComplete: () => void;
  onBusinessExpensesChange?: (expenses: BusinessExpenses) => void;
}

export function Level4BusinessCosts({ 
  state, 
  metrics, 
  onComplete,
  onBusinessExpensesChange
}: Level4BusinessCostsProps) {
  // Initialize from saved state or use defaults
  const [businessExpenses, setBusinessExpenses] = useState<BusinessExpenses>(() => {
    // Check if we have saved business expenses in state
    if (state.businessExpenses) {
      return state.businessExpenses;
    }
    
    // Default values for new calculators
    return {
      physicalCosts: {
        items: {
          Rent: 0,
          Utilities: 0,
          Insurance: 0
        },
        expanded: false
      },
      softwareCosts: {
        items: {
          Accounting: 0,
          'Design tools': 0,
          Website: 0,
          'Marketing tools': 0
        },
        expanded: false
      },
      // Tax breakdown with typical rates
      taxReserve: { 
        selfEmploymentRate: 0,  // Social Security + Medicare (recommended: 15.3%)
        federalRate: 0,           // Federal income tax (recommended: 10-12%)
        stateRate: 0,              // State/local taxes (recommended: 0-13%)
        expanded: false 
      },
      savings: { rate: 0, expanded: false }  // Recommended: 5-10%
    };
  });

  // Notify parent of changes - only when local state actually changes
  useEffect(() => {
    if (onBusinessExpensesChange) {
      // Only call if the expenses have actually changed from what's in parent state
      const hasChanged = JSON.stringify(businessExpenses) !== JSON.stringify(state.businessExpenses);
      if (hasChanged) {
        onBusinessExpensesChange(businessExpenses);
      }
    }
  }, [businessExpenses]); // Removed onBusinessExpensesChange from deps to prevent loops

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

  // Calculate totals from current metrics
  const monthlyRevenue = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.monthlyRevenue || 0), 0
  );
  const grossProfit = metrics.totalGrossProfit || 0;

  // Calculate business costs (excluding tax first)
  const physicalCostsTotal = Object.values(businessExpenses.physicalCosts.items).reduce((sum, cost) => sum + cost, 0);
  const softwareCostsTotal = Object.values(businessExpenses.softwareCosts.items).reduce((sum, cost) => sum + cost, 0);
  const savingsCost = (monthlyRevenue * businessExpenses.savings.rate) / 100;
  
  // Pre-tax profit = Gross Profit - Business Expenses (excluding tax)
  const preTaxProfit = grossProfit - (physicalCostsTotal + softwareCostsTotal + savingsCost);
  
  // Calculate total tax rate and cost
  const totalTaxRate = businessExpenses.taxReserve.selfEmploymentRate + 
                       businessExpenses.taxReserve.federalRate + 
                       businessExpenses.taxReserve.stateRate;
  const taxCost = Math.max(0, (preTaxProfit * totalTaxRate) / 100);
  
  // Total costs including tax
  const totalBusinessCosts = physicalCostsTotal + softwareCostsTotal + savingsCost + taxCost;
  
  // After-tax profit
  const netProfit = grossProfit - totalBusinessCosts;

  const canProceed = true; // Always allow proceeding from this level

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Physical Costs */}
        <Card className="!border-0 border-none bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                physicalCosts: { ...prev.physicalCosts, expanded: !prev.physicalCosts.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Physical Costs</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(physicalCostsTotal)}/mo
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.physicalCosts.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.physicalCosts.expanded && (
              <div className="p-4 space-y-1">
              {Object.entries(businessExpenses.physicalCosts.items).map(([costType, value]) => (
                <div key={costType} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                  <Input
                    value={costType}
                    onChange={(e) => {
                      const newCostType = e.target.value;
                      setBusinessExpenses(prev => {
                        const newItems = { ...prev.physicalCosts.items };
                        delete newItems[costType];
                        newItems[newCostType] = value;
                        return {
                          ...prev,
                          physicalCosts: { ...prev.physicalCosts, items: newItems }
                        };
                      });
                    }}
                    className="h-8 text-sm flex-1 text-foreground"
                    placeholder="Monthly cost name"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={value === 0 ? '' : value}
                      onChange={(e) => setBusinessExpenses(prev => ({
                        ...prev,
                        physicalCosts: {
                          ...prev.physicalCosts,
                          items: { ...prev.physicalCosts.items, [costType]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }
                        }
                      }))}
                      className="pl-6 h-8 text-sm w-full text-foreground"
                      placeholder="0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBusinessExpenses(prev => {
                        const newItems = { ...prev.physicalCosts.items };
                        delete newItems[costType];
                        return {
                          ...prev,
                          physicalCosts: { ...prev.physicalCosts, items: newItems }
                        };
                      });
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="ghost"
                onClick={() => {
                  const newCostKey = `expense_${Date.now()}`;
                  setBusinessExpenses(prev => ({
                    ...prev,
                    physicalCosts: {
                      ...prev.physicalCosts,
                      items: { ...prev.physicalCosts.items, [newCostKey]: 0 }
                    }
                  }));
                }}
                className="w-full h-8 text-sm text-muted-foreground hover:text-foreground"
              >
                + Add Physical Cost
              </Button>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Software & Tools */}
        <Card className="!border-0 border-none bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                softwareCosts: { ...prev.softwareCosts, expanded: !prev.softwareCosts.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Software & Tools</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(softwareCostsTotal)}/mo
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.softwareCosts.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.softwareCosts.expanded && (
              <div className="p-4 space-y-1">
                {Object.entries(businessExpenses.softwareCosts.items).map(([costType, value]) => (
                  <div key={costType} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                    <Input
                      value={costType}
                      onChange={(e) => {
                        const newCostType = e.target.value;
                        setBusinessExpenses(prev => {
                          const newItems = { ...prev.softwareCosts.items };
                          delete newItems[costType];
                          newItems[newCostType] = value;
                          return {
                            ...prev,
                            softwareCosts: { ...prev.softwareCosts, items: newItems }
                          };
                        });
                      }}
                      className="h-8 text-sm flex-1 text-foreground"
                      placeholder="Monthly tool name"
                    />
                    <div className="relative w-24">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={value === 0 ? '' : value}
                        onChange={(e) => setBusinessExpenses(prev => ({
                          ...prev,
                          softwareCosts: {
                            ...prev.softwareCosts,
                            items: { ...prev.softwareCosts.items, [costType]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }
                          }
                        }))}
                        className="pl-6 h-8 text-sm w-full text-foreground"
                        placeholder="0"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBusinessExpenses(prev => {
                          const newItems = { ...prev.softwareCosts.items };
                          delete newItems[costType];
                          return {
                            ...prev,
                            softwareCosts: { ...prev.softwareCosts, items: newItems }
                          };
                        });
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    const newCostKey = `tool_${Date.now()}`;
                    setBusinessExpenses(prev => ({
                      ...prev,
                      softwareCosts: {
                        ...prev.softwareCosts,
                        items: { ...prev.softwareCosts.items, [newCostKey]: 0 }
                      }
                    }));
                  }}
                  className="w-full h-8 text-sm text-muted-foreground hover:text-foreground"
                >
                  + Add Software Cost
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings */}
        <Card className="!border-0 border-none bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                savings: { ...prev.savings, expanded: !prev.savings.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Savings</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(savingsCost)} ({businessExpenses.savings.rate}%)
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.savings.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.savings.expanded && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <Label className="text-sm font-medium text-foreground">Savings Percentage</Label>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={businessExpenses.savings.rate || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setBusinessExpenses(prev => ({
                          ...prev,
                          savings: { ...prev.savings, rate: Math.min(100, Math.max(0, value)) }
                        }));
                      }}
                      className="pr-6 h-8 text-sm w-full text-foreground"
                      placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">%</span>
                  </div>
                  <span className="text-sm text-muted-foreground">of revenue</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium">Monthly allocation: {formatCurrency(savingsCost)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Reserve - Moved to bottom */}
        <Card className="!border-0 border-none bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                taxReserve: { ...prev.taxReserve, expanded: !prev.taxReserve.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tax Reserve</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(taxCost)} ({totalTaxRate.toFixed(1)}% of pre-tax profit)
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.taxReserve.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.taxReserve.expanded && (
              <div className="p-4 space-y-3">
                {/* Self-Employment Tax */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-foreground w-36">Self-Employment</Label>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={businessExpenses.taxReserve.selfEmploymentRate || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setBusinessExpenses(prev => ({
                            ...prev,
                            taxReserve: { ...prev.taxReserve, selfEmploymentRate: Math.min(100, Math.max(0, value)) }
                          }));
                        }}
                        className="pr-6 h-8 text-sm w-full text-foreground"
                        placeholder="15.3"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">%</span>
                    </div>
                    <span className="text-sm font-medium w-24 text-right">
                      {formatCurrencyPrecise(Math.max(0, (preTaxProfit * businessExpenses.taxReserve.selfEmploymentRate) / 100))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-36">Social Security (12.4%) + Medicare (2.9%)</p>
                </div>

                {/* Federal Income Tax */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-foreground w-36">Federal Income</Label>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={businessExpenses.taxReserve.federalRate || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setBusinessExpenses(prev => ({
                            ...prev,
                            taxReserve: { ...prev.taxReserve, federalRate: Math.min(100, Math.max(0, value)) }
                          }));
                        }}
                        className="pr-6 h-8 text-sm w-full text-foreground"
                        placeholder="12"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">%</span>
                    </div>
                    <span className="text-sm font-medium w-24 text-right">
                      {formatCurrencyPrecise(Math.max(0, (preTaxProfit * businessExpenses.taxReserve.federalRate) / 100))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-36">
                    10-12% typical for small business (varies by income)
                  </p>
                </div>

                {/* State/Local Tax */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Label className="text-sm font-medium text-foreground w-36">State/Local</Label>
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={businessExpenses.taxReserve.stateRate || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setBusinessExpenses(prev => ({
                            ...prev,
                            taxReserve: { ...prev.taxReserve, stateRate: Math.min(100, Math.max(0, value)) }
                          }));
                        }}
                        className="pr-6 h-8 text-sm w-full text-foreground"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">%</span>
                    </div>
                    <span className="text-sm font-medium w-24 text-right">
                      {formatCurrencyPrecise(Math.max(0, (preTaxProfit * businessExpenses.taxReserve.stateRate) / 100))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-36">
                    0-13% depending on your state (CA: 9.3%, TX: 0%, NY: 6.5%)
                  </p>
                </div>

                <div className="border-t pt-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Tax Rate</span>
                    <span className="text-sm font-medium">{totalTaxRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Pre-tax profit</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(preTaxProfit)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium">Total Tax Reserve</span>
                    <span className="text-sm font-medium text-amber-600">{formatCurrency(taxCost)}</span>
                  </div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Expenses Summary */}
        <Card className="!border-0 border-none bg-white dark:bg-gray-800/50 shadow-lg">
          <CardContent className="p-0">
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Business Expenses Summary</span>
              </div>
            </div>
            
            <div className="p-4 space-y-2 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Physical Costs</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {totalBusinessCosts > 0 ? `${((physicalCostsTotal / totalBusinessCosts) * 100).toFixed(1)}%` : '0%'}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-gray-100 w-24 text-right">
                      {formatCurrencyPrecise(physicalCostsTotal)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Software & Tools</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {totalBusinessCosts > 0 ? `${((softwareCostsTotal / totalBusinessCosts) * 100).toFixed(1)}%` : '0%'}
                    </span>
                    <span className="font-mono font-medium text-foreground w-24 text-right">
                      {formatCurrencyPrecise(softwareCostsTotal)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Savings</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {totalBusinessCosts > 0 ? `${((savingsCost / totalBusinessCosts) * 100).toFixed(1)}%` : '0%'}
                    </span>
                    <span className="font-mono font-medium text-foreground w-24 text-right">
                      {formatCurrencyPrecise(savingsCost)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tax Reserve</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {totalBusinessCosts > 0 ? `${((taxCost / totalBusinessCosts) * 100).toFixed(1)}%` : '0%'}
                    </span>
                    <span className="font-mono font-medium text-foreground w-24 text-right">
                      {formatCurrencyPrecise(taxCost)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-base text-gray-900 dark:text-gray-100">Total Monthly Expenses</span>
                  <span className="font-mono font-black text-xl tabular-nums text-gray-900 dark:text-gray-100">
                    {formatCurrency(totalBusinessCosts)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground text-xs">% of Revenue</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {monthlyRevenue > 0 ? `${((totalBusinessCosts / monthlyRevenue) * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}