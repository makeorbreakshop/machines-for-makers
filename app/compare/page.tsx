import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import CompareClientPage from "./CompareClientPage"
import type { Database } from "@/lib/database-types"
import { Metadata } from "next"
import dynamic from 'next/dynamic'
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Dynamically import heavy component
const DynamicComparisonTable = dynamic(() => import('@/components/comparison-table'), {
  loading: () => <div className="w-full p-12 text-center">Loading comparison table...</div>,
  ssr: true
})

// Use a different name for the config export
export const dynamicConfig = 'force-dynamic'

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

