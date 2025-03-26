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
  
  // DEBUG: Add more detailed headers to see what's being processed
  response.headers.set('x-debug-pathname', pathname)
  response.headers.set('x-debug-request-url', request.url)
  response.headers.set('x-debug-host', request.headers.get('host') || 'unknown')
  response.headers.set('x-debug-env', process.env.NODE_ENV || 'unknown')
  response.headers.set('x-debug-middleware-version', '1.1')
  
  // Set strong cache control headers to prevent caching for admin routes and API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    // Add debug header to confirm cache headers were set
    response.headers.set('x-debug-cache-headers-set', 'true')
  }
  
  console.log('===== MIDDLEWARE START =====')
  console.log('Processing request for path:', pathname)
  console.log('Request URL:', request.url)
  console.log('Request host:', request.headers.get('host'))
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV)
  console.log('Request method:', request.method)
  console.log('Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries())))
  
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
  console.log('All cookies:', JSON.stringify(Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value]))))
  
  // If no auth cookie, redirect to login
  if (!authCookie?.value) {
    console.log('No auth cookie found, redirecting to login')
    const loginUrl = new URL('/admin/login', request.url)
    console.log('Redirect URL:', loginUrl.toString())
    
    // Create a redirect response with debug headers
    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.headers.set('x-debug-redirect-reason', 'no-auth-cookie')
    redirectResponse.headers.set('x-debug-redirect-url', loginUrl.toString())
    
    console.log('===== MIDDLEWARE END =====')
    return redirectResponse
  }
  
  // Validate token format and expiry
  const [token, timestamp] = authCookie.value.split('.')
  console.log('Token parts present:', !!token, !!timestamp)
  
  if (!token || !timestamp) {
    console.log('Invalid token format, redirecting to login')
    
    // Create a redirect response with debug headers
    const loginUrl = new URL('/admin/login', request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.headers.set('x-debug-redirect-reason', 'invalid-token-format')
    redirectResponse.headers.set('x-debug-redirect-url', loginUrl.toString())
    
    console.log('===== MIDDLEWARE END =====')
    return redirectResponse
  }
  
  // Check token age
  const tokenAge = Date.now() - parseInt(timestamp)
  console.log('Token age (ms):', tokenAge)
  console.log('MAX_TOKEN_AGE (ms):', MAX_TOKEN_AGE)
  console.log('Token expired:', tokenAge > MAX_TOKEN_AGE)
  
  if (tokenAge > MAX_TOKEN_AGE) {
    console.log('Token expired, redirecting to login')
    // Token has expired, clear the cookie and redirect to login
    const loginUrl = new URL('/admin/login', request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      expires: new Date(0),
      path: "/",
    })
    redirectResponse.headers.set('x-debug-redirect-reason', 'expired-token')
    redirectResponse.headers.set('x-debug-redirect-url', loginUrl.toString())
    
    console.log('===== MIDDLEWARE END =====')
    return redirectResponse
  }
  
  console.log('Auth validation successful')
  // Add a debug header to show the request passed authentication
  response.headers.set('x-debug-auth-passed', 'true')
  
  console.log('===== MIDDLEWARE END =====')
  return response
}

// Only run middleware on admin paths
export const config = {
  matcher: [
    '/admin', 
    '/admin/:path*',
    '/api/admin/:path*'
  ]
} 