import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Cookie settings
export const ADMIN_COOKIE_NAME = "admin_auth";
export const EXPIRY_TIME = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Server-side function to check if user is authenticated
 * Use this in admin layout and page components
 */
export async function checkAdminAuth() {
  // Get the cookies from the request
  const cookieStore = cookies();
  const authCookie = cookieStore.get(ADMIN_COOKIE_NAME);
  
  // If no cookie exists, redirect to login
  if (!authCookie?.value) {
    redirect('/admin/login');
  }
  
  // Validate the cookie format
  const [token, timestamp] = authCookie.value.split('.');
  if (!token || !timestamp) {
    // We don't need to clear the cookie here as we're redirecting to login
    // which will handle invalid cookies
    redirect('/admin/login');
  }
  
  // Check if token is expired
  const tokenTimestamp = parseInt(timestamp, 10);
  const tokenAge = Date.now() - tokenTimestamp;
  const maxAge = EXPIRY_TIME * 1000; // Convert to milliseconds
  
  if (tokenAge > maxAge) {
    // We don't need to clear the cookie here as we're redirecting to login
    // which will handle expired cookies
    redirect('/admin/login');
  }
  
  // Authentication passed
  return true;
}

/**
 * Function to get the admin user from cookie
 * Used to display admin info if needed
 */
export function getAdminUser() {
  // In this simple implementation, we just verify authentication
  // You could extend this to include more user info if needed
  return { isAuthenticated: true };
} 