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
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="space-y-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">UV Printer Ink Cost Calculator</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            Upload an image, specify dimensions, and get accurate cost estimates for UV printing jobs.
          </p>
        </div>
        
        <InkCalculator />
      </div>
    </div>
  );
} 