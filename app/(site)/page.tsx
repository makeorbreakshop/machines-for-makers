import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { dataProvider } from "@/lib/data-provider"
import { ArrowRight } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { PriceDropService } from "@/lib/services/price-drop-service"
import { PriceDropBadge } from "@/components/price-drops/price-drop-badge"

// Implement ISR with a 1-hour revalidation period
export const revalidate = 3600

export const metadata = {
  title: "Machines for Makers - Expert Reviews & Comparisons",
  description:
    "Find the perfect machine for your maker projects with comprehensive reviews, detailed comparisons, and expert recommendations for lasers, 3D printers, and CNCs.",
}

// Set explicit runtime for Vercel deployment
export const runtime = 'nodejs';

// Define the product type
type TopPickProduct = {
  id: string;
  machine_name: string;
  award: string;
  slug: string;
  image_url: string | null;
  excerpt_short: string | null;
  price: number | null;
  laser_category: string | null;
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

async function getTopPicks(): Promise<TopPickProduct[]> {
  try {
    // Use the server client directly like we do in the compare page
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("machines")
      .select('id, "Machine Name", "Award", "Internal link", "Image", "Excerpt (Short)", "Price", "Laser Category"')
      .eq("Award", "Top Pick")
      .or('Hidden.is.null,"Hidden".eq.false')
      .order("Rating", { ascending: false })
      .limit(6)

    if (error) {
      console.error("Error fetching top picks:", error.message);
      return [];
    }

    // Transform the data to match the expected format
    return data.map(machine => ({
      id: machine.id,
      machine_name: machine["Machine Name"],
      award: machine["Award"],
      slug: machine["Internal link"],
      image_url: machine["Image"],
      excerpt_short: machine["Excerpt (Short)"],
      price: machine["Price"],
      laser_category: machine["Laser Category"]
    }));
  } catch (error) {
    console.error("Error fetching top picks:", error);
    return [];
  }
}

export default async function HomePage() {
  // Get top picks directly from Supabase
  const directAwardProducts = await getTopPicks();
  
  // Get price drops for the featured products
  const machineIds = directAwardProducts.map(p => p.id);
  const priceDrops = await PriceDropService.getRecentPriceDrops(machineIds, 7);
  
  // Debug what we're showing
  console.log('Top picks count:', directAwardProducts.length);

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
                  <Link href="/deals">View Deals</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
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
            {directAwardProducts.map((product: TopPickProduct, index: number) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card className="overflow-hidden h-full transition-transform hover:scale-[1.02]">
                  <div className="relative h-52 flex items-center justify-center">
                    {priceDrops.has(product.id) && (
                      <div className="absolute top-2 left-2 z-10">
                        <PriceDropBadge 
                          percentageChange={priceDrops.get(product.id)!.percentageChange}
                          isAllTimeLow={priceDrops.get(product.id)!.isAllTimeLow}
                          size="sm"
                        />
                      </div>
                    )}
                    <Image
                      src={product.image_url || "/placeholder.svg?height=200&width=200"}
                      alt={product.machine_name || `Featured product ${product.id || "image"}`}
                      fill
                      loading={index < 3 ? "eager" : "lazy"}
                      priority={index === 0} 
                      className="object-contain p-1"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjFmMSIvPjwvc3ZnPg=="
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

