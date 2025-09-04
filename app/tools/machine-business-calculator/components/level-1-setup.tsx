'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Package, Clock, Store } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalculatorState, 
  CalculatedMetrics, 
  DEFAULT_PRODUCT_TEMPLATES, 
  DEFAULT_PLATFORM_PRESETS, 
  PlatformFee 
} from '../lib/calculator-types';
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
  onAddProduct, 
  onUpdateProduct, 
  onRemoveProduct
}: Level1SetupProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const addProductFromTemplate = (template: typeof DEFAULT_PRODUCT_TEMPLATES[0]) => {
    onAddProduct({
      name: template.name,
      sellingPrice: template.estimatedSellingPrice,
      monthlyUnits: template.estimatedMonthlyUnits,
      costs: template.estimatedCosts,
      timeBreakdown: template.timeBreakdown,
      platformFees: [
        {
          id: 'direct-default',
          name: 'Direct Sales',
          feePercentage: 0,
          salesPercentage: 100
        }
      ]
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
      },
      platformFees: [
        {
          id: 'direct-default',
          name: 'Direct Sales',
          feePercentage: 0,
          salesPercentage: 100
        }
      ]
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Your Products</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-foreground border-border bg-background hover:bg-muted"
            >
              Use Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addBlankProduct}
              className="text-foreground border-border bg-background hover:bg-muted"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </div>
        </div>

        {showTemplates && (
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-foreground mb-3">
              Choose a starting template:
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEFAULT_PRODUCT_TEMPLATES.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto p-3 text-foreground border-border bg-background hover:bg-muted"
                  onClick={() => addProductFromTemplate(template)}
                >
                  <div className="text-left">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(template.estimatedTotalCost)} costs → {formatCurrency(template.estimatedSellingPrice)}
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
              const costs = product.costs || { materials: 0, finishing: 0, packaging: 0, shipping: 0, other: 0 };
              const timeBreakdown = product.timeBreakdown || { design: 0, setup: 0, machine: 0, finishing: 0, packaging: 0 };
              const platformFees = product.platformFees && product.platformFees.length > 0 
                ? product.platformFees 
                : [{ id: 'direct-default', name: 'Direct Sales', feePercentage: 0, salesPercentage: 100 }];
              
              const productMetrics = calculateProductMetrics({ ...product, platformFees }, state.hourlyRate || 0);
              const totalCosts = productMetrics.totalCosts;
              const unitProfit = (product.sellingPrice || 0) - totalCosts;
              const monthlyProfit = (product.monthlyUnits || 0) * unitProfit;
              
              return (
                <Card key={product.id} className="border-border bg-card shadow-sm">
                  <CardContent className="p-0">
                    <div className="bg-muted/50 border-b border-border px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Package className="h-4 w-4 text-primary" />
                          <Input
                            value={product.name}
                            onChange={(e) => onUpdateProduct(product.id, { name: e.target.value })}
                            className="text-base font-medium"
                            placeholder={`Product ${index + 1}`}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-medium ${
                            unitProfit > 0 ? 'text-green-600' : unitProfit < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {formatCurrency(unitProfit)} profit
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveProduct(product.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Price</Label>
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
                          <Label className="text-sm font-medium text-foreground">Units/Month</Label>
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
                          <Label className="text-sm font-medium text-foreground">Total Cost</Label>
                          <div className="h-10 px-3 flex items-center text-sm rounded-md border border-border bg-muted">
                            {formatCurrency(totalCosts)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Profit</Label>
                          <div className={`h-10 px-3 flex items-center text-sm font-medium rounded-md border ${
                            monthlyProfit > 0 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                            monthlyProfit < 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                            'bg-muted text-muted-foreground border-border'
                          }`}>
                            {formatCurrency(monthlyProfit)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg border border-border p-3">
                        <h4 className="text-sm font-medium text-foreground mb-3">Material Costs</h4>
                        <div className="space-y-1">
                          {Object.entries(costs).map(([costType, value]) => (
                            <div key={costType} className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                              <Label className="text-sm capitalize flex-1">{costType}</Label>
                              <div className="relative w-24">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
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
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg border border-border p-3">
                        <h4 className="text-sm font-medium text-foreground mb-3">
                          Labor Costs: {formatCurrency(productMetrics.laborCosts)} ({productMetrics.totalTimeHours.toFixed(1)}h)
                        </h4>
                        <div className="space-y-1">
                          {Object.entries(timeBreakdown).map(([timeType, value]) => (
                            <div key={timeType} className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                              <Label className="text-sm capitalize flex-1">{timeType}</Label>
                              <div className="flex items-center gap-2 w-20">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  value={value || ''}
                                  onChange={(e) => onUpdateProduct(product.id, { 
                                    timeBreakdown: { ...timeBreakdown, [timeType]: parseFloat(e.target.value) || 0 }
                                  })}
                                  className="h-8 text-sm w-full"
                                  placeholder="0"
                                />
                                <span className="text-sm text-muted-foreground">h</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg border border-border p-3">
                        <h4 className="text-sm font-medium text-foreground mb-3">Platform Fees</h4>
                        <div className="space-y-3">
                          {platformFees.map(platformFee => (
                            <div key={platformFee.id} className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                              <Input
                                value={platformFee.name}
                                onChange={(e) => {
                                  const updated = platformFees.map(pf =>
                                    pf.id === platformFee.id ? { ...pf, name: e.target.value } : pf
                                  );
                                  onUpdateProduct(product.id, { platformFees: updated });
                                }}
                                className="h-8 text-sm flex-1"
                                placeholder="Platform name"
                              />
                              <div className="relative w-24">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={platformFee.feePercentage || ''}
                                  onChange={(e) => {
                                    const updated = platformFees.map(pf =>
                                      pf.id === platformFee.id 
                                        ? { ...pf, feePercentage: parseFloat(e.target.value) || 0 }
                                        : pf
                                    );
                                    onUpdateProduct(product.id, { platformFees: updated });
                                  }}
                                  className="pr-6 h-8 text-sm w-full"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                              </div>
                              <div className="relative w-24">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={platformFee.salesPercentage || ''}
                                  onChange={(e) => {
                                    const updated = platformFees.map(pf =>
                                      pf.id === platformFee.id 
                                        ? { ...pf, salesPercentage: parseFloat(e.target.value) || 0 }
                                        : pf
                                    );
                                    onUpdateProduct(product.id, { platformFees: updated });
                                  }}
                                  className="pr-6 h-8 text-sm w-full"
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                              </div>
                              {platformFees.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = platformFees.filter(pf => pf.id !== platformFee.id);
                                    onUpdateProduct(product.id, { platformFees: updated });
                                  }}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Select onValueChange={(value) => {
                            const preset = DEFAULT_PLATFORM_PRESETS.find(p => p.name === value);
                            if (preset) {
                              const newPlatform: PlatformFee = {
                                id: `platform_${Date.now()}`,
                                name: preset.name,
                                feePercentage: preset.feePercentage,
                                salesPercentage: 0
                              };
                              onUpdateProduct(product.id, { platformFees: [...platformFees, newPlatform] });
                            }
                          }}>
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue placeholder="+ Add Platform" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEFAULT_PLATFORM_PRESETS.map((preset) => (
                                <SelectItem key={preset.name} value={preset.name}>
                                  {preset.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
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