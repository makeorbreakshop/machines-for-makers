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
import { MobileSpecsSelector } from "@/components/product-v2/MobileSpecsSelector"
import ExpertReview from "@/components/expert-review"

// Import new V2 components
import { ProductHero } from "@/components/product-v2/ProductHero"
import { ProductTabs } from "@/components/product-v2/ProductTabs"
import { SpecificationsTable } from "@/components/product-v2/SpecificationsTable"
import { ProsConsSection } from "@/components/product-v2/ProsConsSection"
import { EnhancedRelatedProducts } from "@/components/product-v2/EnhancedRelatedProducts"
import { EnhancedExpertReview } from "@/components/product-v2/EnhancedExpertReview"

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

    // Define sections for the tabbed navigation
    const pageSections = [
      { id: "overview", label: "Overview" },
      { id: "specifications", label: "Specifications" },
      { id: "expert-review", label: "Expert Review" },
      { id: "alternatives", label: "Alternatives" },
      { id: "user-reviews", label: "User Reviews" },
    ];

    return (
      <>
        {/* Schema.org structured data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
        
        {/* Enhanced Hero Section */}
        <ProductHero 
          product={product} 
          images={images} 
          highlights={highlights}
        />
        
        {/* Tabbed Navigation */}
        <ProductTabs sections={pageSections} />

        <div className="container px-4 mx-auto max-w-7xl">
          {/* Overview Section */}
          <section id="overview" className="py-12">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Overview</h2>
              
              {/* First promo code highlight if available */}
              {promoCodes.length > 0 && promoCodes[0].isActive && (
                <div className="mb-8">
                  <ProductPromoHighlight promoCode={promoCodes[0]} />
                </div>
              )}
              
              {/* Description */}
              <div className="prose prose-lg max-w-none mb-10">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p>{product.excerpt_short}</p>
                )}
              </div>
              
              {/* Pros & Cons Section */}
              <div className="mb-10">
                <ProsConsSection 
                  highlights={highlights} 
                  drawbacks={drawbacks} 
                />
              </div>
              
              {/* YouTube Video */}
              {youtubeVideoId && (
                <div className="my-10">
                  <h3 className="text-2xl font-bold mb-4">Video Review</h3>
                  <div className="relative rounded-xl overflow-hidden aspect-video shadow-md">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      title={`${product.machine_name} Video Review`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
              
              {/* Add to compare button */}
              <div className="mt-8 flex justify-end">
                <AddToCompareButton product={product} />
              </div>
            </div>
          </section>
          
          {/* Specifications Section */}
          <section id="specifications" className="py-12 border-t">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Specifications</h2>
              <SpecificationsTable product={product} />
              
              {/* Mobile specs selector */}
              <div className="md:hidden mt-8">
                <MobileSpecsSelector product={product} />
              </div>
            </div>
          </section>
          
          {/* Expert Review Section */}
          <section id="expert-review" className="border-t">
            <EnhancedExpertReview 
              review={product.review}
              brandonsTake={product.brandons_take}
            />
          </section>
          
          {/* Alternatives Section */}
          <section id="alternatives" className="py-12 border-t">
            <div className="max-w-5xl mx-auto">
              <EnhancedRelatedProducts 
                products={relatedProducts}
                currentProductId={product.id}
              />
            </div>
            
            {/* Additional promo codes */}
            {promoCodes.length > 1 && (
              <div className="mt-8 max-w-5xl mx-auto">
                <h3 className="text-xl font-bold mb-4">Available Discounts</h3>
                <ProductPromoCodes promoCodes={promoCodes.filter(code => code.isActive)} />
              </div>
            )}
          </section>
          
          {/* User Reviews Section */}
          <section id="user-reviews" className="py-12 border-t">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">User Reviews</h2>
              <ProductReviews reviews={reviews} />
            </div>
          </section>
        </div>
      </>
    )
  } catch (error) {
    console.error("Error in product page:", error)
    notFound()
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

