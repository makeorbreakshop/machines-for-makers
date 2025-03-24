import { Suspense } from "react"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import CompareClientPage from "./CompareClientPage"
import type { Database } from "@/lib/database-types"

export default async function ComparePage() {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Fetch categories
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  // Fetch brands
  const { data: brands } = await supabase.from("brands").select("*").order("name")

  // Fetch initial products
  const { data: products, count } = await supabase
    .from("machines")
    .select("*", { count: "exact" })
    .limit(30)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompareClientPage
        initialCategories={categories || []}
        initialBrands={brands || []}
        initialProducts={products || []}
        initialCount={count || 0}
      />
    </Suspense>
  )
}

