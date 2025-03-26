"use client"

// Dynamic config exports must be in a separate file that's not marked "use client"
// These directives won't have any effect in client components 
// They should be in a separate server component file
// (Keeping them commented for reference)
// export const dynamic = 'force-dynamic';
// export const revalidate = 0;
// export const fetchCache = 'force-no-store';

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  // Check if we're in a redirect loop
  useEffect(() => {
    console.log("Login page mounted")
    // Add a marker in sessionStorage to detect loops
    const loopCount = parseInt(sessionStorage.getItem('loginLoopCount') || '0')
    sessionStorage.setItem('loginLoopCount', (loopCount + 1).toString())
    
    if (loopCount > 5) {
      console.error("Possible redirect loop detected")
      sessionStorage.setItem('loginLoopCount', '0')
    }
    
    return () => {
      console.log("Login page unmounted")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log("Submitting login request")
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log("Login successful, redirecting")
        // Clear any loop detection
        sessionStorage.setItem('loginLoopCount', '0')
        
        // Use a small delay to ensure the cookie is set before redirect
        setTimeout(() => {
          router.push("/admin")
          router.refresh()
        }, 100)
      } else {
        console.log("Login failed:", data.message)
        setError(data.message || "Invalid password")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl text-center">Admin Access</CardTitle>
          <CardDescription className="text-center">
            Enter the admin password to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Export the client component as the default export from the page
export default LoginPage 