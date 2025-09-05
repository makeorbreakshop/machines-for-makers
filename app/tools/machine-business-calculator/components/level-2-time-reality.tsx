'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Clock, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { CalculatorState, CalculatedMetrics } from '../lib/calculator-types';

interface Level2TimeRealityProps {
  state: CalculatorState;
  metrics: CalculatedMetrics;
  onUpdateProduct: (id: string, updates: any) => void;
  onUpdateHourlyRate: (rate: number) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function Level2TimeReality({ 
  state, 
  metrics, 
  onUpdateProduct, 
  onUpdateHourlyRate, 
  onComplete, 
  onBack 
}: Level2TimeRealityProps) {
  const hasTimeBreakdowns = state.products.some(product => 
    Object.values(product.timeBreakdown).some(time => time > 0)
  );

  const hasUnsustainableHours = metrics.totalMonthlyHours > 160;
  const hasLowHourlyRate = metrics.averageHourlyRate < 15;
  
  const canProceed = hasTimeBreakdowns && state.hourlyRate > 0;

  const updateTimeBreakdown = (productId: string, field: string, value: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    const updatedTimeBreakdown = {
      ...product.timeBreakdown,
      [field]: Math.max(0, value)
    };
    
    onUpdateProduct(productId, { timeBreakdown: updatedTimeBreakdown });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Level 2: Time Reality Check
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl">
          Break down the actual time required for each product and discover your real hourly rate.
        </p>
      </div>

      {/* Hourly Rate Input */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
            <DollarSign className="w-5 h-5" />
            Target Hourly Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="hourly-rate" className="text-sm font-medium text-gray-700 mb-3 block">
              What hourly rate do you want to earn? ${state.hourlyRate}
            </Label>
            <Slider
              id="hourly-rate"
              min={0}
              max={100}
              step={5}
              value={[state.hourlyRate]}
              onValueChange={(value) => onUpdateHourlyRate(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>$0/hr</span>
              <span>$50/hr</span>
              <span>$100/hr</span>
            </div>
          </div>
          
          {state.hourlyRate > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                {state.hourlyRate < 15 && "⚠️ This is below minimum wage in many areas."}
                {state.hourlyRate >= 15 && state.hourlyRate < 30 && "💡 This is a reasonable starting rate."}
                {state.hourlyRate >= 30 && "🎯 This is a professional rate - let's see if it's achievable!"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Breakdown for Each Product */}
      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-gray-900">Time Breakdown by Product</h3>
        
        {state.products.map((product) => {
          const productMetric = metrics.productMetrics[product.id];
          const totalMinutes = Object.values(product.timeBreakdown).reduce((sum, time) => sum + time, 0);
          const actualHourlyRate = productMetric?.hourlyRate || 0;
          
          return (
            <Card key={product.id} className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-900">{product.name}</CardTitle>
                  {totalMinutes > 0 && (
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-gray-600">
                        {Math.round(totalMinutes)} min total
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={actualHourlyRate < 15 ? "text-red-600 border-red-200" : 
                                  actualHourlyRate < 30 ? "text-yellow-600 border-yellow-200" : 
                                  "text-green-600 border-green-200"}
                      >
                        ${actualHourlyRate.toFixed(2)}/hr actual
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Design Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Design Time (minutes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.timeBreakdown.design === 0 ? '' : product.timeBreakdown.design}
                      onChange={(e) => updateTimeBreakdown(product.id, 'design', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  {/* Setup Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Setup Time (minutes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.timeBreakdown.setup === 0 ? '' : product.timeBreakdown.setup}
                      onChange={(e) => updateTimeBreakdown(product.id, 'setup', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  {/* Machine Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Machine Time (minutes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.timeBreakdown.machine === 0 ? '' : product.timeBreakdown.machine}
                      onChange={(e) => updateTimeBreakdown(product.id, 'machine', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  {/* Finishing Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Finishing Time (minutes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.timeBreakdown.finishing === 0 ? '' : product.timeBreakdown.finishing}
                      onChange={(e) => updateTimeBreakdown(product.id, 'finishing', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  {/* Packaging Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Packaging Time (minutes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={product.timeBreakdown.packaging === 0 ? '' : product.timeBreakdown.packaging}
                      onChange={(e) => updateTimeBreakdown(product.id, 'packaging', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>
                </div>

                {totalMinutes > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Time:</span>
                        <div className="font-semibold text-gray-900">
                          {Math.round(totalMinutes)} min ({(totalMinutes/60).toFixed(1)}h)
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Profit:</span>
                        <div className="font-semibold text-gray-900">
                          ${(product.sellingPrice - product.materialCost).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Actual Rate:</span>
                        <div className={`font-semibold ${actualHourlyRate < 15 ? 'text-red-600' : actualHourlyRate < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                          ${actualHourlyRate.toFixed(2)}/hr
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly Units:</span>
                        <div className="font-semibold text-gray-900">
                          {productMetric?.unitsProduced || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reality Check Summary */}
      {hasTimeBreakdowns && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
              <TrendingUp className="w-5 h-5" />
              Reality Check Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(metrics.totalMonthlyHours)}
                </div>
                <div className="text-sm text-gray-600">Hours needed per month</div>
                {hasUnsustainableHours && (
                  <div className="mt-2 text-xs text-red-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Unsustainable workload
                  </div>
                )}
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${hasLowHourlyRate ? 'text-red-600' : metrics.averageHourlyRate < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                  ${metrics.averageHourlyRate.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Average hourly rate</div>
                {hasLowHourlyRate && (
                  <div className="mt-2 text-xs text-red-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Below minimum wage
                  </div>
                )}
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  ${metrics.totalGrossProfit.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Monthly gross profit</div>
                <div className="mt-2 text-xs text-gray-500">
                  Before taxes and costs
                </div>
              </div>
            </div>

            {(hasUnsustainableHours || hasLowHourlyRate) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">Reality Check Warning</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {hasUnsustainableHours && (
                        <li>• Working {Math.round(metrics.totalMonthlyHours)} hours/month is likely unsustainable</li>
                      )}
                      {hasLowHourlyRate && (
                        <li>• Your average rate of ${metrics.averageHourlyRate.toFixed(2)}/hr is below minimum wage</li>
                      )}
                    </ul>
                    <p className="text-sm text-red-700 mt-2">
                      Consider increasing prices or reducing time requirements in the next level.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Setup
        </Button>
        
        <Button
          onClick={onComplete}
          size="lg"
          disabled={!canProceed}
          className="bg-gray-900 hover:bg-gray-800 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue to Pricing
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}