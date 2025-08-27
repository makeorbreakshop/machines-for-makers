"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Layers, 
  Settings, 
  ArrowLeft,
  Image, 
  Wrench, 
  LineChart, 
  Search, 
  Link as LinkIcon, 
  Mail, 
  BarChart3, 
  Gift,
  ChevronRight,
  Home,
  Building2,
  Package,
  ScrollText,
  Sparkles,
  FileText,
  Users,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Main navigation items grouped by category
const mainNavigation = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        badge: null,
      },
      {
        title: "Analytics",
        href: "/admin/analytics", 
        icon: BarChart3,
        badge: null,
      },
    ],
  },
  {
    title: "Content Management",
    items: [
      {
        title: "Machines",
        href: "/admin/machines",
        icon: Layers,
        badge: null,
        subitems: [
          { title: "All Machines", href: "/admin/machines" },
          { title: "Brands", href: "/admin/machines?tab=brands" },
          { title: "Categories", href: "/admin/machines?tab=categories" },
          { title: "Reviews", href: "/admin/machines?tab=reviews" },
        ],
      },
      {
        title: "Discovery Pipeline",
        href: "/admin/discovery-unified",
        icon: Search,
        badge: "New",
        badgeVariant: "default",
      },
    ],
  },
  {
    title: "Marketing & Growth",
    items: [
      {
        title: "Lead Magnets",
        href: "/admin/lead-magnets",
        icon: Gift,
        badge: null,
      },
      {
        title: "Short Links",
        href: "/admin/links",
        icon: LinkIcon,
        badge: null,
      },
      {
        title: "Email Signups",
        href: "/admin/email-signups",
        icon: Mail,
        badge: null,
      },
    ],
  },
  {
    title: "Tools & Utilities",
    items: [
      {
        title: "Machine Scraper",
        href: "/admin/tools/machine-scraper",
        icon: Wrench,
        badge: null,
      },
      {
        title: "Price Tracker",
        href: "/admin/tools/price-tracker",
        icon: LineChart,
        badge: null,
      },
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
        badge: null,
      },
      {
        title: "Logo",
        href: "/admin/logo",
        icon: Image,
        badge: null,
      },
    ],
  },
]

export function ModernSidebar() {
  const pathname = usePathname() || ""
  const { state } = useSidebar()
  const [openGroups, setOpenGroups] = React.useState<string[]>([])

  React.useEffect(() => {
    // Auto-expand groups that contain the active route
    const activeGroups = mainNavigation
      .filter(group => 
        group.items.some(item => 
          pathname === item.href || 
          pathname.startsWith(`${item.href}/`) ||
          item.subitems?.some(sub => pathname === sub.href)
        )
      )
      .map(group => group.title)
    
    setOpenGroups(prev => [...new Set([...prev, ...activeGroups])])
  }, [pathname])

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(t => t !== groupTitle)
        : [...prev, groupTitle]
    )
  }

  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/admin" className="flex items-center gap-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                    <Package className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Admin Panel</span>
                    <span className="text-xs text-muted-foreground">Machines for Makers</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        
        <SidebarContent className="gap-0">
          {mainNavigation.map((group) => (
            <Collapsible
              key={group.title}
              open={openGroups.includes(group.title)}
              onOpenChange={() => toggleGroup(group.title)}
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel className="group/label text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-0">
                    {group.title}
                    <ChevronRight className={cn(
                      "size-4 transition-transform duration-200",
                      openGroups.includes(group.title) && "rotate-90"
                    )} />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href || 
                          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
                        const hasSubitems = item.subitems && item.subitems.length > 0
                        const isSubitemActive = item.subitems?.some(sub => pathname === sub.href)
                        
                        return (
                          <React.Fragment key={item.href}>
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive || isSubitemActive}
                                tooltip={state === "collapsed" ? item.title : undefined}
                                className={cn(
                                  "transition-colors",
                                  (isActive || isSubitemActive) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                )}
                              >
                                <Link href={item.href}>
                                  <item.icon className="size-4" />
                                  <span>{item.title}</span>
                                  {hasSubitems && (
                                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-90" />
                                  )}
                                </Link>
                              </SidebarMenuButton>
                              {item.badge && (
                                <SidebarMenuBadge className="bg-primary text-primary-foreground">
                                  {item.badge}
                                </SidebarMenuBadge>
                              )}
                            </SidebarMenuItem>
                            
                            {hasSubitems && isSubitemActive && (
                              <SidebarMenuSub>
                                {item.subitems?.map((subitem) => {
                                  const isSubActive = pathname === subitem.href
                                  return (
                                    <SidebarMenuSubItem key={subitem.href}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubActive}
                                        className={cn(
                                          isSubActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                        )}
                                      >
                                        <Link href={subitem.href}>
                                          <span>{subitem.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )
                                })}
                              </SidebarMenuSub>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ))}
          
          {/* Quick Stats */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg bg-sidebar-accent/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active Machines</span>
                  <span className="font-semibold">174</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pending Reviews</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">3</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Today's Signups</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+12</span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="w-full">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-sm font-medium">Admin User</span>
                      <span className="text-xs text-muted-foreground">admin@machinesformakers.com</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings" className="flex items-center">
                      <Settings className="mr-2 size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center">
                      <Home className="mr-2 size-4" />
                      Back to Site
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 dark:text-red-400">
                    <ArrowLeft className="mr-2 size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}