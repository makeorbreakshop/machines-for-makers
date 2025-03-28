import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Laser Material Library | Machines for Makers",
    template: "%s | Laser Material Library | Machines for Makers",
  },
  description: "Access our comprehensive library of laser settings for cutting and engraving various materials, organized by material, machine type, and power level.",
};

export default function LaserMaterialLibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {children}
    </div>
  );
} 