import { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Learn Lightburn for Lasers - From Beginner to Pro in Days Not Months",
  description: "Discover the exact Lightburn process for flawless cut and engraves so you can stop wasting expensive materials and time. Master your laser cutter with our comprehensive course.",
  keywords: "Lightburn, laser cutting, laser engraving, CNC laser, diode laser, CO2 laser, laser software, laser course, laser tutorial",
  other: {
    username: "user_2tGYSHl6wqvmWecL2tSfahhyB9h",
    offer: "Learn Lightburn for Lasers v2"
  },
  openGraph: {
    title: "Learn Lightburn for Lasers - From Beginner to Pro in Days Not Months",
    description: "Stop wasting expensive materials and time. Master Lightburn with our comprehensive course and create flawless laser cuts and engravings.",
    images: [
      {
        url: "https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/hero/7a2ca51-8fe4-4ccc-cdd2-7c8fea70d8ae_learn-lightburn-logo-1_1744054561004.webp",
        width: 1200,
        height: 630,
        alt: "Learn Lightburn for Lasers"
      }
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn Lightburn for Lasers - From Beginner to Pro in Days Not Months",
    description: "Stop wasting expensive materials and time. Master Lightburn with our comprehensive course.",
    images: ["https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/hero/7a2ca51-8fe4-4ccc-cdd2-7c8fea70d8ae_learn-lightburn-logo-1_1744054561004.webp"],
  },
}

// Course information for structured data
const courseInfo = {
  name: "Learn Lightburn for Lasers",
  description: "Discover the exact Lightburn process for flawless cut and engraves so you can stop wasting expensive materials and time.",
  provider: {
    name: "Make or Break Shop",
    sameAs: "https://youtube.com/@makeorbreakshop"
  },
  price: "197",
  currency: "USD",
  ratingValue: "4.9",
  reviewCount: "124",
  imageUrl: "https://xspderyoeancoqhdcloo.supabase.co/storage/v1/object/public/images/learn-lightburn/hero/7a2ca51-8fe4-4ccc-cdd2-7c8fea70d8ae_learn-lightburn-logo-1_1744054561004.webp"
}

export default function LearnLightburnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": courseInfo.name,
    "description": courseInfo.description,
    "provider": {
      "@type": "Organization",
      "name": courseInfo.provider.name,
      "sameAs": courseInfo.provider.sameAs
    },
    "offers": {
      "@type": "Offer",
      "price": courseInfo.price,
      "priceCurrency": courseInfo.currency,
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": courseInfo.ratingValue,
      "reviewCount": courseInfo.reviewCount
    },
    "image": courseInfo.imageUrl,
    "audience": {
      "@type": "Audience",
      "audienceType": "Laser Cutter Users"
    }
  }

  return (
    <>
      <Script src="https://d15dfsr886zcp9.cloudfront.net/tracker_script.js" defer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      {children}
    </>
  )
} 