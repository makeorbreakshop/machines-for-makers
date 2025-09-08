'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, Target, ChevronDown, ChevronRight, Clock, TrendingUp, Calculator, RotateCcw, Users } from 'lucide-react';
import { CalculatedMetrics, Product, LaborState } from '../lib/calculator-types';
import { PLCalculation } from '../lib/pl-calculations';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

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
  fullProducts?: Product[]; // Full product objects for updating
  onUpdateProduct?: (productId: string, updates: Partial<Product>) => void; // Callback to update products
  onReset?: () => void; // Callback to reset calculator
  laborState?: LaborState; // Labor state for People section
  onUpdateLabor?: (updates: Partial<LaborState>) => void; // Callback to update labor
}

export function CalculatorDashboard({ metrics, monthlyGoal, products, activeTab, businessExpenses, laborCosts, plCalculation, fullProducts, onUpdateProduct, onReset, laborState, onUpdateLabor }: CalculatorDashboardProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set());
  const [expandedPL, setExpandedPL] = useState(true); // Start expanded
  const [editingUnits, setEditingUnits] = useState<string | null>(null); // Track which product is being edited
  const [editingPrice, setEditingPrice] = useState<string | null>(null); // Track which product price is being edited
  const [editingWage, setEditingWage] = useState<string | null>(null); // Track which worker wage is being edited
  const [showResetDialog, setShowResetDialog] = useState(false);
  
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

  const togglePerson = (workerId: string) => {
    const newExpanded = new Set(expandedPeople);
    if (newExpanded.has(workerId)) {
      newExpanded.delete(workerId);
    } else {
      newExpanded.add(workerId);
    }
    setExpandedPeople(newExpanded);
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
    <div className="space-y-3">

      {/* Products Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Products</h3>
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
                    
                    <div className="ml-auto flex items-center gap-2">
                      {/* Interactive Units Input */}
                      {editingUnits === productId && onUpdateProduct && fullProducts ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            min="0"
                            value={productMetric.unitsProduced || ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                              const product = fullProducts.find(p => p.id === productId);
                              if (product) {
                                onUpdateProduct(productId, { monthlyUnits: value });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingUnits(null);
                              }
                            }}
                            className="w-20 h-7 text-sm"
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">units</span>
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUnits(null);
                            }}
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <span 
                          className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdateProduct && fullProducts) {
                              setEditingUnits(productId);
                            }
                          }}
                        >
                          {productMetric.unitsProduced || 0} units
                        </span>
                      )}
                      
                      {/* Interactive Price Input */}
                      {editingPrice === productId && onUpdateProduct && fullProducts ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fullProducts.find(p => p.id === productId)?.sellingPrice || ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              const product = fullProducts.find(p => p.id === productId);
                              if (product) {
                                onUpdateProduct(productId, { sellingPrice: value });
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingPrice(null);
                              }
                            }}
                            className="w-20 h-7 text-sm"
                            autoFocus
                          />
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPrice(null);
                            }}
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <span 
                          className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors font-mono"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdateProduct && fullProducts) {
                              setEditingPrice(productId);
                            }
                          }}
                        >
                          ${fullProducts?.find(p => p.id === productId)?.sellingPrice?.toFixed(2) || '0.00'}
                        </span>
                      )}
                    </div>
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
                          {(productMetric.costBreakdown?.machineCosts || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Machine Time</span>
                              <span className="font-mono">{formatCurrency(productMetric.costBreakdown.machineCosts)}</span>
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

      {/* People Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-medium text-foreground">People</h3>
        </div>
        
        {laborState?.workers && laborState.workers.length > 0 ? (
          laborState.workers.map((worker) => {
            const isExpanded = expandedPeople.has(worker.id);
            
            // Calculate worker's total hours
            let workerHours = 0;
            
            // Add hours from business tasks
            laborState.businessTasks?.forEach(task => {
              const assignedWorkerId = task.assignedWorkerId || 'owner';
              if (assignedWorkerId === worker.id) {
                workerHours += task.hoursPerWeek;
              }
            });
            
            // Add hours from production (if we have product assignments)
            const productAssignments = laborState.productAssignments || {};
            if (fullProducts) {
              fullProducts.forEach(product => {
                const productMetrics = metrics.productMetrics?.[product.id];
                if (productMetrics) {
                  const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                  const assignedWorkerId = productAssignments[product.id] || 'owner';
                  if (assignedWorkerId === worker.id) {
                    workerHours += weeklyHours;
                  }
                }
              });
            }
            
            const weeklyCost = workerHours * worker.hourlyRate;
            const monthlyCost = weeklyCost * 4.33;
            
            return (
              <Card key={worker.id}>
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => togglePerson(worker.id)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-base text-foreground">
                      {worker.name || 'Unnamed Worker'}
                    </span>
                    
                    <div className="ml-auto flex items-center gap-2">
                      {/* Interactive Wage Input */}
                      {editingWage === worker.id && onUpdateLabor ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={worker.hourlyRate || ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : Math.round((parseFloat(e.target.value) || 0) * 100) / 100;
                              const updatedWorkers = laborState.workers.map(w =>
                                w.id === worker.id ? { ...w, hourlyRate: value } : w
                              );
                              onUpdateLabor({ workers: updatedWorkers });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingWage(null);
                              }
                            }}
                            className="w-20 h-7 text-sm"
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">/hr</span>
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWage(null);
                            }}
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <span 
                          className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors font-mono"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdateLabor) {
                              setEditingWage(worker.id);
                            }
                          }}
                        >
                          ${worker.hourlyRate.toFixed(2)}/hr
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Weekly Hours</div>
                      <div className="font-mono font-medium">
                        {workerHours.toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Weekly Cost</div>
                      <div className="font-mono font-medium text-muted-foreground">
                        {formatCurrency(weeklyCost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Monthly Cost</div>
                      <div className="font-mono font-medium">
                        {formatCurrency(monthlyCost)}
                      </div>
                    </div>
                  </div>
                </div>
                  
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium mb-2">Task Breakdown</h5>
                      <div className="space-y-1 text-sm">
                        {/* Business Tasks */}
                        {laborState.businessTasks?.map(task => {
                          const assignedWorkerId = task.assignedWorkerId || 'owner';
                          if (assignedWorkerId === worker.id && task.hoursPerWeek > 0) {
                            return (
                              <div key={task.id} className="flex justify-between">
                                <span className="text-muted-foreground">{task.name}</span>
                                <span className="font-mono">{task.hoursPerWeek.toFixed(1)}h/wk</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                        
                        {/* Production Tasks */}
                        {fullProducts?.map((product, index) => {
                          const productMetrics = metrics.productMetrics?.[product.id];
                          if (productMetrics) {
                            const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                            const assignedWorkerId = productAssignments[product.id] || 'owner';
                            if (assignedWorkerId === worker.id && weeklyHours > 0) {
                              const productName = product.name || `Product ${index + 1}`;
                              return (
                                <div key={product.id} className="flex justify-between">
                                  <span className="text-muted-foreground">{productName} Production</span>
                                  <span className="font-mono">{weeklyHours.toFixed(1)}h/wk</span>
                                </div>
                              );
                            }
                          }
                          return null;
                        })}
                      </div>
                      
                      <div className="pt-2 mt-2 border-t border-border">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total Hours</span>
                          <span className="font-mono">{workerHours.toFixed(1)}h/wk</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium mt-1">
                          <span>Effective Hourly Rate</span>
                          <span className="font-mono">${worker.hourlyRate.toFixed(2)}/hr</span>
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
            No workers configured
          </div>
        )}
      </div>

      {/* Profit & Loss Section */}
      <div className="space-y-3">
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
          <h3 className="text-lg font-medium text-foreground">Profit</h3>
        </div>
        
        {expandedPL && (
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm">
            <div className="p-3 space-y-2">
              {/* Revenue */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</span>
                <span className="font-mono font-bold text-base tabular-nums text-gray-900 dark:text-gray-100">
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

      {/* Reset Button */}
      {onReset && (
        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => setShowResetDialog(true)}
            className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Calculator
          </Button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Calculator?</DialogTitle>
            <DialogDescription>
              This will clear all your current data including products, materials, labor settings, and business expenses. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onReset?.();
                setShowResetDialog(false);
              }}
            >
              Reset Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}