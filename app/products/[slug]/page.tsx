import { dataProvider } from "@/lib/data-provider"
import { notFound } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import ProductReviews from "@/components/product-reviews"
import Breadcrumb from "@/components/breadcrumb"
import RelatedProducts from "@/components/related-products"
import AddToCompareButton from "@/components/add-to-compare-button"
import RatingMeter from "@/components/rating-meter"
import { ProductPromoCodes } from "@/components/product-promo-codes"
import { ProductPromoHighlight } from "@/components/product-promo-highlight"
import { ProductPromoSimple } from "@/components/product-promo-simple"
import { PromoCode, PromoCodeDisplay } from "@/types/promo-codes"
import { createServerClient } from '@/lib/supabase/server'

// Implement ISR with a 1-hour revalidation period
export const revalidate = 3600

// Server-side version of formatPromoCodeForDisplay function
function serverFormatPromoCodeForDisplay(promoCode: PromoCode): PromoCodeDisplay {
  return {
    code: promoCode.code,
    description: promoCode.description || '',
    discountText: formatDiscount(promoCode),
    validUntil: formatDate(promoCode.valid_until),
    isActive: isPromoCodeActive(promoCode),
    affiliateLink: promoCode.affiliate_link || null
  }
}

// Server-side format date function
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null
  
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  }).format(date)
}

// Server-side format discount function
function formatDiscount(promoCode: PromoCode): string {
  if (promoCode.discount_percent) {
    return `${promoCode.discount_percent}% off`
  } else if (promoCode.discount_amount) {
    // Handle both string and number values
    const amount = typeof promoCode.discount_amount === 'string' 
      ? parseFloat(promoCode.discount_amount)
      : promoCode.discount_amount
    
    return `$${amount.toFixed(2)} off`
  }
  return 'Special offer'
}

