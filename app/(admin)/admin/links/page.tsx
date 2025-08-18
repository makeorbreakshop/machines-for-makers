'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { QuickLinkCreator } from '@/components/admin/links/quick-link-creator';
import { LinksLibrary } from '@/components/admin/links/links-library';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function LinksPage() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('short_links')
        .select(`
          *,
          click_count:link_clicks(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching links:', error);
        setError('Error loading links. Please refresh to try again.');
        return;
      }

      // Transform the data to include click counts
      const linksWithStats = data?.map(link => ({
        ...link,
        click_count: link.click_count?.[0]?.count || 0
      })) || [];

      setLinks(linksWithStats);
      setError(null);
    } catch (err) {
      console.error('Error fetching links:', err);
      setError('Error loading links. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleRefresh = () => {
    fetchLinks();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Short Links</h1>
        <p className="text-gray-600">Create branded short URLs to track your content performance</p>
      </div>

      {/* Quick Link Creator */}
      <QuickLinkCreator onLinkCreated={handleRefresh} />

      {/* Links Library */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-600">{error}</div>
        </div>
      ) : (
        <LinksLibrary 
          links={links} 
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}