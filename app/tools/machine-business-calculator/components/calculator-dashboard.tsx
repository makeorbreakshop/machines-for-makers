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
  laborCosts?: number; // Monthly labor costs
}

export function CalculatorDashboard({ metrics, monthlyGoal, products, activeTab, businessExpenses, laborCosts }: CalculatorDashboardProps) {
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

  // Calculate business expenses using actual data if available
  const monthlyRevenue = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.monthlyRevenue || 0), 0
  );
  
  // Use actual business expenses if provided, otherwise zeros
  const actualBusinessExpenses = businessExpenses || {
    taxReserve: { rate: 0 },
    physicalCosts: { items: {} },
    softwareCosts: { items: {} },
    equipmentFund: { rate: 0 }
  };
  
  const taxCost = businessExpenses ? (safeGrossProfit * actualBusinessExpenses.taxReserve.rate) / 100 : 0;
  const physicalCostsTotal = businessExpenses ? Object.values(actualBusinessExpenses.physicalCosts.items).reduce((sum, cost) => sum + cost, 0) : 0;
  const softwareCostsTotal = businessExpenses ? Object.values(actualBusinessExpenses.softwareCosts.items).reduce((sum, cost) => sum + cost, 0) : 0;
  const equipmentFundCost = businessExpenses ? (monthlyRevenue * actualBusinessExpenses.equipmentFund.rate) / 100 : 0;
  
  // Calculate direct labor (product time) vs indirect labor (business tasks)
  const directLaborCost = Object.values(metrics.productMetrics || {}).reduce(
    (sum, product: any) => sum + (product.laborCosts || 0), 0
  );
  
  const indirectLaborCost = (laborCosts || 0) - directLaborCost;
  
  const totalBusinessCosts = (metrics.totalMarketingCosts || 0) + indirectLaborCost + physicalCostsTotal + softwareCostsTotal + taxCost + equipmentFundCost;
  const netProfit = safeGrossProfit - totalBusinessCosts;


  return (
    <div className="space-y-5">

      {/* Product Performance */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Product Performance</h3>
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
                    <span className="font-medium text-base text-foreground">{productName}</span>
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
                              <span className="text-muted-foreground">Marketing</span>
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
        
        {/* Profit & Loss Statement */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-medium text-foreground">Net Profit</h3>
                <span className={`ml-auto text-2xl font-bold font-mono ${
                  netProfit > 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
              
              <div className="space-y-3 text-sm">
                {/* REVENUE */}
                {monthlyRevenue > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">Revenue</span>
                    <span className="font-mono font-medium">
                      {formatCurrency(monthlyRevenue)}
                    </span>
                  </div>
                )}
                
                {/* COST OF GOODS SOLD */}
                {((metrics.totalMonthlyCosts || 0) > 0 || directLaborCost > 0) && (
                  <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">COST OF GOODS SOLD</div>
                    
                    {(metrics.totalMonthlyCosts || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Materials & Supplies</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(metrics.totalMonthlyCosts || 0)}
                        </span>
                      </div>
                    )}
                    
                    {directLaborCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Direct Labor (Production)</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(directLaborCost)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* GROSS PROFIT */}
                {monthlyRevenue > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Gross Profit</span>
                      <span className={`font-mono font-medium text-base ${
                        safeGrossProfit > 0 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {formatCurrency(safeGrossProfit)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {monthlyRevenue > 0 ? `${((safeGrossProfit / monthlyRevenue) * 100).toFixed(1)}% margin` : ''}
                    </div>
                  </div>
                )}
                
                {/* OPERATING EXPENSES */}
                {(indirectLaborCost > 0 || (metrics.totalMarketingCosts || 0) > 0 || physicalCostsTotal > 0 || softwareCostsTotal > 0) && (
                  <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">OPERATING EXPENSES</div>
                    
                    {indirectLaborCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Indirect Labor (Admin/Mgmt)</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(indirectLaborCost)}
                        </span>
                      </div>
                    )}
                    
                    {(metrics.totalMarketingCosts || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Marketing & Advertising</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(metrics.totalMarketingCosts || 0)}
                        </span>
                      </div>
                    )}
                    
                    {physicalCostsTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rent & Facilities</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(physicalCostsTotal)}
                        </span>
                      </div>
                    )}
                    
                    {softwareCostsTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Software & Tools</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(softwareCostsTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* OTHER EXPENSES & RESERVES */}
                {(taxCost > 0 || equipmentFundCost > 0) && (
                  <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">OTHER EXPENSES & RESERVES</div>
                    
                    {taxCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax Reserve</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(taxCost)}
                        </span>
                      </div>
                    )}
                    
                    {equipmentFundCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Equipment Fund</span>
                        <span className="font-mono font-medium text-foreground">
                          -{formatCurrency(equipmentFundCost)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* NET PROFIT DETAILS */}
                {monthlyRevenue > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="text-xs text-muted-foreground">
                      {netProfit > 0 ? `${((netProfit / monthlyRevenue) * 100).toFixed(1)}% net margin` : 'Loss'}
                      {safeHours > 0 && ` • ${formatHours(safeHours)}h/month • ${formatCurrency(netProfit / safeHours)}/hr effective`}
                    </div>
                  </div>
                )}
                
                {activeTab === 'products' && monthlyRevenue === 0 && (
                  <div className="text-xs text-muted-foreground text-center mt-3 bg-muted/30 rounded p-2">
                    Add products to see P&L breakdown
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>


    </div>
  );
}