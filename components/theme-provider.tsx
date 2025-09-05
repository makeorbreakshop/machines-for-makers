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
  
  // For calculator pages, use dark theme
  if (isCalculatorPage) {
    return <NextThemesProvider {...props} defaultTheme="dark" forcedTheme="dark">{children}</NextThemesProvider>
  }
  
  // Force light mode for all other pages
  return <NextThemesProvider {...props} defaultTheme="light" forcedTheme="light">{children}</NextThemesProvider>
}
