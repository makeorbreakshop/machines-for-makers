'use client';

import { useCalculatorState } from '../hooks/use-calculator-state';
import { CalculatorWrapper } from '../components/calculator-wrapper';
import { calculateComprehensiveMetrics } from '../lib/calculator-formulas';
import { Card, CardContent } from '@/components/ui/card';

// Force client-side rendering for calculator
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CalculatorPage() {
  const calculatorState = useCalculatorState();

  if (!calculatorState.isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
              <span className="text-muted-foreground">Loading calculator...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = calculateComprehensiveMetrics(calculatorState.state);

  return (
    <CalculatorWrapper 
      state={calculatorState.state}
      metrics={metrics}
      actions={calculatorState}
    />
  );
}