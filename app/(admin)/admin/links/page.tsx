export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { LinksContent } from './links-content';

export const metadata = {
  title: 'Short Links | Admin',
  description: 'Manage short links and view click analytics',
};

export default async function LinksPage() {
  const supabase = createServerClient();

  // Fetch all short links with stats
  const { data: links, error } = await supabase
    .from('short_links')
    .select(`
      *,
      click_count:link_clicks(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching links:', error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Short Links</h1>
        <div className="text-red-600">Error loading links. Please try again.</div>
      </div>
    );
  }

  // Transform the data to include click counts
  const linksWithStats = links?.map(link => ({
    ...link,
    click_count: link.click_count?.[0]?.count || 0
  })) || [];

  return <LinksContent initialLinks={linksWithStats} />;
}