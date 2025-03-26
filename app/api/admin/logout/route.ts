import { NextResponse } from "next/server"

// Cookie name used for admin authentication
const ADMIN_COOKIE_NAME = "admin_auth"

// Use edge runtime to ensure consistent behavior
export const runtime = 'edge';

export async function POST() {
  try {
    console.log("==== Logout API route called ====")
    
    // Create response
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { 
        status: 200,
        headers: {
          // Add additional cache control headers for auth endpoints
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
    
    // Delete the auth cookie by setting it with an expired date
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      expires: new Date(0), // Set expiry to the past
      path: "/",
    })
    
    console.log("Logout successful, cleared auth cookie")
    console.log("Set-Cookie header:", response.headers.get("Set-Cookie"))
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred during logout" },
      { status: 500 }
    )
  }
} 