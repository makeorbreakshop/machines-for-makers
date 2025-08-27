'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Machine {
  id: string;
  machine_name: string;
  brand?: string;
  category?: string;
  current_price?: number;
  work_area?: string;
  laser_power?: string;
  speed?: string;
  [key: string]: any;
}

interface ComparisonContextType {
  selectedProducts: Machine[];
  addToComparison: (machine: Machine) => void;
  removeFromComparison: (machineId: string) => void;
  clearComparison: () => void;
  isSelected: (machineId: string) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};

interface ComparisonProviderProps {
  children: ReactNode;
}

export function ComparisonProvider({ children }: ComparisonProviderProps) {
  const [comparedMachines, setComparedMachines] = useState<Machine[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('comparedMachines');
    if (stored) {
      try {
        setComparedMachines(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored comparison data');
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('comparedMachines', JSON.stringify(comparedMachines));
  }, [comparedMachines]);

  const addToComparison = (machine: Machine) => {
    setComparedMachines((prev) => {
      if (prev.length >= 8) {
        // Max 8 machines
        return prev;
      }
      if (prev.some((m) => m.id === machine.id)) {
        return prev;
      }
      return [...prev, machine];
    });
  };

  const removeFromComparison = (machineId: string) => {
    setComparedMachines((prev) => prev.filter((m) => m.id !== machineId));
  };

  const clearComparison = () => {
    setComparedMachines([]);
  };

  const isComparing = (machineId: string) => {
    return comparedMachines.some((m) => m.id === machineId);
  };

  return (
    <ComparisonContext.Provider
      value={{
        selectedProducts: comparedMachines,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isSelected: isComparing,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}