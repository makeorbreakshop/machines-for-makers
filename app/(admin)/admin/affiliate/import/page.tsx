export const runtime = 'nodejs';

import { createServerClient } from '@/lib/supabase/server';
import { AdminPageWrapper } from '@/components/admin/admin-page-wrapper';
import { ImportWizard } from './import-wizard';

export default async function AffiliateImportPage() {
  const supabase = createServerClient();
  
  // Fetch available affiliate programs
  const { data: programs, error } = await supabase
    .from('affiliate_programs')
    .select(`
      *,
      brands(Name, Slug)
    `)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching affiliate programs:', error);
  }

  // Fetch recent import batches
  const { data: recentImports, error: importsError } = await supabase
    .from('import_batches')
    .select(`
      *,
      affiliate_programs(name, brands(Name))
    `)
    .order('imported_at', { ascending: false })
    .limit(5);

  if (importsError) {
    console.error('Error fetching recent imports:', importsError);
  }

  return (
    <AdminPageWrapper
      title="Sales Import"
      description="Import affiliate sales data from CSV files and match products to machines"
    >
      <ImportWizard 
        programs={programs || []} 
        recentImports={recentImports || []}
      />
    </AdminPageWrapper>
  );
}