"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Layers, Tag, Star, Building, Settings, LogOut, Image, Wrench, LineChart, Globe, Search, Link as LinkIcon, Mail } from "lucide-react"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/machines", label: "Machines", icon: Layers },
  { href: "/admin/discovery-unified", label: "Discovery Pipeline", icon: Search },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/brands", label: "Brands", icon: Building },
  { href: "/admin/email-signups", label: "Email Signups", icon: Mail },
  { href: "/admin/tools/machine-scraper", label: "Machine Scraper", icon: Wrench },
  { href: "/admin/tools/price-tracker", label: "Price Tracker", icon: LineChart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/logo", label: "Logo", icon: Image },
]

export function Sidebar() {
  const pathname = usePathname() || ""

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen p-4">
      <div className="mb-8 px-4 py-3">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                isActive ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-4 w-52">
        <Link
          href="/"
          className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Back to Site
        </Link>
      </div>
    </div>
  )
}

