'use client';

import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';
import { CalculatorDashboard } from './calculator-dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, ChevronUp, TrendingUp, DollarSign, ChevronRight, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Level1Setup } from './level-1-setup';
import { Level3Marketing } from './level-3-marketing';
import { Level4Labor } from './level-4-labor';
import { Level4BusinessCosts } from './level-4-business-costs';
import { Level5Projections } from './level-5-projections';
import { calculatePL } from '../lib/pl-calculations';

interface CalculatorWrapperProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  actions: {
    updateMonthlyGoal: (goal: number) => void;
    addProduct: (product: any) => string;
    updateProduct: (id: string, updates: any) => void;
    removeProduct: (id: string) => void;
    updateHourlyRate: (rate: number) => void;
    updateMarketing: (updates: any) => void;
    updateLabor: (updates: any) => void;
    updateBusinessExpenses: (expenses: any) => void;
    updateOptimizedPrice: (productId: string, price: number) => void;
    updateBusinessMode: (mode: 'hobby' | 'side' | 'business') => void;
    toggleBusinessCost: (cost: any) => void;
    updateBusinessCost: (costId: string, updates: any) => void;
    setUserInfo: (email: string, name: string) => void;
    resetCalculator: () => void;
    // Material functions
    addMaterial?: (material: any) => string;
    updateMaterial?: (materialId: string, updates: any) => void;
    removeMaterial?: (materialId: string) => void;
    addMaterialUsageToProduct?: (productId: string, usage: any) => void;
    updateMaterialUsage?: (productId: string, index: number, usage: any) => void;
    removeMaterialUsage?: (productId: string, index: number) => void;
  };
}

