'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { CalculatedMetrics } from '../lib/calculator-types';
import { useState } from 'react';

interface CalculatorDashboardProps {
  metrics: CalculatedMetrics;
  monthlyGoal: number;
  products?: Array<{id: string; name: string}>; // Optional product names for display
}

export function CalculatorDashboard({ metrics, monthlyGoal, products }: CalculatorDashboardProps) {
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

  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Live Results
        </h3>
        <p className="text-sm text-gray-600">
          Updates automatically as you progress
        </p>
      </div>

      {/* Monthly Goal Progress */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-600" />
            <CardTitle className="text-sm font-medium text-gray-900">
              Monthly Goal Progress
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Target:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(monthlyGoal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Projected:</span>
              <span className={`font-medium ${safeGrossProfit > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(safeGrossProfit)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  safeGoalPercentage >= 100 ? 'bg-green-600' :
                  safeGoalPercentage >= 75 ? 'bg-green-500' :
                  safeGoalPercentage >= 50 ? 'bg-yellow-500' :
                  safeGoalPercentage >= 25 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min(100, Math.max(0, safeGoalPercentage))}%` 
                }}
              />
            </div>
            <div className="text-center">
              <span className={`text-xs font-medium ${
                safeGoalPercentage >= 100 ? 'text-green-600' :
                safeGoalPercentage >= 75 ? 'text-green-600' :
                safeGoalPercentage >= 50 ? 'text-yellow-600' :
                safeGoalPercentage >= 25 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {safeGoalPercentage.toFixed(0)}% of goal
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Performance P&L */}
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Product Performance
          </h4>
          {metrics.productMetrics && Object.keys(metrics.productMetrics).length > 0 ? (
            Object.entries(metrics.productMetrics).map(([productId, productMetric], index) => {
              const productName = products?.find(p => p.id === productId)?.name || `Product ${index + 1}`;
              
              return (
                <Card key={productId} className="border-gray-200 shadow-sm">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900">
                        {productName} ({productMetric.unitsProduced || 0} units/month)
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Revenue:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(productMetric.monthlyRevenue || 0)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Materials:</span>
                          <span className="text-gray-700">
                            -{formatCurrency(productMetric.costBreakdown?.materials || 0)}
                          </span>
                        </div>
                        
                        {(productMetric.costBreakdown?.finishing || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Finishing:</span>
                            <span className="text-gray-700">
                              -{formatCurrency(productMetric.costBreakdown?.finishing || 0)}
                            </span>
                          </div>
                        )}
                        
                        {(productMetric.costBreakdown?.packaging || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Packaging:</span>
                            <span className="text-gray-700">
                              -{formatCurrency(productMetric.costBreakdown?.packaging || 0)}
                            </span>
                          </div>
                        )}
                        
                        {(productMetric.costBreakdown?.shipping || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping:</span>
                            <span className="text-gray-700">
                              -{formatCurrency(productMetric.costBreakdown?.shipping || 0)}
                            </span>
                          </div>
                        )}
                        
                        {(productMetric.costBreakdown?.other || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Other:</span>
                            <span className="text-gray-700">
                              -{formatCurrency(productMetric.costBreakdown?.other || 0)}
                            </span>
                          </div>
                        )}
                        
                        <div className="border-t border-gray-200 pt-1">
                          <div className="flex justify-between">
                            <span className="text-gray-900 font-medium">Product Profit:</span>
                            <span className={`font-semibold ${
                              (productMetric.monthlyGrossProfit || 0) > 0 ? 'text-green-700' : 'text-red-600'
                            }`}>
                              {formatCurrency(productMetric.monthlyGrossProfit || 0)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-gray-500">
                          <span>Time: {formatHours(productMetric.monthlyTimeHours || 0)}h</span>
                          <span>Rate: {formatCurrency(productMetric.hourlyRate || 0)}/hr</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-xs text-gray-500 text-center py-2">
              Add products to see performance breakdown
            </div>
          )}
        </div>
        
        {/* Monthly Totals */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Monthly Totals</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Revenue:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(safeGrossProfit + (metrics.totalMonthlyCosts || 0))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Costs:</span>
                  <span className="text-gray-700">
                    -{formatCurrency(metrics.totalMonthlyCosts || 0)}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Gross Profit:</span>
                    <span className={`font-semibold text-lg ${
                      safeGrossProfit > 0 ? 'text-green-700' : 'text-red-600'
                    }`}>
                      {formatCurrency(safeGrossProfit)}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total Time: {formatHours(safeHours)}h/month</span>
                  <span>Avg Rate: {formatCurrency(safeHourlyRate)}/hr</span>
                </div>
                
                <div className="text-xs text-gray-500 text-center mt-2 italic">
                  *Business costs will be added in Level 2
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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