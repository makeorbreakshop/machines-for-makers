import React from "react"
import type { Metadata } from "next"
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { GA_MEASUREMENT_ID } from '@/lib/analytics'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import "./globals.css"

export const metadata: Metadata = {
  title: "Machines for Makers - Laser Cutter Reviews & Comparisons",
  description:
    "Find the perfect laser cutter or engraver for your needs with comprehensive reviews, detailed comparisons, and expert recommendations.",
  generator: 'v0.dev',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.machinesformakers.com'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    title: 'Machines for Makers - Expert Reviews & Comparisons',
    description: 'Find the perfect machine for your maker projects with comprehensive reviews, detailed comparisons, and expert recommendations.',
    siteName: 'Machines for Makers',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Machines for Makers - Expert Reviews & Comparisons',
    description: 'Find the perfect machine for your maker projects with comprehensive reviews and comparisons.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body suppressHydrationWarning>
        {children}
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
