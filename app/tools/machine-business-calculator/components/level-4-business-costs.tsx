'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ArrowLeft, Receipt, Percent, DollarSign, Settings, Building, Calculator, X } from 'lucide-react';
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
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Level 4: Business Costs Reality
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl">
          Account for taxes, overhead, and hidden costs that eat into your profits.
        </p>
      </div>

      {/* Current Performance Summary */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Monthly Revenue</div>
              <div className="text-xl font-bold">{formatCurrency(monthlyRevenue)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Gross Profit</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(grossProfit)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Net Profit</div>
              <div className={`text-xl font-bold ${netProfit > 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(netProfit)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Tax Reserve */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setBusinessExpenses(prev => ({
              ...prev,
              taxReserve: { ...prev.taxReserve, expanded: !prev.taxReserve.expanded }
            }))}
            className="w-full justify-between p-3 h-auto"
          >
            <div className="flex items-center gap-3">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Tax Reserve</h4>
              <span className="text-sm font-medium text-muted-foreground">
                {formatCurrencyPrecise(taxCost)} total ({businessExpenses.taxReserve.rate}% of profit)
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {businessExpenses.taxReserve.expanded ? '−' : '+'}
            </span>
          </Button>

          {businessExpenses.taxReserve.expanded && (
            <div className="mt-3 bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-4 mb-3">
                <Label className="text-sm font-medium">Tax Rate</Label>
                <div className="relative w-24">
                  <Input
                    type="number"
                    min="15"
                    max="45"
                    step="1"
                    value={businessExpenses.taxReserve.rate}
                    onChange={(e) => setBusinessExpenses(prev => ({
                      ...prev,
                      taxReserve: { ...prev.taxReserve, rate: Math.max(15, Math.min(45, parseFloat(e.target.value) || 30)) }
                    }))}
                    className="pr-6 h-8 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <span className="text-sm text-muted-foreground">of profit</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Self-employment tax (15.3%) + income tax. Range: 25-40% typical
              </p>
            </div>
          )}
        </div>

        {/* Physical Costs */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setBusinessExpenses(prev => ({
              ...prev,
              physicalCosts: { ...prev.physicalCosts, expanded: !prev.physicalCosts.expanded }
            }))}
            className="w-full justify-between p-3 h-auto"
          >
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Physical Costs</h4>
              <span className="text-sm font-medium text-muted-foreground">
                {formatCurrencyPrecise(physicalCostsTotal)} total
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {businessExpenses.physicalCosts.expanded ? '−' : '+'}
            </span>
          </Button>

          {businessExpenses.physicalCosts.expanded && (
            <div className="mt-3 space-y-1">
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
                    className="h-8 text-sm flex-1"
                    placeholder="Cost name"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={value || ''}
                      onChange={(e) => setBusinessExpenses(prev => ({
                        ...prev,
                        physicalCosts: {
                          ...prev.physicalCosts,
                          items: { ...prev.physicalCosts.items, [costType]: parseFloat(e.target.value) || 0 }
                        }
                      }))}
                      className="pl-6 h-8 text-sm w-full"
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
              
              <div className="bg-muted/50 rounded-lg p-3 mt-3">
                <h5 className="text-xs font-medium mb-2">Common Ranges:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Insurance: $50-100/mo</div>
                  <div>Workspace: $100-300/mo</div>
                  <div>Utilities: $30-100/mo</div>
                  <div>Professional: $50-200/mo</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Software Costs */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setBusinessExpenses(prev => ({
              ...prev,
              softwareCosts: { ...prev.softwareCosts, expanded: !prev.softwareCosts.expanded }
            }))}
            className="w-full justify-between p-3 h-auto"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Software & Tools</h4>
              <span className="text-sm font-medium text-muted-foreground">
                {formatCurrencyPrecise(softwareCostsTotal)} total
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {businessExpenses.softwareCosts.expanded ? '−' : '+'}
            </span>
          </Button>

          {businessExpenses.softwareCosts.expanded && (
            <div className="mt-3 space-y-1">
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
                    className="h-8 text-sm flex-1"
                    placeholder="Software name"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={value || ''}
                      onChange={(e) => setBusinessExpenses(prev => ({
                        ...prev,
                        softwareCosts: {
                          ...prev.softwareCosts,
                          items: { ...prev.softwareCosts.items, [costType]: parseFloat(e.target.value) || 0 }
                        }
                      }))}
                      className="pl-6 h-8 text-sm w-full"
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
              
              <div className="bg-muted/50 rounded-lg p-3 mt-3">
                <h5 className="text-xs font-medium mb-2">Common Ranges:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Design Software: $20-100/mo</div>
                  <div>Accounting: $15-50/mo</div>
                  <div>Cloud Storage: $5-30/mo</div>
                  <div>Marketing Tools: $25-200/mo</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Equipment Fund */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setBusinessExpenses(prev => ({
              ...prev,
              equipmentFund: { ...prev.equipmentFund, expanded: !prev.equipmentFund.expanded }
            }))}
            className="w-full justify-between p-3 h-auto"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Equipment Fund</h4>
              <span className="text-sm font-medium text-muted-foreground">
                {formatCurrencyPrecise(equipmentFundCost)} total ({businessExpenses.equipmentFund.rate}% of revenue)
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {businessExpenses.equipmentFund.expanded ? '−' : '+'}
            </span>
          </Button>

          {businessExpenses.equipmentFund.expanded && (
            <div className="mt-3 bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-4 mb-3">
                <Label className="text-sm font-medium">Equipment Fund</Label>
                <div className="relative w-24">
                  <Input
                    type="number"
                    min="3"
                    max="15"
                    step="1"
                    value={businessExpenses.equipmentFund.rate}
                    onChange={(e) => setBusinessExpenses(prev => ({
                      ...prev,
                      equipmentFund: { ...prev.equipmentFund, rate: Math.max(3, Math.min(15, parseFloat(e.target.value) || 8)) }
                    }))}
                    className="pr-6 h-8 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <span className="text-sm text-muted-foreground">of revenue</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Maintenance, repairs, upgrades, replacement. Range: 5-12% typical
              </p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}