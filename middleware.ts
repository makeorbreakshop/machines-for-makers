import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Cookie name used for admin authentication
const ADMIN_COOKIE_NAME = "admin_auth"

// Maximum token age in milliseconds (7 days)
const MAX_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000

// FIXED VERSION FOR VERCEL DEPLOYMENT - March 26, 2024
// Edge Runtime Directive for Next.js middleware - MUST be experimental-edge
export const runtime = 'experimental-edge';

export async function middleware(request: NextRequest) {
  try {
    // Get the pathname and normalize it
    const pathname = request.nextUrl.pathname.toLowerCase()
    
    // Create a response object to track if middleware is running
    const response = NextResponse.next()
    
    // Set diagnostic headers that will show if middleware runs at all
    response.headers.set('x-edge-middleware-ran', 'true')
    response.headers.set('x-edge-middleware-timestamp', Date.now().toString())
    response.headers.set('x-edge-middleware-version', '2.0')
    response.headers.set('x-edge-middleware-path', pathname)
    
    // For non-admin routes, just add debug headers and return
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
      response.headers.set('x-edge-route-type', 'public')
      return response
    }
    
    // Add cache prevention headers for admin routes
    response.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('x-edge-admin-route', 'true')
    
    // Allow access to login page
    if (
      pathname === '/admin/login' || 
      pathname.startsWith('/admin/login/') ||
      pathname === '/api/admin/login'
    ) {
      response.headers.set('x-edge-auth-bypass', 'login-page')
      return response
    }
    
    // Allow access to debug endpoint
    if (pathname.startsWith('/api/debug/')) {
      response.headers.set('x-edge-auth-bypass', 'debug-endpoint')
      return response
    }
    
    // Check for the admin auth cookie - SIMPLIFIED for Edge Runtime
    const authCookie = request.cookies.get(ADMIN_COOKIE_NAME)
    response.headers.set('x-edge-auth-cookie-present', String(!!authCookie))
    
    // If no auth cookie, redirect to login
    if (!authCookie?.value) {
      const loginUrl = new URL('/admin/login', request.url)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.headers.set('x-edge-redirect-reason', 'no-auth-cookie')
      return redirectResponse
    }
    
    // Validate token format and expiry - SIMPLIFIED for Edge Runtime
    const [token, timestamp] = authCookie.value.split('.')
    response.headers.set('x-edge-token-parts-present', `${!!token},${!!timestamp}`)
    
    if (!token || !timestamp) {
      const loginUrl = new URL('/admin/login', request.url)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.headers.set('x-edge-redirect-reason', 'invalid-token-format')
      return redirectResponse
    }
    
    // Check token age - SIMPLIFIED for Edge Runtime
    const tokenTimestamp = parseInt(timestamp, 10) || 0
    const tokenAge = Date.now() - tokenTimestamp
    response.headers.set('x-edge-token-age', tokenAge.toString())
    
    if (tokenAge > MAX_TOKEN_AGE) {
      const loginUrl = new URL('/admin/login', request.url)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: "",
        expires: new Date(0),
        path: "/",
      })
      redirectResponse.headers.set('x-edge-redirect-reason', 'expired-token')
      return redirectResponse
    }
    
    // Auth passed - add confirmation header
    response.headers.set('x-edge-auth-passed', 'true')
    return response
  } catch (error) {
    // Provide error information without crashing middleware
    const errorResponse = NextResponse.next()
    errorResponse.headers.set('x-edge-middleware-error', 'true')
    errorResponse.headers.set('x-edge-middleware-error-message', error instanceof Error ? error.message : 'Unknown error')
    return errorResponse
  }
}

// Simplified matcher pattern for Vercel Edge Runtime
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/debug/:path*'
  ],
} 