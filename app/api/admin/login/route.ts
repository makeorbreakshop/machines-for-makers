import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// In production, use a real environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin_password_change_me"

// Cookie settings
const ADMIN_COOKIE_NAME = "admin_auth"
const EXPIRY_TIME = 60 * 60 * 24 * 7 // 7 days in seconds

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required" },
        { status: 400 }
      )
    }

    // Check if password matches
    if (password !== ADMIN_PASSWORD) {
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

    // Create a session token (in a real app, use a more secure token generation method)
    const sessionToken = Buffer.from(
      `authenticated-${Date.now()}-${Math.random()}`
    ).toString("base64")

    // Set authentication cookie
    const now = new Date()
    const expiryDate = new Date(now.getTime() + EXPIRY_TIME * 1000)

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: sessionToken,
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