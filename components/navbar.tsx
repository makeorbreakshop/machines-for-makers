import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Tag } from "lucide-react"

export default function Navbar() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <Image src="/logo.svg" alt="Machines for Makers" width={40} height={40} className="h-10 w-auto" />
              <span className="sr-only">Machines for Makers</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              {/* Lasers Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium hover:text-primary">
                  Lasers
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Laser Types</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/lasers/desktop-diode-laser">Desktop Diode Lasers</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/lasers/desktop-galvo">Desktop Galvo Lasers</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/lasers/pro-gantry">Professional Gantry Lasers</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/lasers/desktop-gantry">Desktop Gantry Lasers</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/lasers/open-diode">Open Diode Lasers</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/lasers">View All Lasers</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3D Printers Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium hover:text-primary">
                  3D Printers
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/3d-printers">View All 3D Printers</Link>
                  </DropdownMenuItem>
                  {/* Add subcategories when available */}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* CNCs Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium hover:text-primary">CNCs</DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/cncs">View All CNCs</Link>
                  </DropdownMenuItem>
                  {/* Add subcategories when available */}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link 
                href="https://course.makeorbreakshop.com/learn-lightburn-for-lasers" 
                className="text-sm font-medium hover:text-primary"
                target="_blank" 
                rel="noopener noreferrer"
              >
                Learn Lightburn
              </Link>
              <Link href="/guides" className="text-sm font-medium hover:text-primary">
                Buying Guides
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <Link 
              href="/promo-codes" 
              className="hidden md:flex items-center mr-3 text-sm font-medium hover:text-primary"
            >
              <Tag className="h-4 w-4 mr-1.5" />
              Promo Codes
            </Link>
            <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
              <Link href="/compare">Compare Products</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

