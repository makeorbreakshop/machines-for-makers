export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Share, Download } from 'lucide-react';
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

  // Fetch existing reports (we'll create this table later)
  // For now, let's show some sample data
  const sampleReports = [
    {
      id: '1',
      title: 'Q4 2024 xTool Performance',
      program_name: 'xTool Affiliate Program',
      period: 'Q4 2024',
      total_revenue: 45230.50,
      total_orders: 127,
      share_url: '/partners/xtool/q4-2024-performance',
      created_at: '2024-12-15',
      status: 'published'
    },
    {
      id: '2', 
      title: 'Q3 2024 OneLaser Summary',
      program_name: 'OneLaser Partnership',
      period: 'Q3 2024',
      total_revenue: 12850.00,
      total_orders: 34,
      share_url: '/partners/onelaser/q3-2024-summary',
      created_at: '2024-10-01',
      status: 'draft'
    }
  ];

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

        {/* Existing Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generated Reports
              <Badge variant="outline">{sampleReports.length}</Badge>
            </CardTitle>
            <CardDescription>
              Previously generated partner performance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sampleReports.length > 0 ? (
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
                  {sampleReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.title}
                      </TableCell>
                      <TableCell>
                        {report.program_name}
                      </TableCell>
                      <TableCell>
                        {report.period}
                      </TableCell>
                      <TableCell>
                        ${report.total_revenue.toLocaleString()}
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
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={report.share_url} target="_blank">
                            <Button variant="ghost" size="sm">
                              <Share className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
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