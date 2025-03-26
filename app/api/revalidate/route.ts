import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Revalidation API endpoint that clears the Vercel Edge Cache for key paths
 * Used to fix authentication issues where cached pages might bypass login flows
 * 
 * Routes:
 * - GET /api/revalidate - Revalidates all admin paths
 * - GET /api/revalidate?path=/some/path - Revalidates a specific path
 * - GET /api/revalidate?tag=some-tag - Revalidates by cache tag
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const tag = searchParams.get('tag');
  
  // If a specific path is provided, revalidate only that path
  if (path) {
    revalidatePath(path);
    return NextResponse.json({ 
      revalidated: true, 
      path,
      now: Date.now(),
      message: `Path ${path} successfully revalidated` 
    });
  }
  
  // If a specific tag is provided, revalidate content with that tag
  if (tag) {
    revalidateTag(tag);
    return NextResponse.json({ 
      revalidated: true, 
      tag,
      now: Date.now(),
      message: `Tag ${tag} successfully revalidated` 
    });
  }

  // Otherwise, revalidate all admin-related paths
  revalidatePath('/admin');
  revalidatePath('/admin/login');
  revalidatePath('/api/admin/login');
  
  // Also revalidate paths that might pull data from APIs
  revalidatePath('/api/brands');
  revalidatePath('/api/promo-codes');
  
  return NextResponse.json({ 
    revalidated: true, 
    now: Date.now(),
    message: 'Admin cache successfully revalidated' 
  });
} 