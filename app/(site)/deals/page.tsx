export const runtime = 'nodejs';
export const revalidate = 60; // Revalidate every 60 seconds

import { Suspense } from 'react';
import { UltraSimpleContent } from './ultra-simple-content';

export const metadata = {
  title: 'Exclusive Deals - Save up to 39% | Machines for Makers',
  description: 'Get instant access to exclusive deals on laser cutters, 3D printers, and CNC machines. Plus real-time price drop alerts.',
};

async function getDrops() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/price-drops?days=30&limit=100`, {
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.priceDrops || [];
  } catch (error) {
    console.error('Error fetching drops:', error);
    return [];
  }
}

export default async function OptimizedDealsPage() {
  const drops = await getDrops();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Suspense fallback={<div className="p-8 text-center">Loading deals...</div>}>
        <UltraSimpleContent initialDrops={drops} />
      </Suspense>
    </div>
  );
}