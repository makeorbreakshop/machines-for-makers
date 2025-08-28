'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Plus, X, DollarSign, ArrowRight } from 'lucide-react';
import { CalculatorState, CalculatedMetrics, DEFAULT_PRODUCT_TEMPLATES } from '../lib/calculator-types';
import { calculateProductMetrics } from '../lib/calculator-formulas';

interface Level1SetupProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateGoal: (goal: number) => void;
  onAddProduct: (product: any) => string;
  onUpdateProduct: (id: string, updates: any) => void;
  onRemoveProduct: (id: string) => void;
  onUpdateHourlyRate: (rate: number) => void;
  onComplete: () => void;
}

export function Level1Setup({ 
  state, 
  metrics, 
  onUpdateGoal, 
  onAddProduct, 
  onUpdateProduct, 
  onRemoveProduct, 
  onUpdateHourlyRate,
  onComplete 
}: Level1SetupProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingCosts, setEditingCosts] = useState<{[productId: string]: string}>({});

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  const addProductFromTemplate = (template: typeof DEFAULT_PRODUCT_TEMPLATES[0]) => {
    onAddProduct({
      name: template.name,
      sellingPrice: template.estimatedSellingPrice,
      monthlyUnits: template.estimatedMonthlyUnits,
      costs: template.estimatedCosts,
      timeBreakdown: template.timeBreakdown
    });
    setShowTemplates(false);
  };

  const addBlankProduct = () => {
    onAddProduct({
      name: '',
      sellingPrice: 0,
      monthlyUnits: 10,
      costs: {
        materials: 0,
        finishing: 0,
        packaging: 0,
        shipping: 0,
        other: 0
      },
      timeBreakdown: {
        design: 0,
        setup: 0,
        machine: 0,
        finishing: 0,
        packaging: 0
      }
    });
  };

  const canProceed = state.products.length > 0 && state.products.every(p => {
    const costs = p.costs || { materials: 0, finishing: 0, packaging: 0, shipping: 0, other: 0 };
    const totalCost = Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0);
    return p.name.trim() && totalCost > 0 && p.sellingPrice > 0 && p.monthlyUnits >= 0;
  });

  return (
    <div className="space-y-8">

      {/* Products */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Your Products</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              Use Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addBlankProduct}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Template Selection */}
        {showTemplates && (
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium mb-3">
              Choose a starting template:
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEFAULT_PRODUCT_TEMPLATES.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto p-3"
                  onClick={() => addProductFromTemplate(template)}
                >
                  <div className="text-left">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ${template.estimatedTotalCost.toFixed(2)} costs → {formatCurrency(template.estimatedSellingPrice)}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {state.products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Plus className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">No products added yet</p>
            <p className="text-sm">Add your first product to get started with the analysis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.products.map((product, index) => {
              const productMetrics = calculateProductMetrics(product, state.hourlyRate || 0);
              const costs = product.costs || { materials: 0, finishing: 0, packaging: 0, shipping: 0, other: 0 };
              const timeBreakdown = product.timeBreakdown || { design: 0, setup: 0, machine: 0, finishing: 0, packaging: 0 };
              const totalCosts = productMetrics.totalCosts; // Use calculated total that includes labor
              const unitProfit = (product.sellingPrice || 0) - totalCosts;
              const monthlyProfit = (product.monthlyUnits || 0) * unitProfit;
              const isValid = product.name.trim() && totalCosts > 0 && product.sellingPrice > 0;
              
              return (
                <Card key={product.id}>
                  <CardContent className="p-6 space-y-4">
                        {/* Header: Clickable Name + Unit Profit + Remove */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            {product.isEditingName ? (
                              <Input
                                value={product.name}
                                onChange={(e) => onUpdateProduct(product.id, { name: e.target.value })}
                                onBlur={() => onUpdateProduct(product.id, { isEditingName: false })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    onUpdateProduct(product.id, { isEditingName: false });
                                  }
                                }}
                                className="text-base font-medium"
                                placeholder="Product Name"
                                autoFocus
                              />
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={() => onUpdateProduct(product.id, { isEditingName: true })}
                                className="text-base font-medium h-auto p-0 justify-start hover:bg-transparent"
                              >
                                {product.name || `Product ${index + 1}`}
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                            {/* Unit Profit - Hero Metric */}
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                Unit Profit
                              </div>
                              <div className={`text-lg font-medium font-mono ${
                                unitProfit > 0 
                                  ? 'text-green-600' 
                                  : unitProfit < 0 
                                    ? 'text-destructive' 
                                    : 'text-muted-foreground'
                              }`}>
                                {formatCurrency(unitProfit)}
                              </div>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveProduct(product.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Simple Clean Form */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={product.sellingPrice || ''}
                              onChange={(e) => onUpdateProduct(product.id, { 
                                sellingPrice: parseFloat(e.target.value) || 0 
                              })}
                              placeholder="25.00"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Units/Month</Label>
                            <Input
                              type="number"
                              step="1"
                              value={product.monthlyUnits || ''}
                              onChange={(e) => onUpdateProduct(product.id, { 
                                monthlyUnits: parseInt(e.target.value) || 0 
                              })}
                              placeholder="10"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingCosts[product.id] ?? Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0)}
                              onChange={(e) => {
                                setEditingCosts(prev => ({
                                  ...prev,
                                  [product.id]: e.target.value
                                }));
                              }}
                              onBlur={(e) => {
                                const newTotal = parseFloat(e.target.value) || 0;
                                const currentCosts = { ...costs };
                                
                                // Calculate minimum required (all costs except 'other')
                                const requiredMinimum = Object.entries(currentCosts)
                                  .filter(([key]) => key !== 'other')
                                  .reduce((sum, [, value]) => sum + (value || 0), 0);
                                
                                // If trying to go below required minimum, set to minimum
                                const actualTotal = Math.max(newTotal, requiredMinimum);
                                
                                // Set 'other' to make up the difference
                                const otherAmount = actualTotal - requiredMinimum;
                                
                                onUpdateProduct(product.id, { 
                                  costs: { 
                                    ...currentCosts, 
                                    other: otherAmount 
                                  }
                                });

                                // Clear editing state
                                setEditingCosts(prev => {
                                  const newState = { ...prev };
                                  delete newState[product.id];
                                  return newState;
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="5.00"
                            />
                            {/* Show minimum cost info */}
                            {(() => {
                              const requiredMinimum = Object.entries(costs)
                                .filter(([key]) => key !== 'other')
                                .reduce((sum, [, value]) => sum + (value || 0), 0);
                              return requiredMinimum > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  Minimum: {formatCurrency(requiredMinimum)} (based on itemized costs)
                                </p>
                              ) : null;
                            })()}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Profit</Label>
                            <div className={`h-10 px-3 flex items-center text-sm font-medium rounded-md border ${
                              monthlyProfit > 0 ? 'bg-green-50 text-green-700 border-green-200' : 
                              monthlyProfit < 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                              'bg-muted text-muted-foreground border-border'
                            }`}>
                              {formatCurrency(monthlyProfit)}
                            </div>
                          </div>
                        </div>


                        {/* Material Costs Section */}
                        <div className="border-t border-border pt-4">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const currentlyExpanded = product.showCostBreakdown || false;
                              onUpdateProduct(product.id, { showCostBreakdown: !currentlyExpanded });
                            }}
                            className="w-full justify-between p-3 h-auto"
                          >
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-medium">Material Costs</h4>
                              <span className="text-sm font-medium text-muted-foreground">
                                {formatCurrency(Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0))} total
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {product.showCostBreakdown ? '−' : '+'}
                            </span>
                          </Button>

                          {product.showCostBreakdown && (
                            <div className="mt-3 space-y-1">
                              {/* Material Costs */}
                              {Object.entries(costs).map(([costType, value]) => (
                                value > 0 || product.showCostBreakdown ? (
                                  <div key={costType} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                                    <Input
                                      value={costType.charAt(0).toUpperCase() + costType.slice(1)}
                                      onChange={(e) => {
                                        const newCostType = e.target.value.toLowerCase();
                                        const newCosts = { ...costs };
                                        delete newCosts[costType];
                                        newCosts[newCostType] = value;
                                        onUpdateProduct(product.id, { costs: newCosts });
                                      }}
                                      className="h-8 text-sm flex-1"
                                      placeholder="Cost name"
                                    />
                                    <div className="relative w-24">
                                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                                        $
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={value || ''}
                                        onChange={(e) => onUpdateProduct(product.id, { 
                                          costs: { ...costs, [costType]: parseFloat(e.target.value) || 0 }
                                        })}
                                        className="pl-6 h-8 text-sm w-full"
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newCosts = { ...costs };
                                        delete newCosts[costType];
                                        onUpdateProduct(product.id, { costs: newCosts });
                                      }}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : null
                              ))}
                              
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  const newCostKey = `cost_${Date.now()}`;
                                  onUpdateProduct(product.id, { 
                                    costs: { ...costs, [newCostKey]: 0 }
                                  });
                                }}
                                className="w-full h-8 text-sm text-muted-foreground hover:text-foreground"
                              >
                                + Add Material Cost
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Time Tracking Section */}
                        <div>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const currentlyExpanded = product.showTimeBreakdown || false;
                              onUpdateProduct(product.id, { showTimeBreakdown: !currentlyExpanded });
                            }}
                            className="w-full justify-between p-3 h-auto bg-primary/5 hover:bg-primary/10"
                          >
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-medium">Time Tracking</h4>
                              <span className="text-sm font-medium text-muted-foreground">
                                {formatCurrency(productMetrics.laborCosts)} total ({productMetrics.totalTimeHours.toFixed(1)}h)
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {product.showTimeBreakdown ? '−' : '+'}
                            </span>
                          </Button>

                          {product.showTimeBreakdown && (
                            <div className="mt-3 space-y-3">
                              {/* Hourly Rate Setting */}
                              <div className="bg-primary/5 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Hourly Rate (applies to all products)</Label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={state.hourlyRate || ''}
                                      onChange={(e) => onUpdateHourlyRate(parseFloat(e.target.value) || 0)}
                                      className="w-20 h-8 text-sm"
                                      placeholder="25"
                                    />
                                    <span className="text-sm text-muted-foreground">/hr</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Time Entries */}
                              <div className="space-y-1">
                                {Object.entries(timeBreakdown).map(([timeType, minutes]) => (
                                  minutes > 0 || product.showTimeBreakdown ? (
                                    <div key={timeType} className="group flex items-center gap-3 py-2 px-3 hover:bg-primary/10 rounded-md">
                                      <Input
                                        value={timeType.charAt(0).toUpperCase() + timeType.slice(1)}
                                        onChange={(e) => {
                                          const newTimeType = e.target.value.toLowerCase();
                                          const newTimeBreakdown = { ...timeBreakdown };
                                          delete newTimeBreakdown[timeType];
                                          newTimeBreakdown[newTimeType] = minutes;
                                          onUpdateProduct(product.id, { timeBreakdown: newTimeBreakdown });
                                        }}
                                        className="h-8 text-sm flex-1"
                                        placeholder="Task name"
                                      />
                                      <div className="flex items-center gap-2 w-20">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={minutes || ''}
                                          onChange={(e) => onUpdateProduct(product.id, { 
                                            timeBreakdown: { ...timeBreakdown, [timeType]: parseFloat(e.target.value) || 0 }
                                          })}
                                          className="h-8 text-sm w-16"
                                          placeholder="0"
                                        />
                                        <span className="text-xs text-muted-foreground">min</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const newTimeBreakdown = { ...timeBreakdown };
                                          delete newTimeBreakdown[timeType];
                                          onUpdateProduct(product.id, { timeBreakdown: newTimeBreakdown });
                                        }}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : null
                                ))}
                                
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    const newTimeKey = `task_${Date.now()}`;
                                    onUpdateProduct(product.id, { 
                                      timeBreakdown: { ...timeBreakdown, [newTimeKey]: 0 }
                                    });
                                  }}
                                  className="w-full h-8 text-sm text-muted-foreground hover:text-foreground"
                                >
                                  + Add Time Entry
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}