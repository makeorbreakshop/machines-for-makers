import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const adminAuth = request.cookies.get('admin_auth');
  const pathname = request.nextUrl.pathname;
  
  // Define protected and public routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin/login';
  const isApiRoute = pathname.startsWith('/api');
  
  // Skip middleware for API routes
  if (isApiRoute) {
    return NextResponse.next();
  }
  
  // If trying to access admin pages without auth (except login), redirect to login
  if (isAdminRoute && !isLoginPage && !adminAuth) {
    const loginUrl = new URL('/admin/login', request.url);
    // Add return URL so we can redirect back after login
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If authenticated and trying to access login, redirect to admin dashboard
  if (adminAuth && isLoginPage) {
    const from = request.nextUrl.searchParams.get('from');
    const redirectUrl = from || '/admin';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Match all admin routes
    '/admin/:path*',
    // Skip static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ]
};