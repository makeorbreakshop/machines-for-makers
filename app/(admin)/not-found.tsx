import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Settings } from "lucide-react"
import { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "404 - Page Not Found | Admin Dashboard",
  description: "Sorry, the admin page you're looking for cannot be found.",
}

export default function AdminNotFound() {
  // Auth is handled by middleware for all admin routes
  
  return (
    <div className="container mx-auto py-16 px-4">
      <Card className="mx-auto max-w-3xl border shadow-md">
        <CardContent className="flex flex-col items-center text-center p-8">
          <h1 className="text-6xl font-bold mb-6 text-primary">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Admin Page Not Found</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            The admin page you are looking for might have been removed, had its name changed, 
            or is temporarily unavailable.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/admin">
                <Home className="h-5 w-5" />
                <span>Admin Dashboard</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/admin/settings">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 