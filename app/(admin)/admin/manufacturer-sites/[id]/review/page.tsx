import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function RedirectToDiscovery({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = await createServerClient()
  
  // Get the site name for the filter
  const { data: site } = await supabase
    .from('manufacturer_sites')
    .select('name')
    .eq('id', params.id)
    .single()

  // Redirect to main discovery page with site filter
  const siteParam = site?.name ? `?site=${encodeURIComponent(site.name)}` : ''
  redirect(`/admin/discovery${siteParam}`)
}