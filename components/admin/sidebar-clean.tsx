"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Package,
  Search,
  Gift,
  Link as LinkIcon,
  Mail,
  BarChart3,
  Settings,
  Wrench,
  LineChart,
  Image,
  LogOut,
  ChevronDown,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  children?: Array<{
    title: string
    href: string
  }>
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        title: "Machines",
        href: "/admin/machines",
        icon: Package,
        children: [
          { title: "All Machines", href: "/admin/machines" },
          { title: "Brands", href: "/admin/machines?tab=brands" },
          { title: "Categories", href: "/admin/machines?tab=categories" },
          { title: "Reviews", href: "/admin/machines?tab=reviews" },
        ],
      },
      {
        title: "Discovery",
        href: "/admin/discovery-unified",
        icon: Search,
        badge: "3",
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        title: "Lead Magnets",
        href: "/admin/lead-magnets",
        icon: Gift,
      },
      {
        title: "Short Links",
        href: "/admin/links",
        icon: LinkIcon,
      },
      {
        title: "Email Signups",
        href: "/admin/email-signups",
        icon: Mail,
      },
    ],
  },
  {
    title: "Tools",
    items: [
      {
        title: "Scraper",
        href: "/admin/tools/machine-scraper",
        icon: Wrench,
      },
      {
        title: "Price Tracker",
        href: "/admin/tools/price-tracker",
        icon: LineChart,
      },
    ],
  },
]

const bottomNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Logo",
    href: "/admin/logo",
    icon: Image,
  },
]

function NavItemComponent({ 
  item, 
  isActive,
  isChild = false 
}: { 
  item: NavItem
  isActive: boolean
  isChild?: boolean
}) {
  const Icon = item.icon
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasChildren = item.children && item.children.length > 0
  const pathname = usePathname()

  // Check if any child is active
  const isChildActive = item.children?.some(child => 
    pathname === child.href || pathname?.startsWith(`${child.href}/`)
  )

  React.useEffect(() => {
    if (isChildActive) {
      setIsExpanded(true)
    }
  }, [isChildActive])

  const content = (
    <>
      <div className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isActive || isChildActive
          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
          : "text-gray-600 dark:text-gray-400",
        isChild && "ml-9 py-1.5"
      )}>
        {!isChild && <Icon className="h-4 w-4" />}
        <span className="flex-1">{item.title}</span>
        {item.badge && (
          <Badge 
            variant="secondary" 
            className="ml-auto h-5 px-1.5 text-xs font-normal"
          >
            {item.badge}
          </Badge>
        )}
        {hasChildren && !isChild && (
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        )}
      </div>
    </>
  )

  if (hasChildren && !isChild) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          {content}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => {
              const childActive = pathname === child.href || 
                (pathname?.startsWith(`${child.href}/`) && child.href !== "/admin")
              return (
                <Link key={child.href} href={child.href}>
                  <div className={cn(
                    "ml-9 rounded-lg px-3 py-1.5 text-sm transition-all",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    childActive
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50 font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  )}>
                    {child.title}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link href={item.href}>
      {content}
    </Link>
  )
}

function SidebarContent() {
  const pathname = usePathname() || ""

  return (
    <div className="flex h-full flex-col">
      {/* Logo/Brand */}
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900">
            <Package className="h-4 w-4" />
          </div>
          <span className="text-lg">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (pathname.startsWith(`${item.href}/`) && item.href !== "/admin")
                  return (
                    <NavItemComponent 
                      key={item.href} 
                      item={item} 
                      isActive={isActive}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="border-t p-3">
        <div className="mb-3 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <NavItemComponent 
                key={item.href} 
                item={item} 
                isActive={isActive}
              />
            )
          })}
        </div>
        
        <Separator className="my-3" />
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 px-3 py-2 h-auto font-normal"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col items-start text-left">
                <span className="text-sm font-medium">Admin User</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  admin@machines.com
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/" className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Back to Site
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function CleanSidebar() {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-3 z-40 md:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Always visible on medium screens and up */}
      <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-gray-900 border-r flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}