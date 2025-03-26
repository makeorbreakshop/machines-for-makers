import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database-types"

// Create a Supabase client for route handlers
export function createRouteHandlerSupabase() {
  return createRouteHandlerClient<Database>({ 
    cookies: () => cookies()
  })
} 