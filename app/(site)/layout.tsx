import React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ComparisonProvider } from "@/context/comparison-context"
import ComparisonBar from "@/components/comparison-bar"
import Providers from "@/app/providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <Providers>
          <ComparisonProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <ComparisonBar />
            </div>
          </ComparisonProvider>
        </Providers>
      </ThemeProvider>
    </div>
  )
} 