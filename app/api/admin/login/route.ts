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

// Clean the environment variable
// This removes any whitespace, quotes, or other characters that might be added
// when setting environment variables in different platforms
const cleanEnvPassword = process.env.ADMIN_PASSWORD.trim()
  .replace(/^['"](.*)['"]$/, '$1') // Remove surrounding quotes if present
  .replace(/\r|\n/g, '') // Remove any line breaks

// Log that password exists but not its value
console.log("ADMIN_PASSWORD exists in env, raw length:", process.env.ADMIN_PASSWORD.length)
console.log("ADMIN_PASSWORD cleaned length:", cleanEnvPassword.length)
console.log("ADMIN_PASSWORD first 3 chars:", cleanEnvPassword.substring(0, 3))

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

    // Clean the input password the same way we cleaned the environment variable
    const cleanInputPassword = password.trim()
      .replace(/^['"](.*)['"]$/, '$1') // Remove surrounding quotes if present
      .replace(/\r|\n/g, '') // Remove any line breaks

    // Add more debugging
    console.log("Raw password from request, length:", password.length)
    console.log("Cleaned password length:", cleanInputPassword.length)
    console.log("Password first 3 chars:", cleanInputPassword.substring(0, 3))
    console.log("ENV password length:", cleanEnvPassword.length)
    console.log("ENV first 3 chars:", cleanEnvPassword.substring(0, 3))
    
    // For debugging, log character codes of first few chars to detect encoding issues
    console.log("Input password char codes:", 
      [...cleanInputPassword.substring(0, 3)].map(c => c.charCodeAt(0)))
    console.log("ENV password char codes:", 
      [...cleanEnvPassword.substring(0, 3)].map(c => c.charCodeAt(0)))
    
    // More detailed debugging - full character codes
    console.log("Complete input password char codes:", 
      [...cleanInputPassword].map(c => c.charCodeAt(0)))
    console.log("Complete ENV password char codes:", 
      [...cleanEnvPassword].map(c => c.charCodeAt(0)))

    // Check if password matches - use cleaned versions of both
    const passwordMatches = cleanInputPassword === cleanEnvPassword
    console.log("Password validation:", passwordMatches ? "Success" : "Failed")

    // If still fails, try a hardcoded temporary password for testing
    // This is a temporary measure to diagnose the issue
    const tempPasswordMatches = cleanInputPassword === "admin123"
    console.log("Temp password match:", tempPasswordMatches)
    
    // Also try comparing without case sensitivity as a fallback
    const caseInsensitiveMatch = cleanInputPassword.toLowerCase() === cleanEnvPassword.toLowerCase()
    console.log("Case insensitive match:", caseInsensitiveMatch)

    if (!passwordMatches && !tempPasswordMatches && !caseInsensitiveMatch) {
      // Prepare detailed debugging information
      const debugInfo = {
        envPasswordInfo: {
          length: cleanEnvPassword.length,
          first3Chars: cleanEnvPassword.substring(0, 3),
          charCodes: [...cleanEnvPassword].map(c => c.charCodeAt(0))
        },
        inputPasswordInfo: {
          length: cleanInputPassword.length,
          first3Chars: cleanInputPassword.substring(0, 3),
          charCodes: [...cleanInputPassword].map(c => c.charCodeAt(0))
        }
      };
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid password", 
          debug: debugInfo 
        },
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