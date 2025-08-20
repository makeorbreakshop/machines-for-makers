import React from "react"
import { Inter } from "next/font/google"
import "../(site)/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Providers from "@/app/providers"

export const runtime = 'nodejs';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export default function LaserComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Standalone layout without navigation header
  return (
    <div className={`${inter.variable} font-sans`}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <Providers>
          {children}
        </Providers>
      </ThemeProvider>
    </div>
  );
}