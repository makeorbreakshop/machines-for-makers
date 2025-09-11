import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  password: z.string()
    .min(1, "Password is required")
    .max(100, "Password is too long")
});

// Machine schemas
export const machineIdSchema = z.object({
  id: z.string().uuid("Invalid machine ID format")
});

export const createMachineSchema = z.object({
  machine_name: z.string().min(1).max(255),
  brand_id: z.string().uuid(),
  category_id: z.string().uuid(),
  price: z.number().positive().optional(),
  description: z.string().optional(),
  affiliate_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  published_on: z.string().datetime().optional(),
  hidden: z.boolean().default(false)
});

export const updateMachineSchema = createMachineSchema.partial();

// Review schemas
export const createReviewSchema = z.object({
  machine_id: z.string().uuid(),
  reviewer_name: z.string().min(1).max(100),
  rating: z.number().min(1).max(5),
  review_text: z.string().min(1).max(5000),
  verified_purchase: z.boolean().default(false)
});

// Price history schemas
export const priceHistorySchema = z.object({
  machine_id: z.string().uuid(),
  price: z.number().positive(),
  date: z.string().datetime(),
  source: z.string().optional()
});

// API pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, "File size must be less than 10MB")
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      "Only JPEG, PNG, and WebP images are allowed"
    )
});

// Scraping schemas
export const scrapeUrlSchema = z.object({
  url: z.string().url("Invalid URL format"),
  type: z.enum(['machine', 'brand', 'category']).optional()
});

// Email subscription schemas
export const emailSubscriptionSchema = z.object({
  email: z.string().email("Invalid email format"),
  source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  referrer: z.string().optional()
});

// Lead magnet schemas
export const leadMagnetSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  landing_page_url: z.string().url(),
  convertkit_form_id: z.string().optional(),
  active: z.boolean().default(true)
});

// Analytics schemas
export const analyticsDateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  metric: z.enum(['overview', 'traffic', 'conversions', 'revenue']).optional()
});

// Short link schemas
export const createShortLinkSchema = z.object({
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-_]+$/, "Slug can only contain letters, numbers, hyphens, and underscores"),
  destination_url: z.string().url("Invalid destination URL"),
  type: z.enum(['lead-magnet', 'affiliate', 'internal', 'external']).optional(),
  campaign: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  append_utms: z.boolean().default(false),
  active: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

// Discovery schemas
export const discoveryMachineSchema = z.object({
  url: z.string().url(),
  brand: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive().optional(),
  raw_data: z.record(z.any()),
  normalized_data: z.record(z.any()).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'duplicate']).default('pending')
});

// Helper function to validate and parse data
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Helper function for safe validation (returns result instead of throwing)
export function safeValidateSchema<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}