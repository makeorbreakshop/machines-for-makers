import { dataProvider } from "@/lib/data-provider"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import Breadcrumb from "@/components/breadcrumb"

export const metadata = {
  title: "Laser Cutters & Engravers - Machines for Makers",
  description:
    "Explore our comprehensive guide to laser cutters and engravers. Compare different types, read expert reviews, and find the perfect machine for your needs.",
}

export default async function LaserCuttersPage() {
  const { data: categories } = await dataProvider.getCategories()
  const { data: featuredProducts } = await dataProvider.getMachines({
    limit: 3,
    sort: "rating-desc",
  })

  // Create breadcrumb items
  const breadcrumbItems = [{ label: "Laser Cutters", href: "/category/laser-cutters" }]

  // Schema.org structured data
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Laser Cutters & Engravers",
    description: "Explore our comprehensive guide to laser cutters and engravers.",
    url: "https://machinesformakers.com/category/laser-cutters",
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-6">Laser Cutters & Engravers</h1>
          <div className="prose max-w-none">
            <p>
              Laser cutters and engravers are versatile tools that use focused light beams to cut, mark, or engrave
              materials with precision. Whether you're a hobbyist, small business owner, or industrial manufacturer,
              there's a laser system designed to meet your needs.
            </p>
            <p>
              At Machines for Makers, we provide comprehensive reviews, detailed comparisons, and expert buying guides
              to help you find the perfect laser cutter or engraver for your specific requirements.
            </p>
          </div>
        </div>

        {/* Featured products section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Laser Cutters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProducts?.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <Link href={`/products/${product.slug}`}>
                  <div className="h-[200px] relative">
                    <Image
                      src={product.image_url || "/placeholder.svg?height=200&width=200"}
                      alt={product.machine_name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-bold text-lg mb-1 hover:text-primary">{product.machine_name}</h3>
                  </Link>
                  <div className="text-sm text-muted-foreground mb-2">
                    {product.excerpt_short?.substring(0, 100)}...
                  </div>
                  <div className="font-bold">{product.price ? `$${product.price.toLocaleString()}` : "Price N/A"}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Explore Laser Cutter Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Desktop Diode Lasers",
                slug: "desktop-diode-laser",
                description: "Compact and affordable laser systems perfect for hobbyists and small businesses.",
                image: "/placeholder.svg?height=150&width=150",
              },
              {
                title: "Desktop Galvo Lasers",
                slug: "desktop-galvo",
                description: "High-speed laser marking systems ideal for detailed engraving and metal marking.",
                image: "/placeholder.svg?height=150&width=150",
              },
              {
                title: "Professional Gantry Lasers",
                slug: "pro-gantry",
                description: "Powerful CO2 laser systems for commercial and industrial applications.",
                image: "/placeholder.svg?height=150&width=150",
              },
              {
                title: "Desktop Gantry Lasers",
                slug: "desktop-gantry",
                description: "Enclosed CO2 laser systems balancing power and compact size.",
                image: "/placeholder.svg?height=150&width=150",
              },
              {
                title: "Open Diode Lasers",
                slug: "open-diode",
                description: "Affordable frameless laser systems for DIY enthusiasts and beginners.",
                image: "/placeholder.svg?height=150&width=150",
              },
              {
                title: "Portable Lasers",
                slug: "portable",
                description: "Compact and mobile laser engravers for on-the-go use and limited spaces.",
                image: "/placeholder.svg?height=150&width=150",
              },
            ].map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 relative mr-4">
                      <Image
                        src={category.image || "/placeholder.svg"}
                        alt={category.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <h3 className="font-bold text-lg">{category.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Buying guide section */}
        <div className="mb-12 bg-muted/20 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">How to Choose a Laser Cutter</h2>
          <div className="prose max-w-none">
            <p>Selecting the right laser cutter depends on several key factors:</p>
            <ul>
              <li>
                <strong>Laser Type:</strong> CO2 lasers are versatile for non-metals, fiber lasers excel at metal
                marking, and diode lasers offer affordability for lighter tasks.
              </li>
              <li>
                <strong>Power:</strong> Higher wattage means faster cutting and thicker materials. Hobbyists might need
                30-60W, while professionals often require 80W+.
              </li>
              <li>
                <strong>Work Area:</strong> Consider the size of materials you'll typically work with. Larger work areas
                cost more but offer greater flexibility.
              </li>
              <li>
                <strong>Software:</strong> User-friendly software reduces the learning curve. Some machines use
                proprietary software, while others work with popular options like Lightburn.
              </li>
              <li>
                <strong>Budget:</strong> Laser cutters range from a few hundred dollars to tens of thousands. Balance
                your needs with your budget constraints.
              </li>
            </ul>
            <p>
              For more detailed guidance, check our{" "}
              <a href="/guides/choosing-a-laser-cutter" className="text-primary hover:underline">
                complete guide to choosing a laser cutter
              </a>
              .
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">What's the difference between CO2, fiber, and diode lasers?</h3>
              <p>
                <strong>CO2 lasers</strong> use a gas-filled tube to generate the laser beam and are versatile for
                cutting and engraving non-metal materials like wood, acrylic, and fabric.
                <strong>Fiber lasers</strong> generate the beam through optical fibers and excel at marking and
                engraving metals.
                <strong>Diode lasers</strong> use semiconductor technology, are more compact and affordable, but
                typically have less power than CO2 lasers.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">How much does a good laser cutter cost?</h3>
              <p>
                The cost varies widely based on type, power, and features. Entry-level diode lasers start around
                $200-500, mid-range desktop CO2 lasers cost $2,000-5,000, and professional/industrial systems can range
                from $10,000 to $50,000+. For most small businesses and serious hobbyists, a quality machine in the
                $2,000-5,000 range offers a good balance of capabilities and affordability.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">What materials can laser cutters work with?</h3>
              <p>
                Laser cutters can work with a wide range of materials, but capabilities vary by laser type. CO2 lasers
                can cut and engrave wood, acrylic, leather, paper, fabric, glass (engrave only), and some plastics.
                Fiber lasers excel at marking metals like stainless steel, aluminum, and brass. Diode lasers can cut
                thinner wood, acrylic, and leather, and engrave on various materials including some metals. Materials to
                avoid include PVC, vinyl, and other chlorine-containing materials that produce toxic fumes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

