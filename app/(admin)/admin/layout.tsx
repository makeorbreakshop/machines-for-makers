import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { CleanSidebar } from "@/components/admin/sidebar-clean"
import LogoutButton from "@/components/admin/logout-button"

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
// Add nodejs runtime as per DEVELOPMENT_GUIDELINES for admin routes
export const runtime = 'nodejs';

// Admin layout - middleware handles authentication
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
          <CleanSidebar />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white dark:bg-gray-900 px-6 md:px-8">
              <div className="flex items-center gap-4 md:hidden">
                <div className="w-10" /> {/* Spacer for mobile menu button */}
                <h1 className="text-lg font-semibold">Admin</h1>
              </div>
              <div className="md:ml-auto ml-auto">
                <LogoutButton />
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </ThemeProvider>
    </div>
  )
}