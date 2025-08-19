export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createServiceClient } from '@/lib/supabase/server';
import { LeadMagnetsContent } from './lead-magnets-content';

export const metadata: Metadata = {
  title: 'Lead Magnets | Admin',
  description: 'Manage lead magnets and conversion funnels',
};

export default async function LeadMagnetsPage() {
  await requireAdminAuth();

  const supabase = createServiceClient();

  // Fetch lead magnets
  const { data: leadMagnets, error } = await supabase
    .from('lead_magnets')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching lead magnets:', error);
  }

  return <LeadMagnetsContent initialLeadMagnets={leadMagnets || []} />;
}