'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()
  // Check for calculator page - handle both /tools/machine-business-calculator and any sub-paths
  const isCalculatorPage = pathname?.includes('/machine-business-calculator')
  
  // For calculator pages, force dark theme completely
  if (isCalculatorPage) {
    return (
      <NextThemesProvider 
        {...props} 
        defaultTheme="dark" 
        forcedTheme="dark"
        enableSystem={false}
        attribute="class"
      >
        {children}
      </NextThemesProvider>
    )
  }
  
  // Force light mode for all other pages
  return (
    <NextThemesProvider 
      {...props} 
      defaultTheme="light" 
      forcedTheme="light"
      enableSystem={false}
      attribute="class"
    >
      {children}
    </NextThemesProvider>
  )
}
