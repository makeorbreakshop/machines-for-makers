export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import AnalyticsContent from './analytics-content';

export default function AnalyticsPage() {

  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}