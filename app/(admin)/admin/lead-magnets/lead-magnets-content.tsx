'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink,
  BookOpen,
  Tag,
  Gift,
  FileText,
  Search,
  BarChart3,
  Users,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';

interface LeadMagnet {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  landing_page_url: string;
  convertkit_form_id: string | null;
  convertkit_form_name: string | null;
  convertkit_tag: string | null;
  icon: string;
  color: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface LeadMagnetsContentProps {
  initialLeadMagnets: LeadMagnet[];
}

const iconMap: Record<string, React.ReactNode> = {
  'book-open': <BookOpen className="h-4 w-4" />,
  'tag': <Tag className="h-4 w-4" />,
  'gift': <Gift className="h-4 w-4" />,
  'file-text': <FileText className="h-4 w-4" />,
};

export function LeadMagnetsContent({ initialLeadMagnets }: LeadMagnetsContentProps) {
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>(initialLeadMagnets);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const filteredLeadMagnets = leadMagnets.filter(magnet =>
    magnet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    magnet.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    magnet.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead magnet?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/lead-magnets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lead magnet');
      }

      setLeadMagnets(leadMagnets.filter(m => m.id !== id));
      toast.success('Lead magnet deleted successfully');
    } catch (error) {
      toast.error('Failed to delete lead magnet');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/lead-magnets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentState }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead magnet');
      }

      setLeadMagnets(leadMagnets.map(m => 
        m.id === id ? { ...m, active: !currentState } : m
      ));
      toast.success(`Lead magnet ${!currentState ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update lead magnet');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminPageWrapper
      title="Lead Magnets"
      description="Manage your lead magnets and conversion funnels"
      action={
        <Button onClick={() => router.push('/admin/lead-magnets/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lead Magnet
        </Button>
      }
    >

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lead Magnets</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadMagnets.length}</div>
            <p className="text-xs text-muted-foreground">
              {leadMagnets.filter(m => m.active).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ConvertKit Forms</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leadMagnets.filter(m => m.convertkit_form_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Connected forms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              View in analytics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Magnets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Lead Magnets</CardTitle>
              <CardDescription>
                Configure lead magnets and their ConvertKit integrations
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lead magnets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Landing Page</TableHead>
                <TableHead>ConvertKit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeadMagnets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No lead magnets found matching your search' : 'No lead magnets created yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeadMagnets.map((magnet) => (
                  <TableRow key={magnet.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${magnet.color}20` }}
                        >
                          <div style={{ color: magnet.color }}>
                            {iconMap[magnet.icon] || <Gift className="h-4 w-4" />}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{magnet.name}</p>
                          <p className="text-sm text-muted-foreground">{magnet.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a 
                        href={magnet.landing_page_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {magnet.landing_page_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      {magnet.convertkit_form_id ? (
                        <div>
                          <p className="text-sm font-medium">{magnet.convertkit_form_name || 'Form configured'}</p>
                          <p className="text-xs text-muted-foreground">ID: {magnet.convertkit_form_id}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not configured</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={magnet.active ? 'default' : 'secondary'}>
                        {magnet.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={loading}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/admin/lead-magnets/${magnet.id}/analytics`)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/lead-magnets/${magnet.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(magnet.id, magnet.active)}>
                            {magnet.active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(magnet.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageWrapper>
  );
}