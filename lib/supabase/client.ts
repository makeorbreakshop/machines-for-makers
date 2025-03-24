"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database-types"

// Create a single instance of the Supabase client for client components
export const supabaseClient = createClientComponentClient<Database>()