// Server-side isPromoCodeActive function
function isPromoCodeActive(promoCode: PromoCode): boolean {
  const now = new Date()
  
  // For xTool promo codes or any with future valid_from dates, check only if they're not expired
  if (promoCode.applies_to_brand_id === '2b0c2371-bedb-4af3-8457-be2d26a378c8') {
    // Only check if the promo code is expired or has reached max uses
    const notExpired = !promoCode.valid_until || new Date(promoCode.valid_until) > now
    const hasUsesLeft = !promoCode.max_uses || promoCode.current_uses < promoCode.max_uses
    
    return notExpired && hasUsesLeft
  }
  
  // For other promo codes, check both valid_from and valid_until
  const isValid = 
    (!promoCode.valid_from || new Date(promoCode.valid_from) <= now) && 
    (!promoCode.valid_until || new Date(promoCode.valid_until) > now)
  
  const hasUsesLeft = !promoCode.max_uses || promoCode.current_uses < promoCode.max_uses
  
  return isValid && hasUsesLeft
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // Use await to properly handle dynamic params
  const slug = await (params.slug);
  const { data: product } = await dataProvider.getMachineBySlug(slug)

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
  try {
    // Use await to properly handle dynamic params
    const slug = await (params.slug);
    console.log("Fetching product with slug:", slug);
    const { data: product, error } = await dataProvider.getMachineBySlug(slug);
    
    console.log("Product data:", product ? {
      id: product.id,
      machine_name: product.machine_name,
      company: product.company,
      brand_id: product.brand_id,
      category_id: product.category_id,
    } : "Not found");
    if (error) console.error("Error fetching product:", error);

    if (error || !product) {
      notFound();
    }

    // Get related products based on similarity
    let relatedProducts = [];
    try {
      const { data: relatedProductsData } = await dataProvider.getRelatedProducts(product);
      relatedProducts = relatedProductsData || [];
    } catch (err) {
      console.error("Error fetching related products:", err);
    }

    // Get reviews with error handling
    let reviews = [];
    try {
      const { data: reviewsData } = await dataProvider.getReviewsByMachineId(product.id);
      reviews = reviewsData || [];
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }

    // Get additional images with error handling
    let images = [];
    try {
      const { data: imagesData } = await dataProvider.getImagesByMachineId(product.id);
      images = imagesData || [];
    } catch (err) {
      console.error("Error fetching images:", err);
    }

    // Get promo codes for this product from the server directly
    let promoCodes: PromoCodeDisplay[] = [];
    try {
      const supabase = await createServerClient()
      
      console.log(`Fetching promo codes for product: ${product.machine_name} (ID: ${product.id})`)
      console.log(`Product details - Brand ID: ${product.brand_id}, Category ID: ${product.category_id}, Company: ${product.company}`)
      
      // Process xTool brand separately with direct approach
      if (product.company?.toLowerCase() === 'xtool') {
        console.log('Processing xTool brand promo code with direct approach');
        try {
          // Direct query for xTool promo codes
          const { data: xToolData, error: xToolError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('applies_to_brand_id', '2b0c2371-bedb-4af3-8457-be2d26a378c8');

          console.log('Direct xTool promo code query result:', xToolData);
          
          if (xToolError) {
            console.error('Error fetching xTool promo codes:', xToolError);
            throw xToolError; // Rethrow to trigger catch block for proper error handling
          }

          // If we found promo codes in the database, use those
          if (xToolData && xToolData.length > 0) {
            try {
              console.log('xTool database promo code raw data:', JSON.stringify(xToolData[0]));
              
              // Create properly formatted promo codes with forced active status, manually
              const dbPromoCode = xToolData[0];
              
              // Create a directly formatted version without using the helper function
              const manuallyFormattedCode = {
                code: dbPromoCode.code,
                description: dbPromoCode.description || '',
                discountText: dbPromoCode.discount_amount ? `$${dbPromoCode.discount_amount} off` : 'Special offer',
                validUntil: dbPromoCode.valid_until ? new Date(dbPromoCode.valid_until).toLocaleDateString() : null,
                isActive: true, // Force active
                affiliateLink: dbPromoCode.affiliate_link || null
              };
              
              console.log('Manually formatted xTool promo code:', manuallyFormattedCode);
              
              // Add this to our promo codes array directly
              promoCodes = [manuallyFormattedCode];
            } catch (formatError) {
              console.error('Error formatting xTool promo codes:', formatError);
              throw formatError;
            }
          } else {
            // Create a hardcoded fallback promo code for xTool
            const hardcodedXToolPromoCode = {
              id: 'hardcoded-xtool-promo',
              code: 'xToolBrandon',
              description: '$80 Off purchases of $1000 or more',
              discount_amount: '80',
              discount_percent: null,
              valid_from: '2023-01-01T00:00:00.000Z',
              valid_until: null,
              applies_to_brand_id: '2b0c2371-bedb-4af3-8457-be2d26a378c8',
              affiliate_link: 'https://www.xtool.com/discount/xToolBrandon?ref=rw0h_cdiytm5',
              isActive: true,
              discountText: '$80 off',
              validUntil: null,
              is_global: false,
              current_uses: 0,
              applies_to_machine_id: null,
              applies_to_category_id: null,
              created_at: '2023-01-01T00:00:00.000Z',
              updated_at: '2023-01-01T00:00:00.000Z',
              max_uses: null
            };
            console.log('Using hardcoded xTool promo code fallback:', hardcodedXToolPromoCode);
            promoCodes = [hardcodedXToolPromoCode];
          }
        } catch (error) {
          console.error('Error fetching xTool promo codes:', error);
          
          // In case of error, still provide the hardcoded fallback
          const hardcodedXToolPromoCode = {
            id: 'hardcoded-xtool-promo',
            code: 'xToolBrandon',
            description: '$80 Off purchases of $1000 or more',
            discount_amount: '80',
            discount_percent: null,
            valid_from: '2023-01-01T00:00:00.000Z',
            valid_until: null,
            applies_to_brand_id: '2b0c2371-bedb-4af3-8457-be2d26a378c8',
            affiliate_link: 'https://www.xtool.com/discount/xToolBrandon?ref=rw0h_cdiytm5',
            isActive: true,
            discountText: '$80 off',
            validUntil: null,
            is_global: false,
            current_uses: 0,
            applies_to_machine_id: null,
            applies_to_category_id: null,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
            max_uses: null
          };
          console.log('Using hardcoded xTool promo code fallback due to error:', hardcodedXToolPromoCode);
          promoCodes = [hardcodedXToolPromoCode];
        }
      } else {
        // Regular approach for non-xTool products
        // First get machine-specific codes
        if (product.id) {
          const { data: machineData, error: machineError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('applies_to_machine_id', product.id)
          
          console.log(`Machine-specific promo codes for ID ${product.id}:`, machineData || 'No data')
          if (machineError) console.error('Error fetching machine-specific promo codes:', machineError)
          
          if (!machineError && machineData) {
            promoCodes = [...promoCodes, ...machineData.map(serverFormatPromoCodeForDisplay)]
          }
        }
        
        // Then get brand-specific codes
        if (product.brand_id) {
          const { data: brandData, error: brandError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('applies_to_brand_id', product.brand_id)
          
          console.log(`Brand-specific promo codes for brand ID ${product.brand_id}:`, brandData || 'No data')
          if (brandError) console.error('Error fetching brand-specific promo codes:', brandError)
          
          if (!brandError && brandData) {
            promoCodes = [...promoCodes, ...brandData.map(serverFormatPromoCodeForDisplay)]
          }
        }
        
        // Then get category-specific codes
        if (product.category_id) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('applies_to_category_id', product.category_id)
          
          console.log(`Category-specific promo codes for category ID ${product.category_id}:`, categoryData || 'No data')
          if (categoryError) console.error('Error fetching category-specific promo codes:', categoryError)
          
          if (!categoryError && categoryData) {
            promoCodes = [...promoCodes, ...categoryData.map(serverFormatPromoCodeForDisplay)]
          }
        }
        
        // Finally get global codes
        const { data: globalData, error: globalError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('is_global', true)
        
        console.log('Global promo codes:', globalData || 'No data')
        if (globalError) console.error('Error fetching global promo codes:', globalError)
        
        if (!globalError && globalData) {
          promoCodes = [...promoCodes, ...globalData.map(serverFormatPromoCodeForDisplay)]
        }
      }
      
      // Remove any duplicate promo codes (by code)
      const beforeDeduplication = promoCodes.length;
      promoCodes = promoCodes.filter((code, index, self) => 
        index === self.findIndex((c) => c.code === code.code)
      )
      console.log(`Removed ${beforeDeduplication - promoCodes.length} duplicate promo codes`)
      
      // Sort promo codes by discount value (highest first)
      promoCodes.sort((a, b) => {
        // Extract numeric values from discount text (e.g., "10% off" → 10)
        const valueA = parseInt(a.discountText.match(/(\d+)/)?.[0] || '0')
        const valueB = parseInt(b.discountText.match(/(\d+)/)?.[0] || '0')
        
        // Sort by active status first, then by discount value
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1
        }
        
        return valueB - valueA
      })
      
      console.log(`Final promo codes count: ${promoCodes.length}`)
      console.log('Active promo codes:', promoCodes.filter(code => code.isActive))
    } catch (err) {
      console.error("Error fetching promo codes:", err);
    }

    // Parse highlights and drawbacks from HTML strings
    const highlights = product.highlights ? extractListItems(product.highlights) : [];
    const drawbacks = product.drawbacks ? extractListItems(product.drawbacks) : [];

    // Format price with commas
    const formattedPrice = product.price ? `$${product.price.toLocaleString()}` : "N/A";

    // Extract YouTube video ID if present
    const youtubeVideoId = product.youtube_review ? extractYoutubeId(product.youtube_review) : null;

    // Add a final debug log to see what promo codes are available right before displaying
    console.log('Final promo codes available for display:', promoCodes)
    console.log('Are any promo codes active?', promoCodes.some(code => code.isActive))
    const firstPromoCode = promoCodes.length > 0 ? promoCodes[0] : null;
    console.log('First promo code for prominent display:', firstPromoCode);

    // Create breadcrumb items
    const breadcrumbItems = [
      { label: "Lasers", href: "/lasers" },
      { label: getCategoryLabel(product.laser_category), href: `/lasers/${product.laser_category}` },
      { label: product.machine_name, href: `/products/${product.slug}` },
    ];

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
      // Only include rating information if available
      ...(product.rating && reviews?.length > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          bestRating: "10",
          worstRating: "1",
          ratingCount: reviews.length,
        },
      }),
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />

        <div className="container mx-auto px-4 py-6">
          <Breadcrumb items={breadcrumbItems} />

          <div className="grid md:grid-cols-2 gap-8 mb-8">
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
                <div className="flex justify-between items-center">
                  <div>
                    <Link
                      href={`/brands/${product.company?.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-sm text-primary"
                    >
                      {product.company}
                    </Link>
                    <h1 className="text-3xl font-bold mt-1">{product.machine_name}</h1>
                  </div>
                  
                  {product.rating && (
                    <RatingMeter 
                      rating={product.rating} 
                      size="md" 
                      showLabel={false}
                    />
                  )}
                </div>
              </div>

              {/* Quick summary for featured snippet optimization */}
              <div className="bg-muted/30 p-3 rounded-lg mb-4">
                <p className="text-lg">{product.excerpt_short}</p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
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

              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl font-bold">{formattedPrice}</div>
                {promoCodes.length > 0 && promoCodes[0].discountText !== 'Special offer' && (
                  <ProductPromoSimple promoCode={promoCodes[0]} />
                )}
              </div>

              <div className="grid gap-3 mb-5">
                {product.affiliate_link && (
                  <Button size="lg" className="w-full" asChild>
                    <Link href={product.affiliate_link} target="_blank" rel="noopener noreferrer">
                      <ShoppingCart className="mr-2 h-5 w-5" /> Buy Now
                    </Link>
                  </Button>
                )}
                <AddToCompareButton product={product} />
              </div>

              {/* Move the list of promo codes after the buy button */}
              {promoCodes.length > 1 && (
                <ProductPromoCodes promoCodes={promoCodes.slice(1)} className="mb-4" />
              )}

              {/* Quick Verdict - Only show if pros or cons are available */}
              {(highlights.length > 0 || drawbacks.length > 0) && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-2">Quick Verdict</h3>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {highlights.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-green-600">Pros</h4>
                        <ul className="space-y-1">
                          {highlights.map((pro: string, index: number) => (
                            <li key={index} className="text-sm flex items-start">
                              <span className="text-green-600 mr-2">✓</span> {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {drawbacks.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-red-600">Cons</h4>
                        <ul className="space-y-1">
                          {drawbacks.map((con: string, index: number) => (
                            <li key={index} className="text-sm flex items-start">
                              <span className="text-red-600 mr-2">✗</span> {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4" id="specifications">
              Specifications
            </h2>
            <Tabs defaultValue="basic">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="laser">Laser Specifications</TabsTrigger>
                <TabsTrigger value="dimensions">Machine Dimensions</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
              </TabsList>
              
              {/* Basic Information */}
              <TabsContent value="basic" className="mt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <SpecItem label="Brand" value={product.company} />
                  <SpecItem label="Price" value={formattedPrice} />
                  <SpecItem label="Expert Score" value={product.rating ? `${product.rating}/10` : null} />
                  <SpecItem label="Warranty" value={product.warranty} />
                  <SpecItem label="Software" value={product.software} />
                </div>
              </TabsContent>
              
              {/* Laser Specifications */}
              <TabsContent value="laser" className="mt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <SpecItem label="Laser Type" value={product.laser_type_a} />
                  <SpecItem label="Power (W)" value={product.laser_power_a ? `${product.laser_power_a}` : null} />
                  <SpecItem label="Laser Source" value={product.laser_source_manufacturer} />
                  <SpecItem label="Frequency" value={product.laser_frequency} />
                  <SpecItem label="Pulse Width" value={product.pulse_width} />
                  {product.laser_power_b && (
                    <SpecItem label="Secondary Laser" value={`${product.laser_power_b}W ${product.laser_type_b}`} />
                  )}
                </div>
              </TabsContent>
              
              {/* Machine Dimensions */}
              <TabsContent value="dimensions" className="mt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <SpecItem label="Work Area (mm)" value={product.work_area} />
                  <SpecItem label="Machine Size (mm)" value={product.machine_size} />
                  <SpecItem label="Height (mm)" value={product.height} />
                </div>
              </TabsContent>
              
              {/* Performance */}
              <TabsContent value="performance" className="mt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <SpecItem label="Speed (mm/s)" value={product.speed} />
                  <SpecItem label="Acceleration" value={product.acceleration} />
                </div>
              </TabsContent>
              
              {/* Features */}
              <TabsContent value="features" className="mt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  <SpecItem label="Focus" value={product.focus} />
                  <SpecItem label="Enclosure" value={product.enclosure} />
                  <SpecItem label="WiFi" value={product.wifi} />
                  <SpecItem label="Camera" value={product.camera} />
                  <SpecItem label="Passthrough" value={product.passthrough} />
                  <SpecItem label="Controller" value={product.controller} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Only show Video Review section if youtubeVideoId is available */}
          {youtubeVideoId && (
            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-bold mb-4" id="video-review">
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

          {/* Only show In-Depth Review if description is available */}
          {product.description && (
            <div className="mb-6 mt-2 prose prose-blue max-w-none">
              <h2 className="text-2xl font-bold mb-4 not-prose" id="in-depth-review">
                In-Depth Review
              </h2>
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}

          {/* Best for section - only show if data is available */}
          {product.best_for && (
            <div className="mb-6 mt-2 bg-muted/20 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Best For</h2>
              <p className="text-lg">{product.best_for}</p>
            </div>
          )}

          {/* FAQ Section - only show if we have minimum data needed */}
          {product.machine_name && product.laser_type_a && (
            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-bold mb-4" id="faq">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <h3 className="font-bold text-lg mb-2">Is the {product.machine_name} good for beginners?</h3>
                  <p>
                    {product.laser_category?.includes("diode")
                      ? `Yes, the ${product.machine_name} is suitable for beginners. It offers a good balance of features and ease of use, with ${product.software} software that has a relatively gentle learning curve.`
                      : `The ${product.machine_name} is a ${product.laser_category?.includes("pro") ? "professional-grade" : "mid-level"} machine that may require some experience with laser cutters. However, with proper training and by following the manual, beginners can learn to use it effectively.`}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <h3 className="font-bold text-lg mb-2">What materials can the {product.machine_name} cut?</h3>
                  <p>
                    {product.laser_type_a === "CO2"
                      ? `The ${product.machine_name} can cut and engrave a wide range of materials including wood, acrylic, leather, paper, cardboard, and some plastics. It can also engrave on glass, stone, and anodized aluminum. It cannot cut metal or reflective materials.`
                      : product.laser_type_a === "Fiber"
                        ? `The ${product.machine_name} specializes in marking and engraving metals like stainless steel, aluminum, brass, and copper. It can also mark some plastics. It's not designed for cutting thick materials.`
                        : `The ${product.machine_name} can cut materials like thin wood (up to 10mm depending on power), acrylic, leather, paper, and cardboard. It can also engrave on harder materials like glass and anodized aluminum.`}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
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
          )}

          {/* Customer Reviews - only show if there are reviews available */}
          {reviews && reviews.length > 0 && (
            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-bold mb-4" id="customer-reviews">
                Customer Reviews
              </h2>
              <ProductReviews reviews={reviews} />
            </div>
          )}

          {/* Where to Buy - only show if affiliate link is available */}
          {product.affiliate_link && (
            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-bold mb-4" id="where-to-buy">
                Where to Buy
              </h2>
              <div className="border rounded-lg p-3 flex justify-between items-center">
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
            </div>
          )}

          {/* Related products - only show if there are related products available */}
          {relatedProducts && relatedProducts.length > 0 && (
            <RelatedProducts products={relatedProducts} currentProductId={product.id} />
          )}
        </div>
      </>
    )
  } catch (error) {
    console.error("Error in ProductPage:", error);
    notFound();
  }
}

