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
            hourlyRate: state.hourlyRate ?? 25,
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
    const totalProductionMinutesPerMonth = Object.values(metrics.productMetrics || {}).reduce(
      (sum, product: any) => sum + (product.monthlyTimeHours * 60 || 0), 0
    );
    const productionHoursPerWeek = (totalProductionMinutesPerMonth / 60) / 4.33; // Convert to weekly
    
    setLaborState(prev => ({
      ...prev,
      productionHoursPerWeek: Math.round(productionHoursPerWeek * 10) / 10
    }));
  }, [metrics.productMetrics]);

  // Update parent state when local state changes
  useEffect(() => {
    const totalBusinessHours = laborState.businessTasks.reduce((sum, task) => sum + task.hoursPerWeek, 0);
    const totalHoursNeeded = laborState.productionHoursPerWeek + totalBusinessHours;
    
    // Calculate labor costs for business tasks
    let totalLaborCost = 0;
    laborState.businessTasks.forEach(task => {
      if (task.assignedWorkerId) {
        const worker = laborState.workers.find(w => w.id === task.assignedWorkerId);
        if (worker) {
          totalLaborCost += task.hoursPerWeek * worker.hourlyRate;
        }
      }
    });
    
    // Calculate labor costs for product hours
    const productAssignments = (laborState as any).productAssignments || {};
    if (state.products) {
      state.products.forEach(product => {
        const productMetrics = metrics.productMetrics?.[product.id];
        if (productMetrics) {
          const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
          const assignedWorkerId = productAssignments[product.id] || 'owner';
          const worker = laborState.workers.find(w => w.id === assignedWorkerId);
          if (worker) {
            totalLaborCost += weeklyHours * worker.hourlyRate;
          }
        }
      });
    }
    
    // Calculate total assigned hours for unassigned calculation
    let totalAssignedHours = 0;
    laborState.businessTasks.forEach(task => {
      if (task.assignedWorkerId) {
        totalAssignedHours += task.hoursPerWeek;
      }
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
      if (task.assignedWorkerId === 'owner') {
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
      unassignedHours,
      ownerHours,
      productAssignments
    };
    
    onUpdateLabor(updatedLaborState);
  }, [
    laborState.productionHoursPerWeek,
    JSON.stringify(laborState.businessTasks.map(t => ({ id: t.id, hoursPerWeek: t.hoursPerWeek, assignedWorkerId: t.assignedWorkerId }))),
    JSON.stringify(laborState.workers.map(w => ({ id: w.id, hourlyRate: w.hourlyRate, maxHoursPerWeek: w.maxHoursPerWeek }))),
    JSON.stringify((laborState as any).productAssignments || {}),
    JSON.stringify(state.products?.map(p => p.id) || [])
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
      const productAssignments = (prev as any).productAssignments || {};
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

  // Calculate total labor cost
  const totalLaborCost = laborState.workers.reduce((sum, worker) => {
    let workerHours = 0;
    
    // Add hours from business tasks
    laborState.businessTasks.forEach(task => {
      if (task.assignedWorkerId === worker.id) {
        workerHours += task.hoursPerWeek;
      }
    });
    
    // Add hours from products
    const productAssignments = (laborState as any).productAssignments || {};
    if (state.products) {
      state.products.forEach(product => {
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
    
    return sum + (workerHours * worker.hourlyRate * 4.33);
  }, 0);

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
                        if (task.assignedWorkerId === worker.id) {
                          assignedHours += task.hoursPerWeek;
                        }
                      });
                      
                      // Add hours from product assignments
                      const productAssignments = (laborState as any).productAssignments || {};
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
                  if (task.assignedWorkerId === worker.id) {
                    assignedHours += task.hoursPerWeek;
                  }
                });
                
                // Add hours from product assignments
                const productAssignments = (laborState as any).productAssignments || {};
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
                        onChange={(e) => updateWorker(worker.id, { hourlyRate: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
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
                    {formatCurrency((laborState.productionHoursPerWeek * (laborState.workers[0]?.hourlyRate ?? 25)))}/wk
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
                  const assignedWorker = laborState.workers.find(w => w.id === (laborState as any).productAssignments?.[product.id]) || laborState.workers.find(w => w.id === 'owner');
                  const weeklyAmount = weeklyHours * (assignedWorker?.hourlyRate ?? 25);
                  
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
                        value={((laborState as any).productAssignments?.[product.id]) || "owner"}
                        onValueChange={(workerId) => {
                          setLaborState(prev => ({
                            ...prev,
                            productAssignments: {
                              ...((prev as any).productAssignments || {}),
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
                    {formatCurrency(totalBusinessHours * (laborState.workers[0]?.hourlyRate ?? 25))}/wk
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
                const weeklyAmount = task.hoursPerWeek * (assignedWorker?.hourlyRate ?? 25);
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
          
          <div className="p-4 space-y-3">
            {/* Worker breakdown */}
            <div className="space-y-3">
              {laborState.workers.map((worker) => {
                // Calculate actual assigned hours for this worker
                let assignedHours = 0;
                
                // Add hours from business tasks
                laborState.businessTasks.forEach(task => {
                  if (task.assignedWorkerId === worker.id) {
                    assignedHours += task.hoursPerWeek;
                  }
                });
                
                // Add hours from product assignments
                const productAssignments = (laborState as any).productAssignments || {};
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
                
                const weeklyCost = assignedHours * worker.hourlyRate;
                
                return (
                  <div key={worker.id} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{worker.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{assignedHours.toFixed(1)}h/week</span>
                      <span className="font-mono font-semibold text-sm tabular-nums text-gray-900 dark:text-gray-100">{formatCurrencyCompact(weeklyCost)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Total Labor Cost */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-base text-gray-900 dark:text-gray-100">Total Labor Cost (Monthly)</span>
                <span className="font-mono font-black text-xl tabular-nums text-gray-900 dark:text-gray-100">{formatCurrencyCompact(totalLaborCost)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Labor Cost (Weekly)</span>
                <span className="font-mono font-semibold text-sm tabular-nums text-gray-700 dark:text-gray-300">{formatCurrencyCompact(totalLaborCost / 4.33)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs">Total Weekly Hours</span>
                <span className="font-mono text-xs text-muted-foreground">{totalHoursNeeded.toFixed(1)}h</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground text-xs">Average Hourly Rate</span>
                <span className="font-mono text-xs text-muted-foreground">
                  ${(laborState.workers.reduce((sum, w) => sum + w.hourlyRate, 0) / laborState.workers.length).toFixed(2)}/hr
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}