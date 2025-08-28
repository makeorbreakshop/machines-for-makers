'use client';

import { useCalculatorState } from '../hooks/use-calculator-state';
import { CalculatorWrapper } from '../components/calculator-wrapper';
import { calculateComprehensiveMetrics } from '../lib/calculator-formulas';
import { Card, CardContent } from '@/components/ui/card';

export default function CalculatorPage() {
  const calculatorState = useCalculatorState();

  if (!calculatorState.isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="text-gray-600">Loading calculator...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = calculateComprehensiveMetrics(calculatorState.state);

  return (
    <div className="min-h-screen bg-gray-50">
      <CalculatorWrapper 
        state={calculatorState.state}
        metrics={metrics}
        actions={calculatorState}
      />
    </div>
  );
}