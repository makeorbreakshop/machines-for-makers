import { NextResponse } from "next/server"

// Cookie name used for admin authentication
const ADMIN_COOKIE_NAME = "admin_auth"

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    )
    
    // Delete the auth cookie by setting it with an expired date
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: "",
      expires: new Date(0), // Set expiry to the past
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred during logout" },
      { status: 500 }
    )
  }
} 