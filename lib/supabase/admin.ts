import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database-types"

// Create a Supabase client with admin privileges using service role key
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Admin client creation failed:", {
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseServiceKey
    })
    throw new Error("Supabase URL or Service Role Key not available")
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

// Create a Supabase client for edge functions using anon key
export function createEdgeAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Edge admin client creation failed:", {
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseAnonKey
    })
    throw new Error("Supabase URL or Anon Key not available")
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
} 