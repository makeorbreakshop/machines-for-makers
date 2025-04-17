/**
 * Debugging utilities for analyzing performance and rate limiting issues
 */

const DEBUG_MODE = process.env.NODE_ENV === 'development' || 
                  process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) console.log('[DEBUG]', ...args);
  },
  warn: (...args: any[]) => {
    if (DEBUG_MODE) console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  perf: (label: string, startTime: number) => {
    const duration = performance.now() - startTime;
    if (DEBUG_MODE) console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
};

/**
 * Analyzes response headers and content to detect throttling or rate limiting
 */
export function checkForRateLimiting(response: Response): {
  isRateLimited: boolean;
  isThrottled: boolean;
  details: string[];
  responseTime: number;
} {
  const details: string[] = [];
  const startTime = performance.now();
  
  // Check for specific rate limit headers
  const rateLimitRemaining = response.headers.get('ratelimit-remaining');
  const rateLimitReset = response.headers.get('ratelimit-reset');
  const rateLimitLimit = response.headers.get('ratelimit-limit');
  
  // Check for custom headers from our API
  const throttlingWarning = response.headers.get('x-throttling-warning');
  const queryTime = response.headers.get('x-query-time');
  const totalTime = response.headers.get('x-total-processing-time');
  const isRateLimited = response.headers.get('x-rate-limited') === 'true';
  
  // Check response status
  const isRateLimitStatus = response.status === 429;
  const isServerError = response.status >= 500;
  
  // Analyze results
  if (rateLimitRemaining === '0' || isRateLimitStatus) {
    details.push('CRITICAL: Rate limit exceeded');
  }
  
  if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
    details.push(`WARNING: Rate limit nearly exceeded (${rateLimitRemaining} remaining)`);
  }
  
  if (rateLimitReset) {
    const resetTime = new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString();
    details.push(`Rate limit will reset at ${resetTime}`);
  }
  
  if (throttlingWarning === 'true') {
    details.push('WARNING: Server indicated possible throttling');
  }
  
  if (queryTime && parseInt(queryTime) > 2000) {
    details.push(`SLOW QUERY: Database query took ${parseInt(queryTime) / 1000} seconds`);
  }
  
  if (totalTime && parseInt(totalTime) > 5000) {
    details.push(`SLOW REQUEST: Total processing took ${parseInt(totalTime) / 1000} seconds`);
  }
  
  if (isServerError) {
    details.push(`SERVER ERROR: Response status ${response.status}`);
  }
  
  // Detect throttling based on response time
  const responseTime = performance.now() - startTime;
  if (responseTime > 5000) {
    details.push(`SLOW RESPONSE: Client-side response time ${responseTime.toFixed(2)}ms`);
  }
  
  // Determine overall status
  const isThrottled = 
    queryTime !== null && parseInt(queryTime || '0') > 2000 || 
    responseTime > 3000 ||
    throttlingWarning === 'true';
  
  return {
    isRateLimited: isRateLimited || isRateLimitStatus || rateLimitRemaining === '0',
    isThrottled,
    details,
    responseTime
  };
}

/**
 * Utility to format query parameters for detailed logging
 */
export function formatQueryParams(params: URLSearchParams): Record<string, any> {
  const result: Record<string, any> = {};
  params.forEach((value, key) => {
    if (result[key]) {
      // If the parameter already exists, convert it to an array
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }
      result[key].push(value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

/**
 * Logs the current Supabase rate limit status
 */
export async function checkSupabaseStatus(): Promise<{ ok: boolean; details: string[] }> {
  const details: string[] = [];
  
  try {
    // Perform a simple API call to check status
    const response = await fetch('/api/debug/status', {
      cache: 'no-store'
    });
    
    const result = checkForRateLimiting(response);
    details.push(...result.details);
    
    if (response.ok) {
      const data = await response.json();
      if (data.dbStatus === 'ok') {
        details.push('Supabase connection is working');
      } else {
        details.push(`Supabase status: ${data.dbStatus}`);
      }
      
      if (data.connectionPoolStats) {
        details.push(`Connection pool: ${data.connectionPoolStats.active}/${data.connectionPoolStats.total} connections active`);
      }
      
      return { ok: true, details };
    } else {
      details.push(`API status check failed: ${response.status}`);
      return { ok: false, details };
    }
  } catch (error) {
    details.push(`Error checking status: ${error}`);
    return { ok: false, details };
  }
} 