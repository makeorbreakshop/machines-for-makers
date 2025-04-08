"use client"

import Link from "next/link"
import { Tag, Laptop2, Tv, FlameKindling, Menu, X, Flame } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export default function Navbar() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  useEffect(() => {
    // Fetch logo URL when component mounts
    const fetchLogoUrl = async () => {
      try {
        const response = await fetch('/api/logo')
        const data = await response.json()
        setLogoUrl(data.url)
      } catch (error) {
        console.error('Error fetching logo URL:', error)
      }
    }
    
    fetchLogoUrl()
  }, [])
  
  // Close menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMenuOpen])

  return (
    <header className="border-b relative z-30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <div className="h-10 w-[150px] relative">
                {logoUrl ? (
                  <Image 
                    src={logoUrl}
                    alt="Machines for Makers"
                    fill
                    quality={90}
                    priority
                    sizes="150px"
                    style={{
                      objectFit: 'contain',
                      objectPosition: 'left center'
                    }}
                  />
                ) : (
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
                )}
              </div>
              <span className="sr-only">Machines for Makers</span>
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
                href="/laser-material-library" 
                className="flex items-center text-sm font-medium hover:text-primary"
              >
                <FlameKindling className="h-4 w-4 mr-1.5" />
                Material Library
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
                href="/learn-lightburn-for-lasers" 
                className="flex items-center text-sm font-medium hover:text-primary"
              >
                <Flame className="h-4 w-4 mr-1.5" />
                Learn Lightburn
              </Link>
            </nav>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {/* Mobile Menu */}
        <div 
          className={cn(
            "fixed inset-0 z-50 bg-white md:hidden transition-transform duration-300 ease-in-out transform",
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ top: '61px' }} // Height of the header
        >
          <nav className="flex flex-col p-6 space-y-6 border-t">
            <Link 
              href="/compare" 
              className="flex items-center text-lg font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              <Laptop2 className="h-5 w-5 mr-2" />
              Compare Products
            </Link>
            <Link 
              href="/laser-material-library" 
              className="flex items-center text-lg font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              <FlameKindling className="h-5 w-5 mr-2" />
              Material Library
            </Link>
            <Link 
              href="/promo-codes" 
              className="flex items-center text-lg font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              <Tag className="h-5 w-5 mr-2" />
              Promo Codes
            </Link>
            <Link 
              href="https://www.youtube.com/@makeorbreakshop" 
              className="flex items-center text-lg font-medium hover:text-primary"
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
            >
              <Tv className="h-5 w-5 mr-2" />
              YouTube
            </Link>
            <Link 
              href="/learn-lightburn-for-lasers" 
              className="flex items-center text-lg font-medium hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              <Flame className="h-5 w-5 mr-2" />
              Learn Lightburn
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

