import { createServerClient } from "@/lib/supabase/server"
import Navbar from "./navbar"

export const runtime = 'nodejs';

export default async function NavbarWrapper() {
  const supabase = createServerClient()
  
  let logoUrl: string | null = null
  
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "logo_url")
      .single()
    
    logoUrl = data?.value || null
  } catch (error) {
    console.error("Error fetching logo:", error)
  }
  
  return <Navbar logoUrl={logoUrl} />
}