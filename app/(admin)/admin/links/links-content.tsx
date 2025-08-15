'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Copy,
  ExternalLink,
  MoreVertical,
  Link as LinkIcon,
  BarChart,
  Edit,
  Trash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ShortLink {
  id: string;
  slug: string;
  destination_url: string;
  type: 'lead-magnet' | 'affiliate' | 'resource';
  campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  append_utms: boolean;
  active: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
}

interface LinksContentProps {
  initialLinks: ShortLink[];
}

export function LinksContent({ initialLinks }: LinksContentProps) {
  const [links, setLinks] = useState<ShortLink[]>(initialLinks);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const router = useRouter();

  const handleDelete = async (linkId: string, slug: string) => {
    if (!confirm(`Are you sure you want to delete the link "${slug}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/links/${linkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      // Remove the link from local state
      setLinks(links.filter(link => link.id !== linkId));
      toast.success('Link deleted successfully');
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to delete link. Please try again.');
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = 
      link.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.destination_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.campaign?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || link.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getShortUrl = (slug: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com';
    return `${baseUrl}/go/${slug}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lead-magnet':
        return 'bg-blue-100 text-blue-800';
      case 'affiliate':
        return 'bg-green-100 text-green-800';
      case 'resource':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: links.length,
    active: links.filter(l => l.active).length,
    clicks: links.reduce((sum, link) => sum + link.click_count, 0),
    leadMagnets: links.filter(l => l.type === 'lead-magnet').length,
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Short Links</h1>
          <p className="text-gray-600 mt-1">Manage your branded short URLs and track clicks</p>
        </div>
        <Button onClick={() => router.push('/admin/links/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Links</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Links</CardDescription>
            <CardTitle className="text-2xl">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Clicks</CardDescription>
            <CardTitle className="text-2xl">{stats.clicks.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lead Magnets</CardDescription>
            <CardTitle className="text-2xl">{stats.leadMagnets}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search links..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'lead-magnet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('lead-magnet')}
              >
                Lead Magnets
              </Button>
              <Button
                variant={filterType === 'affiliate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('affiliate')}
              >
                Affiliate
              </Button>
              <Button
                variant={filterType === 'resource' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('resource')}
              >
                Resource
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short Link</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-center">Clicks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                        <code className="text-sm">/go/{link.slug}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getShortUrl(link.slug))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600 truncate max-w-[200px]">
                          {link.destination_url}
                        </span>
                        <a
                          href={link.destination_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(link.type)}>
                        {link.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {link.campaign || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{link.click_count}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.active ? 'success' : 'secondary'}>
                        {link.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/links/${link.id}`)}
                          >
                            <BarChart className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/links/${link.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(getShortUrl(link.slug))}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(link.id, link.slug)}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLinks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No links found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}