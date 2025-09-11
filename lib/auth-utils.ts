import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = "admin_auth";
const HMAC_SECRET = process.env.HMAC_SECRET || 'default-hmac-secret-change-in-production';

/**
 * Verifies the admin session for server components
 * This is the secure check that validates the cookie signature
 * @param redirectToLogin - If true, redirects to login page when not authenticated
 * @returns The session data if valid, null otherwise
 */
export async function verifyAdminSession(redirectToLogin = true) {
  const cookieStore = await cookies();
  const adminAuth = cookieStore.get(ADMIN_COOKIE_NAME);
  
  if (!adminAuth) {
    if (redirectToLogin) {
      redirect('/admin/login');
    }
    return null;
  }
  
  try {
    // Parse the cookie value
    const [token, signature] = adminAuth.value.split('.');
    
    if (!token || !signature) {
      if (redirectToLogin) {
        redirect('/admin/login');
      }
      return null;
    }
    
    // Verify the HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(token)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('[Auth] Invalid session signature');
      if (redirectToLogin) {
        redirect('/admin/login');
      }
      return null;
    }
    
    // Valid session
    return {
      authenticated: true,
      token
    };
  } catch (error) {
    console.error('[Auth] Session verification error:', error);
    if (redirectToLogin) {
      redirect('/admin/login');
    }
    return null;
  }
}

/**
 * Checks if the user is authenticated as admin
 * Redirects to login if not authenticated
 * Alias for verifyAdminSession for backward compatibility
 */
export async function requireAdminAuth() {
  return await verifyAdminSession(true);
}

/**
 * Gets the admin cookie value
 * For compatibility with existing code
 */
export async function getAdminCookie() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE_NAME);
  return cookie ? { name: ADMIN_COOKIE_NAME, value: cookie.value } : null;
}

/**
 * Validates the admin cookie
 * For compatibility with existing code
 */
export async function validateAdminCookie(cookie: { name: string; value: string } | null) {
  if (!cookie) return false;
  const session = await verifyAdminSession(false);
  return session !== null;
} 