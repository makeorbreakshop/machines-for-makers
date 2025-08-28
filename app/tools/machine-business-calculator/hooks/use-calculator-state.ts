'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalculatorState, Product, BusinessCost, DEFAULT_BUSINESS_COSTS } from '../lib/calculator-types';

const STORAGE_KEY = 'machine-business-calculator-state';

const createInitialState = (): CalculatorState => ({
  monthlyGoal: 5000,
  products: [],
  hourlyRate: 25,
  optimizedPrices: {},
  businessMode: 'side',
  selectedCosts: DEFAULT_BUSINESS_COSTS.filter(cost => 
    ['platform-fees', 'tax-reserve'].includes(cost.id)
  ),
  recommendedStrategy: null,
  currentLevel: 1,
  completedLevels: [],
  userEmail: '',
  userName: ''
});

export function useCalculatorState() {
  const [state, setState] = useState<CalculatorState>(createInitialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setState(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load calculator state:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save state to localStorage with debouncing
  useEffect(() => {
    if (!isLoaded) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save calculator state:', error);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, isLoaded]);

  // Update functions
  const updateMonthlyGoal = useCallback((goal: number) => {
    setState(prev => ({ ...prev, monthlyGoal: goal }));
  }, []);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      monthlyUnits: product.monthlyUnits || 10 // Default to 10 units if not specified
    };
    setState(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));
    return newProduct.id;
  }, []);

  const updateProduct = useCallback((productId: string, updates: Partial<Product>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === productId ? { ...p, ...updates } : p
      )
    }));
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId),
      optimizedPrices: Object.fromEntries(
        Object.entries(prev.optimizedPrices).filter(([id]) => id !== productId)
      )
    }));
  }, []);

  const updateHourlyRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, hourlyRate: rate }));
  }, []);

  const updateOptimizedPrice = useCallback((productId: string, price: number) => {
    setState(prev => ({
      ...prev,
      optimizedPrices: { ...prev.optimizedPrices, [productId]: price }
    }));
  }, []);

  const updateBusinessMode = useCallback((mode: 'hobby' | 'side' | 'business') => {
    setState(prev => ({ 
      ...prev, 
      businessMode: mode,
      // Auto-select appropriate costs based on business mode
      selectedCosts: mode === 'hobby' 
        ? DEFAULT_BUSINESS_COSTS.filter(cost => cost.id === 'platform-fees')
        : mode === 'side'
        ? DEFAULT_BUSINESS_COSTS.filter(cost => ['platform-fees', 'tax-reserve'].includes(cost.id))
        : DEFAULT_BUSINESS_COSTS.filter(cost => !['workspace-rent'].includes(cost.id))
    }));
  }, []);

  const toggleBusinessCost = useCallback((cost: BusinessCost) => {
    setState(prev => {
      const isSelected = prev.selectedCosts.some(c => c.id === cost.id);
      return {
        ...prev,
        selectedCosts: isSelected
          ? prev.selectedCosts.filter(c => c.id !== cost.id)
          : [...prev.selectedCosts, cost]
      };
    });
  }, []);

  const updateBusinessCost = useCallback((costId: string, updates: Partial<BusinessCost>) => {
    setState(prev => ({
      ...prev,
      selectedCosts: prev.selectedCosts.map(cost =>
        cost.id === costId ? { ...cost, ...updates } : cost
      )
    }));
  }, []);

  const setCurrentLevel = useCallback((level: number) => {
    setState(prev => ({ ...prev, currentLevel: level }));
  }, []);

  const completeLevel = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      completedLevels: Array.from(new Set([...prev.completedLevels, level])).sort((a, b) => a - b)
    }));
  }, []);

  const setUserInfo = useCallback((email: string, name: string) => {
    setState(prev => ({ ...prev, userEmail: email, userName: name }));
  }, []);

  const resetCalculator = useCallback(() => {
    setState(createInitialState());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear calculator state:', error);
    }
  }, []);

  return {
    state,
    isLoaded,
    updateMonthlyGoal,
    addProduct,
    updateProduct,
    removeProduct,
    updateHourlyRate,
    updateOptimizedPrice,
    updateBusinessMode,
    toggleBusinessCost,
    updateBusinessCost,
    setCurrentLevel,
    completeLevel,
    setUserInfo,
    resetCalculator
  };
}