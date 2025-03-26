import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/database-types'

// Cookie name used for admin authentication
const ADMIN_COOKIE_NAME = "admin_auth"

// Maximum token age in milliseconds (7 days)
const MAX_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000

export async function middleware(request: NextRequest) {
  // Get the pathname and normalize it
  const pathname = request.nextUrl.pathname.toLowerCase()
  
  // Add debug header to track pathname in response
  const response = NextResponse.next()
  response.headers.set('x-debug-pathname', pathname)
  
  // Set cache control headers for admin routes to prevent caching
  if (pathname.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  }
  
  console.log('===== MIDDLEWARE START =====')
  console.log('Processing request for path:', pathname)
  console.log('Request URL:', request.url)
  
  // 1. Skip non-admin routes entirely
  if (!pathname.startsWith('/admin')) {
    console.log('Not an admin route, skipping')
    return response
  }
  
  // 2. ALWAYS allow access to login page or login endpoints
  if (
    pathname === '/admin/login' || 
    pathname.startsWith('/admin/login/') ||
    pathname === '/admin/api/login'
  ) {
    console.log('Login page/endpoint detected, bypassing auth completely')
    console.log('===== MIDDLEWARE END =====')
    return response
  }
  
  console.log('Protected admin path detected, checking authentication')
  
  // Set up Supabase client
  const supabase = createMiddlewareClient<Database>({ req: request, res: response })
  
  // Initialize Supabase auth session
  await supabase.auth.getSession()
  
  // Check for the admin auth cookie
  const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)
  console.log('Auth cookie present:', !!authCookie)
  console.log('Auth cookie value:', authCookie?.value || 'none')
  
  // If no auth cookie, redirect to login
  if (!authCookie?.value) {
    console.log('No auth cookie found, redirecting to login')
    const loginUrl = new URL('/admin/login', request.url)
    console.log('Redirect URL:', loginUrl.toString())
    console.log('===== MIDDLEWARE END =====')
    return NextResponse.redirect(loginUrl)
  }
  
  // Validate token format and expiry
  const [token, timestamp] = authCookie.value.split('.')
  console.log('Token parts present:', !!token, !!timestamp)
  
  if (!token || !timestamp) {
    console.log('Invalid token format, redirecting to login')
    console.log('===== MIDDLEWARE END =====')
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
  
  // Check token age
  const tokenAge = Date.now() - parseInt(timestamp)
  console.log('Token age (ms):', tokenAge)
  
  if (tokenAge > MAX_TOKEN_AGE) {
    console.log('Token expired, redirecting to login')
    // Token has expired, clear the cookie and redirect to login
    const redirectResponse = NextResponse.redirect(new URL('/admin/login', request.url))
    redirectResponse.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      expires: new Date(0),
      path: "/",
    })
    console.log('===== MIDDLEWARE END =====')
    return redirectResponse
  }
  
  console.log('Auth validation successful')
  console.log('===== MIDDLEWARE END =====')
  return response
}

// Only run middleware on admin paths
export const config = {
  matcher: ['/admin', '/admin/:path*']
} 