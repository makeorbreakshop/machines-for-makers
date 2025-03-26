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
    console.log("==== Login API route called ====")
    const { password } = await request.json()

    if (!password) {
      console.log("Missing password in request")
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      )
    }

    // Check if password matches
    const passwordMatches = password === process.env.ADMIN_PASSWORD
    console.log("Password validation:", passwordMatches ? "Success" : "Failed")

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      )
    }

    // Generate a secure random token
    const tokenBytes = randomBytes(32)
    const timestamp = Date.now().toString()
    
    // Create a hash of the token with timestamp
    const hash = createHash("sha256")
    hash.update(tokenBytes)
    hash.update(timestamp)
    const sessionToken = hash.digest("base64")
    
    // Set expiry date
    const now = new Date()
    const expiryDate = new Date(now.getTime() + EXPIRY_TIME * 1000)
    
    // Create the cookie value
    const cookieValue = `${sessionToken}.${timestamp}`
    console.log("Setting cookie:", ADMIN_COOKIE_NAME)
    console.log("Cookie expires:", expiryDate.toISOString())

    // Create response with proper headers
    const response = NextResponse.json(
      { 
        success: true, 
        message: "Authentication successful",
        redirectTo: "/admin"
      },
      { status: 200 }
    )

    // Set authentication cookie with precise options
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: cookieValue,
      expires: expiryDate,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })
    
    console.log("Login successful, returning response with cookie")
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, message: "An error occurred" },
      { status: 500 }
    )
  }
}