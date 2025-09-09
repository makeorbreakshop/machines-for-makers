'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()
  const isCalculatorPage = pathname?.includes('/machine-business-calculator')
  
  // For calculator pages, force dark theme
  if (isCalculatorPage) {
    return (
      <NextThemesProvider 
        attribute="class"
        defaultTheme="dark" 
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    )
  }
  
  // Force light mode for all other pages
  return (
    <NextThemesProvider 
      attribute="class"
      defaultTheme="light" 
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
