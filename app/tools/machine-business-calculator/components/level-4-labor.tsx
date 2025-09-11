'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, X, Briefcase, Package, ChevronDown } from 'lucide-react';
import { CalculatorState, CalculatedMetrics, LaborState, Worker, BusinessTask, DEFAULT_BUSINESS_TASKS } from '../lib/calculator-types';

interface Level4LaborProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateLabor: (updates: Partial<LaborState>) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function Level4Labor({ 
  state, 
  metrics, 
  onUpdateLabor,
  onComplete, 
  onBack 
}: Level4LaborProps) {
  const [businessTasksExpanded, setBusinessTasksExpanded] = useState(false);
  const [productionExpanded, setProductionExpanded] = useState(false);
  const [workersExpanded, setWorkersExpanded] = useState(false);
  const [laborSummaryExpanded, setLaborSummaryExpanded] = useState<{ [workerId: string]: boolean }>({});
  
  // Initialize labor state if it doesn't exist
  const [laborState, setLaborState] = useState<LaborState>(() => {
    if (!state.labor) {
      return {
        productionHoursPerWeek: 0,
        businessTasks: DEFAULT_BUSINESS_TASKS,
        workers: [
          {
            id: 'owner',
            name: 'You',
            hourlyRate: state.hourlyRate !== undefined ? state.hourlyRate : 25,
            maxHoursPerWeek: 40,
            skills: ['admin', 'marketing', 'maintenance', 'inventory', 'shipping', 'development', 'production'],
            assignedHours: 0,
            costPerWeek: 0
          }
        ]
      };
    }
    return state.labor;
  });

  // Sync local state with parent state when it changes
  useEffect(() => {
    if (state.labor) {
      setLaborState(state.labor);
    }
  }, [state.labor]);

  // Calculate production hours from products
  useEffect(() => {
    const totalProductionHoursPerMonth = Object.values(metrics.productMetrics || {}).reduce(
      (sum, product: any) => sum + (product.monthlyTimeHours || 0), 0
    );
    const productionHoursPerWeek = totalProductionHoursPerMonth / 4.33; // Convert to weekly
    
    setLaborState(prev => ({
      ...prev,
      productionHoursPerWeek: Math.round(productionHoursPerWeek * 10) / 10
    }));
  }, [metrics.productMetrics]);

  // Update parent state when local state changes
  useEffect(() => {
    const totalBusinessHours = laborState.businessTasks.reduce((sum, task) => sum + task.hoursPerWeek, 0);
    const totalHoursNeeded = laborState.productionHoursPerWeek + totalBusinessHours;
    
    // Calculate labor costs for business tasks (OPERATING EXPENSES)
    let businessTasksLaborCost = 0;
    laborState.businessTasks.forEach(task => {
      // Default to owner if no worker assigned
      const assignedWorkerId = task.assignedWorkerId || 'owner';
      const worker = laborState.workers.find(w => w.id === assignedWorkerId);
      if (worker) {
        businessTasksLaborCost += task.hoursPerWeek * worker.hourlyRate;
      }
    });
    
    // Calculate labor costs for product hours (COGS)
    let productLaborCost = 0;
    const productAssignments = laborState.productAssignments || {};
    if (state.products) {
      state.products.forEach(product => {
        const productMetrics = metrics.productMetrics?.[product.id];
        if (productMetrics) {
          const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
          const assignedWorkerId = productAssignments[product.id] || 'owner';
          const worker = laborState.workers.find(w => w.id === assignedWorkerId);
          if (worker) {
            productLaborCost += weeklyHours * worker.hourlyRate;
          }
        }
      });
    }
    
    // Total labor cost is sum of both
    const totalLaborCost = businessTasksLaborCost + productLaborCost;
    
    // Calculate total assigned hours for unassigned calculation
    let totalAssignedHours = 0;
    laborState.businessTasks.forEach(task => {
      // All tasks are assigned (default to owner if not specified)
      totalAssignedHours += task.hoursPerWeek;
    });
    
    // Add product hours to assigned hours
    if (state.products) {
      state.products.forEach(product => {
        const productMetrics = metrics.productMetrics?.[product.id];
        if (productMetrics) {
          const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
          const assignedWorkerId = productAssignments[product.id] || 'owner';
          if (assignedWorkerId) {
            totalAssignedHours += weeklyHours;
          }
        }
      });
    }
    
    const unassignedHours = Math.max(0, totalHoursNeeded - totalAssignedHours);
    
    // Calculate owner hours from both business tasks and products
    let ownerHours = 0;
    laborState.businessTasks.forEach(task => {
      // Default to owner if not assigned
      const assignedWorkerId = task.assignedWorkerId || 'owner';
      if (assignedWorkerId === 'owner') {
        ownerHours += task.hoursPerWeek;
      }
    });
    if (state.products) {
      state.products.forEach(product => {
        const productMetrics = metrics.productMetrics?.[product.id];
        if (productMetrics) {
          const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
          const assignedWorkerId = productAssignments[product.id] || 'owner';
          if (assignedWorkerId === 'owner') {
            ownerHours += weeklyHours;
          }
        }
      });
    }
    
    const updatedLaborState = {
      ...laborState,
      totalHoursNeeded,
      totalLaborCost: totalLaborCost * 4.33, // Convert to monthly
      businessTasksLaborCost: businessTasksLaborCost * 4.33, // Convert to monthly (for Operating Expenses)
      productLaborCost: productLaborCost * 4.33, // Convert to monthly (for COGS)
      unassignedHours,
      ownerHours,
      productAssignments
    };
    
    onUpdateLabor(updatedLaborState);
  }, [
    laborState.productionHoursPerWeek,
    JSON.stringify(laborState.businessTasks),
    JSON.stringify(laborState.workers),
    JSON.stringify(laborState.productAssignments),
    JSON.stringify(state.products),
    JSON.stringify(metrics.productMetrics),
    onUpdateLabor
  ]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  const formatCurrencyCompact = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  const formatHours = (hours: number) => `${hours.toFixed(1)}h`;

  const addWorker = () => {
    const newWorker: Worker = {
      id: `worker-${Date.now()}`,
      name: 'New Worker',
      hourlyRate: 15,
      maxHoursPerWeek: 40,
      skills: ['admin', 'inventory', 'shipping'],
      assignedHours: 0,
      costPerWeek: 0
    };
    
    setLaborState(prev => ({
      ...prev,
      workers: [...prev.workers, newWorker]
    }));
  };

  const updateWorker = (workerId: string, updates: Partial<Worker>) => {
    setLaborState(prev => ({
      ...prev,
      workers: prev.workers.map(w =>
        w.id === workerId ? { ...w, ...updates } : w
      )
    }));
  };

  const removeWorker = (workerId: string) => {
    if (workerId === 'owner') return; // Can't remove owner
    
    setLaborState(prev => {
      // Find all product assignments that need to be reassigned
      const productAssignments = prev.productAssignments || {};
      const updatedProductAssignments = { ...productAssignments };
      
      // Reassign products from removed worker to owner
      Object.keys(updatedProductAssignments).forEach(productId => {
        if (updatedProductAssignments[productId] === workerId) {
          updatedProductAssignments[productId] = 'owner';
        }
      });
      
      return {
        ...prev,
        workers: prev.workers.filter(w => w.id !== workerId),
        businessTasks: prev.businessTasks.map(task =>
          task.assignedWorkerId === workerId 
            ? { ...task, assignedWorkerId: 'owner' } // Reassign to owner instead of undefined
            : task
        ),
        productAssignments: updatedProductAssignments
      };
    });
  };

  const updateBusinessTask = (taskId: string, updates: Partial<BusinessTask>) => {
    setLaborState(prev => ({
      ...prev,
      businessTasks: prev.businessTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    }));
  };

  const addBusinessTask = () => {
    const newTask: BusinessTask = {
      id: `task-${Date.now()}`,
      name: 'New Task',
      category: 'admin',
      hoursPerWeek: 1,
      description: 'Custom business task'
    };
    
    setLaborState(prev => ({
      ...prev,
      businessTasks: [...prev.businessTasks, newTask]
    }));
  };

  const removeBusinessTask = (taskId: string) => {
    setLaborState(prev => ({
      ...prev,
      businessTasks: prev.businessTasks.filter(task => task.id !== taskId)
    }));
  };

  const totalBusinessHours = laborState.businessTasks.reduce((sum, task) => sum + task.hoursPerWeek, 0);
  const totalHoursNeeded = laborState.productionHoursPerWeek + totalBusinessHours;
  const totalAssignedHours = laborState.workers.reduce((sum, worker) => sum + worker.assignedHours, 0);
  const unassignedHours = Math.max(0, totalHoursNeeded - totalAssignedHours);

  // Use the total labor cost from state (already calculated and monthly)
  const totalLaborCostMonthly = laborState.totalLaborCost || 0;
  const totalLaborCostWeekly = totalLaborCostMonthly / 4.33;

  return (
    <div className="space-y-4">
      {/* Workers Management Section */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <Button
            variant="ghost"
            onClick={() => setWorkersExpanded(!workersExpanded)}
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Workers</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {laborState.workers.length} {laborState.workers.length === 1 ? 'worker' : 'workers'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {formatCurrency(laborState.workers.reduce((sum, worker) => {
                      let assignedHours = 0;
                      
                      // Add hours from business tasks
                      laborState.businessTasks.forEach(task => {
                        const assignedWorkerId = task.assignedWorkerId || 'owner';
                        if (assignedWorkerId === worker.id) {
                          assignedHours += task.hoursPerWeek;
                        }
                      });
                      
                      // Add hours from product assignments
                      const productAssignments = laborState.productAssignments || {};
                      if (state.products) {
                        state.products.forEach(product => {
                          const productMetrics = metrics.productMetrics?.[product.id];
                          if (productMetrics) {
                            const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                            const assignedWorkerId = productAssignments[product.id] || 'owner';
                            if (assignedWorkerId === worker.id) {
                              assignedHours += weeklyHours;
                            }
                          }
                        });
                      }
                      
                      return sum + (assignedHours * worker.hourlyRate);
                    }, 0))}/wk
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${workersExpanded ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
            </div>
          </Button>
        
        {workersExpanded && (
          <div className="p-4 space-y-1">
              {laborState.workers.map((worker) => {
                const isOwner = worker.id === 'owner';
                
                // Calculate actual assigned hours for this worker
                let assignedHours = 0;
                
                // Add hours from business tasks
                laborState.businessTasks.forEach(task => {
                  const assignedWorkerId = task.assignedWorkerId || 'owner';
                  if (assignedWorkerId === worker.id) {
                    assignedHours += task.hoursPerWeek;
                  }
                });
                
                // Add hours from product assignments
                const productAssignments = laborState.productAssignments || {};
                if (state.products) {
                  state.products.forEach(product => {
                    const productMetrics = metrics.productMetrics?.[product.id];
                    if (productMetrics) {
                      const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                      const assignedWorkerId = productAssignments[product.id] || 'owner';
                      if (assignedWorkerId === worker.id) {
                        assignedHours += weeklyHours;
                      }
                    }
                  });
                }
                
                const capacity = worker.maxHoursPerWeek;
                const overCapacity = assignedHours > capacity;
                const utilizationPercentage = Math.min((assignedHours / capacity) * 100, 100);
                
                const overFortyHours = assignedHours > 40;
                
                return (
                  <div key={worker.id} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                    {/* Worker Name */}
                    <div className="w-[280px]">
                      <Input
                        value={worker.name}
                        onChange={(e) => updateWorker(worker.id, { name: e.target.value })}
                        className="h-8 text-sm w-full bg-background text-foreground"
                        placeholder="Name"
                      />
                    </div>
                    
                    {/* Hourly Rate */}
                    <div className="relative w-20">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={worker.hourlyRate || worker.hourlyRate === 0 ? worker.hourlyRate : ''}
                        onChange={(e) => updateWorker(worker.id, { hourlyRate: e.target.value === '' ? 0 : Math.round((parseFloat(e.target.value) || 0) * 100) / 100 })}
                        className="pl-6 h-8 text-sm w-full bg-background text-foreground"
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10">/hr</span>
                    
                    {/* Hours Assigned */}
                    <span className={`text-sm ${overFortyHours ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'} w-20 text-right`}>
                      {assignedHours.toFixed(1)} hrs/wk
                    </span>
                    
                    {/* Weekly Cost */}
                    <span className="text-sm font-medium w-24 text-right text-foreground">
                      {formatCurrencyCompact(assignedHours * worker.hourlyRate)}
                    </span>
                    
                    {/* Remove Button or Spacer */}
                    {!isOwner ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWorker(worker.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>
                );
              })}
            
            <Button
              variant="ghost"
              onClick={addWorker}
              className="w-full h-8 text-sm text-muted-foreground hover:text-foreground"
            >
              + Add Worker
            </Button>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Production Hours Section */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <Button
            variant="ghost"
            onClick={() => setProductionExpanded(!productionExpanded)}
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Production Hours</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {laborState.productionHoursPerWeek.toFixed(1)} hrs/week
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {(() => {
                      let totalProductionCost = 0;
                      const productAssignments = laborState.productAssignments || {};
                      if (state.products) {
                        state.products.forEach(product => {
                          const productMetric = metrics.productMetrics?.[product.id];
                          if (productMetric) {
                            const weeklyHours = (productMetric.monthlyTimeHours || 0) / 4.33;
                            const assignedWorkerId = productAssignments[product.id] || 'owner';
                            const worker = laborState.workers.find(w => w.id === assignedWorkerId);
                            totalProductionCost += weeklyHours * (worker?.hourlyRate !== undefined ? worker.hourlyRate : 25);
                          }
                        });
                      }
                      return formatCurrency(totalProductionCost);
                    })()}/wk
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${productionExpanded ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
            </div>
          </Button>
        
        {productionExpanded && (
          <div className="p-4 space-y-1">
              {state.products && state.products.length > 0 ? (
                state.products.map((product, index) => {
                  const productMetrics = metrics.productMetrics?.[product.id];
                  if (!productMetrics) return null;
                  
                  const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                  const productName = product.name || `Product ${index + 1}`;
                  const assignedWorker = laborState.workers.find(w => w.id === laborState.productAssignments?.[product.id]) || laborState.workers.find(w => w.id === 'owner');
                  const weeklyAmount = weeklyHours * (assignedWorker?.hourlyRate !== undefined ? assignedWorker.hourlyRate : 25);
                  
                  return (
                    <div key={product.id} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                      {/* Product Name & Units */}
                      <div className="flex items-center gap-2 w-[280px]">
                        <span className="text-sm font-medium text-foreground">{productName}</span>
                        <span className="text-xs text-muted-foreground">
                          {product.monthlyUnits || 0} units/mo
                        </span>
                      </div>
                      
                      {/* Hours (auto-calculated, non-editable) */}
                      <div className="w-20 h-8 flex items-center justify-center bg-muted border border-border rounded-md">
                        <span className="text-sm text-muted-foreground">{weeklyHours.toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground w-10">hr/wk</span>
                      
                      {/* Worker Assignment */}
                      <Select
                        value={(laborState.productAssignments?.[product.id]) || "owner"}
                        onValueChange={(workerId) => {
                          setLaborState(prev => ({
                            ...prev,
                            productAssignments: {
                              ...(prev.productAssignments || {}),
                              [product.id]: workerId
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="w-32 h-8 text-sm bg-background text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {laborState.workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Weekly Cost */}
                      <span className="text-sm font-medium w-24 text-right text-foreground">
                        {formatCurrencyCompact(weeklyAmount)}
                      </span>
                      
                      {/* Spacer for alignment with business tasks that have delete button */}
                      <div className="w-8 h-8" />
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No products with time breakdown yet
                </div>
              )}
          </div>
        )}
        </CardContent>
      </Card>

      {/* Business Tasks Section */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <Button
            variant="ghost"
            onClick={() => setBusinessTasksExpanded(!businessTasksExpanded)}
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Business Tasks</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {laborState.businessTasks.length} tasks
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {formatCurrency(laborState.businessTasks.reduce((sum, task) => {
                      const assignedWorkerId = task.assignedWorkerId || 'owner';
                      const worker = laborState.workers.find(w => w.id === assignedWorkerId);
                      return sum + (task.hoursPerWeek * (worker?.hourlyRate !== undefined ? worker.hourlyRate : 25));
                    }, 0))}/wk
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${businessTasksExpanded ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
            </div>
          </Button>
        
        {businessTasksExpanded && (
          <div className="p-4 space-y-1">
              {laborState.businessTasks.map((task) => {
                const assignedWorker = laborState.workers.find(w => w.id === task.assignedWorkerId) || laborState.workers[0];
                const weeklyAmount = task.hoursPerWeek * (assignedWorker?.hourlyRate !== undefined ? assignedWorker.hourlyRate : 25);
                return (
                  <div key={task.id} className="group flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-md">
                    <Input
                      value={task.name}
                      onChange={(e) => updateBusinessTask(task.id, { name: e.target.value })}
                      className="h-8 text-sm w-[280px] bg-background text-foreground"
                      placeholder="Task name"
                    />
                    
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={task.hoursPerWeek || ''}
                      onChange={(e) => updateBusinessTask(task.id, { hoursPerWeek: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="w-20 h-8 text-sm bg-background text-foreground"
                      placeholder="0"
                    />
                    <span className="text-sm text-muted-foreground w-10">hr/wk</span>
                    
                    <Select
                      value={task.assignedWorkerId || laborState.workers[0]?.id || "owner"}
                      onValueChange={(workerId) => updateBusinessTask(task.id, { assignedWorkerId: workerId })}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm bg-background text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {laborState.workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <span className="text-sm font-medium w-24 text-right text-foreground">
                      {formatCurrencyCompact(weeklyAmount)}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBusinessTask(task.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            
            <Button
              variant="ghost"
              onClick={addBusinessTask}
              className="w-full h-8 text-sm text-muted-foreground hover:text-foreground"
            >
              + Add Business Task
            </Button>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Labor Summary */}
      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-lg">
        <CardContent className="p-0">
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Labor Summary</span>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Worker Details */}
            {laborState.workers.map((worker) => {
              // Calculate hours and costs for this worker
              let businessTaskHours = 0;
              let productionHours = 0;
              const businessTasks: { task: BusinessTask; hours: number; cost: number }[] = [];
              const productionTasks: { product: Product; hours: number; cost: number }[] = [];
              
              // Calculate business tasks
              laborState.businessTasks.forEach(task => {
                const assignedWorkerId = task.assignedWorkerId || 'owner';
                if (assignedWorkerId === worker.id) {
                  businessTaskHours += task.hoursPerWeek;
                  businessTasks.push({
                    task,
                    hours: task.hoursPerWeek,
                    cost: task.hoursPerWeek * worker.hourlyRate * 4.33
                  });
                }
              });
              
              // Calculate production hours
              const productAssignments = laborState.productAssignments || {};
              if (state.products) {
                state.products.forEach(product => {
                  const productMetrics = metrics.productMetrics?.[product.id];
                  if (productMetrics) {
                    const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                    const assignedWorkerId = productAssignments[product.id] || 'owner';
                    if (assignedWorkerId === worker.id) {
                      productionHours += weeklyHours;
                      productionTasks.push({
                        product,
                        hours: weeklyHours,
                        cost: weeklyHours * worker.hourlyRate * 4.33
                      });
                    }
                  }
                });
              }
              
              const totalHours = businessTaskHours + productionHours;
              const totalMonthlyCost = totalHours * worker.hourlyRate * 4.33;
              
              if (totalHours === 0) return null;
              
              const isExpanded = laborSummaryExpanded[worker.id] || false;
              
              return (
                <div key={worker.id} className="space-y-2">
                  {/* Worker Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLaborSummaryExpanded(prev => ({ ...prev, [worker.id]: !prev[worker.id] }))}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {worker.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ${worker.hourlyRate}/hr
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(totalMonthlyCost)}/mo
                    </span>
                  </div>
                  
                  {/* Compact Summary */}
                  {!isExpanded && (
                    <div className="ml-8 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {businessTasks.length > 0 && (
                        <>
                          <span>Business Tasks ({businessTasks.length})</span>
                          <span className="text-xs">{businessTaskHours.toFixed(1)}h/wk</span>
                        </>
                      )}
                      {businessTasks.length > 0 && productionTasks.length > 0 && (
                        <span className="text-xs">•</span>
                      )}
                      {productionTasks.length > 0 && (
                        <>
                          <span>Production ({productionTasks.length} {productionTasks.length === 1 ? 'product' : 'products'})</span>
                          <span className="text-xs">{productionHours.toFixed(1)}h/wk</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="ml-8 space-y-3">
                      {businessTasks.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            Business Tasks
                          </div>
                          {businessTasks.map(({ task, hours, cost }) => (
                            <div key={task.id} className="flex items-center justify-between text-sm pl-2">
                              <span className="text-gray-600 dark:text-gray-300">• {task.name}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-400">{hours.toFixed(1)}h/wk</span>
                                <span className="font-mono text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                                  {formatCurrency(cost)}/mo
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {productionTasks.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            Production
                          </div>
                          {productionTasks.map(({ product, hours, cost }) => (
                            <div key={product.id} className="flex items-center justify-between text-sm pl-2">
                              <span className="text-gray-600 dark:text-gray-300">• {product.name || 'Unnamed Product'}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-400">{hours.toFixed(1)}h/wk</span>
                                <span className="font-mono text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                                  {formatCurrency(cost)}/mo
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3"></div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Hours</span>
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{totalHoursNeeded.toFixed(1)}h/wk</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-base text-gray-900 dark:text-gray-100">Total Monthly Cost</span>
                <span className="font-mono font-black text-xl tabular-nums text-gray-900 dark:text-gray-100">
                  {formatCurrency(totalLaborCostMonthly)}/mo
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                By Category
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Production (COGS)</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {formatCurrency(laborState.productLaborCost || 0)}/mo
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-300">Business Tasks (OpEx)</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {formatCurrency(laborState.businessTasksLaborCost || 0)}/mo
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}