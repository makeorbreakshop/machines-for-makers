'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, ChevronDown, ChevronRight, Clock, TrendingUp, Calculator } from 'lucide-react';
import { CalculatedMetrics } from '../lib/calculator-types';
import { PLCalculation } from '../lib/pl-calculations';
import { useState } from 'react';

interface CalculatorDashboardProps {
  metrics: CalculatedMetrics;
  monthlyGoal: number;
  products?: Array<{id: string; name: string}>; // Optional product names for display
  activeTab?: string; // Current active tab
  businessExpenses?: {
    taxReserve: { 
      selfEmploymentRate: number;
      federalRate: number;
      stateRate: number;
    };
    physicalCosts: { items: Record<string, number> };
    softwareCosts: { items: Record<string, number> };
    savings: { rate: number };
  };
  laborCosts?: number; // Monthly labor costs
  plCalculation?: PLCalculation; // Shared P&L calculation
}

export function CalculatorDashboard({ metrics, monthlyGoal, products, activeTab, businessExpenses, laborCosts, plCalculation }: CalculatorDashboardProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPL, setExpandedPL] = useState(true); // Start expanded
  
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

  // Use the shared P&L calculation if provided
  const revenue = plCalculation?.revenue || 0;
  const cogs = plCalculation?.cogs || 0;
  const grossProfit = plCalculation?.grossProfit || safeGrossProfit;
  const totalOperatingExpenses = plCalculation?.totalOperatingExpenses || 0;
  const netProfit = plCalculation?.netProfit || 0;


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

      {/* Profit & Loss Section */}
      <div className="space-y-4">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setExpandedPL(!expandedPL)}
        >
          {expandedPL ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Profit & Loss</h3>
        </div>
        
        {expandedPL && (
          <Card>
            <div className="p-4 space-y-3">
              {/* Revenue */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="font-mono font-bold text-sm">
                  {formatCurrency(revenue)}
                </span>
              </div>
              
              {/* COGS */}
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Cost of Goods Sold</span>
                <span className="font-mono text-sm text-muted-foreground">
                  -{formatCurrency(cogs)}
                </span>
              </div>
              
              {/* Gross Profit */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Gross Profit</span>
                <span className="font-mono font-medium text-sm">
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              
              {/* Operating Expenses */}
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Operating Expenses</span>
                <span className="font-mono text-sm text-muted-foreground">
                  -{formatCurrency(totalOperatingExpenses)}
                </span>
              </div>
              
              {/* Net Profit */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-medium">Net Profit</span>
                <div className="text-right">
                  <div className={`font-mono font-bold text-sm ${
                    netProfit > 0 ? 'text-green-600' : 'text-destructive'
                  }`}>
                    {formatCurrency(netProfit)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {revenue > 0 ? `${((netProfit / revenue) * 100).toFixed(1)}%` : '0%'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}