import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database-types'

// Cookie name used for admin authentication
const ADMIN_COOKIE_NAME = "admin_auth"

// Routes that require admin authentication
const PROTECTED_ADMIN_ROUTES = ["/admin"]

// Routes that should not be protected (within the admin space)
const PUBLIC_ADMIN_ROUTES = ["/admin/login"]

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req: request, res: response })
  const { pathname } = request.nextUrl

  // Initialize Supabase auth session
  await supabase.auth.getSession()

  // Check if the route is an admin route that needs protection
  const isProtectedAdminRoute = PROTECTED_ADMIN_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // Handle admin route protection
  if (isProtectedAdminRoute) {
    // Allow access to public admin routes like the login page
    if (PUBLIC_ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
      // Add caching headers for non-API routes
      addCachingHeaders(pathname, response)
      return response
    }
    
    // Check for the admin auth cookie
    const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)
    
    // If no auth cookie, redirect to login
    if (!authCookie?.value) {
      const url = new URL("/admin/login", request.url)
      return NextResponse.redirect(url)
    }
  }
  
  // Add caching headers for non-API routes
  addCachingHeaders(pathname, response)
  
  return response
}

// Helper function to add caching headers
function addCachingHeaders(url: string, response: NextResponse) {
  if (!url.includes('/api/') && !url.includes('/auth/')) {
    // Set cache control headers for public pages
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  }
}

// Match all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 