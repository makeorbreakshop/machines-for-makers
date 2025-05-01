import { Metadata } from "next";
import InkCalculator from "./components/InkCalculator";

export const metadata: Metadata = {
  title: "UV Printer Ink Cost Calculator | Machines for Makers",
  description: "Calculate ink costs for your UV printer jobs. Upload an image, specify dimensions, and get accurate cost per print estimates.",
  openGraph: {
    title: "UV Printer Ink Cost Calculator | Machines for Makers",
    description: "Calculate ink costs for your UV printer jobs. Upload an image, specify dimensions, and get accurate cost per print estimates.",
    type: "website",
  },
};

export default function InkCalculatorPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <div className="mx-auto">
        <InkCalculator />
      </div>
    </div>
  );
} 