export const runtime = 'nodejs';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getPublicReportByProgram, getFilteredReportData } from '@/lib/services/affiliate-reports';
import { getVideoMetricsForMachines } from '@/lib/services/video-metrics';
import { PartnerReportView } from '@/components/reports/partner-report-view';

interface PageProps {
  params: Promise<{
    program: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PartnerDashboardPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Get date range from search params
  const fromDate = resolvedSearchParams.from as string | undefined;
  const toDate = resolvedSearchParams.to as string | undefined;
  
  // Fetch the report data (filtered if dates provided)
  let reportData;
  
  try {
    reportData = await getFilteredReportData(resolvedParams.program, fromDate, toDate);
  } catch (error) {
    console.error('Error fetching report:', error);
    notFound();
  }

  if (!reportData) {
    notFound();
  }

  // Get machine IDs from report metrics
  const machineIds = reportData.machineMetrics.map((m: any) => m.machine_id);
  
  // Fetch real-time video metrics
  const { metrics: videoMetrics, summary: videoSummary } = await getVideoMetricsForMachines(machineIds);

  // Format report object for the view component
  const report = {
    ...reportData,
    machine_metrics: reportData.machineMetrics,
    traffic_sources: reportData.trafficSources,
    unmatched_products: reportData.unmatchedProducts,
    total_revenue: reportData.totalRevenue,
    total_commission: reportData.totalCommission,
    total_orders: reportData.totalOrders,
    total_clicks: reportData.totalClicks,
    affiliate_programs: reportData.program,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <PartnerReportView 
        report={report}
        videoMetrics={videoMetrics}
        videoSummary={videoSummary}
        programName={reportData.program.name}
        programSlug={resolvedParams.program}
      />
    </Suspense>
  );
}