import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { dataProvider } from "@/lib/data-provider"
import { ArrowRight } from "lucide-react"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database-types"

// Implement ISR with a 1-hour revalidation period
export const revalidate = 3600

export const metadata = {
  title: "Machines for Makers - Expert Reviews & Comparisons",
  description:
    "Find the perfect machine for your maker projects with comprehensive reviews, detailed comparisons, and expert recommendations for lasers, 3D printers, and CNCs.",
}

// Function to format laser category for display
const formatLaserCategory = (category: string | null) => {
  if (!category) return "";
  
  // Replace hyphens with spaces and capitalize each word
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    // Handle special cases like "CO2"
    .replace(/Co2/g, 'CO2');
}

export default async function HomePage() {
  // Get a larger set of top-rated products to ensure we have some with awards
  const { data: topPicks } = await dataProvider.getMachines({
    limit: 20, // Increased limit
    sort: "rating-desc",
  })
  
  // Directly query the database for machines with awards as a backup
  const supabase = createServerComponentClient<Database>({ cookies: () => cookies() })
  const { data: awardMachines } = await supabase
    .from("machines")
    .select("id, \"Machine Name\", \"Award\", \"Internal link\", \"Image\", \"Excerpt (Short)\", \"Price\", \"Laser Category\"")
    .not("Award", "is", null)
    .eq("Hidden", false)
    .order("Rating", { ascending: false })
    .limit(6)
  
  // Process the award machines into the expected format
  const directAwardProducts = awardMachines?.map(machine => ({
    id: machine.id,
    machine_name: machine["Machine Name"],
    award: machine["Award"],
    slug: machine["Internal link"],
    image_url: machine["Image"],
    excerpt_short: machine["Excerpt (Short)"],
    price: machine["Price"],
    laser_category: machine["Laser Category"]
  })) || []
  
  // Debug what we're showing
  console.log('Direct award products count:', directAwardProducts.length)

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-sky-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <div className="max-w-2xl text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Find Your Perfect Machine</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Expert reviews, detailed comparisons, and buying guides for lasers, 3D printers, and CNC machines.
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/compare">Compare Products</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Top Picks</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {directAwardProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card className="overflow-hidden h-full transition-transform hover:scale-[1.02]">
                  <div className="relative h-52 flex items-center justify-center">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=200&width=200"}
                      alt={product.machine_name || `Featured product ${product.id || "image"}`}
                      fill
                      loading="lazy"
                      className="object-contain p-1"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-2">{product.machine_name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{formatLaserCategory(product.laser_category)}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">
                        {product.price ? `$${Number(product.price).toLocaleString()}` : "Price N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/compare">Compare All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Resources</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-4">Compare Lasers</h3>
                <p className="text-muted-foreground mb-4">
                  Our comprehensive comparison tool lets you view specs side-by-side, helping you find the perfect laser cutter for your needs and budget.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/compare">Compare Now</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-4">Watch Latest Reviews</h3>
                <p className="text-muted-foreground mb-4">
                  See hands-on tests and in-depth reviews of the newest laser cutters, 3D printers, and CNC machines on the Maker Break YouTube channel.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="https://www.youtube.com/@makeorbreakshop" target="_blank" rel="noopener noreferrer">Visit YouTube</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-4">Learn Lightburn Software</h3>
                <p className="text-muted-foreground mb-4">
                  Master the most popular laser control software with our comprehensive tutorials and tips.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="https://makeorbreakshop.mykajabi.com/learn-lightburn-for-lasers" target="_blank" rel="noopener noreferrer">Start Learning</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

