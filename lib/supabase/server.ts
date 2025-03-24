import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database-types"

// Create a Supabase client for server components
export async function createServerClient() {
  return createServerComponentClient<Database>({ 
    cookies: cookies
  })
}

