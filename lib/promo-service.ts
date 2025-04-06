import { PromoCode, PromoCodeDisplay } from "@/types/promo-codes";
import { createServerClient } from '@/lib/supabase/server';

// Helper: Format date function
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  }).format(date);
}

// Helper: Format discount function
function formatDiscount(promoCode: PromoCode): string {
  if (promoCode.discount_percent) {
    return `${promoCode.discount_percent}% off`;
  } else if (promoCode.discount_amount) {
    const amount = typeof promoCode.discount_amount === 'string' 
      ? parseFloat(promoCode.discount_amount)
      : promoCode.discount_amount;
    return `$${amount.toFixed(2)} off`;
  }
  return 'Special offer';
}

// Helper: Check if promo code is active
function isPromoCodeActive(promoCode: PromoCode): boolean {
  const now = new Date();
  
  const maxUses = promoCode.max_uses ?? Infinity;
  const currentUses = promoCode.current_uses ?? 0;
  const hasUsesLeft = currentUses < maxUses;

  // Check expiration date
  const validUntil = promoCode.valid_until ? new Date(promoCode.valid_until) : null;
  const notExpired = !validUntil || validUntil > now;

  // Handle xTool brand specifically (check only expiration/uses)
  if (promoCode.applies_to_brand_id === '2b0c2371-bedb-4af3-8457-be2d26a378c8') {
    return notExpired && hasUsesLeft;
  }
  
  // For other codes, check start date, expiration date, and uses
  const validFrom = promoCode.valid_from ? new Date(promoCode.valid_from) : null;
  const hasStarted = !validFrom || validFrom <= now;
  
  return hasStarted && notExpired && hasUsesLeft;
}

// Helper: Format PromoCode to PromoCodeDisplay
function formatPromoCodeForDisplay(promoCode: PromoCode): PromoCodeDisplay {
  return {
    code: promoCode.code,
    description: promoCode.description || '',
    discountText: formatDiscount(promoCode),
    validUntil: formatDate(promoCode.valid_until),
    isActive: isPromoCodeActive(promoCode),
    affiliateLink: promoCode.affiliate_link || null
  };
}

// Main service function to get promo codes for a product
export async function getProductPromoCodes(product: any): Promise<PromoCodeDisplay[]> {
  let fetchedPromoCodes: PromoCode[] = [];
  const supabase = await createServerClient();

  console.log(`Fetching promo codes for product: ${product.machine_name} (ID: ${product.id})`);
  
  try {
    // Special handling for xTool
    if (product.company?.toLowerCase() === 'xtool' || product.brand_id === '2b0c2371-bedb-4af3-8457-be2d26a378c8') {
      console.log('Processing xTool brand promo code');
      const { data: xToolData, error: xToolError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('applies_to_brand_id', '2b0c2371-bedb-4af3-8457-be2d26a378c8');

      if (xToolError) {
        console.error('Error fetching xTool promo codes directly:', xToolError);
      } else if (xToolData && xToolData.length > 0) {
          console.log(`Found ${xToolData.length} xTool promo codes in DB.`);
          fetchedPromoCodes = xToolData;
      } else {
          console.log('No xTool promo codes found in DB, using hardcoded fallback.');
          // Use a structured hardcoded fallback
          const hardcodedXToolPromoCode: PromoCode = {
            id: 'hardcoded-xtool-promo',
            code: 'xToolBrandon',
            description: '$80 Off purchases of $1000 or more',
            discount_amount: 80,
            discount_percent: null,
            valid_from: '2023-01-01T00:00:00.000Z',
            valid_until: null,
            applies_to_brand_id: '2b0c2371-bedb-4af3-8457-be2d26a378c8',
            affiliate_link: 'https://www.xtool.com/discount/xToolBrandon?ref=rw0h_cdiytm5',
            is_global: false,
            current_uses: 0,
            max_uses: null,
            applies_to_machine_id: null,
            applies_to_category_id: null,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-01T00:00:00.000Z',
          };
          fetchedPromoCodes = [hardcodedXToolPromoCode];
      }
    } else {
      // Regular approach for non-xTool products - parallel queries for efficiency
      let queries = [];

      // Machine-specific codes
      if (product.id) {
        queries.push(
          supabase.from('promo_codes').select('*').eq('applies_to_machine_id', product.id)
        );
      }

      // Brand-specific codes
      if (product.brand_id) {
        queries.push(
          supabase.from('promo_codes').select('*').eq('applies_to_brand_id', product.brand_id)
        );
      }

      // Category-specific codes
      if (product.category_id) {
        queries.push(
          supabase.from('promo_codes').select('*').eq('applies_to_category_id', product.category_id)
        );
      }

      // Global codes
      queries.push(
        supabase.from('promo_codes').select('*').eq('is_global', true)
      );

      const results = await Promise.allSettled(queries);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { data, error } = result.value;
          if (error) {
            console.error(`Error fetching promo codes (Query ${index}):`, error);
          } else if (data) {
            fetchedPromoCodes.push(...data);
          }
        }
      });
    }

    // Format codes for display
    let displayCodes = fetchedPromoCodes.map(formatPromoCodeForDisplay);

    // Remove duplicates (by code)
    const uniqueCodes = displayCodes.filter((code, index, self) =>
      index === self.findIndex((c) => c.code === code.code)
    );
    
    // Sort codes: Active first, then by discount value (descending)
    uniqueCodes.sort((a, b) => {
        // Primary sort: Active codes first
        if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
        }

        // Secondary sort: By discount value (higher is better)
        const extractValue = (text: string) => {
            const match = text?.match(/(\d+(\.\d+)?)/);
            return match ? parseFloat(match[0]) : 0;
        };
        const valueA = extractValue(a.discountText);
        const valueB = extractValue(b.discountText);

        return valueB - valueA;
    });

    return uniqueCodes;

  } catch (error) {
    console.error("Critical error fetching or processing promo codes:", error);
    return []; // Return empty array on critical failure
  }
} 