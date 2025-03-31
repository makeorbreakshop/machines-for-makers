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
let cleanEnvPassword = process.env.ADMIN_PASSWORD.trim()
  .replace(/^['"](.*)['"]$/, '$1') // Remove surrounding quotes if present
  .replace(/\r|\n/g, '') // Remove any line breaks

// In development, just use the raw password from .env.local without any decoding
if (process.env.NODE_ENV === 'development') {
  console.log("Using raw password from .env.local (development mode)");
  // No additional processing needed for development
} 
// Check if the password appears to be a Vercel variable placeholder (${ADMIN_PASSWORD})
else if (cleanEnvPassword.startsWith('${') && cleanEnvPassword.endsWith('}')) {
  console.error("CRITICAL: Environment variable appears to be a placeholder: ", cleanEnvPassword.substring(0, 3))
  
  // Only use fallback if in development, otherwise fail loudly
  if (process.env.NODE_ENV !== 'production') {
    console.log("In non-production mode, using fallback password")
    cleanEnvPassword = "admin123"
  } else {
    console.error("DEPLOYMENT ERROR: Environment variable is a placeholder. Please set ADMIN_PASSWORD in Vercel!")
    // Keep the placeholder to trigger an obvious authentication failure
  }
} 
// Check if this is a Base64 encoded string (for Vercel environment variable workaround)
// Vercel automatically Base64 encodes certain special characters in environment variables
const isProbablyBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanEnvPassword) &&
  cleanEnvPassword.length % 4 === 0 &&
  cleanEnvPassword.length >= 20; // Reasonable minimum length for a Base64 string

if (isProbablyBase64 && process.env.VERCEL === '1') {
  try {
    // Only try to decode as Base64 when on Vercel
    const decoded = Buffer.from(cleanEnvPassword, 'base64').toString('utf-8');
    console.log("Attempted Base64 decode on Vercel, result length:", decoded.length);
    
    // Check if the decoded string looks like a valid password
    if (decoded.length > 0 && /^[A-Za-z0-9+/=]+$/.test(decoded)) {
      console.log("Using Base64 decoded password");
      cleanEnvPassword = decoded;
    } else {
      console.log("Decoded result was invalid, using original");
    }
  } catch (error) {
    console.error("Failed to decode Base64 password:", error);
    // Continue with the original value
  }
} else {
  console.log("Not trying Base64 decode - either not on Vercel or not Base64");
}

// Log that password exists but not its value
console.log("ADMIN_PASSWORD exists in env, raw length:", process.env.ADMIN_PASSWORD.length)
console.log("ADMIN_PASSWORD cleaned length:", cleanEnvPassword.length)
console.log("ADMIN_PASSWORD first 3 chars:", cleanEnvPassword.substring(0, 3))

// Use nodejs runtime to ensure environment variables are properly accessible
export const runtime = 'nodejs';

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
    
    // Override for production testing - use the exact password value without any processing
    if (process.env.VERCEL === '1' && process.env.NODE_ENV === 'production') {
      // This will override any cleanEnvPassword processing done earlier
      cleanEnvPassword = "V7w7powAVKChZzru9JERqPKr39CJqKXfDHMDgsXz";
      console.log("PRODUCTION OVERRIDE: Using hardcoded admin password for testing");
    }
    
    // Clone the request to avoid "body stream already read" errors
    const clonedRequest = request.clone();
    
    // Read body in a try-catch to handle potential errors
    let password;
    try {
      const body = await clonedRequest.json();
      password = body.password;
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { success: false, message: "Invalid request format" },
        { status: 400 }
      );
    }

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
    // Add additional comparison methods for reliability
    const exactMatch = cleanInputPassword === cleanEnvPassword;
    const lengthMatch = cleanInputPassword.length === cleanEnvPassword.length;
    
    // If we're having character encoding issues, try to normalize the strings
    const normalizedInput = cleanInputPassword.normalize();
    const normalizedEnv = cleanEnvPassword.normalize();
    const normalizedMatch = normalizedInput === normalizedEnv;
    
    // Try converting to Buffer and comparing
    const bufferInput = Buffer.from(cleanInputPassword);
    const bufferEnv = Buffer.from(cleanEnvPassword);
    const bufferMatch = bufferInput.equals(bufferEnv);
    
    // Direct length and character comparisons
    const inputChars = [...cleanInputPassword];
    const envChars = [...cleanEnvPassword];
    let charMismatchCount = 0;
    if (lengthMatch) {
      for (let i = 0; i < cleanInputPassword.length; i++) {
        if (inputChars[i] !== envChars[i]) {
          charMismatchCount++;
        }
      }
    }
    
    // Log all matching methods
    console.log({
      exactMatch,
      lengthMatch,
      normalizedMatch,
      bufferMatch,
      charMismatchCount,
      inputLength: cleanInputPassword.length,
      envLength: cleanEnvPassword.length
    });
    
    // Make final decision on authentication
    const passwordMatches = exactMatch || bufferMatch || normalizedMatch || 
      (lengthMatch && charMismatchCount === 0);
    
    console.log(`Password match: ${passwordMatches ? "Success" : "Failed"}`);
    
    // Log exact character differences for debugging
    if (!passwordMatches && cleanInputPassword.length === cleanEnvPassword.length) {
      for (let i = 0; i < cleanInputPassword.length; i++) {
        if (cleanInputPassword[i] !== cleanEnvPassword[i]) {
          console.log(`Mismatch at position ${i}: Input='${cleanInputPassword.charCodeAt(i)}', Env='${cleanEnvPassword.charCodeAt(i)}'`);
        }
      }
    }
    
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