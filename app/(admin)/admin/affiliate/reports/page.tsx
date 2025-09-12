export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportGenerator } from './report-generator';
import { ReportActions } from './report-actions';
import { APITestRunner } from './test-api';
import { getAffiliateReports } from '@/lib/services/affiliate-reports';

export default async function AffiliateReportsPage() {
  const supabase = createServerClient();
  
  // Fetch affiliate programs for report generation
  const { data: programs, error: programsError } = await supabase
    .from('affiliate_programs')
    .select(`
      *,
      brands(Name, Slug)
    `)
    .eq('is_active', true)
    .order('name');

  // Fetch existing reports from database
  let reports: any[] = [];
  try {
    reports = await getAffiliateReports() || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
  }

  // Get basic stats from affiliate_sales
  const { data: salesStats } = await supabase
    .from('affiliate_sales')
    .select('total_sales, commission_amount, status')
    .eq('status', 'approved');

  const totalRevenue = salesStats?.reduce((sum, sale) => sum + parseFloat(sale.total_sales), 0) || 0;
  const totalCommission = salesStats?.reduce((sum, sale) => sum + parseFloat(sale.commission_amount), 0) || 0;
  const totalOrders = salesStats?.length || 0;

  if (programsError) {
    console.error('Error fetching programs:', programsError);
  }

  return (
    <AdminPageWrapper
      title="Affiliate Reports"
      description="Generate and manage partner performance reports"
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time tracked sales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCommission.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Partner commissions earned
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Tracked affiliate sales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Generator */}
        <ReportGenerator programs={programs || []} />

        {/* API Test Suite */}
        <APITestRunner />

        {/* Existing Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generated Reports
              <Badge variant="outline">{reports.length}</Badge>
            </CardTitle>
            <CardDescription>
              Previously generated partner performance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Title</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.title}
                      </TableCell>
                      <TableCell>
                        {report.affiliate_programs?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {report.period}
                      </TableCell>
                      <TableCell>
                        ${(report.total_revenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {report.total_orders}
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'published' ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <ReportActions 
                          shareUrl={report.share_url} 
                          reportId={report.id}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reports generated yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first partner performance report to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageWrapper>
  );
}