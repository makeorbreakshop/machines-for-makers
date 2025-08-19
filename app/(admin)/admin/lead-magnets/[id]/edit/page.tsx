export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { requireAdminAuth } from '@/lib/auth-utils';
import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { LeadMagnetForm } from '../../lead-magnet-form';

export const metadata: Metadata = {
  title: 'Edit Lead Magnet | Admin',
  description: 'Edit lead magnet settings',
};

export default async function EditLeadMagnetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminAuth();

  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch lead magnet
  const { data: leadMagnet, error } = await supabase
    .from('lead_magnets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !leadMagnet) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Lead Magnet</h1>
        <p className="text-muted-foreground mt-1">
          Update lead magnet settings and ConvertKit integration
        </p>
      </div>
      <LeadMagnetForm initialData={leadMagnet} leadMagnetId={id} />
    </div>
  );
}