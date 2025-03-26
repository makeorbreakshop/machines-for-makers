import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { Sidebar } from "@/components/admin/sidebar"
import LogoutButton from "@/components/admin/logout-button"
import { redirect } from 'next/navigation'

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

// Special layout for admin area - relies on middleware for auth protection
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simplified approach: Use client component rendering to handle layout
  // Authentication is handled by middleware so we don't need to check here
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 p-8">
            <div className="flex justify-end mb-4">
              <LogoutButton />
            </div>
            {children}
          </div>
        </div>
      </ThemeProvider>
    </div>
  )
}

