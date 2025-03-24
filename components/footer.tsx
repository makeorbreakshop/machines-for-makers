import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">Machines for Makers</h3>
            <p className="text-muted-foreground text-sm">
              Comprehensive reviews and comparisons of lasers, 3D printers, CNCs, and other maker technologies.
            </p>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Machines for Makers. All rights reserved.
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-4">Products</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/lasers" className="text-muted-foreground hover:text-foreground">
                  Lasers
                </Link>
              </li>
              <li>
                <Link href="/3d-printers" className="text-muted-foreground hover:text-foreground">
                  3D Printers
                </Link>
              </li>
              <li>
                <Link href="/cncs" className="text-muted-foreground hover:text-foreground">
                  CNCs
                </Link>
              </li>
            </ul>

            <h4 className="font-medium mt-6 mb-4">Laser Categories</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/lasers/desktop-diode-laser" className="text-muted-foreground hover:text-foreground">
                  Desktop Diode Lasers
                </Link>
              </li>
              <li>
                <Link href="/lasers/desktop-galvo" className="text-muted-foreground hover:text-foreground">
                  Desktop Galvo Lasers
                </Link>
              </li>
              <li>
                <Link href="/lasers/pro-gantry" className="text-muted-foreground hover:text-foreground">
                  Professional Gantry Lasers
                </Link>
              </li>
              <li>
                <Link href="/lasers/desktop-gantry" className="text-muted-foreground hover:text-foreground">
                  Desktop Gantry Lasers
                </Link>
              </li>
              <li>
                <Link href="/lasers/open-diode" className="text-muted-foreground hover:text-foreground">
                  Open Diode Lasers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/learn-lightburn" className="text-muted-foreground hover:text-foreground">
                  Learn Lightburn
                </Link>
              </li>
              <li>
                <Link href="/buying-guides" className="text-muted-foreground hover:text-foreground">
                  Buying Guides
                </Link>
              </li>
              <li>
                <Link href="/promo-codes" className="text-muted-foreground hover:text-foreground">
                  Promo Codes
                </Link>
              </li>
              <li>
                <Link href="/youtube" className="text-muted-foreground hover:text-foreground">
                  YouTube
                </Link>
              </li>
              <li>
                <Link href="/guides/choosing-a-laser" className="text-muted-foreground hover:text-foreground">
                  How to Choose a Laser
                </Link>
              </li>
              <li>
                <Link href="/guides/choosing-a-3d-printer" className="text-muted-foreground hover:text-foreground">
                  How to Choose a 3D Printer
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="text-muted-foreground hover:text-foreground">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

