export const runtime = 'nodejs';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getPublicReport } from '@/lib/services/affiliate-reports';
import { getVideoMetricsForMachines } from '@/lib/services/video-metrics';
import { PartnerReportView } from '@/components/reports/partner-report-view';

interface PageProps {
  params: Promise<{
    program: string;
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PublicReportPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  let report;
  
  try {
    report = await getPublicReport(resolvedParams.slug);
  } catch (error) {
    console.error('Error fetching report:', error);
    notFound();
  }

  if (!report || !report.is_public) {
    notFound();
  }

  // For date filtering, we'll need to fetch filtered data from the service
  // This requires the service to be updated to support date range filtering
  const fromDate = resolvedSearchParams.from as string | undefined;
  const toDate = resolvedSearchParams.to as string | undefined;

  // Get machine IDs from report metrics
  const machineMetrics = report.machine_metrics || [];
  const machineIds = machineMetrics.map((m: any) => m.machine_id);
  
  // Fetch real-time video metrics
  const { metrics: videoMetrics, summary: videoSummary } = await getVideoMetricsForMachines(machineIds);

  // Get program name for display
  const programName = report.affiliate_programs?.name || 'Partner';

  return (
    <Suspense fallback={<div>Loading report...</div>}>
      <PartnerReportView 
        report={report}
        videoMetrics={videoMetrics}
        videoSummary={videoSummary}
        programName={programName}
      />
    </Suspense>
  );
}