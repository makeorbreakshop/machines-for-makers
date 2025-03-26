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
  const [detailedError, setDetailedError] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [apiDebugInfo, setApiDebugInfo] = useState<any>(null)
  const router = useRouter()
  
  // Check if already logged in based on cookie
  useEffect(() => {
    // Simple client-side check for auth cookie
    const cookies = document.cookie.split(';');
    const adminCookie = cookies.find(cookie => cookie.trim().startsWith("admin_auth="));
    const hasAuthCookie = !!adminCookie && adminCookie.trim() !== "admin_auth=";
    
    console.log("Login page mounted, has auth cookie:", hasAuthCookie);
    
    if (hasAuthCookie) {
      console.log("Already authenticated, redirecting to admin");
      router.push('/admin');
    }
  }, [router]);
  
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
    setDetailedError(null)

    try {
      console.log("Submitting login request")
      
      // Ensure the password is properly prepared for submission
      const cleanedPassword = password.trim();
      
      // Enhanced debug info
      const passwordInfo = {
        rawLength: password.length,
        cleanedLength: cleanedPassword.length,
        first3Chars: cleanedPassword.substring(0, 3),
        charCodes: [...cleanedPassword].map(c => c.charCodeAt(0))
      };
      console.log("Password debug info:", passwordInfo);
      
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({ password: cleanedPassword }),
        credentials: "include", // Include cookies in the request
        cache: "no-store"
      })

      const data = await response.json()
      
      console.log("Login response status:", response.status)
      console.log("Login response headers:", Object.fromEntries([...response.headers]))
      
      if (response.ok) {
        console.log("Login successful, redirecting")
        // Clear any loop detection
        sessionStorage.setItem('loginLoopCount', '0')
        
        // Add a log to check if cookies are set
        console.log("Cookies after login:", document.cookie);
        
        // Use a small delay to ensure the cookie is set before redirect
        setTimeout(() => {
          // Force a hard navigation to ensure the page is fully reloaded
          window.location.href = "/admin";
        }, 500)
      } else {
        console.log("Login failed:", data.message)
        setError(data.message || "Invalid password")
        setDetailedError({
          status: response.status,
          statusText: response.statusText,
          data: data
        })
        
        // Set API debug info if available
        if (data.debug) {
          setApiDebugInfo(data.debug)
          console.log("API debug info:", data.debug)
        }
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again.")
      setDetailedError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter your admin password to access the dashboard
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
            
            {detailedError && (
              <div className="text-xs text-red-500 overflow-auto max-h-24 bg-red-50 p-2 rounded border border-red-200">
                <pre>{JSON.stringify(detailedError, null, 2)}</pre>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? "Hide Debug" : "Show Debug"}
                </Button>
              </div>
              
              {showDebug && (
                <div className="mt-2 text-xs bg-slate-100 p-3 rounded border border-slate-200 space-y-2">
                  <div>
                    <strong>Password Value:</strong> {password}
                  </div>
                  <div>
                    <strong>Length:</strong> {password.length}
                  </div>
                  <div>
                    <strong>Trimmed Length:</strong> {password.trim().length}
                  </div>
                  <div>
                    <strong>First 3 Chars:</strong> {password.substring(0, 3)}
                  </div>
                  <div>
                    <strong>Character Codes:</strong>
                    <pre className="mt-1 bg-slate-200 p-1 rounded overflow-auto">
                      {JSON.stringify([...password].map(c => c.charCodeAt(0)), null, 2)}
                    </pre>
                  </div>
                  
                  {apiDebugInfo && (
                    <>
                      <div className="border-t border-slate-300 pt-2 mt-2">
                        <strong>API Debug Info:</strong>
                      </div>
                      <div>
                        <strong>ENV Password:</strong>
                        <pre className="mt-1 bg-slate-200 p-1 rounded overflow-auto">
                          {JSON.stringify(apiDebugInfo.envPasswordInfo, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <strong>Input Password:</strong>
                        <pre className="mt-1 bg-slate-200 p-1 rounded overflow-auto">
                          {JSON.stringify(apiDebugInfo.inputPasswordInfo, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Export the client component as the default export from the page
export default LoginPage 