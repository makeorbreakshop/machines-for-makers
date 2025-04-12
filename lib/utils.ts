import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as USD currency
 * @param price The price value to format
 * @param currency The currency code (default: 'USD')
 * @returns Formatted price string
 */
export function formatPrice(price: number | null | undefined, currency: string = 'USD'): string {
  if (price === null || price === undefined) {
    return 'N/A';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}
