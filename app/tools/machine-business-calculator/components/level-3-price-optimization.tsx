'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, TrendingUp } from 'lucide-react';
import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';

interface Level3PriceOptimizationProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateOptimizedPrice: (productId: string, price: number) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function Level3PriceOptimization({ 
  state, 
  metrics, 
  onUpdateOptimizedPrice, 
  onComplete, 
  onBack 
}: Level3PriceOptimizationProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Level 3: Price Optimization
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl">
          Test different price points and find the sweet spot for maximum profitability.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
            <TrendingUp className="w-5 h-5" />
            Coming Soon: Price Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This level will provide interactive price sliders and demand curve visualization 
            to help optimize your pricing strategy.
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
          Back to Time Analysis
        </Button>
        
        <Button
          onClick={onComplete}
          size="lg"
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          Continue to Business Costs
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}