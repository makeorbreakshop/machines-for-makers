"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Client-side auth provider that redirects to login if not authenticated
 * Wrap this around all admin pages/areas that require authentication
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Check for authentication on mount and cookie changes
  useEffect(() => {
    // Ignore auth check if on login page
    if (pathname === "/admin/login") {
      setIsLoading(false);
      return;
    }
    
    // Check for admin cookie
    checkAuthentication();
    
    // Listen for cookie changes
    const interval = setInterval(checkAuthentication, 1000);
    return () => clearInterval(interval);
  }, [pathname]);
  
  // Function to check if user is authenticated
  const checkAuthentication = () => {
    const cookies = document.cookie.split(';');
    const adminCookie = cookies.find(cookie => cookie.trim().startsWith("admin_auth="));
    const adminCookieExists = !!adminCookie && adminCookie.trim() !== "admin_auth=";
    
    console.log("Checking authentication, cookie exists:", adminCookieExists);
    
    setIsAuthenticated(adminCookieExists);
    
    if (!adminCookieExists && pathname !== "/admin/login") {
      console.log("Not authenticated, redirecting to login");
      router.push("/admin/login");
    } else {
      setIsLoading(false);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // On login page, just render children
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
  
  // If authenticated or on login page, render children
  return isAuthenticated ? <>{children}</> : null;
} 