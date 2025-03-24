import { dataProvider } from "@/lib/data-provider"
import type { Metadata } from "next"
import ProductsBrowser from "@/components/products-browser"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Laser Cutters & Engravers - Machines for Makers",
  description:
    "Compare and find the best laser cutter for your needs. Detailed reviews and comparisons of CO2, diode, and fiber lasers.",
}

export default async function LasersPage() {
  const { data: products, count } = await dataProvider.getMachines({
    category: "laser",
    limit: 12,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Laser Cutters & Engravers</h1>
      <p className="text-muted-foreground mb-8">
        Compare and find the best laser cutter for your needs. We review and compare CO2, diode, and fiber lasers.
      </p>

      <Suspense fallback={<ProductsGridSkeleton />}>
        <ProductsBrowser initialProducts={products || []} totalCount={count || 0} category="laser" />
      </Suspense>
    </div>
  )
}

function ProductsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(12)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            <Skeleton className="h-[200px] w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          </div>
        ))}
    </div>
  )
}

