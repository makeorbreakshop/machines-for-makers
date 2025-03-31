import Link from "next/link"
import { Tag, Laptop2, Tv, FlameKindling } from "lucide-react"
import Image from "next/image"
import { createServerClient } from "@/lib/supabase/server"

export default async function Navbar() {
  // Fetch logo URL from site settings
  const supabase = createServerClient()
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "logo_url")
    .single()
  
  const logoUrl = data?.value || null

  return (
    <header className="border-b">
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
  )
}

