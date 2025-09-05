'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, RotateCcw, Lightbulb } from 'lucide-react';
import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';

interface Level5SolutionsProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onBack: () => void;
  onRestart: () => void;
}

export function Level5Solutions({ 
  state, 
  metrics, 
  onBack, 
  onRestart 
}: Level5SolutionsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Level 5: Strategy Solutions
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl">
          Get personalized strategies and export your complete business plan.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
            <Lightbulb className="w-5 h-5" />
            Coming Soon: Business Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This level will generate personalized strategies based on your analysis and provide 
            a downloadable PDF business plan with financial projections.
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
          Back to Business Costs
        </Button>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onRestart}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="mr-2 w-4 h-4" />
            Start Over
          </Button>
          
          <Button
            size="lg"
            className="bg-gray-900 hover:bg-gray-800 text-white"
            disabled
          >
            <Download className="mr-2 w-4 h-4" />
            Download Business Plan
          </Button>
        </div>
      </div>
    </div>
  );
}