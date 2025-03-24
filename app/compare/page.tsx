import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import CompareClientPage from "./CompareClientPage"
import type { Database } from "@/lib/database-types"

export const dynamic = 'force-dynamic'

export default async function ComparePage() {
  const supabase = await createServerClient()

  // Fetch data in parallel for better performance
  const [categoriesResponse, brandsResponse, productsResponse] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("machines").select("*", { count: "exact" }).limit(150)
  ])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompareClientPage
        categories={categoriesResponse.data || []}
        brands={brandsResponse.data || []}
        initialProducts={productsResponse.data || []}
      />
    </Suspense>
  )
}

