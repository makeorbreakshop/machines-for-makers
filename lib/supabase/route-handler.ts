import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database-types"

// Create a Supabase client for route handlers
export function createRouteHandlerSupabase() {
  // Use createRouteHandlerClient with proper cookie handling
  return createRouteHandlerClient<Database>({ 
    cookies: () => cookies()
  })
}

// Fallback method that doesn't rely on cookies - use this for routes with auth issues
export function createFallbackRouteHandler() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables')
  }
  
  // Use direct service role access instead of cookie authentication
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Edge-compatible fallback that uses the anon key - use this for edge function routes
export function createEdgeFallbackHandler() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables')
  }
  
  // Use anon key for edge functions
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
} 