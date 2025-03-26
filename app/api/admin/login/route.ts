import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Cookie settings
const ADMIN_COOKIE_NAME = "admin_auth"
const EXPIRY_TIME = 60 * 60 * 24 * 7 // 7 days in seconds

// Validate environment variable
if (!process.env.ADMIN_PASSWORD) {
  console.error("CRITICAL: ADMIN_PASSWORD environment variable is not set!")
  throw new Error("ADMIN_PASSWORD environment variable must be set")
}

// Log that password exists but not its value
console.log("ADMIN_PASSWORD exists in env, length:", process.env.ADMIN_PASSWORD.length)
console.log("ADMIN_PASSWORD first 3 chars:", process.env.ADMIN_PASSWORD.substring(0, 3))

// Use edge runtime to ensure consistent behavior
export const runtime = 'edge';

// Helper function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to generate random bytes using Web Crypto API
async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Helper to create SHA-256 hash using Web Crypto API
async function createSHA256Hash(data: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.digest('SHA-256', data);
}

export async function POST(request: Request) {
  try {
    console.log("==== Login API route called ====")
    const { password } = await request.json()

    if (!password) {
      console.log("Missing password in request")
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      )
    }

    // Add more debugging
    console.log("Password from request, length:", password.length)
    console.log("Password first 3 chars:", password.substring(0, 3))
    console.log("ENV password length:", process.env.ADMIN_PASSWORD?.length || 0)
    console.log("ENV first 3 chars:", process.env.ADMIN_PASSWORD?.substring(0, 3))

    // Check if password matches
    const passwordMatches = password === process.env.ADMIN_PASSWORD
    console.log("Password validation:", passwordMatches ? "Success" : "Failed")

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      )
    }

    // Generate a secure random token using Web Crypto API
    const tokenBytes = await generateRandomBytes(32);
    const timestamp = Date.now().toString();
    
    // Create a combined buffer for hashing
    const combinedBuffer = new Uint8Array(tokenBytes.length + timestamp.length);
    combinedBuffer.set(tokenBytes, 0);
    combinedBuffer.set(new TextEncoder().encode(timestamp), tokenBytes.length);
    
    // Create a hash using Web Crypto API
    const hashBuffer = await createSHA256Hash(combinedBuffer);
    const sessionToken = arrayBufferToBase64(hashBuffer);
    
    // Set expiry date
    const now = new Date();
    const expiryDate = new Date(now.getTime() + EXPIRY_TIME * 1000);
    
    // Create the cookie value
    const cookieValue = `${sessionToken}.${timestamp}`;
    console.log("Setting cookie:", ADMIN_COOKIE_NAME);
    console.log("Cookie expires:", expiryDate.toISOString());

    // Create response with proper headers
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Authentication successful",
        redirectTo: "/admin"
      },
      { 
        status: 200,
        headers: {
          // Add additional cache control headers for auth endpoints
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );

    // Set authentication cookie with precise options
    // Note: Use a shorter path to ensure the cookie is available
    // on all paths, and is properly accessible by client-side JavaScript
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: cookieValue,
      expires: expiryDate,
      path: "/",
      httpOnly: false, // Set to false so we can read it from JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    
    console.log("Login successful, returning response with cookie");
    console.log("Set-Cookie header:", response.headers.get("Set-Cookie"));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}