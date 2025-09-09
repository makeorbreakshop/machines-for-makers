'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Package, Clock, Store, ChevronDown, ChevronUp, Edit2, Layers, Cpu, Calculator, RotateCw, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as SelectPrimitive from "@radix-ui/react-select";
import { 
  CalculatorState, 
  CalculatedMetrics, 
  DEFAULT_PRODUCT_TEMPLATES, 
  DEFAULT_PLATFORM_PRESETS, 
  PlatformFee,
  Material,
  MaterialUsage 
} from '../lib/calculator-types';
import { calculateProductMetrics } from '../lib/calculator-formulas';
import { MaterialCostModal } from './material-cost-modal';
import { MachineCostCalculator } from './machine-cost-calculator';

interface Level1SetupProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateGoal: (goal: number) => void;
  onAddProduct: (product: any) => string;
  onUpdateProduct: (id: string, updates: any) => void;
  onRemoveProduct: (id: string) => void;
  onUpdateHourlyRate: (rate: number) => void;
  onUpdateLabor: (updates: any) => void;
  onComplete: () => void;
  onAddMaterial: (material: Omit<Material, 'id'>) => string;
  onAddMaterialUsage: (productId: string, usage: MaterialUsage) => void;
  onUpdateMaterialUsage: (productId: string, index: number, usage: MaterialUsage) => void;
  onRemoveMaterialUsage: (productId: string, index: number) => void;
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
  onRemoveProduct,
  onUpdateLabor,
  onAddMaterial,
  onAddMaterialUsage,
  onUpdateMaterialUsage,
  onRemoveMaterialUsage
}: Level1SetupProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({});
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [materialModalState, setMaterialModalState] = useState<{
    open: boolean;
    productId: string | null;
    editingIndex: number | null;
    editingUsage: MaterialUsage | undefined;
  }>({ open: false, productId: null, editingIndex: null, editingUsage: undefined });
  const [machineCalculatorState, setMachineCalculatorState] = useState<{
    open: boolean;
    productId: string | null;
    currentCostPerHour: number;
  }>({ open: false, productId: null, currentCostPerHour: 5 });
  
  // Batch mode state for labor
  const [batchModeState, setBatchModeState] = useState<{
    [productId: string]: {
      active: boolean;
      batchSize: number;
      selectedTasks: Set<string>;
      appliedBatches: { [taskKey: string]: number }; // Store which tasks have been batch-converted and by what size
    };
  }>({});

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

  const toggleSection = (productId: string, section: 'materials' | 'machine' | 'labor' | 'platforms') => {
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
      materialUsage: template.materialUsage || [], // Include material usage from template
      machineTime: template.machineTime || { // Include machine time from template
        machineMinutes: template.timeBreakdown?.machine || 0,
        costPerHour: 5,
        totalCost: ((template.timeBreakdown?.machine || 0) / 60) * 5
      },
      timeBreakdown: template.timeBreakdown,
      platformFees: template.platformFees || [
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
      [id]: { materials: false, labor: false, platforms: false, machine: false }
    }));
    // Auto-expand the newly added product
    setExpandedProducts(prev => new Set([...prev, id]));
  };

  const addBlankProduct = () => {
    const id = onAddProduct({
      name: '',
      sellingPrice: 0,
      monthlyUnits: 0,
      costs: {
        materials: 0,
        finishing: 0,
        packaging: 0,
        shipping: 0,
        other: 0
      },
      materialUsage: [], // Initialize with empty material usage array
      machineTime: {     // Initialize machine time
        machineMinutes: 0,
        costPerHour: 5,  // Default $5/hour for electricity and maintenance
        totalCost: 0
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
      [id]: { materials: false, labor: false, platforms: false, machine: false }
    }));
    // Auto-expand the newly added product
    setExpandedProducts(prev => new Set([...prev, id]));
  };


  const addTimeItem = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const newTimeKey = '';
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
              className="text-foreground border-border hover:bg-muted"
            >
              Use Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addBlankProduct}
              className="text-foreground border-border hover:bg-muted"
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
                  className="justify-start h-auto p-3 text-foreground border-border  hover:"
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
              
              // Get the assigned worker's rate for this product
              const productAssignments = state.labor?.productAssignments || {};
              const assignedWorkerId = productAssignments[product.id] || 'owner';
              const assignedWorker = state.labor?.workers?.find(w => w.id === assignedWorkerId);
              const workerHourlyRate = assignedWorker?.hourlyRate ?? state.hourlyRate ?? 0;
              
              const productMetrics = calculateProductMetrics({ ...product, platformFees }, workerHourlyRate);
              const totalCosts = productMetrics.totalCosts;
              const unitProfit = (product.sellingPrice || 0) - totalCosts;
              const monthlyRevenue = (product.monthlyUnits || 0) * (product.sellingPrice || 0);
              const monthlyProfit = (product.monthlyUnits || 0) * unitProfit;
              
              // Calculate material costs from materialUsage or legacy costs
              const materialUsage = product.materialUsage || [];
              const materialCostsTotal = materialUsage.length > 0 
                ? materialUsage.reduce((sum, usage) => sum + usage.cost, 0)
                : Object.values(costs).reduce((sum, cost) => sum + (cost || 0), 0);
              const costItemCount = materialUsage.length || Object.keys(costs).length;
              const laborMinutesTotal = Object.entries(timeBreakdown)
                .filter(([key]) => key !== 'machine')
                .reduce((sum, [, minutes]) => sum + (minutes || 0), 0);
              const laborHoursTotal = laborMinutesTotal / 60;
              const platformCount = platformFees.length;
              
              const isExpanded = expandedSections[product.id];
              
              return (
                <div key={product.id} className="mb-4">
                    {/* Product Header - Clickable to expand/collapse */}
                    <div className={`border border-border ${expandedProducts.has(product.id) ? 'rounded-t-lg border-b-0' : 'rounded-lg'}`}>
                      <div className="flex items-center justify-between px-6 py-4">
                        <button
                          onClick={() => {
                            setExpandedProducts(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(product.id)) {
                                newSet.delete(product.id);
                              } else {
                                newSet.add(product.id);
                              }
                              return newSet;
                            });
                          }}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {expandedProducts.has(product.id) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                          <Package className="h-5 w-5 text-muted-foreground" />
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
                              onClick={(e) => e.stopPropagation()}
                              className="text-base font-medium max-w-xs"
                              placeholder={`Product ${index + 1}`}
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateProduct(product.id, { isEditingName: true });
                              }}
                              className="text-lg font-semibold text-foreground hover:text-primary transition-colors cursor-text"
                            >
                              {product.name || `Product ${index + 1}`}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-semibold tabular-nums ${
                            monthlyProfit > 0 ? 'text-green-500' : monthlyProfit < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}>
                            ${Math.round(monthlyProfit).toLocaleString()}/mo
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this product?')) {
                                onRemoveProduct(product.id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Main Product Body - Mobile Optimized */}
                    {expandedProducts.has(product.id) && (
                    <div className="border border-t-0 border-border rounded-b-lg p-4 sm:p-6 space-y-4 sm:space-y-6 bg-background">
                      {/* Key Metrics - Single Row Layout */}
                      <div className="grid grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Selling Price</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={product.sellingPrice || ''}
                              onChange={(e) => onUpdateProduct(product.id, { 
                                sellingPrice: Math.round((parseFloat(e.target.value) || 0) * 100) / 100,
                                pricingMode: 'price',
                                targetMargin: undefined
                              })}
                              onFocus={() => onUpdateProduct(product.id, { pricingMode: 'price' })}
                              placeholder="25"
                              inputMode="decimal"
                              className={`h-10 text-sm font-semibold tabular-nums pl-8 pr-3 ${
                                product.pricingMode === 'price' || !product.pricingMode
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                                  : ''
                              }`}
                            />
                          </div>
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
                            placeholder="400"
                            inputMode="numeric"
                            className="h-10 text-sm font-semibold tabular-nums"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Cost/Unit</Label>
                          <div className="h-10 px-3 flex items-center text-sm font-semibold tabular-nums rounded-md border ">
                            {formatCurrencyCompact(totalCosts)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Profit/Unit</Label>
                          <div className="h-10 px-3 flex items-center text-sm font-semibold tabular-nums rounded-md border ">
                            <span className={
                              unitProfit > 0 ? 'text-green-500' : 
                              unitProfit < 0 ? 'text-red-600 dark:text-red-400' : 
                              'text-muted-foreground'
                            }>
                              {formatCurrencyCompact(unitProfit)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Margin %</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={(product.pricingMode === 'margin' && product.targetMargin !== undefined) 
                                ? product.targetMargin === 0 ? '' : product.targetMargin
                                : (product.sellingPrice > 0 && totalCosts > 0 
                                  ? Math.round(((product.sellingPrice - totalCosts) / product.sellingPrice) * 1000) / 10 
                                  : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                const margin = value === '' ? 0 : parseFloat(value) || 0;
                                const newPrice = totalCosts / (1 - margin / 100);
                                onUpdateProduct(product.id, { 
                                  sellingPrice: Math.round(newPrice * 100) / 100,
                                  pricingMode: 'margin',
                                  targetMargin: margin
                                });
                              }}
                              onFocus={() => onUpdateProduct(product.id, { pricingMode: 'margin' })}
                              placeholder="0"
                              inputMode="decimal"
                              className={`h-10 text-sm font-semibold tabular-nums pr-8 ${
                                product.pricingMode === 'margin' 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                                  : ''
                              }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Cost Sections - Mobile Optimized */}
                      <div className="space-y-3">
                        {/* Material Costs Section */}
                        <div className="bg-muted/30 rounded-lg border border-border">
                          <button
                            onClick={() => toggleSection(product.id, 'materials')}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-lg min-h-[48px]"
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
                            <div className="px-4 pb-4 pt-2 space-y-2">
                              {/* Column headers */}
                              <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
                                <span className="col-span-5">Material</span>
                                <span className="col-span-2 text-center">Qty</span>
                                <span className="col-span-2 text-center">Price</span>
                                <span className="col-span-2 text-right">Total</span>
                                <span className="col-span-1"></span>
                              </div>
                              
                              {/* Display existing materials */}
                              {materialUsage.map((usage, idx) => {
                                const isBatch = usage.isBatch || (usage.batchQuantities && usage.batchQuantities.length > 0);
                                
                                return (
                                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                      {isBatch ? (
                                        <div className="relative flex items-center gap-2">
                                          <Layers className="h-3.5 w-3.5 text-blue-500 absolute left-2 z-10" />
                                          <button
                                            onClick={() => {
                                              setMaterialModalState({
                                                open: true,
                                                productId: product.id,
                                                editingIndex: idx,
                                                editingUsage: usage
                                              });
                                            }}
                                            className="h-9 pl-8 pr-3 text-sm text-left w-full hover:bg-blue-900/20 rounded transition-colors text-blue-400 hover:text-blue-300"
                                          >
                                            {usage.name || 'Unnamed material'}
                                          </button>
                                        </div>
                                      ) : (
                                        <Input
                                          value={usage.name || ''}
                                          onChange={(e) => {
                                            const updatedUsage = { ...usage, name: e.target.value };
                                            onUpdateMaterialUsage(product.id, idx, updatedUsage);
                                          }}
                                          className="h-9 text-sm "
                                          placeholder="Material name"
                                        />
                                      )}
                                    </div>
                                    <div className="col-span-2">
                                      <Input
                                        type="number"
                                        value={usage.quantity === 0 ? '' : usage.quantity || 1}
                                        onChange={(e) => {
                                          const qty = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                          const updatedUsage = { 
                                            ...usage, 
                                            quantity: qty,
                                            cost: Math.round(qty * usage.unitCost * 100) / 100
                                          };
                                          onUpdateMaterialUsage(product.id, idx, updatedUsage);
                                        }}
                                        className={`h-9 text-sm text-center  ${isBatch ? 'text-blue-400' : ''}`}
                                        min="0"
                                        step="0.01"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <div className="relative">
                                        <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm ${isBatch ? 'text-blue-500' : 'text-muted-foreground'}`}>$</span>
                                        <Input
                                          type="number"
                                          value={usage.unitCost === 0 ? '' : usage.unitCost}
                                          onChange={(e) => {
                                            const cost = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                            const updatedUsage = { 
                                              ...usage, 
                                              unitCost: cost,
                                              cost: Math.round(usage.quantity * cost * 100) / 100
                                            };
                                            onUpdateMaterialUsage(product.id, idx, updatedUsage);
                                          }}
                                          className={`h-9 text-sm pl-6  text-center ${isBatch ? 'text-blue-400' : ''}`}
                                          min="0"
                                          step="0.01"
                                          placeholder="0"
                                        />
                                      </div>
                                    </div>
                                    <div className={`col-span-2 text-sm font-medium text-right tabular-nums ${isBatch ? 'text-blue-400' : ''}`}>
                                      {formatCurrencyCompact(usage.cost)}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          onRemoveMaterialUsage(product.id, idx);
                                        }}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Add Material Buttons */}
                              <div className="flex gap-2 mt-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    // Add a new empty material
                                    onAddMaterialUsage(product.id, {
                                      name: '',
                                      quantity: 1,
                                      unitCost: 0,
                                      cost: 0,
                                      isBatch: false
                                    });
                                  }}
                                  className="flex-1 h-9 text-sm text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Material
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setMaterialModalState({
                                      open: true,
                                      productId: product.id,
                                      editingIndex: null,
                                      editingUsage: undefined
                                    });
                                  }}
                                  className="flex-1 h-9 text-sm text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Batch Material
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Machine Time Section */}
                        <div className="bg-muted/30 rounded-lg border border-border">
                          <button
                            onClick={() => toggleSection(product.id, 'machine')}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Machine Time</span>
                              <span className={`text-sm ${batchModeState[product.id]?.appliedBatches?.['machine'] ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-muted-foreground'}`}>
                                {(timeBreakdown.machine || 0).toFixed((timeBreakdown.machine || 0) % 1 !== 0 ? 2 : 0)} minutes
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {formatCurrencyCompact(
                                  product.machineTime?.totalCost || 
                                  ((timeBreakdown.machine || 0) / 60) * (product.machineTime?.costPerHour || 5)
                                )}
                              </span>
                              {isExpanded?.machine ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded?.machine && (
                            <div className="px-4 pb-4 pt-2 space-y-3">
                              {/* Machine batch mode controls */}
                              {batchModeState[product.id]?.active && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={batchModeState[product.id]?.selectedTasks?.has('machine')}
                                      onChange={(e) => {
                                        const newSelected = new Set(batchModeState[product.id].selectedTasks);
                                        if (e.target.checked) {
                                          newSelected.add('machine');
                                        } else {
                                          newSelected.delete('machine');
                                        }
                                        setBatchModeState(prev => ({
                                          ...prev,
                                          [product.id]: {
                                            ...prev[product.id],
                                            selectedTasks: newSelected
                                          }
                                        }));
                                      }}
                                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-blue-700 dark:text-blue-400">
                                      Include machine time in batch conversion
                                    </span>
                                  </div>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-medium text-muted-foreground">Machine Minutes</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={timeBreakdown.machine || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const minutes = value === '' ? 0 : parseFloat(value) || 0;
                                      onUpdateProduct(product.id, { 
                                        timeBreakdown: { ...timeBreakdown, machine: minutes },
                                        machineTime: {
                                          machineMinutes: minutes,
                                          costPerHour: product.machineTime?.costPerHour || 5,
                                          totalCost: (minutes / 60) * (product.machineTime?.costPerHour || 5)
                                        }
                                      });
                                    }}
                                    className={`h-9 text-sm  ${batchModeState[product.id]?.appliedBatches?.['machine'] ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-muted-foreground">Cost per Hour</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => {
                                        setMachineCalculatorState({
                                          open: true,
                                          productId: product.id,
                                          currentCostPerHour: product.machineTime?.costPerHour || 5
                                        });
                                      }}
                                    >
                                      <Calculator className="h-3 w-3 mr-1" />
                                      Calculate
                                    </Button>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={product.machineTime?.costPerHour === 0 ? '' : product.machineTime?.costPerHour || ''}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const costPerHour = value === '' ? 0 : Math.round((parseFloat(value) || 0) * 100) / 100;
                                        onUpdateProduct(product.id, {
                                          machineTime: {
                                            machineMinutes: timeBreakdown.machine || 0,
                                            costPerHour: costPerHour,
                                            totalCost: Math.round(((timeBreakdown.machine || 0) / 60) * costPerHour * 100) / 100
                                          }
                                        });
                                      }}
                                      className="h-9 text-sm pl-6 "
                                      placeholder="5.00"
                                    />
                                  </div>
                                </div>
                              </div>
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
                                {laborMinutesTotal.toFixed(laborMinutesTotal % 1 !== 0 ? 2 : 0)} minutes
                              </span>
                              {batchModeState[product.id]?.appliedBatches && 
                               Object.keys(batchModeState[product.id].appliedBatches).filter(k => k !== 'machine').length > 0 && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                  batch applied
                                </span>
                              )}
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
                            <div className="px-4 pb-4 pt-2 space-y-2">
                              {/* Batch mode controls */}
                              {batchModeState[product.id]?.active && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2 mb-3">
                                  <div className="flex items-center gap-3">
                                    <RotateCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Batch Mode:</span>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={batchModeState[product.id].batchSize}
                                      onChange={(e) => {
                                        const newSize = parseInt(e.target.value) || 1;
                                        setBatchModeState(prev => ({
                                          ...prev,
                                          [product.id]: {
                                            ...prev[product.id],
                                            batchSize: newSize
                                          }
                                        }));
                                      }}
                                      className="h-7 w-20 text-sm"
                                      placeholder="30"
                                    />
                                    <span className="text-sm text-blue-700 dark:text-blue-400">units per batch</span>
                                    <div className="ml-auto flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => {
                                          // Apply batch conversion
                                          const batchState = batchModeState[product.id];
                                          const newTimeBreakdown = { ...timeBreakdown };
                                          const newAppliedBatches = { ...batchState.appliedBatches };
                                          
                                          batchState.selectedTasks.forEach(taskKey => {
                                            if (taskKey in newTimeBreakdown) {
                                              // Convert to per-unit time
                                              newTimeBreakdown[taskKey] = Math.round((newTimeBreakdown[taskKey] / batchState.batchSize) * 100) / 100;
                                              newAppliedBatches[taskKey] = batchState.batchSize;
                                            }
                                          });
                                          
                                          // Also update machine time if it was converted
                                          const machineUpdates: any = { timeBreakdown: newTimeBreakdown };
                                          if (batchState.selectedTasks.has('machine') && product.machineTime) {
                                            machineUpdates.machineTime = {
                                              ...product.machineTime,
                                              machineMinutes: newTimeBreakdown.machine,
                                              totalCost: (newTimeBreakdown.machine / 60) * (product.machineTime.costPerHour || 5)
                                            };
                                          }
                                          
                                          onUpdateProduct(product.id, machineUpdates);
                                          
                                          // Exit batch mode but remember what was converted
                                          setBatchModeState(prev => ({
                                            ...prev,
                                            [product.id]: {
                                              ...batchState,
                                              active: false,
                                              selectedTasks: new Set(),
                                              appliedBatches: newAppliedBatches
                                            }
                                          }));
                                        }}
                                        className="h-7"
                                      >
                                        Apply
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          // Cancel batch mode and restore per-unit values
                                          const batchState = batchModeState[product.id];
                                          const appliedBatches = batchState.appliedBatches || {};
                                          const restoredTimeBreakdown = { ...timeBreakdown };
                                          
                                          // Convert back to per-unit for previously converted tasks
                                          Object.keys(appliedBatches).forEach(taskKey => {
                                            if (taskKey in restoredTimeBreakdown && appliedBatches[taskKey]) {
                                              restoredTimeBreakdown[taskKey] = Math.round((restoredTimeBreakdown[taskKey] / appliedBatches[taskKey]) * 100) / 100;
                                            }
                                          });
                                          
                                          onUpdateProduct(product.id, { timeBreakdown: restoredTimeBreakdown });
                                          
                                          // Restore machine time if it was converted
                                          if (appliedBatches['machine'] && product.machineTime) {
                                            onUpdateProduct(product.id, {
                                              timeBreakdown: restoredTimeBreakdown,
                                              machineTime: {
                                                ...product.machineTime,
                                                machineMinutes: restoredTimeBreakdown.machine,
                                                totalCost: (restoredTimeBreakdown.machine / 60) * (product.machineTime.costPerHour || 5)
                                              }
                                            });
                                          }
                                          
                                          setBatchModeState(prev => ({
                                            ...prev,
                                            [product.id]: {
                                              ...prev[product.id],
                                              active: false,
                                              selectedTasks: new Set()
                                            }
                                          }));
                                        }}
                                        className="h-7"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Column headers */}
                              <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
                                {batchModeState[product.id]?.active && (
                                  <span className="col-span-1"></span>
                                )}
                                <span className={batchModeState[product.id]?.active ? "col-span-4" : "col-span-5"}>Task</span>
                                <span className="col-span-2 text-center">Worker</span>
                                <span className="col-span-2 text-center">Minutes</span>
                                <span className="col-span-2 text-right">Cost</span>
                                <span className="col-span-1"></span>
                              </div>
                              
                              {Object.entries(timeBreakdown)
                                .filter(([timeType]) => timeType !== 'machine') // Exclude machine time from labor
                                .map(([timeType, value]) => {
                                // Get the assigned worker name
                                const workerName = assignedWorker?.name || 'You';
                                const batchState = batchModeState[product.id];
                                const isInBatchMode = batchState?.active;
                                const isSelected = batchState?.selectedTasks?.has(timeType);
                                const batchSize = batchState?.appliedBatches?.[timeType];
                                
                                return (
                                  <div key={timeType} className="grid grid-cols-12 gap-2 items-center">
                                    {/* Checkbox for batch mode */}
                                    {isInBatchMode && (
                                      <div className="col-span-1 flex justify-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            const newSelected = new Set(batchState.selectedTasks);
                                            if (e.target.checked) {
                                              newSelected.add(timeType);
                                            } else {
                                              newSelected.delete(timeType);
                                            }
                                            setBatchModeState(prev => ({
                                              ...prev,
                                              [product.id]: {
                                                ...prev[product.id],
                                                selectedTasks: newSelected
                                              }
                                            }));
                                          }}
                                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                        />
                                      </div>
                                    )}
                                    <div className={isInBatchMode ? "col-span-4" : "col-span-5"}>
                                      <Input
                                        defaultValue={timeType ? timeType.charAt(0).toUpperCase() + timeType.slice(1).replace(/_/g, ' ') : ''}
                                        onBlur={(e) => {
                                          const newTimeType = e.target.value.toLowerCase().replace(/ /g, '_');
                                          if (newTimeType && newTimeType !== timeType) {
                                            const newTimeBreakdown = { ...timeBreakdown };
                                            if (timeType) {
                                              delete newTimeBreakdown[timeType];
                                            } else {
                                              delete newTimeBreakdown[''];
                                            }
                                            newTimeBreakdown[newTimeType] = value;
                                            onUpdateProduct(product.id, { timeBreakdown: newTimeBreakdown });
                                          }
                                        }}
                                        className="h-9 text-sm "
                                        placeholder="Task name"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Select
                                        value={assignedWorkerId || 'owner'}
                                        onValueChange={(workerId) => {
                                          const productAssignments = state.labor?.productAssignments || {};
                                          const updatedAssignments = { ...productAssignments, [product.id]: workerId };
                                          onUpdateLabor({ 
                                            ...state.labor,
                                            productAssignments: updatedAssignments 
                                          });
                                        }}
                                      >
                                        <SelectPrimitive.Trigger className="flex h-9 w-full items-center justify-between rounded-md border border-input  px-3 py-2 text-sm text-left ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
                                          <SelectValue placeholder="Select worker">
                                            {assignedWorker?.name || 'Select worker'}
                                          </SelectValue>
                                        </SelectPrimitive.Trigger>
                                        <SelectContent>
                                          {(state.labor?.workers || []).map((worker) => (
                                            <SelectItem key={worker.id} value={worker.id}>
                                              {worker.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="col-span-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={value || ''}
                                        onChange={(e) => {
                                          const inputValue = e.target.value;
                                          const numericValue = inputValue === '' ? 0 : parseFloat(inputValue) || 0;
                                          onUpdateProduct(product.id, { 
                                            timeBreakdown: { ...timeBreakdown, [timeType]: numericValue }
                                          });
                                        }}
                                        className={`h-9 text-sm text-center tabular-nums  ${batchSize ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`}
                                        placeholder="0"
                                        inputMode="decimal"
                                      />
                                    </div>
                                    <div className="col-span-2 text-sm font-medium text-right tabular-nums">
                                      {formatCurrencyCompact(((value || 0) / 60) * workerHourlyRate)}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeTimeItem(product.id, timeType)}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              <div className="flex gap-2 mt-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => addTimeItem(product.id)}
                                  className="flex-1 h-9 text-sm text-muted-foreground hover:text-foreground"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Labor Task
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    const currentBatchState = batchModeState[product.id] || {
                                      active: false,
                                      batchSize: 30,
                                      selectedTasks: new Set(),
                                      appliedBatches: {}
                                    };
                                    
                                    if (currentBatchState.active) {
                                      // Cancel batch mode
                                      setBatchModeState(prev => ({
                                        ...prev,
                                        [product.id]: {
                                          ...currentBatchState,
                                          active: false,
                                          selectedTasks: new Set()
                                        }
                                      }));
                                    } else {
                                      // Enter batch mode - pre-select all tasks and convert times back to batch totals
                                      const allTaskKeys = Object.keys(timeBreakdown).filter(key => key !== 'machine');
                                      const appliedBatches = currentBatchState.appliedBatches || {};
                                      
                                      // Convert times back to batch totals for tasks that were previously converted
                                      const batchTimeBreakdown = { ...timeBreakdown };
                                      Object.keys(appliedBatches).forEach(taskKey => {
                                        if (taskKey in batchTimeBreakdown && appliedBatches[taskKey]) {
                                          // Multiply back by the batch size to get batch total
                                          batchTimeBreakdown[taskKey] = Math.round(batchTimeBreakdown[taskKey] * appliedBatches[taskKey] * 100) / 100;
                                        }
                                      });
                                      
                                      // Update the product with batch totals temporarily
                                      onUpdateProduct(product.id, { timeBreakdown: batchTimeBreakdown });
                                      
                                      // Also update machine time if it was converted
                                      if (appliedBatches['machine'] && product.machineTime) {
                                        onUpdateProduct(product.id, {
                                          timeBreakdown: batchTimeBreakdown,
                                          machineTime: {
                                            ...product.machineTime,
                                            machineMinutes: batchTimeBreakdown.machine,
                                            totalCost: (batchTimeBreakdown.machine / 60) * (product.machineTime.costPerHour || 5)
                                          }
                                        });
                                      }
                                      
                                      setBatchModeState(prev => ({
                                        ...prev,
                                        [product.id]: {
                                          ...currentBatchState,
                                          active: true,
                                          selectedTasks: new Set(allTaskKeys),
                                          batchSize: currentBatchState.batchSize || 30
                                        }
                                      }));
                                    }
                                  }}
                                  className="flex-1 h-9 text-sm text-muted-foreground hover:text-foreground"
                                >
                                  <RotateCw className="h-4 w-4 mr-2" />
                                  Batch Mode
                                </Button>
                              </div>
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
                            <div className="px-4 pb-4 pt-2 space-y-2">
                              {/* Column headers */}
                              <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
                                <span className="col-span-4">Platform</span>
                                <span className="col-span-1 text-center">Fee %</span>
                                <span className="col-span-2 text-center">Sales %</span>
                                <span className="col-span-2 text-center">Units</span>
                                <span className="col-span-2 text-right">Cost</span>
                                <span className="col-span-1"></span>
                              </div>
                              
                              {platformFees.map(platformFee => {
                                const platformUnits = Math.round((product.monthlyUnits || 0) * (platformFee.salesPercentage / 100));
                                const platformCost = (product.sellingPrice || 0) * platformUnits * (platformFee.feePercentage / 100);
                                
                                return (
                                  <div key={platformFee.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4">
                                      <Input
                                        value={platformFee.name}
                                        onChange={(e) => {
                                          const updated = platformFees.map(pf =>
                                            pf.id === platformFee.id ? { ...pf, name: e.target.value } : pf
                                          );
                                          onUpdateProduct(product.id, { platformFees: updated });
                                        }}
                                        className="h-9 text-sm "
                                        placeholder="Platform name"
                                      />
                                    </div>
                                    <div className="col-span-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={platformFee.feePercentage || ''}
                                        onChange={(e) => {
                                          const updated = platformFees.map(pf =>
                                            pf.id === platformFee.id 
                                              ? { ...pf, feePercentage: Math.round((parseFloat(e.target.value) || 0) * 100) / 100 }
                                              : pf
                                          );
                                          onUpdateProduct(product.id, { platformFees: updated });
                                        }}
                                        className="h-9 text-sm text-center tabular-nums "
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={platformFee.salesPercentage || ''}
                                        onChange={(e) => {
                                          const newPercentage = Math.round(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) * 100) / 100;
                                          
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
                                        className="h-9 text-sm text-center tabular-nums "
                                        placeholder="0"
                                      />
                                    </div>
                                    <div className="col-span-2 text-sm text-muted-foreground text-center tabular-nums">
                                      {platformUnits}
                                    </div>
                                    <div className="col-span-2 text-sm font-medium text-right tabular-nums">
                                      {formatCurrencyCompact(platformCost)}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
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
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              
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
                                <SelectTrigger className="w-full h-9 text-sm text-muted-foreground hover:text-foreground">
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
                                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 rounded-md border border-amber-200/50 dark:border-amber-800/50">
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
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Material Cost Modal */}
      <MaterialCostModal
        open={materialModalState.open}
        onClose={() => setMaterialModalState({ open: false, productId: null, editingIndex: null, editingUsage: undefined })}
        materials={state.materials}
        onAddMaterial={onAddMaterial}
        onAddMaterialUsage={(usage) => {
          if (materialModalState.productId) {
            if (materialModalState.editingIndex !== null) {
              onUpdateMaterialUsage(materialModalState.productId, materialModalState.editingIndex, usage);
            } else {
              onAddMaterialUsage(materialModalState.productId, usage);
            }
            setMaterialModalState({ open: false, productId: null, editingIndex: null, editingUsage: undefined });
          }
        }}
        existingUsage={materialModalState.editingUsage}
      />

      {/* Machine Cost Calculator Modal */}
      <MachineCostCalculator
        open={machineCalculatorState.open}
        onOpenChange={(open) => {
          if (!open) {
            setMachineCalculatorState({ open: false, productId: null, currentCostPerHour: 5 });
          }
        }}
        onCalculate={(costPerHour) => {
          if (machineCalculatorState.productId) {
            const product = state.products.find(p => p.id === machineCalculatorState.productId);
            if (product) {
              const machineMinutes = product.timeBreakdown?.machine || 0;
              onUpdateProduct(machineCalculatorState.productId, {
                machineTime: {
                  machineMinutes: machineMinutes,
                  costPerHour: costPerHour,
                  totalCost: (machineMinutes / 60) * costPerHour
                }
              });
            }
          }
        }}
        currentCostPerHour={machineCalculatorState.currentCostPerHour}
      />
    </div>
  );
}