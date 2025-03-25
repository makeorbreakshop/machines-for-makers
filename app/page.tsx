import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { dataProvider } from "@/lib/data-provider"
import { ArrowRight } from "lucide-react"

// Implement ISR with a 1-hour revalidation period
export const revalidate = 3600

export const metadata = {
  title: "Machines for Makers - Expert Reviews & Comparisons",
  description:
    "Find the perfect machine for your maker projects with comprehensive reviews, detailed comparisons, and expert recommendations for lasers, 3D printers, and CNCs.",
}

export default async function HomePage() {
  // Get featured products for the hero section
  const { data: featuredProducts } = await dataProvider.getMachines({
    limit: 6,
    sort: "rating-desc",
  })

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-sky-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Find Your Perfect Maker Machine</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Expert reviews, detailed comparisons, and buying guides for lasers, 3D printers, and CNC machines.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/compare">Compare Products</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/guides">Buying Guides</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-[300px] md:h-[400px]">
              <Image
                src="/placeholder.svg?height=400&width=600"
                alt="Machines for Makers"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Machine Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Explore Machine Categories</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Lasers Card */}
            <Card className="overflow-hidden">
              <div className="relative h-48">
                <Image
                  src="/placeholder.svg?height=200&width=400"
                  alt="Laser Cutters & Engravers"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Laser Cutters & Engravers</h3>
                    <p className="text-white/80 mb-4">Compare CO2, diode, and fiber lasers for cutting and engraving</p>
                    <Button size="sm" variant="outline" className="bg-white hover:bg-white/90" asChild>
                      <Link href="/lasers">
                        Explore Lasers <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 3D Printers Card */}
            <Card className="overflow-hidden">
              <div className="relative h-48">
                <Image src="/placeholder.svg?height=200&width=400" alt="3D Printers" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">3D Printers</h3>
                    <p className="text-white/80 mb-4">
                      Find the perfect 3D printer for your prototyping and production needs
                    </p>
                    <Button size="sm" variant="outline" className="bg-white hover:bg-white/90" asChild>
                      <Link href="/3d-printers">
                        Explore 3D Printers <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* CNCs Card */}
            <Card className="overflow-hidden md:col-span-2">
              <div className="relative h-48">
                <Image src="/placeholder.svg?height=200&width=800" alt="CNC Machines" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">CNC Machines</h3>
                    <p className="text-white/80 mb-4">
                      Explore CNC routers, mills, and more for precision cutting and carving
                    </p>
                    <Button size="sm" variant="outline" className="bg-white hover:bg-white/90" asChild>
                      <Link href="/cncs">
                        Explore CNCs <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Featured Products</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {featuredProducts?.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src={product.image_url || "/placeholder.svg?height=200&width=200"}
                    alt={product.machine_name || `Featured product ${product.id || "image"}`}
                    fill
                    loading="lazy"
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {product.award && (
                    <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                      {product.award}
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">{product.machine_name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{product.excerpt_short?.substring(0, 100)}...</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">
                      {product.price ? `$${product.price.toLocaleString()}` : "Price N/A"}
                    </span>
                    <Button size="sm" asChild>
                      <Link href={`/products/${product.slug}`}>View Details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/compare">Compare All Products</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/lasers">View All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Guides Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Buying Guides & Resources</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-4">How to Choose a Laser Cutter</h3>
                <p className="text-muted-foreground mb-4">
                  Learn about the different types of laser cutters, key specifications to consider, and which one is
                  right for your needs.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/guides/choosing-a-laser">Read Guide</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-xl mb-4">3D Printer Buying Guide</h3>
                <p className="text-muted-foreground mb-4">
                  Compare FDM vs. resin technologies, understand key features, and find the perfect 3D printer for your
                  projects.
                </p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/guides/choosing-a-3d-printer">Read Guide</Link>
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
                  <Link href="/learn-lightburn">Start Learning</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

