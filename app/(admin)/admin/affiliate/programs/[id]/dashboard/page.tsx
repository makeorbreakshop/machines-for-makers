export const runtime = 'nodejs';

import { notFound } from 'next/navigation';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { AdminPartnerDashboard } from '@/components/admin/admin-partner-dashboard';
import { createServiceClient } from '@/lib/supabase/server';
import { getFilteredReportData } from '@/lib/services/affiliate-reports';
import { getVideoMetricsForMachines } from '@/lib/services/video-metrics';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPartnerDashboardPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = createServiceClient();
  
  // Get the program details
  const { data: program, error } = await supabase
    .from('affiliate_programs')
    .select(`
      *,
      brands(Name, Slug)
    `)
    .eq('id', resolvedParams.id)
    .single();

  if (error || !program) {
    notFound();
  }

  // Get date range from search params
  const fromDate = resolvedSearchParams.from as string | undefined;
  const toDate = resolvedSearchParams.to as string | undefined;
  
  // Fetch the report data (filtered if dates provided)
  let reportData;
  
  try {
    reportData = await getFilteredReportData(program.brands.Slug, fromDate, toDate);
  } catch (error) {
    console.error('Error fetching report data:', error);
    // Return empty data if there's an error
    reportData = {
      program: {
        ...program,
        commission_rate: program.commission_rate || 0.15,
      },
      machineMetrics: [],
      trafficSources: [],
      unmatchedProducts: [],
      totalRevenue: 0,
      totalCommission: 0,
      totalOrders: 0,
      totalClicks: 0,
    };
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
    <AdminPageWrapper
      title={`${program.name} Dashboard`}
      description="Preview and share partner performance reports"
    >
      <AdminPartnerDashboard 
        program={program}
        report={report}
        videoMetrics={videoMetrics}
        videoSummary={videoSummary}
      />
    </AdminPageWrapper>
  );
}