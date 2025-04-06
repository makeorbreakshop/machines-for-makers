import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laser Settings Library - Perfect Cuts & Engravings | Machines for Makers",
  description: "Get instant access to verified laser settings organized by material, machine type, and power level. Find perfect parameters for your projects in seconds.",
  openGraph: {
    title: "Laser Settings Library - Perfect Cuts & Engravings",
    description: "Get instant access to verified laser settings organized by material, machine type, and power level.",
    images: [
      {
        url: "/images/og/laser-settings-library.jpg",
        width: 1200,
        height: 630,
        alt: "Laser Settings Library Preview"
      }
    ]
  }
};

export default function LaserSettingsLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 