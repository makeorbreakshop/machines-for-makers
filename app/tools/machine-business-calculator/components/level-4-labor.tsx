'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Users, Clock, Plus, X, Briefcase, UserCheck, Package } from 'lucide-react';
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
            hourlyRate: state.hourlyRate || 25,
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
    JSON.stringify(laborState.workers.map(w => ({ id: w.id, hourlyRate: w.hourlyRate }))),
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
    
    setLaborState(prev => ({
      ...prev,
      workers: prev.workers.filter(w => w.id !== workerId),
      businessTasks: prev.businessTasks.map(task =>
        task.assignedWorkerId === workerId 
          ? { ...task, assignedWorkerId: undefined }
          : task
      )
    }));
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Labor Planning</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Total Hours Needed</span>
          <span className="text-lg font-bold">{formatHours(totalHoursNeeded)}/week</span>
        </div>
      </div>


      {/* Workers & Capacity Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h4 className="text-lg font-medium">Workers & Capacity</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addWorker}
            >
              <Plus className="h-4 w-4 mr-1" />
              Hire Worker
            </Button>
          </div>
          
          <div className="space-y-4">
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
              
              return (
                <Card key={worker.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isOwner ? 'bg-primary/10' : 'bg-muted'}`}>
                          <UserCheck className={`h-4 w-4 ${isOwner ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            value={worker.name}
                            onChange={(e) => updateWorker(worker.id, { name: e.target.value })}
                            className="h-8 text-sm font-medium w-32"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="10"
                              step="1"
                              value={worker.hourlyRate}
                              onChange={(e) => updateWorker(worker.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs w-16"
                            />
                            <span className="text-xs text-muted-foreground">/hr</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max="80"
                              step="1"
                              value={worker.maxHoursPerWeek}
                              onChange={(e) => updateWorker(worker.id, { maxHoursPerWeek: parseFloat(e.target.value) || 0 })}
                              className="h-8 text-xs w-16"
                            />
                            <span className="text-xs text-muted-foreground">hrs/week max</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWorker(worker.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Capacity Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Workload</span>
                        <span className={overCapacity ? 'text-red-500 font-medium' : 'text-foreground'}>
                          {formatHours(assignedHours)} / {formatHours(capacity)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            overCapacity 
                              ? 'bg-red-500' 
                              : utilizationPercentage > 80 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(utilizationPercentage, 100)}%` 
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {overCapacity 
                            ? `Over by ${formatHours(assignedHours - capacity)}` 
                            : `${formatHours(capacity - assignedHours)} available`
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Product Hours Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-primary" />
            <h4 className="text-lg font-medium">Product Hours</h4>
            <span className="text-sm text-muted-foreground">
              {formatHours(laborState.productionHoursPerWeek)}/week total
            </span>
          </div>
          
          <div className="space-y-3">
            {state.products && state.products.length > 0 ? (
              state.products.map((product, index) => {
                const productMetrics = metrics.productMetrics?.[product.id];
                if (!productMetrics) return null;
                
                const weeklyHours = (productMetrics.monthlyTimeHours || 0) / 4.33;
                const productName = product.name || `Product ${index + 1}`;
                const assignedWorker = laborState.workers.find(w => w.id === (laborState as any).productAssignments?.[product.id]) || laborState.workers.find(w => w.id === 'owner');
                
                return (
                  <div key={product.id} className="bg-muted/30 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div>
                        <div className="text-sm font-medium text-foreground">{productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.monthlyUnits || 0} units/month
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{formatHours(weeklyHours)}</div>
                        <span className="text-xs text-muted-foreground">hrs/week</span>
                      </div>
                      
                      <div>
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
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Assign to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {laborState.workers.map((worker) => (
                              <SelectItem key={worker.id} value={worker.id}>
                                {worker.name} (${worker.hourlyRate}/hr)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        {assignedWorker && (
                          <div>
                            {formatCurrency(weeklyHours * assignedWorker.hourlyRate * 4.33)}/mo
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No products with time breakdown yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Tasks Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h4 className="text-lg font-medium">Business Tasks</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addBusinessTask}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
          
          <div className="space-y-3">
            {laborState.businessTasks.map((task) => {
              const assignedWorker = laborState.workers.find(w => w.id === task.assignedWorkerId);
              return (
                <div key={task.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Input
                        value={task.name}
                        onChange={(e) => updateBusinessTask(task.id, { name: e.target.value })}
                        className="h-8 text-sm font-medium"
                        placeholder="Task name"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={task.hoursPerWeek}
                        onChange={(e) => updateBusinessTask(task.id, { hoursPerWeek: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm w-16"
                      />
                      <span className="text-xs text-muted-foreground">hrs/week</span>
                    </div>
                    
                    <div>
                      <Select
                        value={task.assignedWorkerId || "unassigned"}
                        onValueChange={(workerId) => updateBusinessTask(task.id, { assignedWorkerId: workerId === "unassigned" ? undefined : workerId })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {laborState.workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name} (${worker.hourlyRate}/hr)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2">
                      {assignedWorker && (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(task.hoursPerWeek * assignedWorker.hourlyRate * 4.33)}/mo
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBusinessTask(task.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Labor Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-medium">Labor Summary</h3>
          </div>
          
          <div className="space-y-4">
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
              
              const monthlyCost = assignedHours * worker.hourlyRate * 4.33;
              
              if (assignedHours === 0) return null; // Don't show workers with no hours
              
              return (
                <div key={worker.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-foreground">{worker.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {formatHours(assignedHours)}/week
                    </span>
                  </div>
                  <span className="font-mono font-medium">
                    {formatCurrency(monthlyCost)}
                  </span>
                </div>
              );
            })}
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-lg">Total Labor Cost</span>
                <span className="font-mono font-medium text-lg text-foreground">
                  {formatCurrency((laborState.totalLaborCost || 0))}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}