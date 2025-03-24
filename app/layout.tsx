import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ComparisonProvider } from "@/context/comparison-context"
import ComparisonBar from "@/components/comparison-bar"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Machines for Makers - Laser Cutter Reviews & Comparisons",
  description:
    "Find the perfect laser cutter or engraver for your needs with comprehensive reviews, detailed comparisons, and expert recommendations.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ComparisonProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <ComparisonBar />
            </div>
          </ComparisonProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'