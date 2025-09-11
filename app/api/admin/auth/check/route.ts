import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "admin_auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(ADMIN_COOKIE_NAME);
    
    const isAuthenticated = !!authCookie && authCookie.value !== "";
    
    return NextResponse.json({ 
      authenticated: isAuthenticated 
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ 
      authenticated: false 
    });
  }
}