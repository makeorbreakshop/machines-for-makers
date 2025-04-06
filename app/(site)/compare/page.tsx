import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import CompareClientPage from "./CompareClientPage"
import type { Database } from "@/lib/database-types"
import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { lazy } from "react"

// Set config options directly, not re-exported
export const dynamic = 'auto'
export const revalidate = 3600 // Revalidate at most every hour

// Define metadata
export const metadata: Metadata = {
  title: "Compare Laser Cutters | Machines for Makers",
  description: "Compare laser cutters and engravers side by side. Filter by price, power, features and more.",
}

// Dynamically import heavy component with preloading hint
const DynamicComparisonTable = lazy(() => import('@/components/comparison-table'))

export default async function ComparePage() {
  const supabase = await createServerClient()

  // Fetch data in parallel for better performance
  const [categoriesResponse, brandsResponse, productsResponse] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("machines").select("*", { count: "exact" }).limit(150)
  ])

  return (
    <div className="min-h-[800px]">
      <Suspense fallback={
        <div className="min-h-[800px] flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded w-full max-w-4xl"></div>
          </div>
        </div>
      }>
        <CompareClientPage
          categories={categoriesResponse.data || []}
          brands={brandsResponse.data || []}
          initialProducts={productsResponse.data || []}
        />
      </Suspense>
    </div>
  )
}

