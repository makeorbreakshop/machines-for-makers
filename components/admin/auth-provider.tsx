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
    
    // Listen for cookie changes - changed from 1000ms to 30000ms (30 seconds) to reduce CPU usage
    const interval = setInterval(checkAuthentication, 30000);
    return () => clearInterval(interval);
  }, [pathname]);
  
  // Function to check if user is authenticated
  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/admin/auth/check', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });
      
      const data = await response.json();
      const isAuth = data.authenticated === true;
      
      console.log("Checking authentication, authenticated:", isAuth);
      
      setIsAuthenticated(isAuth);
      
      if (!isAuth && pathname !== "/admin/login") {
        console.log("Not authenticated, redirecting to login");
        router.push("/admin/login");
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      if (pathname !== "/admin/login") {
        router.push("/admin/login");
      }
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