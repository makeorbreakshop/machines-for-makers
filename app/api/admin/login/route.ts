import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { loginRateLimiter } from "@/lib/rate-limiter"
import { loginSchema } from "@/lib/validation/schemas"
import crypto from "crypto"

// Cookie settings
const ADMIN_COOKIE_NAME = "admin_auth"
const EXPIRY_TIME = 60 * 60 * 24 * 7 // 7 days in seconds

// Environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const HMAC_SECRET = process.env.HMAC_SECRET || 'default-hmac-secret-change-in-production';

// Validate environment variable
if (!ADMIN_PASSWORD) {
  console.error("CRITICAL: ADMIN_PASSWORD environment variable is not set!")
  throw new Error("ADMIN_PASSWORD environment variable must be set")
}

// Use nodejs runtime to ensure environment variables are properly accessible
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    
    // Check rate limit
    if (loginRateLimiter.isRateLimited(ip)) {
      const resetTime = loginRateLimiter.getResetTime(ip);
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many login attempts. Please try again later.",
          retryAfter: resetTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTime.toString()
          }
        }
      );
    }
    
    // Parse and validate request body
    let validatedData;
    try {
      const body = await request.json();
      validatedData = loginSchema.parse(body);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid request format" },
        { status: 400 }
      );
    }

    const { password } = validatedData;

    // Verify password
    if (password.trim() !== ADMIN_PASSWORD.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid password"
        },
        { status: 401 }
      )
    }

    // Generate secure session token
    const sessionToken = crypto.randomUUID();
    
    // Create HMAC signature for the token
    const signature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(sessionToken)
      .digest('hex');
    
    // Combine token and signature
    const cookieValue = `${sessionToken}.${signature}`;
    
    // Set expiry date
    const expiryDate = new Date(Date.now() + EXPIRY_TIME * 1000);
    
    // Reset rate limit on successful login
    loginRateLimiter.reset(ip);

    // Create response
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Authentication successful",
        redirectTo: "/admin"
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );

    // Set secure httpOnly cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: cookieValue,
      expires: expiryDate,
      path: "/",
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // CSRF protection
    });
    
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}