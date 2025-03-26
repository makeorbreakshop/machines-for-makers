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
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    vercelSpecific: {
      isVercelProduction: headers['x-vercel-id'] ? true : false,
      vercelId: headers['x-vercel-id'] || null,
      vercelDeploymentUrl: headers['x-vercel-deployment-url'] || null,
    },
    middlewareInfo: {
      adminCookiePresent: !!cookies['admin_auth'],
      middlewareHeaders: {
        // Debug headers - explicitly check for each one
        'x-debug-pathname': headers['x-debug-pathname'],
        'x-debug-request-url': headers['x-debug-request-url'],
        'x-debug-host': headers['x-debug-host'],
        'x-debug-env': headers['x-debug-env'],
        'x-debug-middleware-version': headers['x-debug-middleware-version'],
        'x-debug-is-running': headers['x-debug-is-running'],
        'x-debug-route-type': headers['x-debug-route-type'],
        'x-debug-cache-headers-set': headers['x-debug-cache-headers-set'],
        'x-debug-auth-passed': headers['x-debug-auth-passed'],
        'x-debug-auth-cookie-present': headers['x-debug-auth-cookie-present'],
        'x-debug-redirect-reason': headers['x-debug-redirect-reason'],
        'x-debug-redirect-url': headers['x-debug-redirect-url'],
        'x-debug-protected-path': headers['x-debug-protected-path'],
      },
      allHeadersByPrefix: Object.fromEntries(
        Object.entries(headers)
          .filter(([key]) => key.startsWith('x-debug-'))
          .map(([key, value]) => [key, value])
      )
    }
  };
  
  // Return debug info as JSON with strong no-cache headers
  return NextResponse.json(debugInfo, {
    headers: {
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Debug-Timestamp': Date.now().toString(),
    }
  });
} 