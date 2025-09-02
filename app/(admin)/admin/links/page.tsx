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
      
      // Fetch links with stats from the admin API
      const response = await fetch('/api/admin/links');
      
      if (!response.ok) {
        throw new Error('Failed to fetch links');
      }

      const linksData = await response.json();
      setLinks(linksData);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Short Links</h1>
          <p className="text-lg text-gray-600">Create branded short URLs to track your content performance</p>
        </div>

        {/* Quick Link Creator */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <QuickLinkCreator onLinkCreated={handleRefresh} />
          </div>
        </div>

        {/* Links Library */}
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="text-center py-12">
              <div className="text-red-600 text-lg">{error}</div>
            </div>
          </div>
        ) : (
          <LinksLibrary 
            links={links} 
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}