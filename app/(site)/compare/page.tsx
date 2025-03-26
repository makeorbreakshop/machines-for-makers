import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import CompareClientPage from "./CompareClientPage"
import type { Database } from "@/lib/database-types"
import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { lazy } from "react"

// Dynamically import heavy component
const DynamicComparisonTable = lazy(() => import('@/components/comparison-table'))

// Set dynamic to auto and add revalidation to enable bfcache
export const dynamic = 'auto'
export const revalidate = 3600 // Revalidate at most every hour

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