export function CalculatorWrapper({ state, metrics, actions }: CalculatorWrapperProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
  
  // Initialize business expenses from state or use defaults
  const [currentBusinessExpenses, setCurrentBusinessExpenses] = useState(() => {
    if (state.businessExpenses) {
      return state.businessExpenses;
    }
    return {
      taxReserve: { 
        selfEmploymentRate: 0,
        federalRate: 0,
        stateRate: 0,
        expanded: false 
      },
      physicalCosts: {
        expanded: false,
        items: {
          rent: 0,
          insurance: 0,
          utilities: 0
        }
      },
      softwareCosts: {
        expanded: false,
        items: {
          design_software: 0,
          accounting_software: 0
        }
      },
      savings: { rate: 0, expanded: false }
    };
  });
  
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  // Calculate P&L using shared function
  const plCalculation = calculatePL(metrics, state, currentBusinessExpenses);
  
  const safeNetProfit = isNaN(plCalculation.netProfit) || !isFinite(plCalculation.netProfit) ? 0 : plCalculation.netProfit;
  const safeGoalPercentage = state.monthlyGoal > 0 ? (safeNetProfit / state.monthlyGoal) * 100 : 0;

  const renderTabContent = (tab: string) => {
    switch (tab) {
      case 'products':
        return (
          <Level1Setup
            state={state}
            metrics={metrics}
            onUpdateGoal={actions.updateMonthlyGoal}
            onAddProduct={actions.addProduct}
            onUpdateProduct={actions.updateProduct}
            onRemoveProduct={actions.removeProduct}
            onUpdateHourlyRate={actions.updateHourlyRate}
            onUpdateLabor={actions.updateLabor}
            onComplete={() => setActiveTab('marketing')}
            onAddMaterial={actions.addMaterial || (() => '')}
            onAddMaterialUsage={actions.addMaterialUsageToProduct || (() => {})}
            onUpdateMaterialUsage={actions.updateMaterialUsage || (() => {})}
            onRemoveMaterialUsage={actions.removeMaterialUsage || (() => {})}
          />
        );
      case 'marketing':
        return (
          <Level3Marketing
            state={state}
            metrics={metrics}
            onUpdateMarketing={actions.updateMarketing}
            onComplete={() => setActiveTab('labor')}
            onBack={() => setActiveTab('products')}
          />
        );
      case 'labor':
        return (
          <Level4Labor
            state={state}
            metrics={metrics}
            onUpdateLabor={actions.updateLabor}
            onComplete={() => setActiveTab('business')}
            onBack={() => setActiveTab('marketing')}
          />
        );
      case 'business':
        return (
          <Level4BusinessCosts
            state={state}
            metrics={metrics}
            onComplete={() => setActiveTab('projections')}
            onBusinessExpensesChange={(expenses) => {
              setCurrentBusinessExpenses(expenses);
              actions.updateBusinessExpenses(expenses);
            }}
          />
        );
      case 'optimize':
        return (
          <div className="space-y-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">Price Optimization</h2>
              <p className="text-muted-foreground">Coming soon - optimize pricing strategies</p>
            </div>
          </div>
        );
      case 'pnl':
        return (
          <Level5Projections
            state={state}
            metrics={metrics}
            businessExpenses={currentBusinessExpenses}
            plCalculation={plCalculation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Goal Progress Bar - Desktop Only */}
      <div className="hidden sm:block bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Goal:</span>
              {isEditingGoal ? (
                <Input
                  type="number"
                  value={state.monthlyGoal}
                  onChange={(e) => actions.updateMonthlyGoal(parseInt(e.target.value) || 0)}
                  onBlur={() => setIsEditingGoal(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setIsEditingGoal(false);
                    }
                  }}
                  className="w-24 h-7 text-sm text-foreground bg-background border-border"
                  autoFocus
                />
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setIsEditingGoal(true)}
                  className="h-7 px-2 text-sm font-medium hover:bg-transparent text-foreground"
                >
                  {formatCurrency(state.monthlyGoal)}
                </Button>
              )}
            </div>
            
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <Progress 
                  value={Math.min(safeGoalPercentage, 100)} 
                  className="h-3"
                  style={{
                    '--progress-background': safeGoalPercentage >= 100 
                      ? 'hsl(142 71% 45%)' 
                      : safeGoalPercentage >= 75 
                        ? 'hsl(142 69% 58%)' 
                        : safeGoalPercentage >= 50 
                          ? 'hsl(var(--primary))' 
                          : 'hsl(25 95% 53%)'
                  } as React.CSSProperties}
                />
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground font-mono">
                  {formatCurrency(safeNetProfit)} net profit
                </span>
                <span className={`font-medium ${
                  safeGoalPercentage >= 100 
                    ? 'text-green-600' 
                    : safeGoalPercentage >= 75 
                      ? 'text-green-500' 
                      : 'text-foreground'
                }`}>
                  {Math.round(safeGoalPercentage)}%
                  {safeGoalPercentage >= 100 && (
                    <span className="ml-1 text-green-600">🎯</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Mobile: Dropdown Selector */}
          <div className="lg:hidden bg-slate-900/50 p-3 rounded-lg">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-12 bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600 shadow-xl">
                <SelectItem value="products" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  <div className="flex items-center justify-between w-full">
                    <span>1. Products</span>
                    {state.products.length > 0 && (
                      <span className="text-xs text-green-500 ml-2">✓</span>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="marketing" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  <div className="flex items-center justify-between w-full">
                    <span>2. Marketing</span>
                    {(state.marketing?.channelSplit?.organic || 0) > 0 && (
                      <span className="text-xs text-green-500 ml-2">✓</span>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="labor" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  <div className="flex items-center justify-between w-full">
                    <span>3. Labor</span>
                    {state.labor?.totalLaborCost > 0 && (
                      <span className="text-xs text-green-500 ml-2">✓</span>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="business" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  <span>4. Business Costs</span>
                </SelectItem>
                <SelectItem value="pnl" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                  <span>5. P&L Summary</span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Progress Indicator - Mobile Only */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Step {['products', 'marketing', 'labor', 'business', 'pnl'].indexOf(activeTab) + 1} of 5</span>
              {activeTab !== 'pnl' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const tabs = ['products', 'marketing', 'labor', 'business', 'pnl'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) {
                      setActiveTab(tabs[currentIndex + 1]);
                    }
                  }}
                  className="text-xs h-7 text-slate-300 hover:text-white"
                >
                  Next Step
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Desktop: Tab Navigation */}
          <div className="hidden lg:block">
            <TabsList className="flex w-full p-1 rounded-lg bg-slate-900/80 border-slate-700/50 border">
              <TabsTrigger 
                value="products" 
                className={`flex-1 font-medium transition-all duration-150 rounded-md py-3 px-4 ${
                  activeTab === 'products' 
                    ? 'bg-gray-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/60'
                }`}>
                Products
              </TabsTrigger>
              <TabsTrigger 
                value="marketing" 
                className={`flex-1 font-medium transition-all duration-150 rounded-md py-3 px-4 ${
                  activeTab === 'marketing' 
                    ? 'bg-gray-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/60'
                }`}>
                Marketing
              </TabsTrigger>
              <TabsTrigger 
                value="labor" 
                className={`flex-1 font-medium transition-all duration-150 rounded-md py-3 px-4 ${
                  activeTab === 'labor' 
                    ? 'bg-gray-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/60'
                }`}>
                Labor
              </TabsTrigger>
              <TabsTrigger 
                value="business" 
                className={`flex-1 font-medium transition-all duration-150 rounded-md py-3 px-4 ${
                  activeTab === 'business' 
                    ? 'bg-gray-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/60'
                }`}>
                Business
              </TabsTrigger>
              <TabsTrigger 
                value="pnl" 
                className={`flex-1 font-medium transition-all duration-150 rounded-md py-3 px-4 ${
                  activeTab === 'pnl' 
                    ? 'bg-gray-700 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/60'
                }`}>
                P&L
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Content Area */}
            <div className="lg:col-span-2 rounded-lg transition-all duration-300 bg-slate-900/50 ring-1 ring-slate-700/50 p-4">
              <TabsContent value="products" className="mt-0">
                {renderTabContent('products')}
              </TabsContent>
              <TabsContent value="marketing" className="mt-0">
                {renderTabContent('marketing')}
              </TabsContent>
              <TabsContent value="labor" className="mt-0">
                {renderTabContent('labor')}
              </TabsContent>
              <TabsContent value="business" className="mt-0">
                {renderTabContent('business')}
              </TabsContent>
              <TabsContent value="pnl" className="mt-0">
                {renderTabContent('pnl')}
              </TabsContent>
              <TabsContent value="optimize" className="mt-0">
                {renderTabContent('optimize')}
              </TabsContent>
            </div>
            
            {/* Desktop Sidebar Dashboard - Hidden on Mobile */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-8">
                <CalculatorDashboard
                  metrics={metrics}
                  monthlyGoal={state.monthlyGoal}
                  products={state.products}
                  activeTab={activeTab}
                  businessExpenses={currentBusinessExpenses}
                  laborCosts={state.labor?.totalLaborCost || 0}
                  plCalculation={plCalculation}
                  fullProducts={state.products}
                  onUpdateProduct={(productId, updates) => {
                    if (state.products) {
                      const product = state.products.find(p => p.id === productId);
                      if (product && actions.updateProduct) {
                        const updatedProduct = { ...product };
                        if (updates.monthlyUnits !== undefined) {
                          updatedProduct.monthlyUnits = updates.monthlyUnits;
                        }
                        if (updates.sellingPrice !== undefined) {
                          updatedProduct.sellingPrice = updates.sellingPrice;
                        }
                        actions.updateProduct(productId, updatedProduct);
                      }
                    }
                  }}
                  onReset={actions.resetCalculator}
                  laborState={state.labor}
                  onUpdateLabor={actions.updateLabor}
                />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
      
      {/* Mobile Summary Button - Fixed at Bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none">
        <Button
          onClick={() => setIsMobileSummaryOpen(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white pointer-events-auto shadow-xl border border-slate-600"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Summary
          <span className="ml-auto text-sm">
            {formatCurrency(safeNetProfit)} net
          </span>
        </Button>
      </div>

      {/* Mobile Summary Bottom Sheet */}
      {isMobileSummaryOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end pointer-events-none">
          {/* Subtle Backdrop - just a slight dim, no blur */}
          <div 
            className="absolute inset-0 bg-black/20 pointer-events-auto"
            onClick={() => setIsMobileSummaryOpen(false)}
          />
          
          {/* Bottom Sheet - Modern Design */}
          <div className="relative w-full bg-slate-950 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom duration-300">
            {/* Handle Bar */}
            <div className="pt-3 pb-1">
              <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto" />
            </div>
            
            {/* Header */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Summary</h3>
                <button
                  onClick={() => setIsMobileSummaryOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <ChevronUp className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
            
            {/* Summary Content */}
            <div className="px-6 pb-8 overflow-y-auto max-h-[calc(85vh-5rem)]">
              {/* Hero Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Goal</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(state.monthlyGoal)}</div>
                </div>
                <div className={`bg-gradient-to-br ${safeNetProfit >= 0 ? 'from-green-900/30 to-green-900/10 border-green-800/30' : 'from-red-900/30 to-red-900/10 border-red-800/30'} rounded-2xl p-4 border`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net</span>
                  </div>
                  <div className={`text-2xl font-bold ${safeNetProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(safeNetProfit)}
                  </div>
                </div>
              </div>
              
              {/* Progress Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Goal Progress</span>
                  <span className={`text-sm font-bold ${safeGoalPercentage >= 100 ? 'text-green-400' : safeGoalPercentage >= 50 ? 'text-blue-400' : 'text-orange-400'}`}>
                    {Math.round(safeGoalPercentage)}%
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      safeGoalPercentage >= 100 ? 'bg-gradient-to-r from-green-500 to-green-400' : 
                      safeGoalPercentage >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 
                      'bg-gradient-to-r from-orange-500 to-orange-400'
                    }`}
                    style={{ width: `${Math.min(safeGoalPercentage, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* P&L Card */}
              <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h4 className="text-base font-semibold text-white">Profit & Loss</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Revenue</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(plCalculation.revenue)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Cost of Goods</span>
                    <span className="text-sm font-semibold text-slate-300">-{formatCurrency(plCalculation.cogs)}</span>
                  </div>
                  
                  <div className="h-px bg-slate-800" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Gross Profit</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(plCalculation.grossProfit)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Operating Expenses</span>
                    <span className="text-sm font-semibold text-slate-300">-{formatCurrency(plCalculation.operatingExpenses)}</span>
                  </div>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-semibold text-white">Net Profit</span>
                    <span className={`text-lg font-bold ${safeNetProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(safeNetProfit)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Products Section */}
              {state.products.length > 0 && (
                <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-white">Products</h4>
                    <span className="text-xs font-medium px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                      {state.products.length} items
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {state.products.slice(0, 3).map(product => (
                      <div key={product.id} className="flex items-center justify-between">
                        <span className="text-sm text-slate-300 truncate mr-2">{product.name}</span>
                        <span className="text-sm font-semibold text-white whitespace-nowrap">
                          {formatCurrency(product.sellingPrice * product.monthlyUnits)}<span className="text-slate-500">/mo</span>
                        </span>
                      </div>
                    ))}
                    {state.products.length > 3 && (
                      <button className="w-full text-xs text-blue-400 hover:text-blue-300 py-2 transition-colors">
                        View all {state.products.length} products →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}