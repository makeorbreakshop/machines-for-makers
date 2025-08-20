export const runtime = 'nodejs';

import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getLogoUrl } from '@/lib/services/logo-service';
import { getSubscriberCount } from '@/lib/services/convertkit-service';
import ShopifyStyleLanding from './components/ShopifyStyleLanding';

export const metadata: Metadata = {
  title: '157 Laser Cutters Compared: Real Specs, Real Prices',
  description: 'Compare actual work areas, real power specs, and software compatibility for every major laser cutter in one place.',
  robots: 'noindex, nofollow',
};

export default async function LaserComparisonPage() {
  const supabase = await createServerClient();
  const logoUrl = await getLogoUrl();
  const subscriberCount = await getSubscriberCount();
  
  // Get total count of laser machines
  const { count: totalLasers } = await supabase
    .from('machines')
    .select('*', { count: 'exact', head: true })
    .eq('Machine Category', 'laser')
    .neq('Hidden', 'true')
    .not('Published On', 'is', null);
  
  // Fetch 6 popular laser cutters for preview
  const { data: machines } = await supabase
    .from('machines')
    .select(`
      id,
      "Machine Name",
      "Internal link",
      "Company",
      "Price",
      "Work Area",
      "Laser Power A",
      "Laser Type A",
      "Speed",
      "Software",
      "Focus",
      "Camera",
      "Image"
    `)
    .eq('Machine Category', 'laser')
    .neq('Hidden', 'true')
    .not('Published On', 'is', null)
    .not('Price', 'is', null)
    .gte('Price', 500)
    .lte('Price', 5000)
    .in('Company', ['xtool', 'omtech', 'glowforge', 'creality', 'thunder', 'onelaser'])
    .neq('Speed', '?')
    .not('Speed', 'is', null)
    .neq('Software', '?')
    .not('Software', 'is', null)
    .neq('Machine Name', 'Creality Falcon A1 10W')
    .order('Price', { ascending: true })
    .limit(6);

  return <ShopifyStyleLanding 
    machines={machines || []} 
    logoUrl={logoUrl} 
    totalLasers={totalLasers || 157} 
    subscriberCount={subscriberCount}
  />;
}