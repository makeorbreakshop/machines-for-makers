import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get all headers
  const headers = Object.fromEntries(request.headers.entries());
  
  // Get all cookies
  const cookies = Object.fromEntries(
    request.cookies.getAll().map(c => [c.name, c.value])
  );
  
  // Create response object with debug info
  const debugInfo = {
    time: new Date().toISOString(),
    url: request.url,
    pathname: request.nextUrl.pathname,
    method: request.method,
    headers,
    cookies,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    middlewareInfo: {
      adminCookiePresent: !!cookies['admin_auth'],
      middlewareHeaders: {
        'x-debug-pathname': headers['x-debug-pathname'],
        'x-debug-request-url': headers['x-debug-request-url'],
        'x-debug-host': headers['x-debug-host'],
        'x-debug-env': headers['x-debug-env'],
        'x-debug-middleware-version': headers['x-debug-middleware-version'],
        'x-debug-cache-headers-set': headers['x-debug-cache-headers-set'],
        'x-debug-auth-passed': headers['x-debug-auth-passed'],
        'x-debug-redirect-reason': headers['x-debug-redirect-reason'],
        'x-debug-redirect-url': headers['x-debug-redirect-url'],
      }
    }
  };
  
  // Return debug info as JSON
  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
} 