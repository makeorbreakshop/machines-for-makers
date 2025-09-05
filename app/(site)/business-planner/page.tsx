export const runtime = 'nodejs';

import { Suspense } from 'react';
import { BusinessPlannerContent } from './business-planner-content';

export const metadata = {
  title: 'See If Your Laser Business Will Actually Make Money | Machines for Makers',
  description: 'Most makers discover they need to charge 2x more. Free business planner reveals your real numbers before you invest thousands.',
};

export default async function BusinessPlannerPage() {
  // Could fetch subscriber count here if needed
  const subscriberCount = 54826; // From ConvertKit
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Suspense fallback={<div className="p-8 text-center">Loading business planner...</div>}>
        <BusinessPlannerContent subscriberCount={subscriberCount} />
      </Suspense>
    </div>
  );
}