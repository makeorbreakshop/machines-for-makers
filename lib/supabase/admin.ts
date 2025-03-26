import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

// Create a Supabase client with admin privileges using service role key
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL or Service Role Key not available")
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
} 