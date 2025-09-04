'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Receipt, Percent, DollarSign, Settings, Building, Calculator, X, ChevronDown } from 'lucide-react';
import { CalculatorState, CalculatedMetrics, BusinessCost } from '../lib/calculator-types';
import { calculateBusinessCosts } from '../lib/calculator-formulas';

interface Level4BusinessCostsProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateBusinessMode: (mode: 'hobby' | 'side' | 'business') => void;
  onToggleBusinessCost: (cost: BusinessCost) => void;
  onUpdateBusinessCost: (costId: string, updates: any) => void;
  onComplete: () => void;
  onBack: () => void;
  onBusinessExpensesChange?: (expenses: any) => void;
}

export function Level4BusinessCosts({ 
  state, 
  metrics, 
  onUpdateBusinessMode,
  onToggleBusinessCost,
  onUpdateBusinessCost,
  onComplete, 
  onBack,
  onBusinessExpensesChange
}: Level4BusinessCostsProps) {
  const [businessExpenses, setBusinessExpenses] = useState({
    taxReserve: { rate: 30, expanded: false },
    physicalCosts: {
      expanded: false,
      items: {
        rent: 200,
        insurance: 75,
        utilities: 50
      }
    },
    softwareCosts: {
      expanded: false, 
      items: {
        design_software: 50,
        accounting_software: 25
      }
    },
    equipmentFund: { rate: 8, expanded: false }
  });

  // Notify parent of changes
  useEffect(() => {
    if (onBusinessExpensesChange) {
      onBusinessExpensesChange(businessExpenses);
    }
  }, [businessExpenses, onBusinessExpensesChange]);

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

  // Calculate business costs
  const taxCost = (grossProfit * businessExpenses.taxReserve.rate) / 100;
  const equipmentFundCost = (monthlyRevenue * businessExpenses.equipmentFund.rate) / 100;
  const physicalCostsTotal = Object.values(businessExpenses.physicalCosts.items).reduce((sum, cost) => sum + cost, 0);
  const softwareCostsTotal = Object.values(businessExpenses.softwareCosts.items).reduce((sum, cost) => sum + cost, 0);
  const totalBusinessCosts = taxCost + physicalCostsTotal + softwareCostsTotal + equipmentFundCost;
  const netProfit = grossProfit - totalBusinessCosts;

  const canProceed = true; // Always allow proceeding from this level

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {/* Tax Reserve */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                taxReserve: { ...prev.taxReserve, expanded: !prev.taxReserve.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-muted/50 px-6 py-4 border-b border-border w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span className="text-base font-medium text-foreground">Tax Reserve</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(taxCost)} total
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.taxReserve.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.taxReserve.expanded && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-3">
                  <Label className="text-sm font-medium text-foreground">Tax Rate</Label>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={businessExpenses.taxReserve.rate || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setBusinessExpenses(prev => ({
                          ...prev,
                          taxReserve: { ...prev.taxReserve, rate: isNaN(value) ? 0 : Math.max(0, Math.min(100, value)) }
                        }));
                      }}
                      className="pr-6 h-8 text-sm text-foreground"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">%</span>
                  </div>
                  <span className="text-sm text-foreground">of profit</span>
                </div>
                <p className="text-xs text-foreground">
                  Self-employment tax (15.3%) + income tax. Range: 25-40% typical
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Physical Costs */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                physicalCosts: { ...prev.physicalCosts, expanded: !prev.physicalCosts.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-muted/50 px-6 py-4 border-b border-border w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    <span className="text-base font-medium text-foreground">Physical Costs</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(physicalCostsTotal)} total
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.physicalCosts.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.physicalCosts.expanded && (
              <div className="p-6 space-y-1">
              {Object.entries(businessExpenses.physicalCosts.items).map(([costType, value]) => (
                <div key={costType} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                  <Input
                    value={costType.replace('_', ' ').charAt(0).toUpperCase() + costType.slice(1).replace('_', ' ')}
                    onChange={(e) => {
                      const newCostType = e.target.value.toLowerCase().replace(' ', '_');
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
                    placeholder="Cost name"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={value || ''}
                      onChange={(e) => setBusinessExpenses(prev => ({
                        ...prev,
                        physicalCosts: {
                          ...prev.physicalCosts,
                          items: { ...prev.physicalCosts.items, [costType]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }
                        }
                      }))}
                      className="pl-6 h-8 text-sm w-full text-foreground"
                      placeholder="0.00"
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

        {/* Software Costs */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                softwareCosts: { ...prev.softwareCosts, expanded: !prev.softwareCosts.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-muted/50 px-6 py-4 border-b border-border w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <span className="text-base font-medium text-foreground">Software & Tools</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(softwareCostsTotal)} total
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.softwareCosts.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.softwareCosts.expanded && (
              <div className="p-6 space-y-1">
              {Object.entries(businessExpenses.softwareCosts.items).map(([costType, value]) => (
                <div key={costType} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                  <Input
                    value={costType.replace('_', ' ').charAt(0).toUpperCase() + costType.slice(1).replace('_', ' ')}
                    onChange={(e) => {
                      const newCostType = e.target.value.toLowerCase().replace(' ', '_');
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
                    placeholder="Software name"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={value || ''}
                      onChange={(e) => setBusinessExpenses(prev => ({
                        ...prev,
                        softwareCosts: {
                          ...prev.softwareCosts,
                          items: { ...prev.softwareCosts.items, [costType]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }
                        }
                      }))}
                      className="pl-6 h-8 text-sm w-full text-foreground"
                      placeholder="0.00"
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
                  const newCostKey = `software_${Date.now()}`;
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

        {/* Equipment Fund */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <Button
              variant="ghost"
              onClick={() => setBusinessExpenses(prev => ({
                ...prev,
                equipmentFund: { ...prev.equipmentFund, expanded: !prev.equipmentFund.expanded }
              }))}
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="bg-muted/50 px-6 py-4 border-b border-border w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-base font-medium text-foreground">Equipment Fund</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyPrecise(equipmentFundCost)} total
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${businessExpenses.equipmentFund.expanded ? 'transform rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </Button>

            {businessExpenses.equipmentFund.expanded && (
              <div className="p-6">
              <div className="flex items-center gap-4 mb-3">
                <Label className="text-sm font-medium text-foreground">Equipment Fund</Label>
                <div className="relative w-24">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={businessExpenses.equipmentFund.rate || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setBusinessExpenses(prev => ({
                        ...prev,
                        equipmentFund: { ...prev.equipmentFund, rate: isNaN(value) ? 0 : Math.max(0, Math.min(100, value)) }
                      }));
                    }}
                    className="pr-6 h-8 text-sm text-foreground"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-foreground">%</span>
                </div>
                <span className="text-sm text-foreground">of revenue</span>
              </div>
              <p className="text-xs text-foreground">
                Maintenance, repairs, upgrades, replacement. Range: 5-12% typical
              </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Expenses Summary */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="bg-muted/50 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-base font-medium text-foreground">Business Expenses Summary</span>
              </div>
            </div>
            
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Reserve ({businessExpenses.taxReserve.rate}%)</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(taxCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rent & Facilities</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(physicalCostsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Software & Tools</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(softwareCostsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipment Fund ({businessExpenses.equipmentFund.rate}%)</span>
                <span className="font-mono font-medium text-foreground">{formatCurrency(equipmentFundCost)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Business Expenses</span>
                  <span className="font-mono font-medium text-lg text-destructive">{formatCurrency(totalBusinessCosts)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground">Impact on Profit</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {monthlyRevenue > 0 ? `${((totalBusinessCosts / monthlyRevenue) * 100).toFixed(1)}% of revenue` : 'N/A'}
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