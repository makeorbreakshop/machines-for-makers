import { NextRequest, NextResponse } from 'next/server';

// Use Edge Runtime for this API route to match middleware environment
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Get all headers
    const headers = Object.fromEntries(request.headers.entries());
    
    // Get all cookies
    const cookies = Object.fromEntries(
      request.cookies.getAll().map(c => [c.name, c.value])
    );
    
    // Check for specific middleware headers
    const middlewareRan = !!headers['x-edge-middleware-ran'];
    const middlewareTimestamp = headers['x-edge-middleware-timestamp'];
    const edgeHeaders = Object.fromEntries(
      Object.entries(headers)
        .filter(([key]) => key.startsWith('x-edge-'))
        .map(([key, value]) => [key, value])
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
        middlewareBypass: headers['x-middleware-bypass'] || null,
      },
      middlewareStatus: {
        middlewareRan,
        middlewareTimestamp,
        isEdgeRuntime: true, // This API route runs in Edge Runtime
        edgeHeaders,
        cookieAuth: {
          adminCookiePresent: !!cookies['admin_auth'],
          adminCookieValue: cookies['admin_auth'] ? 
            `${cookies['admin_auth'].substring(0, 10)}...` : null,
        },
        diagnostics: {
          apiEndpointExecuted: true,
          timeGap: middlewareTimestamp ? 
            (Date.now() - parseInt(middlewareTimestamp)) : null,
          middlewareError: headers['x-edge-middleware-error'] || null,
          middlewareErrorMessage: headers['x-edge-middleware-error-message'] || null,
        }
      }
    };
    
    // Return debug info as JSON with strong no-cache headers
    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Debug-Timestamp': Date.now().toString(),
        'X-Debug-Api-Edge-Runtime': 'true',
      }
    });
  } catch (error) {
    // Return error info without failing
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        time: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        }
      }
    );
  }
} 