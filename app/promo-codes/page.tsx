import { Metadata } from "next"
import { createServerClient } from "@/lib/supabase/server"
import { PromoCode, PromoCodeDisplay } from "@/types/promo-codes"
import { Copy, ExternalLink, Tag, Percent, DollarSign, Globe, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { PromoCodeBadge } from "@/components/promo-code-badge"

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
    return `$${promoCode.discount_amount.toFixed(2)} off`
  }
  return 'Special offer'
}

// Server-side check if a promo code is active
function isPromoCodeActive(promoCode: PromoCode): boolean {
  const now = new Date()
  const validFrom = new Date(promoCode.valid_from)
  const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null
  
  // Check if code is valid based on end date only (ignoring valid_from)
  // This is a temporary fix to show promo codes with future valid_from dates
  const isInValidDateRange = !validUntil || validUntil >= now
  
  // Check if code still has uses left
  const hasUsesLeft = !promoCode.max_uses || promoCode.current_uses < promoCode.max_uses
  
  return isInValidDateRange && hasUsesLeft
}

// Server-side version of formatPromoCodeForDisplay
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

// Function to get brand logos from the database
async function getBrandLogos() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('brands')
    .select('id, Logo')
    .not('Logo', 'is', null)
  
  if (error) {
    console.error("Error fetching brand logos:", error)
    return {}
  }
  
  // Create a map of brand IDs to logo URLs
  const logoMap: Record<string, string> = {}
  data?.forEach(brand => {
    logoMap[brand.id] = brand.Logo
  })
  
  return logoMap
}

export const metadata: Metadata = {
  title: "Promo Codes - Machines for Makers",
  description: "View all available promo codes for Machines for Makers products",
}

export default async function PromoCodesPage() {
  const supabase = await createServerClient()
  const brandLogos = await getBrandLogos()

  // Get all active promo codes
  const { data: promoCodes, error } = await supabase
    .from('promo_codes')
    .select('*')
    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching promo codes:", error)
  }

  // Group promo codes by type (global, machine-specific, etc.)
  const globalCodes = promoCodes?.filter(code => code.is_global) || []
  const machineCodes = promoCodes?.filter(code => code.applies_to_machine_id && !code.is_global) || []
  const brandCodes = promoCodes?.filter(code => code.applies_to_brand_id && !code.is_global && !code.applies_to_machine_id) || []
  const categoryCodes = promoCodes?.filter(code => code.applies_to_category_id && !code.is_global && !code.applies_to_machine_id && !code.applies_to_brand_id) || []

  // Format all the promo codes for display using the server-side formatter
  const formattedGlobalCodes = globalCodes.map(serverFormatPromoCodeForDisplay)
  const formattedMachineCodes = machineCodes.map(serverFormatPromoCodeForDisplay)
  const formattedBrandCodes = brandCodes.map(serverFormatPromoCodeForDisplay)
  const formattedCategoryCodes = categoryCodes.map(serverFormatPromoCodeForDisplay)

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
        <p className="text-muted-foreground mt-2">
          Find all active promo codes for Machines for Makers products. Copy a code and use it at checkout.
        </p>
      </div>

      {(!promoCodes || promoCodes.length === 0) && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No Active Promo Codes</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            There are no active promo codes at this time. Check back later for special offers and discounts.
          </p>
        </div>
      )}

      {formattedGlobalCodes.length > 0 && (
        <PromoCodeSection 
          title="Global Promo Codes" 
          description="These promo codes can be used on any product"
          icon={<Globe className="h-5 w-5" />}
          promoCodes={formattedGlobalCodes}
          originalCodes={globalCodes}
          brandLogos={brandLogos}
        />
      )}

      {formattedMachineCodes.length > 0 && (
        <PromoCodeSection 
          title="Machine-Specific Promo Codes" 
          description="These promo codes can only be used on specific machines"
          icon={<Percent className="h-5 w-5" />}
          promoCodes={formattedMachineCodes}
          originalCodes={machineCodes}
          brandLogos={brandLogos}
        />
      )}

      {formattedBrandCodes.length > 0 && (
        <PromoCodeSection 
          title="Brand Promo Codes" 
          description="These promo codes can be used on specific brands"
          icon={<DollarSign className="h-5 w-5" />}
          promoCodes={formattedBrandCodes}
          originalCodes={brandCodes}
          brandLogos={brandLogos}
        />
      )}

      {formattedCategoryCodes.length > 0 && (
        <PromoCodeSection 
          title="Category Promo Codes" 
          description="These promo codes can be used on specific product categories"
          icon={<Tag className="h-5 w-5" />}
          promoCodes={formattedCategoryCodes}
          originalCodes={categoryCodes}
          brandLogos={brandLogos}
        />
      )}
    </div>
  )
}