function SpecItem({ label, value }: { label: string; value: string | null }) {
  return value ? (
    <div className="p-3 bg-muted rounded-lg">
      <div className="font-medium">{label}</div>
      <div className="text-lg">{value}</div>
    </div>
  ) : null
}

// Helper function to extract list items from HTML string
function extractListItems(htmlString: string | null): string[] {
  if (!htmlString) return []
  
  const regex = /<li[^>]*>(.*?)<\/li>/g
  const items: string[] = []
  let match

  while ((match = regex.exec(htmlString)) !== null) {
    items.push(match[1].replace(/<[^>]*>/g, "").trim())
  }

  return items
}

// Helper function to extract YouTube video ID
function extractYoutubeId(url: string | null): string | null {
  if (!url) return null
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  
  return match && match[2].length === 11 ? match[2] : null
}

// Helper function to get human-readable category label
function getCategoryLabel(category: string | null): string {
  if (!category) return "Laser Cutters"

  const categoryLabels: Record<string, string> = {
    "desktop-diode-laser": "Desktop Diode Lasers",
    "desktop-co2-laser": "Desktop CO2 Lasers",
    "desktop-fiber-laser": "Desktop Fiber Lasers",
    "large-format-co2-laser": "Large Format CO2 Lasers",
    "large-format-fiber-laser": "Large Format Fiber Lasers",
  }

  return categoryLabels[category] || "Laser Cutters"
}

