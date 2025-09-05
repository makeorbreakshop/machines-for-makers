'use client';

import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';
import { CalculatorDashboard } from './calculator-dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target } from 'lucide-react';
import { CalculatorThemeToggle } from './calculator-theme-toggle';
import { useState, useEffect } from 'react';
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
    updateOptimizedPrice: (productId: string, price: number) => void;
    updateBusinessMode: (mode: 'hobby' | 'side' | 'business') => void;
    toggleBusinessCost: (cost: any) => void;
    updateBusinessCost: (costId: string, updates: any) => void;
    setUserInfo: (email: string, name: string) => void;
    resetCalculator: () => void;
  };
}

export function CalculatorWrapper({ state, metrics, actions }: CalculatorWrapperProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [currentBusinessExpenses, setCurrentBusinessExpenses] = useState({
    taxReserve: { 
      selfEmploymentRate: 15.3,
      federalRate: 12,
      stateRate: 5,
      expanded: false 
    },
    physicalCosts: {
      expanded: false,
      items: {
        rent: 200,
        insurance: 75,
        utilities: 50
      }
    },
    softwareCosts: {
      expanded: false,
      items: {
        design_software: 50,
        accounting_software: 25
      }
    },
    savings: { rate: 8, expanded: false }
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load calculator theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('calculator-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  // Save calculator theme preference
  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('calculator-theme', isDark ? 'dark' : 'light');
  };
  
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
            onComplete={() => setActiveTab('marketing')}
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
            onUpdateBusinessMode={actions.updateBusinessMode}
            onToggleBusinessCost={actions.toggleBusinessCost}
            onUpdateBusinessCost={actions.updateBusinessCost}
            onComplete={() => setActiveTab('projections')}
            onBack={() => setActiveTab('labor')}
            onBusinessExpensesChange={setCurrentBusinessExpenses}
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
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`}>
      {/* Monthly Goal Progress Bar */}
      <div className="bg-muted/30 border-b border-border">
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
            <div className="ml-auto">
              <CalculatorThemeToggle isDark={isDarkMode} onToggle={handleThemeToggle} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Tab Navigation */}
          <TabsList className="flex w-full">
            <TabsTrigger value="products" className="flex-1">Products</TabsTrigger>
            <TabsTrigger value="marketing" className="flex-1">Marketing</TabsTrigger>
            <TabsTrigger value="labor" className="flex-1">Labor</TabsTrigger>
            <TabsTrigger value="business" className="flex-1">Business</TabsTrigger>
            <TabsTrigger value="pnl" className="flex-1">P&L</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Content Area */}
            <div className="lg:col-span-2">
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
            
            {/* Sidebar Dashboard - Consistent Across All Tabs */}
            <div className="lg:col-span-1">
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
                />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}