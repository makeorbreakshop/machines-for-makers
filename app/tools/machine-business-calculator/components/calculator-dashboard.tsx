'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, ChevronDown, ChevronRight, Clock, TrendingUp, Calculator } from 'lucide-react';
import { CalculatedMetrics } from '../lib/calculator-types';
import { useState } from 'react';

interface CalculatorDashboardProps {
  metrics: CalculatedMetrics;
  monthlyGoal: number;
  products?: Array<{id: string; name: string}>; // Optional product names for display
  activeTab?: string; // Current active tab
  businessExpenses?: {
    taxReserve: { rate: number };
    physicalCosts: { items: Record<string, number> };
    softwareCosts: { items: Record<string, number> };
    equipmentFund: { rate: number };
  };
}

export function CalculatorDashboard({ metrics, monthlyGoal, products, activeTab, businessExpenses }: CalculatorDashboardProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // Safety check for metrics object
  if (!metrics) {
    return <div>Loading...</div>;
  }
  
  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) return '$0';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (isNaN(hours) || !isFinite(hours)) return '0.0';
    return hours.toFixed(1);
  };

  // Safety checks for all metrics
  const safeGrossProfit = isNaN(metrics.totalGrossProfit) || !isFinite(metrics.totalGrossProfit) 
    ? 0 
    : metrics.totalGrossProfit;
    
  const safeHours = isNaN(metrics.totalMonthlyHours) || !isFinite(metrics.totalMonthlyHours) 
    ? 0 
    : metrics.totalMonthlyHours;
    
  const safeHourlyRate = isNaN(metrics.averageHourlyRate) || !isFinite(metrics.averageHourlyRate) 
    ? 0 
    : metrics.averageHourlyRate;

  const safeGoalPercentage = isNaN(metrics.goalAchievementPercentage) || !isFinite(metrics.goalAchievementPercentage) 
    ? 0 
    : metrics.goalAchievementPercentage;
    
  const isPositiveProfit = safeGrossProfit > 0;

  // Calculate business expenses using actual data if available, otherwise defaults
  const monthlyRevenue = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.monthlyRevenue || 0), 0
  );
  
  // Use actual business expenses if provided, otherwise defaults
  const actualBusinessExpenses = businessExpenses || {
    taxReserve: { rate: 30 },
    physicalCosts: { items: { rent: 200, insurance: 75, utilities: 50 } },
    softwareCosts: { items: { design_software: 50, accounting_software: 25 } },
    equipmentFund: { rate: 8 }
  };
  
  const taxCost = (safeGrossProfit * actualBusinessExpenses.taxReserve.rate) / 100;
  const physicalCostsTotal = Object.values(actualBusinessExpenses.physicalCosts.items).reduce((sum, cost) => sum + cost, 0);
  const softwareCostsTotal = Object.values(actualBusinessExpenses.softwareCosts.items).reduce((sum, cost) => sum + cost, 0);
  const equipmentFundCost = (monthlyRevenue * actualBusinessExpenses.equipmentFund.rate) / 100;
  const totalBusinessCosts = taxCost + physicalCostsTotal + softwareCostsTotal + equipmentFundCost;
  const netProfit = safeGrossProfit - totalBusinessCosts;


  return (
    <div className="space-y-5">

      {/* Product Performance */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-medium">Product Performance</h3>
        </div>
        
        {metrics.productMetrics && Object.keys(metrics.productMetrics).length > 0 ? (
          Object.entries(metrics.productMetrics).map(([productId, productMetric], index) => {
            const productName = products?.find(p => p.id === productId)?.name || `Product ${index + 1}`;
            const isExpanded = expandedProducts.has(productId);
            
            return (
              <Card key={productId}>
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleProduct(productId)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-base">{productName}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {productMetric.unitsProduced || 0} units
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                      <div className="font-mono font-medium">
                        {formatCurrency(productMetric.monthlyRevenue || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Costs</div>
                      <div className="font-mono font-medium text-muted-foreground">
                        -{formatCurrency(productMetric.monthlyCosts || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Profit</div>
                      <div className={`font-mono font-medium ${
                        (productMetric.monthlyGrossProfit || 0) > 0 ? 'text-green-600' : 'text-destructive'
                      }`}>
                        {formatCurrency(productMetric.monthlyGrossProfit || 0)}
                      </div>
                    </div>
                  </div>
                </div>
                  
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Cost Breakdown */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium mb-2">Cost Breakdown</h5>
                        <div className="space-y-1 text-sm">
                          {(productMetric.costBreakdown?.materials || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Materials</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.materials)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.finishing || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Finishing</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.finishing)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.packaging || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Packaging</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.packaging)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.shipping || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.shipping)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.other || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Other</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.other)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.labor || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Labor</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.labor)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.platformFees || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Platform Fees</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.platformFees)}</span>
                            </div>
                          )}
                          {(productMetric.costBreakdown?.marketing || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Marketing (CAC)</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.marketing)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            Add products to see performance breakdown
          </div>
        )}
      </div>
        
        {/* Monthly Totals */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-medium">Monthly Totals</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(safeGrossProfit + (metrics.totalMonthlyCosts || 0) + (metrics.totalMarketingCosts || 0))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Costs</span>
                  <span className="font-mono font-medium text-muted-foreground">
                    -{formatCurrency(metrics.totalMonthlyCosts || 0)}
                  </span>
                </div>
                
                {(metrics.totalMarketingCosts || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marketing Costs</span>
                    <span className="font-mono font-medium text-muted-foreground">
                      -{formatCurrency(metrics.totalMarketingCosts || 0)}
                    </span>
                  </div>
                )}
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Gross Profit</span>
                    <span className={`font-mono font-medium text-base ${
                      safeGrossProfit > 0 ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {formatCurrency(safeGrossProfit)}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>Time: {formatHours(safeHours)}h/month</span>
                  <span>Rate: {formatCurrency(safeHourlyRate)}/hr</span>
                </div>
                
                {activeTab === 'products' && (
                  <div className="text-xs text-muted-foreground text-center mt-3">
                    *Marketing & business costs added in next levels
                  </div>
                )}
                {activeTab === 'marketing' && (
                  <div className="text-xs text-muted-foreground text-center mt-3">
                    *Business overhead costs added in next level
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Business Expenses Section - Only show on Business tab */}
      {activeTab === 'business' && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-medium">Business Expenses</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Reserve ({actualBusinessExpenses.taxReserve.rate}%)</span>
                  <span className="font-mono font-medium text-destructive">
                    -{formatCurrency(taxCost)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Physical Costs</span>
                  <span className="font-mono font-medium text-destructive">
                    -{formatCurrency(physicalCostsTotal)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Software & Tools</span>
                  <span className="font-mono font-medium text-destructive">
                    -{formatCurrency(softwareCostsTotal)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipment Fund ({actualBusinessExpenses.equipmentFund.rate}%)</span>
                  <span className="font-mono font-medium text-destructive">
                    -{formatCurrency(equipmentFundCost)}
                  </span>
                </div>
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Business Costs</span>
                    <span className="font-mono font-medium text-destructive text-base">
                      -{formatCurrency(totalBusinessCosts)}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Net Profit</span>
                    <span className={`font-mono font-medium text-base ${
                      netProfit > 0 ? 'text-green-600' : 'text-destructive'
                    }`}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground text-center mt-3">
                  {netProfit > 0 ? (
                    `${((netProfit / safeGrossProfit) * 100).toFixed(1)}% of gross profit retained`
                  ) : (
                    'Business costs exceed gross profit'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reality Check Warnings */}
      {metrics.totalMonthlyHours > 160 && (
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-800 mb-1">
                  Unsustainable Hours
                </div>
                <div className="text-xs text-red-700">
                  {formatHours(metrics.totalMonthlyHours)} hours/month requires 
                  working {formatHours(metrics.totalMonthlyHours / 4)} hours/week
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.averageHourlyRate < 15 && metrics.averageHourlyRate > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  Below Minimum Wage
                </div>
                <div className="text-xs text-yellow-700">
                  Current hourly rate is below most minimum wages
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPositiveProfit && (
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-800 mb-1">
                  Negative Profit
                </div>
                <div className="text-xs text-red-700">
                  Material costs exceed selling prices
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}