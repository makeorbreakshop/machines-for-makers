'use client'

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ListFilter, Tag, Laptop2, Tv } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ComparisonProvider } from "@/context/comparison-context"
import ComparisonBar from "@/components/comparison-bar"

// Note: metadata can't be used in client components
// Metadata is handled automatically for 404 pages by Next.js

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function GlobalNotFound() {
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <ComparisonProvider>
          <div className="flex min-h-screen flex-col">
            {/* Navbar with all links from the original navbar */}
            <header className="border-b">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    <Link href="/" className="flex items-center">
                      <div 
                        className="w-12 h-12 flex items-center justify-center"
                        style={{ backgroundColor: '#30A9DE' }}
                      >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="8" y="5" width="10" height="10" rx="1" fill="white" />
                          <path d="M13 15 L10 18 L16 18 Z" fill="white" />
                          <path d="M13 21 L10 24 L13 27 L16 24 L13 21" stroke="white" strokeWidth="1.5" fill="none" />
                          
                          <circle cx="13" cy="30" r="5" fill="white" />
                          <circle cx="11" cy="30" r="1.5" fill="#30A9DE" />
                          <circle cx="15" cy="30" r="1.5" fill="#30A9DE" />
                          <path d="M11 33 L15 33" stroke="#30A9DE" strokeWidth="1" />
                          
                          <path d="M26 5 C30 5, 30 5, 30 5, 30 5, 30 12, 30 12, 30 12, 26 12, 26 12" stroke="white" strokeWidth="1.5" fill="none" />
                          <rect x="23" y="7" width="4" height="3" fill="white" />
                          <path d="M30 16 L23 16" stroke="white" strokeWidth="1.5" />
                          <path d="M30 20 L23 20" stroke="white" strokeWidth="1.5" />
                          
                          <rect x="25" y="24" width="6" height="3" rx="1" fill="white" />
                          <path d="M26 27 L24 32 L32 32 L30 27" fill="white" />
                        </svg>
                      </div>
                      <span className="ml-2 font-medium text-lg">Machines for Makers</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-6">
                      <Link 
                        href="/compare" 
                        className="flex items-center text-sm font-medium hover:text-primary"
                      >
                        <Laptop2 className="h-4 w-4 mr-1.5" />
                        Compare Products
                      </Link>
                      <Link 
                        href="/promo-codes" 
                        className="flex items-center text-sm font-medium hover:text-primary"
                      >
                        <Tag className="h-4 w-4 mr-1.5" />
                        Promo Codes
                      </Link>
                      <Link 
                        href="https://www.youtube.com/@makeorbreakshop" 
                        className="flex items-center text-sm font-medium hover:text-primary"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Tv className="h-4 w-4 mr-1.5" />
                        YouTube
                      </Link>
                      <Link 
                        href="https://makeorbreakshop.mykajabi.com/learn-lightburn-for-lasers" 
                        className="text-sm font-medium hover:text-primary"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Learn Lightburn
                      </Link>
                    </nav>
                  </div>
                </div>
              </div>
            </header>
            <main className="flex-1">
              <div className="container mx-auto py-16 px-4">
                <Card className="mx-auto max-w-3xl border shadow-md">
                  <CardContent className="flex flex-col items-center text-center p-8">
                    <h1 className="text-6xl font-bold mb-6 text-primary">404</h1>
                    <h2 className="text-2xl font-semibold mb-4">This page could not be found</h2>
                    <p className="text-muted-foreground max-w-md mb-8">
                      The page you are looking for might have been removed, had its name changed, 
                      or is temporarily unavailable.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button asChild size="lg" className="gap-2">
                        <Link href="/">
                          <Home className="h-5 w-5" />
                          <span>Browse Products</span>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="gap-2">
                        <Link href="/compare">
                          <ListFilter className="h-5 w-5" />
                          <span>Compare Products</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
            <div className="border-t py-8 bg-muted/40">
              <div className="container mx-auto px-4">
                <div className="text-center text-sm text-muted-foreground">
                  <p>© {new Date().getFullYear()} Machines for Makers. All rights reserved.</p>
                </div>
              </div>
            </div>
            <ComparisonBar />
          </div>
        </ComparisonProvider>
      </ThemeProvider>
    </div>
  )
} 