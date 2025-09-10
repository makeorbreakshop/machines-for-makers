'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Copy, 
  BarChart3, 
  Edit, 
  Trash2, 
  Search, 
  Plus,
  ExternalLink,
  MousePointer,
  Calendar,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface LinkData {
  id: string;
  slug: string;
  destination_url: string;
  type: string;
  campaign?: string;
  click_count: number;
  created_at: string;
  active: boolean;
  metadata?: {
    description?: string;
    video_title?: string;
  };
}

interface LinksLibraryProps {
  links: LinkData[];
  onRefresh: () => void;
}

export function LinksLibrary({ links, onRefresh }: LinksLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Filter and sort links
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = links;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(link => 
        link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.metadata?.video_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.campaign?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(link => link.type === filterType);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'clicks':
          return b.click_count - a.click_count;
        case 'alphabetical':
          return a.slug.localeCompare(b.slug);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [links, searchQuery, filterType, sortBy]);

  const recentLinks = filteredAndSortedLinks.slice(0, 10);
  const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);

  const copyToClipboard = async (slug: string) => {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://machinesformakers.com'}/go/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const deleteLink = async (id: string, slug: string) => {
    if (!confirm(`Are you sure you want to delete /go/${slug}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/links/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      toast.success('Link deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete link');
    }
  };

  const getDestinationDisplay = (url: string) => {
    // Check for internal pages
    if (url.includes('material-library')) return 'Material Library';
    if (url.includes('deal-alerts') || url.includes('/deals')) return 'Deal Alerts';
    
    // Check for external URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        // Show domain for external links
        return urlObj.hostname.replace('www.', '');
      } catch {
        return url;
      }
    }
    
    return url;
  };

  const getLinkTypeColor = (type: string) => {
    switch (type) {
      case 'lead-magnet': return 'bg-green-100 text-green-800';
      case 'external': return 'bg-blue-100 text-blue-800';
      case 'affiliate': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Links</p>
                <p className="text-2xl font-bold">{links.length}</p>
              </div>
              <Tag className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clicks</p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <MousePointer className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Links</p>
                <p className="text-2xl font-bold">{links.filter(l => l.active).length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Links</span>
            <Badge variant="outline">{recentLinks.length} of {links.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No links found. Create your first link above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono text-blue-600">
                        /go/{link.slug}
                      </code>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm text-gray-600">
                        {getDestinationDisplay(link.destination_url)}
                      </span>
                      <Badge className={getLinkTypeColor(link.type)} variant="secondary">
                        {link.type.replace('-', ' ')}
                      </Badge>
                      {link.click_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {link.click_count} clicks
                        </Badge>
                      )}
                    </div>
                    {link.metadata?.video_title && (
                      <p className="text-xs text-gray-500 mt-1">
                        📹 {link.metadata.video_title}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created {format(new Date(link.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(link.slug)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/links/${link.id}`}>
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/links/${link.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Library Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Links</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/links/new">
                <Plus className="h-4 w-4 mr-2" />
                Manual Create
              </Link>
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search links, videos, campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lead-magnet">Lead Magnets</SelectItem>
                <SelectItem value="external">External Links</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="resource">Resources</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Newest First</SelectItem>
                <SelectItem value="clicks">Most Clicks</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No links match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 font-medium">Link</th>
                    <th className="py-2 font-medium">Destination</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Clicks</th>
                    <th className="py-2 font-medium">Created</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedLinks.map((link) => (
                    <tr key={link.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <code className="text-sm font-mono text-blue-600">
                            /go/{link.slug}
                          </code>
                          {link.metadata?.video_title && (
                            <p className="text-xs text-gray-500 mt-1">
                              📹 {link.metadata.video_title}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        {getDestinationDisplay(link.destination_url)}
                      </td>
                      <td className="py-3">
                        <Badge className={getLinkTypeColor(link.type)} variant="secondary">
                          {link.type.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {link.click_count > 0 ? (
                          <Badge variant="outline">
                            {link.click_count}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500">
                        {format(new Date(link.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(link.slug)}
                            title="Copy link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" asChild title="View analytics">
                            <Link href={`/admin/links/${link.id}`}>
                              <BarChart3 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild title="Edit link">
                            <Link href={`/admin/links/${link.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild title="Test link">
                            <a href={`/go/${link.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteLink(link.id, link.slug)}
                            title="Delete link"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}