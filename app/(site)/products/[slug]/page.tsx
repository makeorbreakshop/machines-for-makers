import { dataProvider } from "@/lib/data-provider"
import { notFound } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import ProductReviews from "@/components/product-reviews"
import RelatedProducts from "@/components/related-products"
import AddToCompareButton from "@/components/add-to-compare-button"
import RatingMeter from "@/components/rating-meter"
import { ProductPromoCodes } from "@/components/product-promo-codes"
import { ProductPromoHighlight } from "@/components/product-promo-highlight"
import { ProductPromoSimple } from "@/components/product-promo-simple"
import { PromoCode, PromoCodeDisplay } from "@/types/promo-codes"
import { createServerClient } from '@/lib/supabase/server'
import { MobileSpecsSelector } from "./components/mobile-specs-selector"
import ExpertReview from "@/components/expert-review"

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
      images: [
        {
          url: product.image_url || "",
          width: 800,
          height: 600,
          alt: `${product.machine_name} - ${product.laser_power_a}W ${product.laser_type_a} Laser Cutter`
        }
      ],
      publishedTime: product.published_at,
      modifiedTime: product.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: product.image_url || "",
          alt: `${product.machine_name} - ${product.laser_power_a}W ${product.laser_type_a} Laser Cutter`
        }
      ],
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

    // Schema.org structured data for product
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.machine_name,
      image: product.image_url,
      description: product.description ? stripHtmlTags(product.description).substring(0, 5000) : product.excerpt_short,
      brand: {
        "@type": "Brand",
        name: product.company,
      },
      sku: product.id,
      mpn: product.id,
      category: getCategoryLabel(product.category_id),
      offers: {
        "@type": "Offer",
        url: `https://machinesformakers.com/products/${slug}`,
        price: product.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition"
      },
      review: (product.review || product["Brandon's Take"]) ? {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: product.rating || "9",
          bestRating: "10"
        },
        author: {
          "@type": "Person",
          name: "Brandon (Machines for Makers Expert)"
        },
        datePublished: product.updated_at || new Date().toISOString().split('T')[0],
        reviewBody: product.review ? 
          stripHtmlTags(product.review).substring(0, 1000) : 
          (product["Brandon's Take"] ? stripHtmlTags(product["Brandon's Take"]).substring(0, 1000) : "")
      } : undefined,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating || "9",
        reviewCount: reviews?.length || 1,
        bestRating: "10"
      }
    };

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-8 md:space-y-12">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-12 mb-4 md:mb-8">
            <div className="relative">
              {product.award && (
                <Badge className="absolute top-4 right-4 bg-sky-500 hover:bg-sky-600">{product.award}</Badge>
              )}
              <div className="aspect-[4/3] md:aspect-square relative bg-white rounded-lg p-4 md:p-6 shadow-sm">
                <Image
                  src={product.image_url || "/placeholder.svg?height=500&width=500"}
                  alt={`${product.machine_name} - ${product.laser_power_a}W ${product.laser_type_a} Laser Cutter`}
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">
              <div>
                <div className="flex flex-col space-y-1 md:space-y-2">
                  <Link
                    href={`/brands/${product.company?.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-primary"
                  >
                    {product.company}
                  </Link>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{product.machine_name}</h1>
                    
                    {product.rating && (
                      <div className="flex items-center">
                        <RatingMeter 
                          rating={product.rating} 
                          size="md" 
                          showLabel={false}
                        />
                        <span className="sr-only">Rating: {product.rating} out of 10</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick summary for featured snippet optimization */}
              <div className="bg-muted/30 p-3 md:p-5 rounded-lg border border-muted/40">
                <p className="text-sm md:text-base">{product.excerpt_short}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4 text-xs md:text-sm" aria-label="Product specifications">
                  <div className="flex items-center">
                    <span className="font-medium mr-1 md:mr-2">Laser Type:</span> 
                    <span itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                      <meta itemProp="name" content="Laser Type" />
                      <span itemProp="value">{product.laser_type_a}</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-1 md:mr-2">Power:</span> 
                    <span itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                      <meta itemProp="name" content="Power" />
                      <span itemProp="value">{product.laser_power_a}W</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-1 md:mr-2">Work Area:</span> 
                    <span itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                      <meta itemProp="name" content="Work Area" />
                      <span itemProp="value">{product.work_area}</span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-1 md:mr-2">Speed:</span> 
                    <span itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                      <meta itemProp="name" content="Speed" />
                      <span itemProp="value">{product.speed}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="sticky top-0 z-10 bg-white/95 py-2 md:static md:bg-transparent md:py-0 space-y-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                    <meta itemProp="priceCurrency" content="USD" />
                    <meta itemProp="price" content={product.price?.toString() || ""} />
                    <link itemProp="availability" href="https://schema.org/InStock" />
                    {formattedPrice}
                  </div>
                  {promoCodes.length > 0 && promoCodes[0].discountText !== 'Special offer' && (
                    <ProductPromoSimple promoCode={promoCodes[0]} />
                  )}
                </div>

                <div className="flex flex-col space-y-3 md:space-y-4">
                  {product.affiliate_link && (
                    <Button size="lg" className="w-full py-6 text-base" asChild>
                      <Link 
                        href={product.affiliate_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`Buy ${product.machine_name} now`}
                      >
                        <ShoppingCart className="mr-3 h-5 w-5" /> Buy Now
                      </Link>
                    </Button>
                  )}
                  <AddToCompareButton product={product} />
                </div>
              </div>

              {/* Move the list of promo codes after the buy button */}
              {promoCodes.length > 1 && (
                <ProductPromoCodes promoCodes={promoCodes.slice(1)} className="mb-2 md:mb-4" />
              )}

              {/* Quick Verdict - Only show if pros or cons are available */}
              {(highlights.length > 0 || drawbacks.length > 0) && (
                <div className="border-t pt-4 md:pt-6">
                  <h3 className="font-semibold mb-3 text-base md:text-lg">Quick Verdict</h3>
                  <div className="flex flex-col space-y-4 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
                    {highlights.length > 0 && (
                      <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                        <h4 className="font-medium mb-2 text-green-600">Pros</h4>
                        <ul className="space-y-2">
                          {highlights.map((pro: string, index: number) => (
                            <li key={index} className="text-xs md:text-sm flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span> {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {drawbacks.length > 0 && (
                      <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                        <h4 className="font-medium mb-2 text-red-600">Cons</h4>
                        <ul className="space-y-2">
                          {drawbacks.map((con: string, index: number) => (
                            <li key={index} className="text-xs md:text-sm flex items-start">
                              <span className="text-red-600 mr-2 mt-0.5">✗</span> {con}
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

          <div className="space-y-4 md:space-y-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold hidden md:block" id="specifications">
                Specifications
              </h2>
            </div>
            
            {/* Mobile Specs Selector (Client Component) */}
            <MobileSpecsSelector product={product} formattedPrice={formattedPrice} />
            
            {/* Desktop Tabs (Only visible on MD and up) */}
            <div className="hidden md:block">
              <Tabs defaultValue="basic">
                <TabsList className="w-full overflow-x-auto flex-nowrap hide-scrollbar">
                  <TabsTrigger value="basic" className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap">Basic Information</TabsTrigger>
                  <TabsTrigger value="laser" className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap">Laser Specifications</TabsTrigger>
                  <TabsTrigger value="dimensions" className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap">Machine Dimensions</TabsTrigger>
                  <TabsTrigger value="performance" className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap">Performance</TabsTrigger>
                  <TabsTrigger value="features" className="px-4 py-2 md:px-6 md:py-3 whitespace-nowrap">Features</TabsTrigger>
                </TabsList>
                
                <div className="max-w-3xl mx-auto">
                  {/* Basic Information */}
                  <TabsContent value="basic" className="mt-4 md:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SpecItem label="Brand" value={product.company} propName="brand" />
                      <SpecItem label="Price" value={formattedPrice} propName="price" />
                      <SpecItem label="Expert Score" value={product.rating ? `${product.rating}/10` : null} propName="rating" />
                      <SpecItem label="Warranty" value={product.warranty} propName="warranty" />
                      <SpecItem label="Software" value={product.software} propName="software" />
                    </div>
                  </TabsContent>
                  
                  {/* Laser Specifications */}
                  <TabsContent value="laser" className="mt-4 md:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SpecItem label="Laser Type" value={product.laser_type_a} propName="laserType" />
                      <SpecItem label="Power (W)" value={product.laser_power_a ? `${product.laser_power_a}` : null} propName="power" />
                      <SpecItem label="Laser Source" value={product.laser_source_manufacturer} propName="laserSource" />
                      <SpecItem label="Frequency" value={product.laser_frequency} propName="frequency" />
                      <SpecItem label="Pulse Width" value={product.pulse_width} propName="pulseWidth" />
                      {product.laser_power_b && (
                        <SpecItem label="Secondary Laser" value={`${product.laser_power_b}W ${product.laser_type_b}`} propName="secondaryLaser" />
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Machine Dimensions */}
                  <TabsContent value="dimensions" className="mt-4 md:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SpecItem label="Work Area (mm)" value={product.work_area} propName="workArea" />
                      <SpecItem label="Machine Size (mm)" value={product.machine_size} propName="machineSize" />
                      <SpecItem label="Height (mm)" value={product.height} propName="height" />
                    </div>
                  </TabsContent>
                  
                  {/* Performance */}
                  <TabsContent value="performance" className="mt-4 md:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SpecItem label="Speed (mm/s)" value={product.speed} propName="speed" />
                      <SpecItem label="Acceleration" value={product.acceleration} propName="acceleration" />
                    </div>
                  </TabsContent>
                  
                  {/* Features */}
                  <TabsContent value="features" className="mt-4 md:mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <SpecItem label="Focus" value={product.focus} propName="focus" />
                      <SpecItem label="Enclosure" value={product.enclosure} propName="enclosure" />
                      <SpecItem label="WiFi" value={product.wifi} propName="wifi" />
                      <SpecItem label="Camera" value={product.camera} propName="camera" />
                      <SpecItem label="Passthrough" value={product.passthrough} propName="passthrough" />
                      <SpecItem label="Controller" value={product.controller} propName="controller" />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Only show Video Review section if youtubeVideoId is available */}
          {youtubeVideoId && (
            <div className="space-y-4 md:space-y-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" id="video-review">
                  Video Review
                </h2>
              </div>
              <div className="max-w-3xl mx-auto aspect-video w-full rounded-lg overflow-hidden shadow-md">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title={`${product.machine_name} Video Review`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          )}

          {/* Only show In-Depth Review if description is available */}
          {product.description && (
            <section className="space-y-4 md:space-y-6" itemProp="description">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold not-prose" id="in-depth-review">
                  In-Depth Review
                </h2>
              </div>
              <div className="max-w-3xl mx-auto prose prose-sm md:prose-base lg:prose-lg prose-blue max-w-none
                  prose-headings:font-bold 
                  prose-headings:text-foreground
                  prose-headings:mb-6
                  prose-headings:mt-8
                  prose-h2:text-2xl 
                  prose-h2:md:text-3xl
                  prose-h2:leading-tight
                  prose-h3:text-xl 
                  prose-h3:md:text-2xl
                  prose-h3:leading-tight
                  prose-h4:text-lg
                  prose-h4:md:text-xl
                  prose-h4:leading-tight" 
                dangerouslySetInnerHTML={{ __html: product.description }} 
              />
            </section>
          )}

          {/* Expert Review - show if Review or Brandon's Take is available */}
          <ExpertReview 
            review={product["Review"]} 
            brandonsTake={product["Brandon's Take"]} 
          />

          {/* Best for section - only show if data is available */}
          {product.best_for && (
            <div className="space-y-4 md:space-y-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">Best For</h2>
              </div>
              <div className="max-w-3xl mx-auto bg-muted/20 p-6 md:p-8 rounded-lg border border-muted/30">
                <p className="text-base md:text-lg">{product.best_for}</p>
              </div>
            </div>
          )}

          {/* Customer Reviews - only show if there are reviews available */}
          {reviews && reviews.length > 0 && (
            <section className="space-y-4 md:space-y-6" itemProp="review" itemScope itemType="https://schema.org/Review">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" id="customer-reviews">
                  Customer Reviews
                </h2>
              </div>
              <div className="max-w-3xl mx-auto">
                <ProductReviews reviews={reviews} />
              </div>
            </section>
          )}

          {/* Where to Buy - only show if affiliate link is available */}
          {product.affiliate_link && (
            <div className="space-y-4 md:space-y-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" id="where-to-buy">
                  Where to Buy
                </h2>
              </div>
              <div className="max-w-3xl mx-auto border rounded-lg p-4 md:p-6 flex flex-col md:flex-row md:justify-between md:items-center space-y-3 md:space-y-0 md:space-x-6">
                <div>
                  <div className="font-medium text-base md:text-lg">Official Store</div>
                  <div className="text-xl md:text-2xl font-bold">{formattedPrice}</div>
                </div>
                <Button size="lg" className="px-8" asChild>
                  <Link 
                    href={product.affiliate_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={`Buy ${product.machine_name} from official store`}
                  >
                    View Deal
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Related products - only show if there are related products available */}
          {relatedProducts && relatedProducts.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2 md:mb-4 text-center md:text-left" id="related-products">Related Products</h2>
              <RelatedProducts 
                products={relatedProducts} 
                currentProductId={product.id}
                showHeading={false}
              />
            </div>
          )}
        </div>
      </>
    )
  } catch (error) {
    console.error("Error in ProductPage:", error);
    notFound();
  }
}

function SpecItem({ 
  label, 
  value, 
  propName
}: { 
  label: string; 
  value: string | null; 
  propName?: string;
}) {
  return value ? (
    <div className="p-2 md:p-3 bg-muted rounded-lg" itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
      <meta itemProp="name" content={label} />
      <meta itemProp="value" content={value} />
      <div className="font-medium text-sm md:text-base">{label}</div>
      <div className="text-base md:text-lg">{value}</div>
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

// Helper function to strip HTML tags for use in schema description
function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
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

