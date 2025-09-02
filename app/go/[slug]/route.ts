export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';

// Simple in-memory cache for active links (Edge runtime compatible)
const linkCache = new Map<string, { link: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

// Bot user agents to detect
const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i, /baiduspider/i,
  /yandexbot/i, /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /slackbot/i, /telegram/i, /discordbot/i,
  /curl/i, /wget/i, /python-requests/i, /go-http-client/i,
  /java/i, /perl/i, /ruby/i, /bot/i, /crawl/i, /spider/i
];

// Rate limiting map (IP -> timestamp array)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now();
  const { slug } = await params;
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log(`[Redirect] Processing request for slug: ${slug}`);
  }

  try {
    // Get IP for rate limiting and logging
    const ip = request.headers.get('x-real-ip') || 
               request.headers.get('x-forwarded-for')?.split(',')[0] || 
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Try cache first
    const cached = linkCache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (isDev) console.log(`Cache hit for slug: ${slug}`);
      return await handleRedirect(request, cached.link, startTime);
    }

    // Fetch from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return redirectToHomepage('config-error');
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/short_links?slug=eq.${slug}&active=eq.true&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Supabase error:', response.status);
      return redirectToHomepage('fetch-error');
    }

    const links = await response.json();

    if (!links || links.length === 0) {
      if (isDev) console.log(`No active link found for slug: ${slug}`);
      return redirectToHomepage('not-found');
    }

    const link = links[0];

    // Update cache
    linkCache.set(slug, { link, timestamp: Date.now() });

    // Handle redirect and logging
    return await handleRedirect(request, link, startTime);

  } catch (error) {
    console.error('[Redirect] Error:', error);
    console.error('[Redirect] Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return redirectToHomepage('error');
  }
}

async function handleRedirect(
  request: NextRequest,
  link: any,
  startTime: number
) {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Build destination URL with UTM parameters
  let destinationUrl: URL;
  try {
    // Check if destination_url is absolute or relative
    if (link.destination_url.startsWith('http://') || link.destination_url.startsWith('https://')) {
      destinationUrl = new URL(link.destination_url);
    } else {
      // It's a relative URL, use the site URL as base
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      destinationUrl = new URL(link.destination_url, baseUrl);
    }
  } catch (error) {
    console.error('Invalid destination URL:', link.destination_url);
    return redirectToHomepage('invalid-url');
  }
  
  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  
  // Remove the slug parameter (it's not needed in the destination)
  searchParams.delete('slug');
  
  // Add default UTM parameters if enabled
  if (link.append_utms) {
    // Set defaults from link configuration
    if (link.utm_source && !searchParams.has('utm_source')) {
      searchParams.set('utm_source', link.utm_source);
    }
    if (link.utm_medium && !searchParams.has('utm_medium')) {
      searchParams.set('utm_medium', link.utm_medium);
    }
    if (link.utm_campaign && !searchParams.has('utm_campaign')) {
      searchParams.set('utm_campaign', link.utm_campaign);
    }
    if (link.utm_term && !searchParams.has('utm_term')) {
      searchParams.set('utm_term', link.utm_term);
    }
    if (link.utm_content && !searchParams.has('utm_content')) {
      searchParams.set('utm_content', link.utm_content);
    }
  }

  // Append all parameters to destination
  searchParams.forEach((value, key) => {
    destinationUrl.searchParams.set(key, value);
  });

  // 🚨 NEW: Log click SYNCHRONOUSLY (this is the fix!)
  try {
    await logClickImmediate(request, link, searchParams);
  } catch (error) {
    // Log the error but don't block the redirect
    console.error('Click logging failed:', error);
    // In production, you might want to queue this for retry
  }

  // 🆕 BACKGROUND ENRICHMENT: Use Next.js after() for Node.js runtime
  after(async () => {
    try {
      await enrichClickData(link.id, request, searchParams);
    } catch (error) {
      console.error('Background enrichment failed:', error);
    }
  });

  const redirectTime = Date.now() - startTime;
  if (isDev) {
    console.log(`Redirect to ${destinationUrl.toString()} in ${redirectTime}ms`);
  }

  return NextResponse.redirect(destinationUrl.toString(), 302);
}

