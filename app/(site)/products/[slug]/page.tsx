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
import { getProductPromoCodes } from "@/lib/promo-service"

// Import V2 components
import { ProductHero } from "@/components/product-v2/ProductHero"
import { ProductTabs } from "@/components/product-v2/ProductTabs"
import { SpecificationsTable } from "@/components/product-v2/SpecificationsTable"
import { SpecificationsTab } from "@/components/product-v2/SpecificationsTab"
import { ProsConsSection } from "@/components/product-v2/ProsConsSection"
import { EnhancedRelatedProducts } from "@/components/product-v2/EnhancedRelatedProducts"
import { EnhancedExpertReview } from "@/components/product-v2/EnhancedExpertReview"
import { AtAGlance } from "@/components/product-v2/AtAGlance"

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

  // More SEO-optimized title format with year and type
  const currentYear = new Date().getFullYear();
  const title = `${product.machine_name} Review: ${product.laser_power_a}W ${product.laser_type_a} Laser Cutter & Engraver (${currentYear})`

  // More detailed meta description with keywords
  const description = product.excerpt_short 
    ? `${product.excerpt_short.trim()}. Read our expert review, specifications, and buyer's guide.`
    : `Comprehensive review of the ${product.machine_name} ${product.laser_type_a} laser cutter. Learn about specs, performance, pros and cons, and if it's right for your needs. Expert buying advice for ${currentYear}.`;

  // Category info for breadcrumbs
  const categoryLabel = getCategoryLabel(product.category_id);
  
  return {
    title,
    description,
    keywords: [
      product.machine_name,
      `${product.laser_type_a} laser`,
      `${product.laser_power_a}W laser cutter`,
      "laser engraver",
      "laser cutting machine",
      "laser engraving",
      product.company,
      "laser cutter review",
      `${currentYear} laser cutter`,
    ].filter(Boolean),
    alternates: {
      canonical: `https://machinesformakers.com/products/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://machinesformakers.com/products/${slug}`,
      images: [
        {
          url: product.image_url || "",
          width: 1200,
          height: 630,
          alt: `${product.machine_name} - ${product.laser_power_a}W ${product.laser_type_a} Laser Cutter`
        }
      ],
      publishedTime: product.published_at,
      modifiedTime: product.updated_at,
      siteName: "Machines for Makers",
      locale: "en_US",
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
      site: "@machinesmakers",
      creator: "@machinesmakers",
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
      has_review: !!product.review,
      review_length: product.review ? product.review.length : 0,
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

    // Get promo codes using our new service
    let promoCodes: PromoCodeDisplay[] = [];
    try {
      promoCodes = await getProductPromoCodes(product);
      console.log(`Retrieved ${promoCodes.length} promo codes, ${promoCodes.filter(c => c.isActive).length} active`);
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

    // Get the first active promo code for prominent display
    const firstPromoCode = promoCodes.find(code => code.isActive) || null;
    console.log('First promo code for prominent display:', firstPromoCode);

    // Define sections for the tabbed navigation - filtered by available content
    const pageSections = [
      ...(youtubeVideoId ? [{ id: "video-review", label: "Video Review" }] : []),
      { id: "specifications", label: "Technical Specs" },
      ...(product.review ? [{ id: "expert-review", label: "Expert Review" }] : []),
      { id: "alternatives", label: "Alternatives" },
    ];

    // Create product schema with proper typing
    const productSchema: {
      "@context": string;
      "@type": string;
      name: string;
      image: string[];
      description: string;
      brand: { "@type": string; name: string };
      sku: string;
      mpn: string;
      category: string;
      offers: {
        "@type": string;
        url: string;
        price: number;
        priceCurrency: string;
        availability: string;
        itemCondition: string;
      };
      review?: {
        "@type": string;
        reviewRating: {
          "@type": string;
          ratingValue: string;
          bestRating: string;
        };
        author: {
          "@type": string;
          name: string;
        };
      };
      aggregateRating?: {
        "@type": string;
        ratingValue: string;
        reviewCount: string;
      };
      video?: {
        "@type": string;
        name: string;
        description: string;
        thumbnailUrl: string;
        uploadDate: string;
        contentUrl: string;
        embedUrl: string;
      };
    } = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.machine_name,
      image: images.map(img => img.url),
      description: product.description || product.excerpt_short || "",
      brand: {
        "@type": "Brand",
        name: product.company || ""
      },
      sku: product.id,
      mpn: product.id,
      category: "Laser Cutter",
      offers: {
        "@type": "Offer",
        url: `https://machinesformakers.com/products/${product.slug}`,
        price: product.price || 0,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition"
      }
    };

    // Add review to schema if available
    if (product.review) {
      productSchema.review = {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: product.rating?.toString() || "5",
          bestRating: "5"
        },
        author: {
          "@type": "Person",
          name: "Brandon"
        }
      };
    }

    // Add aggregate rating if available
    if (product.rating) {
      productSchema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: product.rating.toString(),
        reviewCount: "1"
      };
    }

    // Update Schema.org structured data to include video if present
    if (youtubeVideoId) {
      productSchema.video = {
        "@type": "VideoObject",
        name: `${product.machine_name} Video Review`,
        description: `Detailed video review of the ${product.machine_name}`,
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
        uploadDate: product.updated_at || new Date().toISOString().split('T')[0],
        contentUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
        embedUrl: `https://www.youtube.com/embed/${youtubeVideoId}`
      };
    }

    return (
      <>
        {/* Schema.org structured data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
        
        {/* Enhanced Hero Section */}
        <div className="mt-[-20px]">
          <ProductHero 
            product={product} 
            images={images} 
            highlights={highlights}
            promoCode={firstPromoCode}
          />
        </div>
        
        {/* Tab navigation */}
        <ProductTabs 
          sections={pageSections}
          showAtAGlance={highlights.length > 0 || drawbacks.length > 0 || (product["Brandon's Take"] && product["Brandon's Take"].trim() !== '')}
        />
        
        {/* Main content container */}
        <div className="container px-4 mx-auto max-w-5xl">
          {/* Video Review section */}
          {youtubeVideoId && (
            <section id="video-review" className="py-8">
              {/* At A Glance section with key specs and verdict */}
              {(highlights.length > 0 || drawbacks.length > 0 || (product["Brandon's Take"] && product["Brandon's Take"].trim() !== '')) && (
                <AtAGlance 
                  highlights={highlights} 
                  drawbacks={drawbacks} 
                  verdict={product["Brandon's Take"]}
                  product={product}
                />
              )}
              
              <div className="max-w-5xl mx-auto mt-8">              
                {/* First promo code highlight if available */}
                {firstPromoCode && (
                  <div className="mb-8">
                    <ProductPromoHighlight promoCode={firstPromoCode} />
                  </div>
                )}
                
                {/* Video Review heading */}
                <h2 className="text-3xl font-bold mb-6">Video Review</h2>
                
                {/* YouTube Video */}
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
            </section>
          )}
            
          {/* Specifications section */}
          <section id="specifications" className="py-8 border-t">
            <SpecificationsTab product={product} />
          </section>
          
          {/* Expert Review Section */}
          {product.review && (
            <section id="expert-review" className="py-8 border-t">
              <h2 className="text-3xl font-bold mb-6">Expert Review</h2>
              <EnhancedExpertReview 
                review={product.review}
                brandonsTake={product["Brandon's Take"]}
                className="px-0 py-0 max-w-none"
              />
            </section>
          )}
          
          {/* Alternatives Section */}
          <section id="alternatives" className="py-8 border-t">
            <h2 className="text-3xl font-bold mb-6">Alternative Options</h2>
            <EnhancedRelatedProducts 
              products={relatedProducts} 
              currentProductId={product.id}
            />
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

