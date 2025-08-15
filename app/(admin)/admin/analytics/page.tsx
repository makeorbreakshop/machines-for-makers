export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { requireAdminAuth } from '@/lib/auth-utils';
import AnalyticsContent from './analytics-content';

export default async function AnalyticsPage() {
  await requireAdminAuth();

  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}