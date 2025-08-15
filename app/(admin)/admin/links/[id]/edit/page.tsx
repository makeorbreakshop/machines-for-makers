export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditLinkForm } from './edit-link-form';

export const metadata = {
  title: 'Edit Short Link | Admin',
  description: 'Edit your branded short URL',
};

export default async function EditLinkPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();
  
  const { data: link, error } = await supabase
    .from('short_links')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !link) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Short Link</h1>
        <p className="text-gray-600 mt-1">Update your branded short URL settings</p>
      </div>
      <EditLinkForm link={link} />
    </div>
  );
}