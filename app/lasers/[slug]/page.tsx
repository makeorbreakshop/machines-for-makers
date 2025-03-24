import { dataProvider } from "@/lib/data-provider"
import { notFound } from "next/navigation"
import ProductsGrid from "@/components/products-grid"
import Breadcrumb from "@/components/breadcrumb"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal } from "lucide-react"
import FilterButton from "@/components/filter-button"

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const categorySlug = params.slug
  const categoryName = getCategoryName(categorySlug)

  return {
    title: `${categoryName} - Machines for Makers`,
    description: `Compare and find the best ${categoryName.toLowerCase()} for your needs. Detailed reviews, specifications, and buying guides.`,
  }
}

export default async function LaserCategoryPage({ params }: { params: { slug: string } }) {
  const categorySlug = params.slug
  const categoryName = getCategoryName(categorySlug)

  const { data: products } = await dataProvider.getMachines({
    limit: 100,
    category: categorySlug,
    sort: "rating-desc",
  })

  const { data: categories } = await dataProvider.getCategories()
  const { data: brands } = await dataProvider.getBrands()

  if (!products || products.length === 0) {
    notFound()
  }

  // Create breadcrumb items
  const breadcrumbItems = [
    { label: "Lasers", href: "/lasers" },
    { label: categoryName, href: `/lasers/${categorySlug}` },
  ]

  // Schema.org structured data for category
  const categorySchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryName,
    description: `Compare and find the best ${categoryName.toLowerCase()} for your needs.`,
    url: `https://machinesformakers.com/lasers/${categorySlug}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.machine_name,
          url: `https://machinesformakers.com/products/${product.slug}`,
          image: product.image_url,
        },
      })),
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }} />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={breadcrumbItems} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{categoryName}</h1>
          <div className="prose max-w-none">
            <p>{getCategoryDescription(categorySlug)}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 overflow-x-auto">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="flex w-full justify-start overflow-x-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="featured">Featured</TabsTrigger>
                  <TabsTrigger value="best-value">Best Value</TabsTrigger>
                  <TabsTrigger value="budget">Budget</TabsTrigger>
                  <TabsTrigger value="premium">Premium</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-2">
              <FilterButton categories={categories || []} brands={brands || []} />
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="font-medium">{products.length} machines</span>
            <span className="text-muted-foreground ml-2">in {categoryName}</span>
          </div>
          <Button variant="outline" size="sm">
            Clear Filters
          </Button>
        </div>

        {/* Top picks section */}
        {products.some((p) => p.award) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Top Picks</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products
                .filter((p) => p.award)
                .slice(0, 3)
                .map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="font-bold text-primary">{product.award}</div>
                    <div className="font-medium text-lg mt-1">{product.machine_name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {product.excerpt_short?.substring(0, 100)}...
                    </div>
                    <div className="mt-2 font-bold">
                      {product.price ? `$${product.price.toLocaleString()}` : "Price N/A"}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Comparison table for top models */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Compare Top Models</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border p-2 text-left">Model</th>
                  <th className="border p-2 text-left">Power</th>
                  <th className="border p-2 text-left">Work Area</th>
                  <th className="border p-2 text-left">Speed</th>
                  <th className="border p-2 text-left">Price</th>
                  <th className="border p-2 text-left">Rating</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 5).map((product) => (
                  <tr key={product.id} className="hover:bg-muted/10">
                    <td className="border p-2 font-medium">{product.machine_name}</td>
                    <td className="border p-2">
                      {product.laser_power_a}W {product.laser_type_a}
                    </td>
                    <td className="border p-2">{product.work_area}</td>
                    <td className="border p-2">{product.speed}</td>
                    <td className="border p-2">{product.price ? `$${product.price.toLocaleString()}` : "N/A"}</td>
                    <td className="border p-2">{product.rating}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buying guide section */}
        <div className="mb-8 bg-muted/20 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Buying Guide: How to Choose a {categoryName.replace(/s$/, "")}</h2>
          <div className="prose max-w-none">
            <p>When selecting a {categoryName.toLowerCase().replace(/s$/, "")}, consider these key factors:</p>
            <ul>
              <li>
                <strong>Power:</strong> Higher wattage means faster cutting and ability to cut thicker materials.
              </li>
              <li>
                <strong>Work Area:</strong> Ensure the machine can accommodate your typical project sizes.
              </li>
              <li>
                <strong>Speed:</strong> Faster machines increase productivity but may cost more.
              </li>
              <li>
                <strong>Software:</strong> User-friendly software reduces the learning curve.
              </li>
              <li>
                <strong>Build Quality:</strong> Better construction means longer lifespan and more precise results.
              </li>
              <li>
                <strong>Features:</strong> Consider if you need features like cameras, WiFi, or autofocus.
              </li>
            </ul>
            <p>
              For more detailed guidance, check our{" "}
              <a href="/guides/choosing-a-laser" className="text-primary hover:underline">
                complete guide to choosing a laser cutter
              </a>
              .
            </p>
          </div>
        </div>

        <ProductsGrid products={products} />

        {/* FAQ Section for SEO */}
        <div className="mt-12 mb-8">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">What is a {categoryName.replace(/s$/, "")}?</h3>
              <p>{getCategoryFAQ(categorySlug, "what")}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">What can you do with a {categoryName.replace(/s$/, "")}?</h3>
              <p>{getCategoryFAQ(categorySlug, "uses")}</p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">How much does a {categoryName.replace(/s$/, "")} cost?</h3>
              <p>{getCategoryFAQ(categorySlug, "cost")}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Helper function to get category name from slug
function getCategoryName(slug: string): string {
  const categoryMap: Record<string, string> = {
    "desktop-diode-laser": "Desktop Diode Lasers",
    "desktop-galvo": "Desktop Galvo Lasers",
    "pro-gantry": "Professional Gantry Lasers",
    "desktop-gantry": "Desktop Gantry Lasers",
    "open-diode": "Open Diode Lasers",
  }

  return (
    categoryMap[slug] ||
    slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

// Helper function to get category description
function getCategoryDescription(slug: string): string {
  const descriptionMap: Record<string, string> = {
    "desktop-diode-laser":
      "Desktop diode lasers offer a compact and affordable solution for hobbyists and small businesses. These machines use semiconductor diode technology to produce a laser beam capable of cutting and engraving various materials. With their smaller footprint and lower power requirements, they're perfect for home workshops and maker spaces.",
    "desktop-galvo":
      "Desktop galvo lasers use galvanometer systems to direct the laser beam with exceptional speed and precision. These machines excel at high-speed engraving and marking, making them ideal for detailed work on smaller items. Their advanced mirror-based beam steering allows for incredibly fast processing times compared to gantry systems.",
    "pro-gantry":
      "Professional gantry lasers are high-powered machines designed for industrial and commercial applications. These robust systems use a moving gantry to position the laser head, offering large work areas and the ability to cut through thick materials. With their superior power and build quality, they're the workhorses of professional fabrication shops.",
    "desktop-gantry":
      "Desktop gantry lasers combine the reliability of gantry systems with a more compact form factor. These machines are perfect for small businesses and serious hobbyists who need professional-quality results without the space requirements of industrial systems. They typically offer a good balance of work area, power, and precision.",
    "open-diode":
      "Open diode lasers are frameless systems that offer flexibility and affordability. These machines lack an enclosure, making them more compact and less expensive, but requiring additional safety precautions. They're popular among DIY enthusiasts and makers looking for an entry-level laser cutting solution.",
  }

  return (
    descriptionMap[slug] ||
    `Explore our selection of ${getCategoryName(slug).toLowerCase()} for your cutting and engraving needs. Compare specifications, read reviews, and find the perfect machine for your projects.`
  )
}

// Helper function to get category FAQ answers
function getCategoryFAQ(slug: string, question: string): string {
  const faqMap: Record<string, Record<string, string>> = {
    "desktop-diode-laser": {
      what: "A desktop diode laser is a compact laser cutting and engraving machine that uses semiconductor diode technology to generate the laser beam. These machines are designed to fit on a desk or workbench and are popular for small businesses and hobbyists.",
      uses: "Desktop diode lasers are versatile tools that can engrave and cut a variety of materials including wood, leather, paper, acrylic, and some plastics. They're commonly used for creating personalized gifts, signage, artwork, jewelry, and small business products.",
      cost: "Desktop diode lasers typically range from $400 to $3,000 depending on power, features, and build quality. Entry-level models start around $400-600, mid-range options cost $800-1,500, and premium models with higher power and better features can cost $1,500-3,000.",
    },
    "desktop-galvo": {
      what: "A desktop galvo laser uses galvanometer mirrors to direct the laser beam at extremely high speeds. Unlike gantry systems that move the entire laser head, galvo systems only move small mirrors, allowing for much faster operation and precise control.",
      uses: "Desktop galvo lasers excel at high-speed marking and engraving, particularly on metals and plastics. They're ideal for industrial marking, serial numbering, logo engraving, jewelry marking, and creating detailed artwork on small items.",
      cost: "Desktop galvo lasers typically range from $2,000 to $10,000. Basic fiber galvo systems start around $2,000-3,000, while more advanced MOPA fiber lasers with greater control over pulse width and frequency can cost $5,000-10,000.",
    },
    "pro-gantry": {
      what: "A professional gantry laser is a high-powered laser cutting and engraving system that uses a moving gantry to position the laser head over the work area. These machines are designed for commercial and industrial applications requiring power, precision, and reliability.",
      uses: "Professional gantry lasers can cut and engrave a wide range of materials including thick acrylic, wood, leather, fabric, and paper. They're used in sign making, architectural model building, furniture production, display manufacturing, and industrial fabrication.",
      cost: "Professional gantry lasers typically range from $5,000 to $30,000+. Entry-level professional models start around $5,000-10,000, mid-range systems cost $10,000-20,000, and high-end industrial systems can cost $20,000-30,000 or more.",
    },
    "desktop-gantry": {
      what: "A desktop gantry laser is a smaller version of professional gantry laser systems, designed to fit in a home workshop or small business environment. These machines use a moving gantry to position the laser head and typically feature enclosed designs for safety.",
      uses: "Desktop gantry lasers are versatile machines used for cutting and engraving wood, acrylic, leather, paper, and fabric. They're popular for creating signage, artwork, prototypes, small business products, and personalized items.",
      cost: "Desktop gantry lasers typically range from $2,000 to $7,000. Entry-level CO2 desktop systems start around $2,000-3,000, while more powerful and feature-rich models can cost $4,000-7,000.",
    },
    "open-diode": {
      what: "An open diode laser is a frameless laser engraving and cutting system without an enclosure. These machines use diode laser technology and typically feature a simple X-Y gantry system mounted on an open frame.",
      uses: "Open diode lasers are used for engraving and cutting thin materials like wood, leather, paper, and some plastics. They're popular for DIY projects, hobby crafting, simple signage, and personalized items.",
      cost: "Open diode lasers are among the most affordable laser systems, typically ranging from $200 to $800. Basic models start around $200-300, while more powerful and precise options can cost $400-800.",
    },
  }

  return (
    faqMap[slug]?.[question] ||
    "Please contact us for more information about this category of laser cutters and engravers."
  )
}

