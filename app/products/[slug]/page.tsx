import { dataProvider } from "@/lib/data-provider"
import { notFound } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, Heart, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import ProductReviews from "@/components/product-reviews"
import Breadcrumb from "@/components/breadcrumb"
import AuthorInfo from "@/components/author-info"
import RelatedProducts from "@/components/related-products"

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: product } = await dataProvider.getMachineBySlug(params.slug)

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
    }
  }

  // More SEO-optimized title format
  const title = `${product.machine_name} Review: ${product.laser_power_a}W ${product.laser_type_a} Laser Cutter & Engraver (2025)`

  // More detailed meta description
  const description =
    product.excerpt_short ||
    `Comprehensive review of the ${product.machine_name} ${product.laser_type_a} laser cutter. Learn about specs, performance, pros and cons, and if it's right for your needs.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [product.image_url || ""],
      publishedTime: product.published_at,
      modifiedTime: product.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.image_url || ""],
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { data: product, error } = await dataProvider.getMachineBySlug(params.slug)

  if (error || !product) {
    notFound()
  }

  // Get related products based on the same laser category
  const { data: relatedProducts } = await dataProvider.getMachines({
    limit: 4,
    category: product.laser_category,
  })

  const { data: reviews } = await dataProvider.getReviewsByMachineId(product.id)

  // Parse highlights and drawbacks from HTML strings
  const highlights = product.highlights ? extractListItems(product.highlights) : []
  const drawbacks = product.drawbacks ? extractListItems(product.drawbacks) : []

  // Format price with commas
  const formattedPrice = product.price ? `$${product.price.toLocaleString()}` : "N/A"

  // Extract YouTube video ID if present
  const youtubeVideoId = product.youtube_review ? extractYoutubeId(product.youtube_review) : null

  // Create breadcrumb items
  const breadcrumbItems = [
    { label: "Lasers", href: "/lasers" },
    { label: getCategoryLabel(product.laser_category), href: `/lasers/${product.laser_category}` },
    { label: product.machine_name, href: `/products/${product.slug}` },
  ]

  // Schema.org structured data for product
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.machine_name,
    image: product.image_url,
    description: product.excerpt_short,
    brand: {
      "@type": "Brand",
      name: product.company,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://machinesformakers.com/products/${product.slug}`,
    },
    ...(product.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        bestRating: "10",
        worstRating: "1",
        ratingCount: reviews?.length || 1,
      },
    }),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumb items={breadcrumbItems} />

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative">
            {product.award && (
              <Badge className="absolute top-4 right-4 bg-sky-500 hover:bg-sky-600">{product.award}</Badge>
            )}
            <div className="aspect-square relative bg-white rounded-lg p-4">
              <Image
                src={product.image_url || "/placeholder.svg?height=500&width=500"}
                alt={product.machine_name}
                fill
                priority
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          <div>
            <div className="mb-4">
              <Link
                href={`/brands/${product.company?.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm text-primary"
              >
                {product.company}
              </Link>
              <h1 className="text-3xl font-bold mt-1">{product.machine_name}</h1>
            </div>

            <div className="flex items-center mb-4">
              <div className="flex">
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <Star
                      key={index}
                      className={`h-5 w-5 ${
                        index < Math.floor(product.rating || 0)
                          ? "fill-primary text-primary"
                          : index < (product.rating || 0)
                            ? "fill-primary/50 text-primary"
                            : "text-muted-foreground"
                      }`}
                    />
                  ))}
              </div>
              <span className="ml-2 text-sm text-muted-foreground">{product.rating} rating</span>
            </div>

            {/* Quick summary for featured snippet optimization */}
            <div className="bg-muted/30 p-4 rounded-lg mb-6">
              <p className="text-lg">{product.excerpt_short}</p>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Laser Type:</span> {product.laser_type_a}
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Power:</span> {product.laser_power_a}W
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Work Area:</span> {product.work_area}
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Speed:</span> {product.speed}
                </div>
              </div>
            </div>

            <div className="text-3xl font-bold mb-6">{formattedPrice}</div>

            <div className="grid gap-4 mb-8">
              {product.affiliate_link && (
                <Button size="lg" className="w-full" asChild>
                  <Link href={product.affiliate_link} target="_blank" rel="noopener noreferrer">
                    <ShoppingCart className="mr-2 h-5 w-5" /> Buy Now
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="lg" className="w-full">
                <Heart className="mr-2 h-5 w-5" /> Add to Wishlist
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                Add to Compare
              </Button>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-2">Quick Verdict</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium mb-2 text-green-600">Pros</h4>
                  <ul className="space-y-1">
                    {highlights.map((pro, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="text-green-600 mr-2">✓</span> {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Cons</h4>
                  <ul className="space-y-1">
                    {drawbacks.map((con, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="text-red-600 mr-2">✗</span> {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Author info for E-A-T */}
        <AuthorInfo
          name="John Doe"
          role="Laser Cutting Expert"
          publishDate={product.published_at || product.created_at}
          updateDate={product.updated_at}
        />

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" id="specifications">
            Specifications
          </h2>
          <Tabs defaultValue="general">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="physical">Physical</TabsTrigger>
              <TabsTrigger value="software">Software</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <SpecItem label="Power" value={`${product.laser_power_a}W ${product.laser_type_a}`} />
                {product.laser_power_b && (
                  <SpecItem label="Secondary Laser" value={`${product.laser_power_b}W ${product.laser_type_b}`} />
                )}
                <SpecItem label="Work Area" value={product.work_area} />
                <SpecItem label="Machine Size" value={product.machine_size} />
                <SpecItem label="Software" value={product.software} />
                <SpecItem label="Focus Type" value={product.focus} />
                <SpecItem label="Camera" value={product.camera} />
                <SpecItem label="WiFi Connectivity" value={product.wifi} />
              </div>
            </TabsContent>
            <TabsContent value="performance" className="mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <SpecItem label="Speed" value={product.speed} />
                <SpecItem label="Acceleration" value={product.acceleration} />
                <SpecItem label="Laser Frequency" value={product.laser_frequency} />
                <SpecItem label="Pulse Width" value={product.pulse_width} />
                <SpecItem label="Laser Source" value={product.laser_source_manufacturer} />
              </div>
            </TabsContent>
            <TabsContent value="physical" className="mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <SpecItem label="Machine Size" value={product.machine_size} />
                <SpecItem label="Height" value={product.height} />
                <SpecItem label="Enclosure" value={product.enclosure} />
                <SpecItem label="Passthrough" value={product.passthrough} />
                <SpecItem label="Controller" value={product.controller} />
              </div>
            </TabsContent>
            <TabsContent value="software" className="mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <SpecItem label="Software" value={product.software} />
                <SpecItem label="WiFi" value={product.wifi} />
                <SpecItem label="Camera" value={product.camera} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {youtubeVideoId && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6" id="video-review">
              Video Review
            </h2>
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                title={`${product.machine_name} Video Review`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {product.description && (
          <div className="mb-12 prose prose-blue max-w-none">
            <h2 className="text-2xl font-bold mb-6 not-prose" id="in-depth-review">
              In-Depth Review
            </h2>
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        )}

        {/* Best for section - good for featured snippets */}
        {product.best_for && (
          <div className="mb-12 bg-muted/20 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Best For</h2>
            <p className="text-lg">{product.best_for}</p>
          </div>
        )}

        {/* FAQ Section for SEO */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" id="faq">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Is the {product.machine_name} good for beginners?</h3>
              <p>
                {product.laser_category?.includes("diode")
                  ? `Yes, the ${product.machine_name} is suitable for beginners. It offers a good balance of features and ease of use, with ${product.software} software that has a relatively gentle learning curve.`
                  : `The ${product.machine_name} is a ${product.laser_category?.includes("pro") ? "professional-grade" : "mid-level"} machine that may require some experience with laser cutters. However, with proper training and by following the manual, beginners can learn to use it effectively.`}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">What materials can the {product.machine_name} cut?</h3>
              <p>
                {product.laser_type_a === "CO2"
                  ? `The ${product.machine_name} can cut and engrave a wide range of materials including wood, acrylic, leather, paper, cardboard, and some plastics. It can also engrave on glass, stone, and anodized aluminum. It cannot cut metal or reflective materials.`
                  : product.laser_type_a === "Fiber"
                    ? `The ${product.machine_name} specializes in marking and engraving metals like stainless steel, aluminum, brass, and copper. It can also mark some plastics. It's not designed for cutting thick materials.`
                    : `The ${product.machine_name} can cut materials like thin wood (up to 10mm depending on power), acrylic, leather, paper, and cardboard. It can also engrave on harder materials like glass and anodized aluminum.`}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">How does the {product.machine_name} compare to similar models?</h3>
              <p>
                The {product.machine_name} offers{" "}
                {Number.parseInt(product.laser_power_a || "0") > 50 ? "high" : "moderate"} power at {formattedPrice},
                making it{" "}
                {Number.parseInt(product.price?.toString() || "0") < 2000 ? "more affordable" : "a premium option"} in
                its category. Compared to competitors, it stands out for its{" "}
                {product.award ? product.award.toLowerCase() : "balance of features and performance"}. Check our
                comparison table for a detailed analysis against similar models.
              </p>
            </div>
          </div>
        </div>

        {reviews && reviews.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6" id="customer-reviews">
              Customer Reviews
            </h2>
            <ProductReviews reviews={reviews} />
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" id="where-to-buy">
            Where to Buy
          </h2>
          {product.affiliate_link ? (
            <div className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">Official Store</div>
                <div className="text-xl font-bold">{formattedPrice}</div>
              </div>
              <Button asChild>
                <Link href={product.affiliate_link} target="_blank" rel="noopener noreferrer">
                  View Deal
                </Link>
              </Button>
            </div>
          ) : (
            <p>No purchase links available at this time.</p>
          )}
        </div>

        {/* Related products for internal linking */}
        {relatedProducts && relatedProducts.length > 0 && (
          <RelatedProducts products={relatedProducts} currentProductId={product.id} />
        )}
      </div>
    </>
  )
}

function SpecItem({ label, value }: { label: string; value: string | null }) {
  return value ? (
    <div className="p-4 bg-muted rounded-lg">
      <div className="font-medium">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  ) : null
}

// Helper function to extract list items from HTML string
function extractListItems(htmlString: string): string[] {
  const matches = htmlString.match(/<li[^>]*>(.*?)<\/li>/g)
  if (!matches) return []

  return matches.map((match) => {
    // Remove HTML tags and trim
    return match.replace(/<\/?[^>]+(>|$)/g, "").trim()
  })
}

// Helper function to extract YouTube video ID
function extractYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

// Helper function to get human-readable category label
function getCategoryLabel(category: string | null): string {
  if (!category) return "Products"

  const categoryMap: Record<string, string> = {
    "desktop-diode-laser": "Desktop Diode Lasers",
    "desktop-galvo": "Desktop Galvo Lasers",
    "pro-gantry": "Professional Gantry Lasers",
    "desktop-gantry": "Desktop Gantry Lasers",
    "open-diode": "Open Diode Lasers",
    portable: "Portable Lasers",
  }

  return (
    categoryMap[category] ||
    category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

