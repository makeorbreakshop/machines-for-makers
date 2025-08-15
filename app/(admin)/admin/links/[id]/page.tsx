export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { LinkAnalytics } from './link-analytics';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: link } = await supabase
    .from('short_links')
    .select('slug')
    .eq('id', params.id)
    .single();

  return {
    title: link ? `Analytics: ${link.slug} | Admin` : 'Link Analytics | Admin',
    description: 'View detailed analytics for your short link',
  };
}

export default async function LinkAnalyticsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();
  
  // Fetch link details
  const { data: link, error: linkError } = await supabase
    .from('short_links')
    .select('*')
    .eq('id', params.id)
    .single();

  if (linkError || !link) {
    notFound();
  }

  // Fetch click data
  const { data: clicks, error: clickError } = await supabase
    .from('link_clicks')
    .select('*')
    .eq('short_link_id', params.id)
    .order('clicked_at', { ascending: false });

  if (clickError) {
    console.error('Error fetching clicks:', clickError);
  }

  // Fetch aggregated stats
  const { data: stats } = await supabase
    .from('link_click_stats')
    .select('*')
    .eq('short_link_id', params.id)
    .single();

  return (
    <LinkAnalytics 
      link={link} 
      clicks={clicks || []} 
      stats={stats}
    />
  );
}