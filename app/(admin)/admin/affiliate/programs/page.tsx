export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
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

export default async function AffiliateProgramsPage() {
  const supabase = createServerClient();
  
  // Fetch affiliate programs with brand data
  const { data: programs, error } = await supabase
    .from('affiliate_programs')
    .select(`
      *,
      brands(Name, Slug)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate programs:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
  }

  // Debug: Log what we got back
  console.log('Programs query result:', { 
    data: programs, 
    count: programs?.length, 
    error: error 
  });

  return (
    <AdminPageWrapper
      title="Affiliate Programs"
      description="Manage affiliate tracking programs and commission rates"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              Configure affiliate programs for different brands and set commission rates.
            </p>
          </div>
          <Link href="/admin/affiliate/programs/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Program
            </Button>
          </Link>
        </div>

        {/* Programs Table */}
        {programs && programs.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Active Programs</CardTitle>
              <CardDescription>
                {programs.length} affiliate program{programs.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">
                        {program.name}
                      </TableCell>
                      <TableCell>
                        {program.brands?.Name || 'Unknown Brand'}
                      </TableCell>
                      <TableCell>
                        {(parseFloat(program.commission_rate) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={program.is_active ? "default" : "secondary"}>
                          {program.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(program.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" disabled>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" disabled>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No affiliate programs yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get started by creating your first affiliate program to track partner sales.
                  </p>
                </div>
                <Link href="/admin/affiliate/programs/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Program
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        {programs && programs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{programs.length}</div>
                <p className="text-xs text-muted-foreground">
                  {programs.filter(p => p.is_active).length} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(programs.reduce((sum, p) => sum + parseFloat(p.commission_rate), 0) / programs.length * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all programs
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Brands Covered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(programs.map(p => p.brand_id)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique brands
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}