// 🚨 NEW FUNCTION: Immediate click logging (blocks redirect but ensures data)
async function logClickImmediate(
  request: NextRequest,
  link: any,
  searchParams: URLSearchParams
) {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Extract essential data only (for speed)
  const userAgent = request.headers.get('user-agent') || '';
  const referrer = request.headers.get('referer') || '';
  const ip = request.headers.get('x-real-ip') || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             'unknown';
  
  // Hash IP for privacy using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

  // Detect if it's a bot (basic check)
  let isBot = false;
  let botReason = null;
  
  if (!userAgent) {
    isBot = true;
    botReason = 'Empty user agent';
  } else {
    for (const pattern of BOT_PATTERNS) {
      if (pattern.test(userAgent.toLowerCase())) {
        isBot = true;
        botReason = `Matched pattern: ${pattern.source}`;
        break;
      }
    }
  }

  // Core click data (minimal for speed)
  const clickData = {
    link_id: link.id,
    clicked_at: new Date().toISOString(),
    ip_hash: ipHash,
    user_agent: userAgent.substring(0, 1000), // Limit length
    referrer_url: referrer.substring(0, 500), // Limit length
    is_bot: isBot,
    bot_reason: botReason?.substring(0, 200) || null,
    // UTM parameters
    utm_source: searchParams.get('utm_source')?.substring(0, 255) || null,
    utm_medium: searchParams.get('utm_medium')?.substring(0, 255) || null,
    utm_campaign: searchParams.get('utm_campaign')?.substring(0, 255) || null,
    utm_content: searchParams.get('utm_content')?.substring(0, 255) || null,
    utm_term: searchParams.get('utm_term')?.substring(0, 255) || null,
  };

  if (isDev) {
    console.log('Logging click immediately:', clickData);
  }

  // Insert into database SYNCHRONOUSLY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration for logging');
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/link_clicks`,
    {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(clickData),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to log click: ${response.status} - ${error}`);
  }

  if (isDev) {
    console.log('Click logged successfully (immediate)');
  }
}

// 🆕 BACKGROUND ENRICHMENT: Geo data, device parsing, etc.
async function enrichClickData(
  linkId: string,
  request: NextRequest,
  searchParams: URLSearchParams
) {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.log('Starting background enrichment for link:', linkId);
  
  try {
    // Get additional data that takes longer to process
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';
    const region = request.headers.get('x-vercel-ip-region') || 'unknown';
    const city = request.headers.get('x-vercel-ip-city') || null;
    
    const userAgent = request.headers.get('user-agent') || '';
    const { deviceType, browser, os } = parseUserAgent(userAgent);
    
    // Update the click record with enriched data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      await fetch(
        `${supabaseUrl}/rest/v1/link_clicks?link_id=eq.${linkId}&clicked_at=gte.${new Date(Date.now() - 60000).toISOString()}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            device_type: deviceType,
            browser: browser,
            os: os,
            country_code: country.substring(0, 2),
            region: region.substring(0, 100),
            city: city?.substring(0, 100) || null,
            query_params: Object.fromEntries(searchParams.entries()),
          }),
        }
      );
      
      if (isDev) {
        console.log('Background enrichment completed successfully:', {
          deviceType, browser, os, country: country.substring(0, 2)
        });
      }
    }
  } catch (error) {
    // Don't throw - enrichment failing is not critical
    console.error('Click enrichment failed:', error);
  }
}

function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  os: string;
  isBot: boolean;
  botReason: string | null;
} {
  const ua = userAgent.toLowerCase();
  
  // Check for bots
  let isBot = false;
  let botReason = null;
  
  if (!userAgent) {
    isBot = true;
    botReason = 'Empty user agent';
  } else {
    for (const pattern of BOT_PATTERNS) {
      if (pattern.test(ua)) {
        isBot = true;
        botReason = `Matched pattern: ${pattern.source}`;
        break;
      }
    }
  }

  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet|kindle/i.test(ua)) {
    deviceType = 'tablet';
  } else if (isBot) {
    deviceType = 'bot';
  }

  // Detect browser
  let browser = 'unknown';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  // Detect OS
  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macos/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  return { deviceType, browser, os, isBot, botReason };
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    const entries = Array.from(rateLimitMap.entries());
    for (const [key, value] of entries) {
      if (value.length === 0 || now - value[value.length - 1] > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return true;
}

function redirectToHomepage(reason: string): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log(`Redirecting to homepage, reason: ${reason}`);
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return NextResponse.redirect(new URL(`/?ref=broken-link&reason=${reason}`, baseUrl));
}