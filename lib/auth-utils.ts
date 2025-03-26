import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "admin_auth";
const MAX_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface Cookie {
  name: string;
  value: string;
}

/**
 * Retrieves the admin cookie from the request
 * Uses a version compatible with Next.js server components
 */
export async function getAdminCookie() {
  try {
    // Access the cookie header directly
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.get(ADMIN_COOKIE_NAME);
    
    if (cookieHeader) {
      return { name: ADMIN_COOKIE_NAME, value: cookieHeader.value };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting admin cookie:", error);
    return null;
  }
}

/**
 * Validates the admin auth cookie
 * @param cookie The cookie object to validate
 * @returns true if the cookie is valid, false otherwise
 */
export function validateAdminCookie(cookie: Cookie | null) {
  // If no cookie, it's invalid
  if (!cookie?.value) return false;
  
  try {
    // Split into token and timestamp
    const [token, timestamp] = cookie.value.split('.');
    if (!token || !timestamp) return false;
    
    // Parse timestamp and check age
    const tokenTimestamp = parseInt(timestamp, 10);
    if (isNaN(tokenTimestamp)) return false;
    
    const tokenAge = Date.now() - tokenTimestamp;
    return tokenAge <= MAX_TOKEN_AGE;
  } catch (error) {
    console.error("Error validating admin cookie:", error);
    return false;
  }
}

/**
 * Checks if the user is authenticated as admin
 * Redirects to login if not authenticated
 */
export async function requireAdminAuth() {
  const adminCookie = await getAdminCookie();
  const isAuthenticated = validateAdminCookie(adminCookie);
  
  if (!isAuthenticated) {
    redirect('/admin/login');
  }
  
  return true;
} 