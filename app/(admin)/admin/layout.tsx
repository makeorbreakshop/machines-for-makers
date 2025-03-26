import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { Sidebar } from "@/components/admin/sidebar"
import LogoutButton from "@/components/admin/logout-button"
import AuthProvider from "@/components/admin/auth-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Admin Dashboard - Machines for Makers",
  description: "Admin dashboard for managing Machines for Makers content",
  other: {
    'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

// Dynamic configuration for server components
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Admin layout - each page will handle its own authentication
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        {/* AuthProvider handles authentication for all admin pages */}
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">
              <div className="flex justify-end mb-4">
                <LogoutButton />
              </div>
              {children}
            </div>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </div>
  )
}

