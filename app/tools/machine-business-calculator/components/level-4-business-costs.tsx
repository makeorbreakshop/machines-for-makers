'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Receipt } from 'lucide-react';
import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';

interface Level4BusinessCostsProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateBusinessMode: (mode: 'hobby' | 'side' | 'business') => void;
  onToggleBusinessCost: (cost: any) => void;
  onUpdateBusinessCost: (costId: string, updates: any) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function Level4BusinessCosts({ 
  state, 
  metrics, 
  onUpdateBusinessMode,
  onToggleBusinessCost,
  onUpdateBusinessCost,
  onComplete, 
  onBack 
}: Level4BusinessCostsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Level 4: Business Costs Reality
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl">
          Account for taxes, fees, and hidden costs that eat into your profits.
        </p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
            <Receipt className="w-5 h-5" />
            Coming Soon: Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This level will include business mode selection and comprehensive cost tracking 
            including taxes, platform fees, insurance, and other business expenses.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Pricing
        </Button>
        
        <Button
          onClick={onComplete}
          size="lg"
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          Continue to Solutions
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}