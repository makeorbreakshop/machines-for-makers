'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Package, Clock, Store, ChevronDown, ChevronUp } from 'lucide-react';
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

interface ExpandedSections {
  [productId: string]: {
    materials: boolean;
    labor: boolean;
    platforms: boolean;
  };
}

export function Level1Setup({ 
  state, 
  onAddProduct, 
  onUpdateProduct, 
  onRemoveProduct
}: Level1SetupProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({});
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatCurrencyCompact = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const toggleSection = (productId: string, section: 'materials' | 'labor' | 'platforms') => {
    setExpandedSections(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [section]: !prev[productId]?.[section]
      }
    }));
  };

  const addProductFromTemplate = (template: typeof DEFAULT_PRODUCT_TEMPLATES[0]) => {
    const id = onAddProduct({
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
    // Initialize expanded state for this product
    setExpandedSections(prev => ({
      ...prev,
      [id]: { materials: false, labor: false, platforms: false }
    }));
  };

  const addBlankProduct = () => {
    const id = onAddProduct({
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
    // Initialize expanded state for this product
    setExpandedSections(prev => ({
      ...prev,
      [id]: { materials: false, labor: false, platforms: false }
    }));
  };

  const addCostItem = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const newCostKey = `cost_${Date.now()}`;
    onUpdateProduct(productId, { 
      costs: { ...product.costs, [newCostKey]: 0 }
    });
  };

  const removeCostItem = (productId: string, costType: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const newCosts = { ...product.costs };
    delete newCosts[costType];
    onUpdateProduct(productId, { costs: newCosts });
  };

  const addTimeItem = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const newTimeKey = `task_${Date.now()}`;
    onUpdateProduct(productId, { 
      timeBreakdown: { ...product.timeBreakdown, [newTimeKey]: 0 }
    });
  };

  const removeTimeItem = (productId: string, timeType: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const newTimeBreakdown = { ...product.timeBreakdown };
    delete newTimeBreakdown[timeType];
    onUpdateProduct(productId, { timeBreakdown: newTimeBreakdown });
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
              
              const materialCostsTotal = Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0);
              const costItemCount = Object.keys(costs).length;
              const laborHoursTotal = Object.values(timeBreakdown).reduce((sum, hours) => sum + (hours || 0), 0);
              const platformCount = platformFees.length;
              
              const isExpanded = expandedSections[product.id];
              
              return (
                <Card key={product.id} className="border-border bg-card shadow-sm">
                  <CardContent className="p-0">
                    {/* Product Header */}
                    <div className="bg-muted/50 border-b border-border px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Package className="h-4 w-4 text-primary" />
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
                              className="text-base font-medium max-w-xs"
                              placeholder={`Product ${index + 1}`}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => onUpdateProduct(product.id, { isEditingName: true })}
                              className="text-base font-medium hover:text-primary transition-colors"
                            >
                              {product.name || `Product ${index + 1}`}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-medium ${
                            unitProfit > 0 ? 'text-green-600' : unitProfit < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            {formatCurrency(unitProfit)} profit/unit
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this product?')) {
                                onRemoveProduct(product.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Main Product Body */}
                    <div className="p-6 space-y-6">
                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Selling Price</Label>
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
                          <Input
                            type="number"
                            step="0.01"
                            value={editingCosts[product.id] ?? totalCosts.toFixed(2)}
                            onChange={(e) => {
                              setEditingCosts(prev => ({
                                ...prev,
                                [product.id]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              const newTotalCost = parseFloat(e.target.value) || 0;
                              const currentMaterialCosts = materialCostsTotal;
                              const nonMaterialCosts = totalCosts - currentMaterialCosts;
                              const newMaterialTotal = Math.max(0, newTotalCost - nonMaterialCosts);
                              
                              // Distribute the change proportionally across existing costs
                              if (currentMaterialCosts > 0) {
                                const ratio = newMaterialTotal / currentMaterialCosts;
                                const updatedCosts = Object.entries(costs).reduce((acc, [key, value]) => {
                                  acc[key] = (value || 0) * ratio;
                                  return acc;
                                }, {} as Record<string, number>);
                                onUpdateProduct(product.id, { costs: updatedCosts });
                              } else {
                                // If no costs yet, add to 'other'
                                onUpdateProduct(product.id, { 
                                  costs: { ...costs, other: newMaterialTotal }
                                });
                              }
                              
                              // Clear editing state
                              setEditingCosts(prev => {
                                const newState = { ...prev };
                                delete newState[product.id];
                                return newState;
                              });
                            }}
                            placeholder="5.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum: {formatCurrency(totalCosts - materialCostsTotal)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground">Monthly Profit</Label>
                          <div className={`h-10 px-3 flex items-center text-sm font-medium rounded-md border ${
                            monthlyProfit > 0 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                            monthlyProfit < 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                            'bg-muted text-muted-foreground border-border'
                          }`}>
                            {formatCurrency(monthlyProfit)}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Cost Sections */}
                      <div className="space-y-3">
                        {/* Material Costs Section */}
                        <div className="bg-muted/30 rounded-lg border border-border">
                          <button
                            onClick={() => toggleSection(product.id, 'materials')}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Material Costs</span>
                              <span className="text-sm text-muted-foreground">
                                {costItemCount} {costItemCount === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {formatCurrencyCompact(materialCostsTotal)}
                              </span>
                              {isExpanded?.materials ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded?.materials && (
                            <div className="px-4 pb-4 space-y-2">
                              {Object.entries(costs).map(([costType, value]) => (
                                <div key={costType} className="flex items-center gap-3">
                                  <Input
                                    value={costType.charAt(0).toUpperCase() + costType.slice(1).replace(/_/g, ' ')}
                                    onChange={(e) => {
                                      const newCostType = e.target.value.toLowerCase().replace(/ /g, '_');
                                      if (newCostType !== costType) {
                                        const newCosts = { ...costs };
                                        delete newCosts[costType];
                                        newCosts[newCostType] = value;
                                        onUpdateProduct(product.id, { costs: newCosts });
                                      }
                                    }}
                                    className="h-9 text-sm flex-1"
                                    placeholder="Cost name"
                                  />
                                  <div className="relative w-24">
                                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={value === 0 ? '0' : value || ''}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        onUpdateProduct(product.id, { 
                                          costs: { ...costs, [costType]: val || 0 }
                                        });
                                      }}
                                      onBlur={(e) => {
                                        const roundedValue = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value) * 100) / 100 || 0;
                                        onUpdateProduct(product.id, { 
                                          costs: { ...costs, [costType]: roundedValue }
                                        });
                                      }}
                                      className="pl-6 h-9 text-sm w-full"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCostItem(product.id, costType)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              
                              <Button
                                variant="ghost"
                                onClick={() => addCostItem(product.id)}
                                className="w-full h-9 text-sm text-muted-foreground hover:text-foreground mt-2"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Material Cost
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Labor Costs Section */}
                        <div className="bg-muted/30 rounded-lg border border-border">
                          <button
                            onClick={() => toggleSection(product.id, 'labor')}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Labor</span>
                              <span className="text-sm text-muted-foreground">
                                {laborHoursTotal.toFixed(1)} hours
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {formatCurrencyCompact(productMetrics.laborCosts)}
                              </span>
                              {isExpanded?.labor ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded?.labor && (
                            <div className="px-4 pb-4 space-y-2">
                              {Object.entries(timeBreakdown).map(([timeType, value]) => (
                                <div key={timeType} className="flex items-center gap-3">
                                  <Input
                                    value={timeType.charAt(0).toUpperCase() + timeType.slice(1).replace(/_/g, ' ')}
                                    onChange={(e) => {
                                      const newTimeType = e.target.value.toLowerCase().replace(/ /g, '_');
                                      if (newTimeType !== timeType) {
                                        const newTimeBreakdown = { ...timeBreakdown };
                                        delete newTimeBreakdown[timeType];
                                        newTimeBreakdown[newTimeType] = value;
                                        onUpdateProduct(product.id, { timeBreakdown: newTimeBreakdown });
                                      }
                                    }}
                                    className="h-9 text-sm flex-1"
                                    placeholder="Task name"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={value === 0 ? '0' : value || ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      onUpdateProduct(product.id, { 
                                        timeBreakdown: { ...timeBreakdown, [timeType]: val || 0 }
                                      });
                                    }}
                                    className="h-9 text-sm w-24"
                                    placeholder="0.00"
                                  />
                                  <span className="text-sm font-medium w-20 text-right">
                                    {formatCurrencyCompact((value || 0) * (state.hourlyRate || 0))}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTimeItem(product.id, timeType)}
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              
                              <Button
                                variant="ghost"
                                onClick={() => addTimeItem(product.id)}
                                className="w-full h-9 text-sm text-muted-foreground hover:text-foreground mt-2"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Labor Task
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Platform Fees Section */}
                        <div className="bg-muted/30 rounded-lg border border-border">
                          <button
                            onClick={() => toggleSection(product.id, 'platforms')}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Platform Fees</span>
                              <span className="text-sm text-muted-foreground">
                                {platformCount} {platformCount === 1 ? 'platform' : 'platforms'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {formatCurrencyCompact(productMetrics.platformFees)}
                              </span>
                              {isExpanded?.platforms ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded?.platforms && (
                            <div className="px-4 pb-4 space-y-3">
                              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground px-1">
                                <span className="flex-1">Platform</span>
                                <span className="w-20 text-center">Fee %</span>
                                <span className="w-20 text-center">Sales %</span>
                                <span className="w-16 text-center">Units</span>
                                <span className="w-8"></span>
                              </div>
                              
                              {platformFees.map(platformFee => (
                                <div key={platformFee.id} className="flex items-center gap-3">
                                  <Input
                                    value={platformFee.name}
                                    onChange={(e) => {
                                      const updated = platformFees.map(pf =>
                                        pf.id === platformFee.id ? { ...pf, name: e.target.value } : pf
                                      );
                                      onUpdateProduct(product.id, { platformFees: updated });
                                    }}
                                    className="h-9 text-sm flex-1"
                                    placeholder="Platform name"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={platformFee.feePercentage || ''}
                                    onChange={(e) => {
                                      const updated = platformFees.map(pf =>
                                        pf.id === platformFee.id 
                                          ? { ...pf, feePercentage: parseFloat(e.target.value) || 0 }
                                          : pf
                                      );
                                      onUpdateProduct(product.id, { platformFees: updated });
                                    }}
                                    className="h-9 text-sm w-20"
                                    placeholder="0.00"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={platformFee.salesPercentage || ''}
                                    onChange={(e) => {
                                      const newPercentage = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                      
                                      if (platformFees.length === 1) {
                                        const updated = platformFees.map(pf =>
                                          pf.id === platformFee.id 
                                            ? { ...pf, salesPercentage: newPercentage }
                                            : pf
                                        );
                                        onUpdateProduct(product.id, { platformFees: updated });
                                      } else {
                                        // Adjust others proportionally
                                        const otherFees = platformFees.filter(pf => pf.id !== platformFee.id);
                                        const currentOtherTotal = otherFees.reduce((sum, pf) => sum + pf.salesPercentage, 0);
                                        const remainingPercentage = 100 - newPercentage;
                                        
                                        const updated = platformFees.map(pf => {
                                          if (pf.id === platformFee.id) {
                                            return { ...pf, salesPercentage: newPercentage };
                                          } else if (currentOtherTotal > 0) {
                                            const proportion = pf.salesPercentage / currentOtherTotal;
                                            return { ...pf, salesPercentage: remainingPercentage * proportion };
                                          } else {
                                            return pf;
                                          }
                                        });
                                        onUpdateProduct(product.id, { platformFees: updated });
                                      }
                                    }}
                                    className="h-9 text-sm w-20"
                                    placeholder="0.00"
                                  />
                                  <span className="text-sm text-muted-foreground w-16 text-center">
                                    {Math.round((product.monthlyUnits || 0) * (platformFee.salesPercentage / 100))}
                                  </span>
                                  {platformFees.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updated = platformFees.filter(pf => pf.id !== platformFee.id);
                                        // Redistribute percentages
                                        const totalPercentage = 100;
                                        if (updated.length > 0) {
                                          const equalShare = totalPercentage / updated.length;
                                          updated.forEach(pf => {
                                            pf.salesPercentage = equalShare;
                                          });
                                        }
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
                                <SelectTrigger className="w-full h-9 text-sm">
                                  <SelectValue placeholder="+ Add Platform" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DEFAULT_PLATFORM_PRESETS.map((preset) => (
                                    <SelectItem key={preset.name} value={preset.name}>
                                      {preset.name} ({preset.feePercentage}% fee)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {(() => {
                                const total = platformFees.reduce((sum, pf) => sum + pf.salesPercentage, 0);
                                return total !== 100 && total > 0 ? (
                                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50/80 px-3 py-2 rounded-md border border-amber-200/50">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                    <span>Distribution totals {Math.round(total)}% (should be 100%)</span>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
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