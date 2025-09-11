export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { NewProgramForm } from './new-program-form';

export default async function NewAffiliateProgramPage() {
  const supabase = createServerClient();
  
  // Fetch available brands for the dropdown
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, Name, Slug')
    .order('Name');

  if (error) {
    console.error('Error fetching brands:', error);
  }

  return (
    <AdminPageWrapper
      title="New Affiliate Program"
      description="Create a new affiliate tracking program for a brand"
    >
      <NewProgramForm brands={brands || []} />
    </AdminPageWrapper>
  );
}