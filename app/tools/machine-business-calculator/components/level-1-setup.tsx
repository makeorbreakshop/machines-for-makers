'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Package, Clock, Store, ChevronDown, ChevronUp, Edit2, Layers, Cpu, Calculator } from 'lucide-react';
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
              
              // Get the assigned worker's rate for this product
              const productAssignments = (state.labor as any)?.productAssignments || {};
              const assignedWorkerId = productAssignments[product.id] || 'owner';
              const assignedWorker = state.labor?.workers?.find(w => w.id === assignedWorkerId);
              const workerHourlyRate = assignedWorker?.hourlyRate ?? state.hourlyRate ?? 0;
              
              const productMetrics = calculateProductMetrics({ ...product, platformFees }, workerHourlyRate);
              const totalCosts = productMetrics.totalCosts;
              const unitProfit = (product.sellingPrice || 0) - totalCosts;
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
                <Card key={product.id} className="border-0 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    {/* Product Header */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
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
                              className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {product.name || `Product ${index + 1}`}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-semibold tabular-nums ${
                            unitProfit > 0 ? 'text-green-600 dark:text-green-400' : unitProfit < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
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
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Main Product Body - Mobile Optimized */}
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                      {/* Key Metrics Grid - Responsive */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Selling Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={product.sellingPrice || ''}
                            onChange={(e) => onUpdateProduct(product.id, { 
                              sellingPrice: parseFloat(e.target.value) || 0 
                            })}
                            placeholder="0.00"
                            inputMode="decimal"
                            className="h-10 sm:h-9 text-base sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-semibold tabular-nums focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Units/Month</Label>
                          <Input
                            type="number"
                            step="1"
                            value={product.monthlyUnits || ''}
                            onChange={(e) => onUpdateProduct(product.id, { 
                              monthlyUnits: parseInt(e.target.value) || 0 
                            })}
                            placeholder="0"
                            inputMode="numeric"
                            className="h-10 sm:h-9 text-base sm:text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-semibold tabular-nums focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Total Cost</Label>
                          <div className="h-10 px-3 flex items-center text-base font-semibold tabular-nums rounded-md border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
                            {formatCurrencyCompact(totalCosts)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Profit</Label>
                          <div className={`h-10 px-3 flex items-center text-base sm:text-sm font-bold tabular-nums rounded-md border ${
                            monthlyProfit > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 
                            monthlyProfit < 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' : 
                            'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                          }`}>
                            {formatCurrency(monthlyProfit)}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Cost Sections - Mobile Optimized */}
                      <div className="space-y-3">
                        {/* Material Costs Section */}
                        <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => toggleSection(product.id, 'materials')}
                            className="w-full px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors rounded-lg min-h-[48px]"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
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
                                          className="h-9 text-sm bg-background"
                                          placeholder="Material name"
                                        />
                                      )}
                                    </div>
                                    <div className="col-span-2">
                                      <Input
                                        type="number"
                                        value={usage.quantity || 1}
                                        onChange={(e) => {
                                          const qty = parseFloat(e.target.value) || 1;
                                          const updatedUsage = { 
                                            ...usage, 
                                            quantity: qty,
                                            cost: qty * usage.unitCost
                                          };
                                          onUpdateMaterialUsage(product.id, idx, updatedUsage);
                                        }}
                                        className={`h-9 text-sm text-center bg-background ${isBatch ? 'text-blue-400' : ''}`}
                                        min="0"
                                        step="0.01"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <div className="relative">
                                        <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm ${isBatch ? 'text-blue-500' : 'text-muted-foreground'}`}>$</span>
                                        <Input
                                          type="number"
                                          value={usage.unitCost || 0}
                                          onChange={(e) => {
                                            const cost = parseFloat(e.target.value) || 0;
                                            const updatedUsage = { 
                                              ...usage, 
                                              unitCost: cost,
                                              cost: usage.quantity * cost
                                            };
                                            onUpdateMaterialUsage(product.id, idx, updatedUsage);
                                          }}
                                          className={`h-9 text-sm pl-6 bg-background text-center ${isBatch ? 'text-blue-400' : ''}`}
                                          min="0"
                                          step="0.01"
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
                              <span className="text-sm text-muted-foreground">
                                {timeBreakdown.machine || 0} minutes
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
                                    className="h-9 text-sm bg-background"
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
                                      value={product.machineTime?.costPerHour || 5}
                                      onChange={(e) => {
                                        const costPerHour = parseFloat(e.target.value) || 0;
                                        onUpdateProduct(product.id, {
                                          machineTime: {
                                            machineMinutes: timeBreakdown.machine || 0,
                                            costPerHour: costPerHour,
                                            totalCost: ((timeBreakdown.machine || 0) / 60) * costPerHour
                                          }
                                        });
                                      }}
                                      className="h-9 text-sm pl-6 bg-background"
                                      placeholder="5.00"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Machine Hours:</span>
                                  <span className="font-medium">{((timeBreakdown.machine || 0) / 60).toFixed(2)} hrs</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Total Machine Cost:</span>
                                  <span className="font-medium">
                                    {formatCurrencyCompact(
                                      ((timeBreakdown.machine || 0) / 60) * (product.machineTime?.costPerHour || 5)
                                    )}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  This covers electricity, maintenance, and machine depreciation
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
                                {laborMinutesTotal} minutes
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
                            <div className="px-4 pb-4 pt-2 space-y-2">
                              {/* Column headers */}
                              <div className="grid grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground">
                                <span className="col-span-5">Task</span>
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
                                
                                return (
                                  <div key={timeType} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
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
                                        className="h-9 text-sm bg-background"
                                        placeholder="Task name"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <Select
                                        value={assignedWorkerId || 'owner'}
                                        onValueChange={(workerId) => {
                                          const productAssignments = (state.labor as any)?.productAssignments || {};
                                          const updatedAssignments = { ...productAssignments, [product.id]: workerId };
                                          onUpdateLabor({ 
                                            ...state.labor,
                                            productAssignments: updatedAssignments 
                                          });
                                        }}
                                      >
                                        <SelectPrimitive.Trigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
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
                                        step="1"
                                        value={value === 0 ? '0' : value || ''}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                          onUpdateProduct(product.id, { 
                                            timeBreakdown: { ...timeBreakdown, [timeType]: val || 0 }
                                          });
                                        }}
                                        className="h-9 text-sm text-center tabular-nums bg-background"
                                        placeholder="0"
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
                              
                              <Button
                                variant="ghost"
                                onClick={() => addTimeItem(product.id)}
                                className="w-full h-9 text-sm text-muted-foreground hover:text-foreground mt-1"
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
                                        className="h-9 text-sm bg-background"
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
                                              ? { ...pf, feePercentage: parseFloat(e.target.value) || 0 }
                                              : pf
                                          );
                                          onUpdateProduct(product.id, { platformFees: updated });
                                        }}
                                        className="h-9 text-sm text-center tabular-nums bg-background"
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
                                        className="h-9 text-sm text-center tabular-nums bg-background"
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
                  </CardContent>
                </Card>
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