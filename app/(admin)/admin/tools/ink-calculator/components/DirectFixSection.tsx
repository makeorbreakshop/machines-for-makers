'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DirectFixButton } from './DirectFixButton';

interface DirectFixSectionProps {
  onFixComplete?: (success: boolean) => void;
}

export function DirectFixSection({ onFixComplete }: DirectFixSectionProps) {
  return (
    <div className="my-4">
      <Card className="border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-800 dark:text-red-400">Direct CMYK Fix (Phase 2.4)</CardTitle>
          <CardDescription>
            Apply the CMYK scaling fix directly from API with no caching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <DirectFixButton onFixComplete={onFixComplete} />
            <p className="text-sm text-muted-foreground">
              This will fix the 100× scaling issue by directly updating the database and reloading the page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 