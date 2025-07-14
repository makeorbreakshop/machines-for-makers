'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';

interface ProgressTrackerProps {
  currentQuantity: number;
  targetQuantity: number;
  progressPercentage: number;
}

export default function ProgressTracker({ 
  currentQuantity, 
  targetQuantity, 
  progressPercentage 
}: ProgressTrackerProps) {
  const spotsRemaining = targetQuantity - currentQuantity;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Users className="h-5 w-5" />
          Group Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {currentQuantity}/{targetQuantity}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            People joined
          </div>
        </div>

        <Progress value={progressPercentage} className="h-3" />

        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{progressPercentage.toFixed(0)}% Complete</span>
          <span>{spotsRemaining} spots left</span>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium mb-2">Recent Joiners</div>
          <div className="flex justify-center space-x-1">
            {[...Array(Math.min(currentQuantity, 8))].map((_, i) => (
              <div 
                key={i}
                className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                {i + 1}
              </div>
            ))}
            {currentQuantity > 8 && (
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                +{currentQuantity - 8}
              </div>
            )}
          </div>
        </div>

        {spotsRemaining <= 5 && spotsRemaining > 0 && (
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
              🔥 Only {spotsRemaining} spots remaining!
            </div>
          </div>
        )}

        {currentQuantity >= targetQuantity && (
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm font-medium text-green-800 dark:text-green-200">
              🎉 Group buy is complete!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}