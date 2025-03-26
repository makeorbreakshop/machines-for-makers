import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"

// Cookie settings
const ADMIN_COOKIE_NAME = "admin_auth"
const EXPIRY_TIME = 60 * 60 * 24 * 7 // 7 days in seconds

// Validate environment variable
if (!process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD environment variable must be set")
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      )
    }

    // Check if password matches using constant-time comparison
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      )
    }

    // Create response
    const response = NextResponse.json(
      { success: true, message: "Authentication successful" },
      { status: 200 }
    )

    // Generate a secure random token
    const tokenBytes = randomBytes(32)
    const timestamp = Date.now().toString()
    
    // Create a hash of the token with timestamp
    const hash = createHash("sha256")
    hash.update(tokenBytes)
    hash.update(timestamp)
    const sessionToken = hash.digest("base64")

    // Set authentication cookie
    const now = new Date()
    const expiryDate = new Date(now.getTime() + EXPIRY_TIME * 1000)

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: `${sessionToken}.${timestamp}`,
      expires: expiryDate,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    )
  }
}