import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Machines for Makers - Laser Cutter Reviews & Comparisons",
  description:
    "Find the perfect laser cutter or engraver for your needs with comprehensive reviews, detailed comparisons, and expert recommendations.",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
