import { createServerClient } from '@/lib/supabase/server';

export async function getLogoUrl(): Promise<string | null> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'logo_url')
      .single();

    if (error || !data?.value) {
      return null;
    }

    return data.value;
  } catch (error) {
    console.error('Error fetching logo:', error);
    return null;
  }
}