interface PromoCodeSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  promoCodes: PromoCodeDisplay[]
  originalCodes: PromoCode[]
  brandLogos?: Record<string, string>
}

function PromoCodeSection({ title, description, icon, promoCodes, originalCodes, brandLogos }: PromoCodeSectionProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground mb-6">{description}</p>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promoCodes.map((displayCode, index) => {
          const originalCode = originalCodes[index]
          const isAffiliateOnly = 
            ((typeof originalCode.discount_percent === 'string' && originalCode.discount_percent === "0") || 
             (typeof originalCode.discount_percent === 'number' && originalCode.discount_percent === 0) || 
             originalCode.discount_percent === null) && 
            (originalCode.discount_amount === null || 
             originalCode.discount_amount === 0);
          
          const CardWrapper = ({ children }: { children: React.ReactNode }) => {
            if (isAffiliateOnly && displayCode.affiliateLink) {
              return (
                <a 
                  href={displayCode.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                >
                  {children}
                </a>
              );
            }
            return <div className="border rounded-lg p-4 bg-card">{children}</div>;
          };
          
          return (
            <CardWrapper key={originalCode.id}>
              {/* Brand or Global Section at the top */}
              {originalCode.applies_to_brand_id ? (
                <div className="flex flex-col items-center mb-4">
                  {brandLogos && brandLogos[originalCode.applies_to_brand_id] ? (
                    <div className="flex-shrink-0 h-16 w-full max-w-[180px] mb-2 overflow-hidden rounded bg-white border p-2 flex items-center justify-center">
                      {displayCode.affiliateLink && !isAffiliateOnly ? (
                        <a 
                          href={displayCode.affiliateLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full h-full flex items-center justify-center"
                        >
                          <Image 
                            src={brandLogos[originalCode.applies_to_brand_id]} 
                            alt={getBrandName(originalCode.applies_to_brand_id)} 
                            width={150} 
                            height={80} 
                            className="max-h-12 w-auto object-contain" 
                          />
                        </a>
                      ) : (
                        <Image 
                          src={brandLogos[originalCode.applies_to_brand_id]} 
                          alt={getBrandName(originalCode.applies_to_brand_id)} 
                          width={150} 
                          height={80} 
                          className="max-h-12 w-auto object-contain" 
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 h-16 w-full max-w-[180px] mb-2 rounded bg-primary/5 border flex items-center justify-center">
                      <Store className="h-8 w-8 text-primary" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-16 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                </div>
              )}
              
              {/* Discount description */}
              <div className="text-center mb-4">
                <p className="text-base font-semibold">
                  {originalCode.description || displayCode.discountText}
                </p>
              </div>
              
              {/* Promo code at the bottom - only show if not affiliate only */}
              {!isAffiliateOnly && (
                <PromoCodeBadge 
                  promoCode={displayCode}
                  size="lg" 
                  className="w-full mt-4"
                  simplified={true}
                />
              )}
              
              {/* Category or Machine Tags if applicable */}
              {!originalCode.is_global && !originalCode.applies_to_brand_id && (
                <div className="mt-3 text-xs text-muted-foreground text-center">
                  {originalCode.applies_to_machine_id && (
                    <p>Specific to a machine</p>
                  )}
                  {originalCode.applies_to_category_id && (
                    <p>Valid for a specific category</p>
                  )}
                </div>
              )}
            </CardWrapper>
          )
        })}
      </div>
    </div>
  )
}

function getBrandName(brandId: string | null): string {
  if (!brandId) return '';
  
  const brandMap: Record<string, string> = {
    'c64ce7bc-b27c-4612-a05d-c1697b7fce74': 'Aeon',
    '340da09a-9d27-42f5-a995-afb19055db11': 'EM Smart',
    '4d3f3af6-b67d-41c0-b507-fe07a928685d': 'Glowforge',
    'e19ec761-84b9-4f7c-ad52-b5ab0601d9a4': 'Gweike',
    '9ceca2c5-08d4-4189-8c54-b55cd0bb3124': 'Monport',
    '9da4176a-2f6e-4522-80eb-0a941ab7b567': 'OMTech',
    '43d28029-7093-4724-a714-8ae2d3c17a6a': 'OneLaser',
    '2b0c2371-bedb-4af3-8457-be2d26a378c8': 'xTool'
  };
  
  return brandMap[brandId] || 'Unknown Brand';
} 